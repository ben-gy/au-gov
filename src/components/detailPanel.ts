// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Entity } from '../types';
import { portfolioColour, portfolioShort } from '../data/portfolios';
import { escapeHtml, formatDate } from '../utils/format';
import { glossaryTerm } from './glossaryTip';

interface PanelDeps {
  byPortfolio: Map<string, Entity[]>;
}

export class DetailPanel {
  private el: HTMLElement;
  private scrim: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private titleEl: HTMLHeadingElement;

  constructor(host: HTMLElement, private deps: PanelDeps, private onSelect: (e: Entity) => void) {
    this.scrim = document.createElement('div');
    this.scrim.className = 'scrim';
    this.scrim.addEventListener('click', () => this.close());
    host.appendChild(this.scrim);

    this.el = document.createElement('aside');
    this.el.className = 'detail-panel';
    this.el.setAttribute('aria-label', 'Entity detail panel');
    this.el.innerHTML = `
      <header>
        <h3 id="dp-title">—</h3>
        <button class="close" type="button" aria-label="Close panel">×</button>
      </header>
      <div class="body" id="dp-body"></div>
    `;
    this.el.querySelector('.close')!.addEventListener('click', () => this.close());
    host.appendChild(this.el);

    this.bodyEl = this.el.querySelector<HTMLDivElement>('#dp-body')!;
    this.titleEl = this.el.querySelector<HTMLHeadingElement>('#dp-title')!;

    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') this.close();
    });
  }

  open(e: Entity, allEntities: Entity[]): void {
    this.titleEl.textContent = e.title;
    this.bodyEl.innerHTML = this.render(e, allEntities);
    this.bodyEl.scrollTop = 0;
    this.el.classList.add('open');
    this.scrim.classList.add('open');
    history.replaceState(null, '', `#id=${encodeURIComponent(e.id)}`);

    this.bodyEl.querySelectorAll<HTMLButtonElement>('.sibling-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!id) return;
        const target = allEntities.find((x) => x.id === id);
        if (target) this.onSelect(target);
      });
    });
  }

  close(): void {
    this.el.classList.remove('open');
    this.scrim.classList.remove('open');
    if (location.hash.startsWith('#id=')) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  private render(e: Entity, allEntities: Entity[]): string {
    const colour = portfolioColour(e.portfolio);
    const parent = e.parentOrg ? allEntities.find((x) => x.title === e.parentOrg) : undefined;
    const children = allEntities.filter((x) => x.parentOrg === e.title && x.id !== e.id);
    const siblings = (this.deps.byPortfolio.get(e.portfolio) || [])
      .filter((s) => s.id !== e.id && s.id !== parent?.id && !children.some((c) => c.id === s.id))
      .slice(0, 8);

    const fields: Array<[string, string]> = [];
    fields.push(['Portfolio', `<span class="pill solid" style="background:${colour}">${escapeHtml(portfolioShort(e.portfolio))}</span> <span style="margin-left:6px;">${escapeHtml(e.portfolio)}</span>`]);
    if (e.classification) fields.push(['Classification', escapeHtml(e.classification)]);
    if (e.typeOfBody) fields.push(['Type of body', escapeHtml(e.typeOfBody)]);
    if (e.gfsSector) fields.push([glossaryTerm('gfs-sector', 'GFS sector'), escapeHtml(e.gfsSector)]);
    if (e.materiality) fields.push([glossaryTerm('materiality', 'Materiality'), escapeHtml(e.materiality)]);
    if (e.psAct) fields.push([glossaryTerm('ps-act', 'PS Act'), escapeHtml(e.psAct)]);
    if (e.function) fields.push(['Function (GFS)', escapeHtml(e.function)]);
    if (e.establishedBy) fields.push(['Established by', `${escapeHtml(e.establishedBy)}${e.establishedInfo ? ` — ${escapeHtml(e.establishedInfo)}` : ''}`]);
    if (e.created) fields.push(['Created', formatDate(e.created)]);
    if (e.parentOrg) {
      const parentVal = parent
        ? `<button type="button" class="sibling-link" data-id="${escapeHtml(parent.id)}" style="text-align:left;background:none;border:none;padding:0;color:var(--accent-navy);text-decoration:underline;text-decoration-color:var(--accent-gold);cursor:pointer;font-size:inherit;">${escapeHtml(e.parentOrg)}</button>`
        : escapeHtml(e.parentOrg);
      fields.push([glossaryTerm('parent-organisation', 'Parent'), parentVal]);
    }
    if (e.auditor) fields.push([glossaryTerm('anao', 'Auditor'), escapeHtml(e.auditor)]);
    if (e.abn) fields.push([glossaryTerm('abn', 'ABN'), escapeHtml(formatAbn(e.abn))]);
    if (e.suburb || e.state) fields.push(['Head office', escapeHtml([e.streetAddress, e.suburb, e.state, e.postcode].filter(Boolean).join(', '))]);
    if (e.website) fields.push(['Website', `<a href="${escapeHtml(e.website)}" target="_blank" rel="noopener">${escapeHtml(stripProto(e.website))}</a>`]);
    if (e.corporatePlan) fields.push(['Corporate plan', `<a href="${escapeHtml(e.corporatePlan)}" target="_blank" rel="noopener">Open document</a>`]);
    if (e.annualReports) fields.push(['Annual reports', `<a href="${escapeHtml(e.annualReports)}" target="_blank" rel="noopener">Open page</a>`]);
    if (e.budgetDocs) fields.push(['Budget documents', `<a href="${escapeHtml(e.budgetDocs)}" target="_blank" rel="noopener">Open page</a>`]);

    const pills: string[] = [];
    if (e.isPortfolioDept) pills.push(`<span class="pill dept">Portfolio Department</span>`);
    if (e.materiality === 'Material') pills.push(`<span class="pill material">Material</span>`);
    if (e.materiality === 'Small') pills.push(`<span class="pill small">Small</span>`);

    const linkCard = (title: string, list: Entity[]): string =>
      list.length
        ? `<div class="card" style="margin-top:1rem;background:var(--bg-elevated);">
             <strong style="font-size:var(--font-size-sm);color:var(--accent-navy);">${title}</strong>
             <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px;">
               ${list.map((s) => `<button type="button" class="sibling-link" data-id="${escapeHtml(s.id)}" style="text-align:left;background:none;border:none;color:var(--accent-navy);text-decoration:underline;text-decoration-color:var(--accent-gold);font-size:var(--font-size-sm);padding:2px 0;cursor:pointer;">${escapeHtml(s.title)}</button>`).join('')}
             </div>
           </div>`
        : '';

    return `
      ${pills.length ? `<div class="pills">${pills.join('')}</div>` : ''}
      ${e.description ? `<div class="description">${escapeHtml(e.description)}</div>` : ''}
      <div>
        ${fields.map(([k, v]) => `<div class="field"><div class="label">${k}</div><div class="value">${v}</div></div>`).join('')}
      </div>
      ${linkCard(`Bodies within (${children.length})`, children.slice(0, 20))}
      ${linkCard('Others in this portfolio', siblings)}
    `;
  }
}

function stripProto(s: string): string {
  return s.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function formatAbn(s: string): string {
  const cleaned = s.replace(/\s+/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  return s;
}
