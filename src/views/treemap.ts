import type { Entity } from '../types';
import { portfolioColour } from '../data/portfolios';
import { glossaryTerm } from '../components/glossaryTip';
import { squarify } from '../utils/squarify';

interface Ctx {
  entities: Entity[];
  open: (e: Entity) => void;
}

export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  value: number;
  label: string;
  colour: string;
  bodies?: number;
  entity?: Entity;
}

export function weightOf(e: Entity, mode: string): number {
  if (mode === 'count') return 1;
  if (e.materiality === 'Material') return 4;
  if (e.materiality === 'Small') return 2;
  return 1;
}

/**
 * Two-level treemap layout: portfolios tile the canvas, each portfolio block is
 * sub-divided by its entities. Pure geometry so tests can assert positions.
 */
export function computeCells(entities: Entity[], mode: string, width: number, height: number): { cells: Cell[]; total: number } {
  const byPortfolio = new Map<string, Entity[]>();
  for (const e of entities) {
    if (!byPortfolio.has(e.portfolio)) byPortfolio.set(e.portfolio, []);
    byPortfolio.get(e.portfolio)!.push(e);
  }

  const blocks = [...byPortfolio.entries()]
    .map(([p, ents]) => ({
      portfolio: p,
      entities: ents,
      weight: ents.reduce((s, e) => s + weightOf(e, mode), 0),
    }))
    .sort((a, b) => b.weight - a.weight);

  const total = blocks.reduce((s, b) => s + b.weight, 0);
  const cells: Cell[] = [];
  if (!total) return { cells, total };

  const outer = squarify(blocks.map((b) => b.weight), width, height);

  blocks.forEach((block, i) => {
    const r = outer[i];
    const colour = portfolioColour(block.portfolio);
    cells.push({
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      value: block.weight,
      label: block.portfolio,
      colour,
      bodies: block.entities.length,
    });

    const padding = 1.5;
    const innerHeaderH = Math.min(18, r.h * 0.18);
    const ix = r.x + padding;
    const iy = r.y + innerHeaderH + padding;
    const iw = r.w - padding * 2;
    const ih = r.h - innerHeaderH - padding * 2;
    if (iw < 6 || ih < 6) return;

    const entitiesSorted = block.entities
      .slice()
      .sort((a, b) => weightOf(b, mode) - weightOf(a, mode));
    const sub = squarify(entitiesSorted.map((e) => weightOf(e, mode)), iw, ih);
    entitiesSorted.forEach((e, j) => {
      const sr = sub[j];
      cells.push({
        x: ix + sr.x,
        y: iy + sr.y,
        w: sr.w,
        h: sr.h,
        value: weightOf(e, mode),
        label: e.title,
        colour: shade(colour, e.materiality === 'Material' ? 0.18 : e.materiality === 'Small' ? -0.05 : -0.15),
        entity: e,
      });
    });
  });

  return { cells, total };
}

export function renderTreemap(root: HTMLElement, ctx: Ctx): void {
  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Treemap</h2>
        <p class="sub">Every portfolio is a block, sized by the number of bodies it contains. Each block is sub-divided by the bodies inside it (weighted: ${glossaryTerm('materiality', 'Material')} bodies count for 4, Small bodies for 2, the rest for 1). Hover any cell for detail; click to open it.</p>
      </div>
      <div>
        <label style="font-size:var(--font-size-sm);">View:
          <select id="tm-mode" style="margin-left:6px;padding:0.35rem 0.5rem;border:1px solid var(--border-default);border-radius:4px;font-size:var(--font-size-sm);">
            <option value="weighted" selected>Weighted by materiality</option>
            <option value="count">Equal weight (count)</option>
          </select>
        </label>
      </div>
    </div>
    <div class="treemap-svg-wrap" id="tm-host"></div>
  `;

  const host = root.querySelector<HTMLDivElement>('#tm-host')!;
  const select = root.querySelector<HTMLSelectElement>('#tm-mode')!;
  select.addEventListener('change', () => draw());

  function draw() {
    const mode = select.value;
    const width = host.clientWidth || 1200;
    const height = Math.max(560, Math.min(820, width * 0.55));

    const { cells, total } = computeCells(ctx.entities, mode, width, height);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    cells.forEach((c) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('class', 'tm-cell');
      rect.setAttribute('x', String(c.x));
      rect.setAttribute('y', String(c.y));
      rect.setAttribute('width', String(Math.max(0, c.w - (c.entity ? 1 : 0))));
      rect.setAttribute('height', String(Math.max(0, c.h - (c.entity ? 1 : 0))));
      rect.setAttribute('fill', c.colour);
      const tipText = c.entity
        ? `${c.label} — ${c.entity.materiality || 'Standard'} · ${c.entity.portfolio}`
        : `${c.label} — ${c.bodies} ${c.bodies === 1 ? 'body' : 'bodies'} · ${Math.round((c.value / total) * 100)}% of weight`;
      rect.setAttribute('data-tip', tipText);
      rect.setAttribute('aria-label', tipText);
      if (c.entity) {
        rect.addEventListener('click', () => ctx.open(c.entity!));
      }
      svg.appendChild(rect);

      if (!c.entity && c.h > 22 && c.w > 80) {
        const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tx.setAttribute('class', 'tm-label');
        tx.setAttribute('x', String(c.x + 6));
        tx.setAttribute('y', String(c.y + 14));
        tx.setAttribute('font-weight', '600');
        tx.textContent = shortLabel(c.label, c.w / 7);
        svg.appendChild(tx);
        const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sub.setAttribute('class', 'tm-label');
        sub.setAttribute('x', String(c.x + 6));
        sub.setAttribute('y', String(c.y + 14 + 12));
        sub.setAttribute('font-size', '10');
        sub.setAttribute('opacity', '0.85');
        sub.textContent = `${Math.round((c.value / total) * 100)}% · ${c.bodies} bodies`;
        svg.appendChild(sub);
      }
      if (c.entity && c.w > 68 && c.h > 30) {
        const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tx.setAttribute('class', 'tm-label');
        tx.setAttribute('x', String(c.x + 4));
        tx.setAttribute('y', String(c.y + 12));
        tx.setAttribute('font-size', '10');
        tx.textContent = shortLabel(c.label, c.w / 6);
        svg.appendChild(tx);
      }
    });

    host.innerHTML = '';
    host.appendChild(svg);
  }

  draw();
  let resizeT: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeT) window.clearTimeout(resizeT);
    resizeT = window.setTimeout(() => draw(), 200);
  });
}

function shortLabel(s: string, maxChars: number): string {
  const m = Math.max(4, Math.floor(maxChars));
  if (s.length <= m) return s;
  return s.slice(0, m - 1) + '…';
}

function shade(hex: string, amount: number): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  r = Math.round(r + (target - r) * t);
  g = Math.round(g + (target - g) * t);
  b = Math.round(b + (target - b) * t);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
