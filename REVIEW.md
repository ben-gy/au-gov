# Machinery of Government (AU) — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **Custom domain:** https://au-gov.benrichardson.dev *(live via Cloudflare CNAME + GitHub Pages TLS)*
- **GitHub Pages:** https://ben-gy.github.io/au-gov/ *(redirects to custom domain now that CNAME is set)*

## What this is

An interactive explorer for the Australian Government's full structure — 1,381 entities (departments, agencies, statutory bodies, advisory committees, government companies, joint ventures) across 17 portfolios — sourced from the Department of Finance's Australian Government Organisations Register.

## Views

1. **Tree** — portfolios → classifications → entities
2. **Cabinet** — Second Albanese ministry (22 Cabinet + outer + assistants) + portfolio-to-department cards
3. **Treemap** — squarified layout sized by materiality or entity count
4. **Matrix** — Portfolio × Body-type heat map
5. **Network** — force-directed parent-child graph
6. **Map** — Leaflet with AU state polygons and clustered head office markers
7. **Timeline** — stacked bars by decade / year
8. **Table** — searchable, sortable 1,381-row table
9. **Insights** — auto-computed cards + materiality leaderboard

## Data pipeline

- `pipeline/collect.mjs` pulls the latest AGOR CSV from data.gov.au and emits normalised JSON to `public/data/`.
- `.github/workflows/data-pipeline.yml` runs the pipeline weekly on a cron.

## Tests

47 Vitest tests across format, portfolio metadata, glossary, ministers, location helpers, and treemap layout — all passing.
