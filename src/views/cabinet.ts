import type { Entity } from '../types';
import { MINISTERS } from '../data/ministers';
import { PORTFOLIOS, portfolioColour } from '../data/portfolios';
import { escapeHtml } from '../utils/format';
import { glossaryTerm } from '../components/glossaryTip';

interface Ctx {
  entities: Entity[];
  open: (e: Entity) => void;
}

export function renderCabinet(root: HTMLElement, ctx: Ctx): void {
  const portfolioOrder = PORTFOLIOS.map((p) => p.name);
  const byPortfolio = new Map<string, typeof MINISTERS>();
  for (const m of MINISTERS) {
    if (!byPortfolio.has(m.portfolio)) byPortfolio.set(m.portfolio, []);
    byPortfolio.get(m.portfolio)!.push(m);
  }

  const deptForPortfolio = new Map<string, Entity>();
  for (const e of ctx.entities) {
    if (e.isPortfolioDept && !deptForPortfolio.has(e.portfolio)) {
      deptForPortfolio.set(e.portfolio, e);
    }
  }

  const cabinetMinisters = MINISTERS.filter((m) => m.cabinet);
  const outerMinisters = MINISTERS.filter((m) => !m.cabinet);

  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Cabinet &amp; Ministry</h2>
        <p class="sub">The Second Albanese Ministry (sworn in 13 May 2025). Cabinet ministers are highlighted in gold; outer ministry and assistant ministers in navy. Click a portfolio card to see the lead department for that area.</p>
      </div>
    </div>

    <h3 style="font-family:var(--font-serif);color:var(--accent-navy);margin-bottom:0.75rem;">Cabinet (${cabinetMinisters.length})</h3>
    <div class="cabinet-grid">
      ${cabinetMinisters.map((m) => renderMinisterCard(m, true)).join('')}
    </div>

    <h3 style="font-family:var(--font-serif);color:var(--accent-navy);margin-top:2rem;margin-bottom:0.75rem;">Outer ministry &amp; assistant ministers (${outerMinisters.length})</h3>
    <div class="cabinet-grid">
      ${outerMinisters.map((m) => renderMinisterCard(m, false)).join('')}
    </div>

    <h3 style="font-family:var(--font-serif);color:var(--accent-navy);margin-top:2rem;margin-bottom:0.75rem;">Portfolios &amp; their lead departments</h3>
    <p style="color:var(--text-tertiary);font-size:var(--font-size-sm);margin-bottom:1rem;">Each ${glossaryTerm('portfolio', 'portfolio')} is led by a ${glossaryTerm('portfolio-dept', 'Department of State')} which supports the responsible minister. Click a card to open the department's full record.</p>
    <div class="cabinet-grid">
      ${portfolioOrder.map((p) => {
        const dept = deptForPortfolio.get(p);
        const colour = portfolioColour(p);
        return `
          <div class="minister-card" style="border-left-color:${colour}" data-portfolio="${escapeHtml(p)}" ${dept ? `data-dept-id="${escapeHtml(dept.id)}"` : ''}>
            <div class="name" style="font-size:var(--font-size-base);">${escapeHtml(p)}</div>
            ${dept ? `<div class="title">${escapeHtml(dept.title)}</div>` : '<div class="title" style="color:var(--text-tertiary);">No Department of State</div>'}
            <div class="portfolio">${(byPortfolio.get(p) || []).map((m) => escapeHtml(m.name)).join(' · ') || '—'}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  root.querySelectorAll<HTMLDivElement>('.minister-card[data-dept-id]').forEach((card) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const id = card.dataset.deptId;
      const ent = ctx.entities.find((e) => e.id === id);
      if (ent) ctx.open(ent);
    });
  });
}

function renderMinisterCard(m: (typeof MINISTERS)[number], cabinet: boolean): string {
  const colour = portfolioColour(m.portfolio);
  return `
    <div class="minister-card ${cabinet ? 'cabinet' : ''}" style="${cabinet ? '' : `border-left-color:${colour}`}">
      <div class="name">${escapeHtml(m.name)}</div>
      <div class="title">${escapeHtml(m.title)}</div>
      <div class="portfolio">${escapeHtml(m.portfolio)}</div>
    </div>
  `;
}
