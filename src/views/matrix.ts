// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Entity } from '../types';
import { PORTFOLIOS, portfolioColour, portfolioShort } from '../data/portfolios';
import { escapeHtml, typeCode } from '../utils/format';
import { glossaryTerm } from '../components/glossaryTip';

interface Ctx {
  entities: Entity[];
  open: (e: Entity) => void;
}

const TYPE_ORDER = [
  'A. Non-corporate Commonwealth entity',
  'B. Corporate Commonwealth entity',
  'C. Commonwealth company',
  'D. Statutory advisory structure',
  'E. Statutory office holder, offices and committees',
  'F. Non-statutory advisory structure',
  'G. Non-statutory function with separate branding',
  'H. Ministerial Councils and related bodies',
  'I. National law bodies',
  'J. Inter-jurisdictional and international bodies',
  'K. Structures linked to the Australian Government through statutory contracts, agreements and delegations',
  'L. Joint ventures, partnerships and interests in other companies',
  'M. Subsidiaries of corporate Commonwealth entities and Commonwealth companies',
];

export function renderMatrix(root: HTMLElement, ctx: Ctx): void {
  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Portfolio × Body type matrix</h2>
        <p class="sub">Which portfolios are dominated by ${glossaryTerm('non-corporate', 'non-corporate entities')}, ${glossaryTerm('advisory-structure', 'advisory bodies')}, ${glossaryTerm('joint-venture', 'joint ventures')}, or ${glossaryTerm('statutory-office', 'statutory offices')}? Each cell shows the count; deeper colour means a heavier concentration. Click a cell to filter the table.</p>
      </div>
    </div>
    <div class="matrix-wrap">
      <table class="matrix-table" id="mx"></table>
    </div>
  `;

  const table = root.querySelector<HTMLTableElement>('#mx')!;
  const portfolioOrder = PORTFOLIOS.map((p) => p.name).filter((name) =>
    ctx.entities.some((e) => e.portfolio === name),
  );

  const matrix = new Map<string, Map<string, number>>();
  for (const p of portfolioOrder) matrix.set(p, new Map());
  let maxCell = 0;
  for (const e of ctx.entities) {
    if (!e.typeOfBody) continue;
    const row = matrix.get(e.portfolio);
    if (!row) continue;
    const next = (row.get(e.typeOfBody) || 0) + 1;
    row.set(e.typeOfBody, next);
    if (next > maxCell) maxCell = next;
  }

  const typeTotals = new Map<string, number>();
  for (const e of ctx.entities) {
    if (!e.typeOfBody) continue;
    typeTotals.set(e.typeOfBody, (typeTotals.get(e.typeOfBody) || 0) + 1);
  }

  const usedTypes = TYPE_ORDER.filter((t) => typeTotals.has(t));

  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  tr.innerHTML = `<th class="portfolio-header">Portfolio</th>` +
    usedTypes.map((t) => `<th data-tip="${escapeHtml(t)}">${typeCode(t)}</th>`).join('') +
    '<th>Total</th>';
  thead.appendChild(tr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  portfolioOrder.forEach((p) => {
    const row = matrix.get(p)!;
    const total = [...row.values()].reduce((s, v) => s + v, 0);
    const colour = portfolioColour(p);
    const cells = usedTypes.map((t) => {
      const v = row.get(t) || 0;
      const alpha = v ? Math.min(0.9, 0.12 + (v / maxCell) * 0.75) : 0;
      const tip = v ? ` data-tip="${escapeHtml(`${p} × ${t.replace(/^[A-Z]\.\s*/, '')}: ${v} ${v === 1 ? 'body' : 'bodies'} — click to filter`)}"` : '';
      return `<td class="cell ${v ? '' : 'empty'}" data-p="${escapeHtml(p)}" data-t="${escapeHtml(t)}"${tip} style="background:${v ? rgba(colour, alpha) : 'transparent'};color:${v && alpha > 0.45 ? '#fff' : 'inherit'};">${v || ''}</td>`;
    }).join('');
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <th class="portfolio-header row-head" data-p="${escapeHtml(p)}" data-tip="${escapeHtml(`${p}: ${total} ${total === 1 ? 'body' : 'bodies'} — click to list them`)}" style="cursor:pointer;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colour};margin-right:6px;"></span>${escapeHtml(portfolioShort(p))}</th>
        ${cells}
        <td><strong>${total}</strong></td>
      </tr>
    `);
  });
  const grandTotal = [...typeTotals.values()].reduce((s, v) => s + v, 0);
  tbody.insertAdjacentHTML('beforeend', `
    <tr class="total">
      <th class="portfolio-header">All portfolios</th>
      ${usedTypes.map((t) => `<td>${typeTotals.get(t) || 0}</td>`).join('')}
      <td>${grandTotal}</td>
    </tr>
  `);
  table.appendChild(tbody);

  table.querySelectorAll<HTMLTableCellElement>('td.cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      const portfolio = cell.dataset.p;
      const type = cell.dataset.t;
      const matches = ctx.entities.filter((e) => e.portfolio === portfolio && e.typeOfBody === type);
      if (matches.length === 1) {
        ctx.open(matches[0]);
      } else if (matches.length > 1) {
        window.dispatchEvent(new CustomEvent('au-gov-filter-table', { detail: { portfolio, type } }));
      }
    });
  });

  // Row header → filter the table to that whole portfolio.
  table.querySelectorAll<HTMLTableCellElement>('th.row-head').forEach((th) => {
    th.addEventListener('click', () => {
      const portfolio = th.dataset.p;
      if (portfolio) window.dispatchEvent(new CustomEvent('au-gov-filter-table', { detail: { portfolio } }));
    });
  });

  root.insertAdjacentHTML('beforeend', `
    <div style="margin-top:0.75rem;font-size:var(--font-size-xs);color:var(--text-tertiary);display:flex;gap:1.5rem;flex-wrap:wrap;">
      <span><strong>Type codes:</strong> ${usedTypes.map((t) => `<span style="margin:0 0.5rem 0 0.25rem;"><span style="font-family:var(--font-mono);background:var(--bg-tint);padding:0 4px;border-radius:2px;">${typeCode(t)}</span> ${escapeHtml(t.replace(/^[A-Z]\.\s*/, ''))}</span>`).join('')}</span>
    </div>
  `);
}

function rgba(hex: string, alpha: number): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`;
}
