# Machinery of Government (AU)

**Interactive map of the Australian Government — every department, agency, statutory body and public entity, with structure, function, and ministerial data.**

🔗 **Live:** [https://au-gov.benrichardson.dev](https://au-gov.benrichardson.dev)

## What is this?

The Australian Government is not one thing. It is a portfolio structure of 16 policy areas — plus a handful of parliamentary departments — each led by a Department of State, and each hosting dozens of statutory authorities, corporate entities, government companies, advisory boards, ministerial councils, joint ventures, and subsidiaries. In total the Department of Finance's Australian Government Organisations Register lists **1,381 bodies**.

The only official browser is a slow, list-based ASP.NET app at directory.gov.au. This site loads the register into a fast, searchable, multi-view dashboard with hierarchical browsing, cross-cutting matrices, geographic distribution, timeline analysis, and a relationship graph — the kind of interface you'd want when you're actually trying to work with the data.

## Who is this for?

- **Journalists** covering Cabinet reshuffles, machinery-of-government changes, and agency scandals
- **Policy analysts** working out which body regulates what
- **Lobbyists and stakeholders** mapping decision-makers
- **Students of public administration**
- **Public servants** orienting to a new agency
- **Engaged citizens** trying to understand how their government is put together

## Data Sources

| Source | What it provides | Update frequency |
|--------|-------------------|-----------------|
| Australian Government Organisations Register (AGOR) via data.gov.au | 1,381 entities with portfolio, type, classification, materiality, description, governing act, ABN, head office, parent organisation, website | Quarterly |
| PM&C Ministry list (13 May 2025) | Cabinet ministers, junior ministers, portfolios | Manual on reshuffle |

## Features

- **Portfolio tree** — collapsible hierarchy of all 17 portfolios → departments → primary bodies → other governance
- **Cabinet & Ministry view** — Second Albanese ministry: 22 Cabinet ministers + outer ministry + assistant ministers, plus portfolio → lead department cards
- **Treemap** — every entity sized by materiality (Material > Small > Other) or entity count, grouped by portfolio
- **Portfolio × Body type matrix** — heat map instantly reveals which portfolios are dominated by non-corporate entities, advisory bodies, joint ventures, or statutory offices
- **Relationship graph** — force-directed parent → child edges, filterable by portfolio, with Departments of State and Material bodies highlighted
- **Map view** — Leaflet + AU state GeoJSON, head office locations clustered by suburb, shows the Canberra dominance
- **Timeline** — stacked bar chart of creation dates by decade or year, portfolio-coloured, reveals waves of agency creation
- **Searchable table** — 1,381-row sortable, filterable table with drill-down detail panel
- **Insights view** — auto-computed cards for oldest/youngest entity, largest portfolio, Canberra concentration, joint venture count, plus a materiality leaderboard
- **Educational glossary** — click any ⓘ term (AGOR, PGPA Act, ANAO, materiality, etc.) for an inline definition
- **Entity detail panel** — slide-in with full record: description, governing Act, parent, website, corporate plan, ABN, address, related entities

## Tech Stack

- **Runtime:** Vanilla TypeScript (no framework)
- **Build:** Vite 6
- **Testing:** Vitest
- **Hosting:** GitHub Pages (static, no backend)
- **Data:** GitHub Actions pipeline that fetches the latest AGOR CSV weekly and emits `public/data/entities.json` + `public/data/aggregate.json`
- **Map:** Leaflet with hand-authored simplified AU state polygons
- **All other visualisations:** hand-rolled SVG (treemap uses a squarified algorithm; network uses a hand-rolled force simulation)

## Local Development

```bash
npm install
npm run dev      # dev server
npm test         # run tests
npm run build    # production build
npm run preview  # preview production build

# Refresh data from data.gov.au
node pipeline/collect.mjs
```

## How it works

1. The `pipeline/collect.mjs` script queries the data.gov.au CKAN API for the latest AGOR CSV resource, downloads it, parses it, normalises each row into a compact typed shape, and writes `public/data/entities.json` (1.8 MB, ~65 KB gzipped) and `public/data/aggregate.json`.
2. A GitHub Actions workflow (`.github/workflows/data-pipeline.yml`) runs the pipeline weekly and commits any changes.
3. The frontend fetches both JSON files on load, builds a portfolio → entities index, and renders whichever tab is active. Views share a portfolio colour scheme, a glossary tooltip system, and a slide-in detail panel keyed by URL hash.

## License

MIT — data is Creative Commons Attribution 3.0 Australia via data.gov.au.
