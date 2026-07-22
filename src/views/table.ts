// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Entity } from '../types';
import { PORTFOLIOS, portfolioColour, portfolioShort } from '../data/portfolios';
import { compareBy, debounce, escapeHtml, formatDate } from '../utils/format';

interface Ctx {
  entities: Entity[];
  open: (e: Entity) => void;
  preset?: TablePreset;
}

export interface TablePreset {
  portfolio?: string;
  type?: string;
  yearStart?: number;
  yearEnd?: number;
}

type SortKey = 'title' | 'portfolio' | 'typeOfBody' | 'created' | 'materiality';

const TYPE_OPTIONS = [
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

export function renderTable(root: HTMLElement, ctx: Ctx): void {
  let q = '';
  let portfolioFilter = ctx.preset?.portfolio || '';
  let typeFilter = ctx.preset?.type || '';
  let materialOnly = false;
  let sortKey: SortKey = 'title';
  let sortAsc = true;

  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>All entities</h2>
        <p class="sub">Searchable, sortable table of every body in the AGOR — 1,381 entities. Click a row to open its detail panel.</p>
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-controls">
        <input type="search" id="tbl-q" placeholder="Search names, descriptions, governing Acts…" />
        <select id="tbl-portfolio">
          <option value="">All portfolios</option>
          ${PORTFOLIOS.map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('')}
        </select>
        <select id="tbl-type">
          <option value="">All types</option>
          ${TYPE_OPTIONS.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
        </select>
        <label style="font-size:var(--font-size-sm);display:flex;align-items:center;gap:4px;">
          <input type="checkbox" id="tbl-material" /> Material only
        </label>
        <span class="count" id="tbl-count"></span>
      </div>
      <div style="overflow-x:auto;">
        <table class="entity-table" id="tbl">
          <thead>
            <tr>
              <th data-k="title">Name <span class="sort-ind">↑</span></th>
              <th data-k="portfolio">Portfolio</th>
              <th data-k="typeOfBody">Type</th>
              <th data-k="materiality">Materiality</th>
              <th data-k="created">Created</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  const search = root.querySelector<HTMLInputElement>('#tbl-q')!;
  const portfolioEl = root.querySelector<HTMLSelectElement>('#tbl-portfolio')!;
  const typeEl = root.querySelector<HTMLSelectElement>('#tbl-type')!;
  const materialEl = root.querySelector<HTMLInputElement>('#tbl-material')!;
  const countEl = root.querySelector<HTMLSpanElement>('#tbl-count')!;
  const tbody = root.querySelector<HTMLTableSectionElement>('#tbl tbody')!;

  portfolioEl.value = portfolioFilter;
  typeEl.value = typeFilter;

  function apply() {
    const ql = q.trim().toLowerCase();
    let rows = ctx.entities.filter((e) => {
      if (portfolioFilter && e.portfolio !== portfolioFilter) return false;
      if (typeFilter && e.typeOfBody !== typeFilter) return false;
      if (materialOnly && e.materiality !== 'Material') return false;
      if (ctx.preset?.yearStart && e.created) {
        const y = parseInt(e.created.slice(0, 4), 10);
        if (y < (ctx.preset.yearStart || 0)) return false;
        if (y > (ctx.preset.yearEnd || 9999)) return false;
      }
      if (!ql) return true;
      const blob = [e.title, e.description, e.establishedInfo, e.parentOrg, e.suburb, e.state, e.function]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(ql);
    });

    const sorter = compareBy<Entity>((e) => {
      switch (sortKey) {
        case 'title': return e.title.toLowerCase();
        case 'portfolio': return e.portfolio || '';
        case 'typeOfBody': return e.typeOfBody || 'zzz';
        case 'created': return e.created || '0000-00-00';
        case 'materiality': return e.materiality === 'Material' ? 0 : e.materiality === 'Small' ? 1 : 2;
      }
    }, sortAsc);
    rows = rows.slice().sort(sorter);

    countEl.textContent = `${rows.length.toLocaleString()} of ${ctx.entities.length.toLocaleString()}`;
    tbody.innerHTML = rows.slice(0, 400).map((e) => `
      <tr data-id="${escapeHtml(e.id)}">
        <td class="name-cell">${escapeHtml(e.title)}</td>
        <td><span class="portfolio-dot" style="background:${portfolioColour(e.portfolio)}"></span>${escapeHtml(portfolioShort(e.portfolio))}</td>
        <td style="color:var(--text-tertiary);font-size:var(--font-size-xs);">${escapeHtml(e.typeOfBody || '—')}</td>
        <td>${e.materiality === 'Material' ? '<span class="pill material">Material</span>' : e.materiality === 'Small' ? '<span class="pill small">Small</span>' : '—'}</td>
        <td style="font-variant-numeric:tabular-nums;color:var(--text-secondary);">${formatDate(e.created)}</td>
        <td style="color:var(--text-tertiary);">${escapeHtml([e.suburb, e.state].filter(Boolean).join(', ') || '—')}</td>
      </tr>
    `).join('');
    if (rows.length > 400) {
      tbody.insertAdjacentHTML('beforeend', `<tr><td colspan="6" style="text-align:center;color:var(--text-tertiary);padding:1rem;">Showing first 400 results — refine your search to see others.</td></tr>`);
    }

    tbody.querySelectorAll<HTMLTableRowElement>('tr[data-id]').forEach((tr) => {
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        const ent = ctx.entities.find((x) => x.id === id);
        if (ent) ctx.open(ent);
      });
    });

    root.querySelectorAll<HTMLTableCellElement>('thead th').forEach((th) => {
      const ind = th.querySelector('.sort-ind') as HTMLSpanElement | null;
      const k = th.dataset.k;
      if (!ind) {
        if (k === sortKey) th.insertAdjacentHTML('beforeend', ` <span class="sort-ind">${sortAsc ? '↑' : '↓'}</span>`);
      } else if (k === sortKey) {
        ind.textContent = sortAsc ? '↑' : '↓';
      } else {
        ind.remove();
      }
    });
  }

  const reapply = debounce(apply, 180);
  search.addEventListener('input', () => {
    q = search.value;
    reapply();
  });
  portfolioEl.addEventListener('change', () => { portfolioFilter = portfolioEl.value; apply(); });
  typeEl.addEventListener('change', () => { typeFilter = typeEl.value; apply(); });
  materialEl.addEventListener('change', () => { materialOnly = materialEl.checked; apply(); });
  root.querySelectorAll<HTMLTableCellElement>('thead th[data-k]').forEach((th) => {
    th.addEventListener('click', () => {
      const k = th.dataset.k as SortKey;
      if (k === sortKey) sortAsc = !sortAsc;
      else { sortKey = k; sortAsc = k !== 'created'; }
      apply();
    });
  });

  apply();
}
