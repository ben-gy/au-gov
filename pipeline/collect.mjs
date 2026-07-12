// Pipeline: download the latest Australian Government Organisations Register (AGOR)
// from data.gov.au, normalise into compact JSON, and emit aggregate/entity files
// into public/data/.
//
// Run: node pipeline/collect.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = join(__dirname, '..', 'public', 'data');

const PACKAGE_API =
  'https://data.gov.au/data/api/3/action/package_show?id=australian-government-organisations-register';

async function findLatestCsvUrl() {
  const res = await fetch(PACKAGE_API);
  if (!res.ok) throw new Error(`package_show ${res.status}`);
  const data = await res.json();
  const resources = data?.result?.resources ?? [];
  const csvs = resources
    .filter((r) => (r.format || '').toUpperCase() === 'CSV')
    .sort(
      (a, b) =>
        new Date(b.last_modified || 0).getTime() -
        new Date(a.last_modified || 0).getTime(),
    );
  if (!csvs.length) throw new Error('no CSV resources found in AGOR package');
  return { url: csvs[0].url, modified: csvs[0].last_modified, name: csvs[0].name };
}

// Tiny CSV parser tolerant of quoted fields with embedded commas/newlines.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim()));
}

function rowsToObjects(rows) {
  const headers = rows[0].map((h) => h.replace(/^﻿/, '').trim());
  return rows.slice(1).map((cols) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] ?? '').trim();
    });
    return obj;
  });
}

function parseDate(s) {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return s;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const PORTFOLIO_CODES = {
  "Agriculture, Fisheries and Forestry": 'AFF',
  "Attorney-General's": 'AG',
  "Climate Change, Energy, the Environment and Water": 'CCEEW',
  Defence: 'DEF',
  Education: 'EDU',
  "Employment and Workplace Relations": 'EWR',
  Finance: 'FIN',
  "Foreign Affairs and Trade": 'DFAT',
  "Health, Disability and Ageing": 'HDA',
  "Home Affairs": 'HA',
  "Industry, Science and Resources": 'ISR',
  "Infrastructure, Transport, Regional Development, Communications, Sport & Arts": 'ITRDCSA',
  "Prime Minister and Cabinet": 'PMC',
  "Social Services": 'SS',
  Treasury: 'TRY',
  "Veterans' Affairs (part of the Defence Portfolio)": 'DVA',
  "Parliamentary Departments (not a portfolio)": 'PARL',
};

function normaliseEntity(r) {
  return {
    id: r['Id'],
    slug: slugify(r['Title']),
    title: r['Title'],
    portfolio: r['Portfolio'],
    portfolioCode: PORTFOLIO_CODES[r['Portfolio']] || 'OTHER',
    isPortfolioDept: /^(yes|y|true)$/i.test(r['Portfolio Dept?'] || ''),
    classification: r['Classification'] || null,
    typeOfBody: r['Type of Body'] || null,
    gfsSector: r['GFS Sector Classification'] || null,
    materiality: r['Materiality'] || null,
    description: r['Description'] || null,
    establishedBy: r['Established By / Under'] || null,
    establishedInfo: r['Established by/Under More Info'] || null,
    created: parseDate(r['Creation Date']),
    function: r['GFS Function / Sector Reported'] || null,
    psAct: r['PS Act Body'] || null,
    auditor: r['Auditor'] || null,
    abn: (r['ABN'] || '').replace(/\s+/g, '') || null,
    parentOrg: r['Parent Organisation'] || null,
    streetAddress: r['Head Office Street Address'] || null,
    suburb: r['Head Office Suburb'] || null,
    state: r['Head Office State'] || null,
    postcode: r['Head Office Postcode'] || null,
    country: r['Head Office Country'] || null,
    website: r['Website Address'] || null,
    corporatePlan: r['Strategic/Corporate/Organisational Plan'] || null,
    annualReports: r['Annual Reports'] || null,
    budgetDocs: r['Budget Documentation'] || null,
  };
}

function tally(arr, key) {
  const m = {};
  for (const r of arr) {
    const v = r[key];
    if (v) m[v] = (m[v] || 0) + 1;
  }
  return m;
}

async function main() {
  console.log('Looking up latest AGOR CSV URL…');
  const { url, modified, name } = await findLatestCsvUrl();
  console.log(`Latest: ${name} (modified ${modified})`);
  console.log(`Fetching ${url}`);
  const csvRes = await fetch(url);
  if (!csvRes.ok) throw new Error(`download CSV ${csvRes.status}`);
  const csvText = await csvRes.text();
  const rows = parseCsv(csvText);
  const objs = rowsToObjects(rows);
  console.log(`Parsed ${objs.length} entities`);
  const entities = objs.map(normaliseEntity);

  const portfolioMap = new Map();
  for (const e of entities) {
    if (!portfolioMap.has(e.portfolio)) {
      portfolioMap.set(e.portfolio, {
        portfolio: e.portfolio,
        code: e.portfolioCode,
        total: 0,
        byType: {},
        byClassification: {},
        byState: {},
        material: 0,
        small: 0,
      });
    }
    const p = portfolioMap.get(e.portfolio);
    p.total++;
    if (e.typeOfBody) p.byType[e.typeOfBody] = (p.byType[e.typeOfBody] || 0) + 1;
    if (e.classification)
      p.byClassification[e.classification] = (p.byClassification[e.classification] || 0) + 1;
    if (e.state) p.byState[e.state] = (p.byState[e.state] || 0) + 1;
    if (e.materiality === 'Material') p.material++;
    if (e.materiality === 'Small') p.small++;
  }

  const totals = {
    entityCount: entities.length,
    portfolioCount: portfolioMap.size,
    departmentCount: entities.filter((e) => e.isPortfolioDept).length,
    materialCount: entities.filter((e) => e.materiality === 'Material').length,
    smallCount: entities.filter((e) => e.materiality === 'Small').length,
    materialitySet: entities.filter((e) => e.materiality).length,
    byType: tally(entities, 'typeOfBody'),
    byState: tally(entities, 'state'),
    byClassification: tally(entities, 'classification'),
    byPortfolio: tally(entities, 'portfolio'),
    sourceName: name,
    sourceUrl: url,
    sourceModified: modified,
    generatedAt: new Date().toISOString(),
  };

  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, 'entities.json'), JSON.stringify(entities));
  await writeFile(
    join(OUT, 'aggregate.json'),
    JSON.stringify({
      totals,
      portfolios: Array.from(portfolioMap.values()).sort((a, b) => b.total - a.total),
    }),
  );

  console.log(`Wrote ${entities.length} entities to public/data/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
