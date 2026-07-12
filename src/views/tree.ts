import type { Entity } from '../types';
import { PORTFOLIOS, portfolioColour } from '../data/portfolios';
import { escapeHtml, yearOf } from '../utils/format';
import { glossaryTerm } from '../components/glossaryTip';

interface Ctx {
  entities: Entity[];
  open: (e: Entity) => void;
}

export function renderTree(root: HTMLElement, ctx: Ctx): void {
  const byPortfolio = new Map<string, Entity[]>();
  for (const e of ctx.entities) {
    if (!byPortfolio.has(e.portfolio)) byPortfolio.set(e.portfolio, []);
    byPortfolio.get(e.portfolio)!.push(e);
  }

  const portfolioOrder = PORTFOLIOS.map((p) => p.name).filter((name) => byPortfolio.has(name));

  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Portfolio tree</h2>
        <p class="sub">All ${ctx.entities.length.toLocaleString()} entities in the ${glossaryTerm('agor', 'AGOR')}, grouped by ${glossaryTerm('portfolio', 'portfolio')} and classification. Click a portfolio to expand; click any entity for full detail.</p>
      </div>
      <div>
        <button id="expand-all" style="border:1px solid var(--border-default);background:var(--bg-surface);padding:0.4rem 0.85rem;border-radius:4px;color:var(--accent-navy);font-size:var(--font-size-sm);">Expand all</button>
        <button id="collapse-all" style="border:1px solid var(--border-default);background:var(--bg-surface);padding:0.4rem 0.85rem;border-radius:4px;color:var(--accent-navy);font-size:var(--font-size-sm);">Collapse all</button>
      </div>
    </div>
    <div class="tree" id="tree-list"></div>
  `;

  const list = root.querySelector<HTMLDivElement>('#tree-list')!;
  const order = ['A. Primary body', 'B. Secondary statutory structure', 'C. Secondary non-statutory structure', 'D. Other governance relationship'];

  portfolioOrder.forEach((name) => {
    const entities = byPortfolio.get(name)!;
    const groups = new Map<string, Entity[]>();
    for (const e of entities) {
      const key = e.classification || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    const sortedGroups = [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    const colour = portfolioColour(name);
    const card = document.createElement('div');
    card.className = 'tree-portfolio';
    const total = entities.length;
    card.innerHTML = `
      <header tabindex="0">
        <span class="toggle">+</span>
        <span class="colour" style="background:${colour}"></span>
        <h3>${escapeHtml(name)}</h3>
        <span class="count">${total} ${total === 1 ? 'body' : 'bodies'}</span>
      </header>
      <div class="body">
        ${sortedGroups.map(([cls, items]) => `
          <div class="group">
            <h4>${escapeHtml(cls)} <span style="color:var(--accent-gold);font-weight:700;">·</span> ${items.length}</h4>
            <ul class="entities">
              ${items.slice().sort((a, b) => (a.isPortfolioDept === b.isPortfolioDept ? a.title.localeCompare(b.title) : a.isPortfolioDept ? -1 : 1)).map((e) => `
                <li class="entity" data-id="${escapeHtml(e.id)}" data-tip="${escapeHtml(`${e.typeOfBody?.replace(/^[A-Z]\.\s*/, '') || 'Body'}${e.materiality ? ` · ${e.materiality}` : ''}${yearOf(e.created) ? ` · est. ${yearOf(e.created)}` : ''} — click for details`)}">
                  <div class="name">${escapeHtml(e.title)}${e.isPortfolioDept ? ' <span class="pill dept" style="font-size:9px;padding:0 6px;">Dept of State</span>' : ''}</div>
                  <div class="meta">
                    <span>${escapeHtml(e.typeOfBody || '—')}</span>
                    ${e.materiality === 'Material' ? '<span class="pill material" style="font-size:9px;padding:0 4px;">Material</span>' : ''}
                  </div>
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    `;

    const header = card.querySelector('header')!;
    header.addEventListener('click', () => {
      card.classList.toggle('open');
      header.querySelector('.toggle')!.textContent = card.classList.contains('open') ? '–' : '+';
    });
    header.addEventListener('keydown', (ev) => {
      if ((ev as KeyboardEvent).key === 'Enter' || (ev as KeyboardEvent).key === ' ') {
        ev.preventDefault();
        (header as HTMLElement).click();
      }
    });

    card.querySelectorAll<HTMLLIElement>('.entity').forEach((li) => {
      li.addEventListener('click', () => {
        const id = li.dataset.id;
        const ent = ctx.entities.find((e) => e.id === id);
        if (ent) ctx.open(ent);
      });
    });

    list.appendChild(card);
  });

  const first = list.querySelector<HTMLDivElement>('.tree-portfolio');
  if (first) {
    first.classList.add('open');
    first.querySelector('.toggle')!.textContent = '–';
  }

  root.querySelector('#expand-all')!.addEventListener('click', () => {
    list.querySelectorAll<HTMLDivElement>('.tree-portfolio').forEach((c) => {
      c.classList.add('open');
      c.querySelector('.toggle')!.textContent = '–';
    });
  });
  root.querySelector('#collapse-all')!.addEventListener('click', () => {
    list.querySelectorAll<HTMLDivElement>('.tree-portfolio').forEach((c) => {
      c.classList.remove('open');
      c.querySelector('.toggle')!.textContent = '+';
    });
  });
}
