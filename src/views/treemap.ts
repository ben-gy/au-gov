import type { Entity } from '../types';
import { portfolioColour } from '../data/portfolios';
import { glossaryTerm } from '../components/glossaryTip';

interface Ctx {
  entities: Entity[];
  open: (e: Entity) => void;
}

interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  value: number;
  label: string;
  colour: string;
  entity?: Entity;
}

interface Item<T> {
  value: number;
  ref: T;
}
interface Placed<T> {
  x: number;
  y: number;
  w: number;
  h: number;
  item: Item<T>;
}

export function renderTreemap(root: HTMLElement, ctx: Ctx): void {
  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Treemap</h2>
        <p class="sub">Every portfolio is a block, sized by the number of bodies it contains. Each block is sub-divided by the bodies inside it (weighted: ${glossaryTerm('materiality', 'Material')} bodies count for 4, Small bodies for 2, the rest for 1). Click any cell to open its detail.</p>
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

  function weight(e: Entity, mode: string): number {
    if (mode === 'count') return 1;
    if (e.materiality === 'Material') return 4;
    if (e.materiality === 'Small') return 2;
    return 1;
  }

  function draw() {
    const mode = select.value;
    const width = host.clientWidth || 1200;
    const height = Math.max(560, Math.min(820, width * 0.55));

    const byPortfolio = new Map<string, Entity[]>();
    for (const e of ctx.entities) {
      if (!byPortfolio.has(e.portfolio)) byPortfolio.set(e.portfolio, []);
      byPortfolio.get(e.portfolio)!.push(e);
    }

    const blocks = [...byPortfolio.entries()]
      .map(([p, ents]) => ({
        portfolio: p,
        entities: ents,
        weight: ents.reduce((s, e) => s + weight(e, mode), 0),
      }))
      .sort((a, b) => b.weight - a.weight);

    const total = blocks.reduce((s, b) => s + b.weight, 0);

    const outerRects = squarify(
      blocks.map((b) => ({ value: b.weight, ref: b })),
      0,
      0,
      width,
      height,
    );

    const cells: Cell[] = [];
    outerRects.forEach((r) => {
      const block = r.item.ref;
      const colour = portfolioColour(block.portfolio);
      cells.push({
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        value: block.weight,
        label: block.portfolio,
        colour,
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
        .sort((a, b) => weight(b, mode) - weight(a, mode));
      const sub = squarify(
        entitiesSorted.map((e) => ({ value: weight(e, mode), ref: e })),
        ix,
        iy,
        iw,
        ih,
      );
      sub.forEach((sr) => {
        cells.push({
          x: sr.x,
          y: sr.y,
          w: sr.w,
          h: sr.h,
          value: weight(sr.item.ref, mode),
          label: sr.item.ref.title,
          colour: shade(colour, sr.item.ref.materiality === 'Material' ? 0.18 : sr.item.ref.materiality === 'Small' ? -0.05 : -0.15),
          entity: sr.item.ref,
        });
      });
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    cells.forEach((c) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('class', 'tm-cell');
      rect.setAttribute('x', String(c.x));
      rect.setAttribute('y', String(c.y));
      rect.setAttribute('width', String(c.w));
      rect.setAttribute('height', String(c.h));
      rect.setAttribute('fill', c.colour);
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = c.entity ? `${c.label} — ${c.entity.portfolio}` : `${c.label} (${c.value} bodies)`;
      rect.appendChild(title);
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
        sub.textContent = `${Math.round((c.value / total) * 100)}% · ${c.value} bodies`;
        svg.appendChild(sub);
      }
      if (c.entity && c.w > 70 && c.h > 22) {
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

export function squarify<T>(items: Item<T>[], x: number, y: number, w: number, h: number): Placed<T>[] {
  if (!items.length) return [];
  const sorted = items.slice().sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return [];
  const area = w * h;
  const scale = area / total;
  const remaining = sorted.map((i) => ({ ...i, area: i.value * scale }));
  const placed: Placed<T>[] = [];

  let rx = x, ry = y, rw = w, rh = h;

  while (remaining.length) {
    const row: typeof remaining = [];
    const side = Math.min(rw, rh);

    let bestRatio = Infinity;
    while (remaining.length) {
      const candidate = [...row, remaining[0]];
      const ratio = worstRatio(candidate.map((c) => c.area), side);
      if (ratio > bestRatio) break;
      bestRatio = ratio;
      row.push(remaining.shift()!);
    }

    const rowSum = row.reduce((s, r) => s + r.area, 0);
    const rowThickness = rowSum / side;
    const horizontal = rw < rh;

    let cursor = horizontal ? rx : ry;
    row.forEach((item) => {
      const length = item.area / rowThickness;
      if (horizontal) {
        placed.push({ x: cursor, y: ry, w: rowThickness, h: length, item });
        cursor += length;
      } else {
        placed.push({ x: rx, y: ry, w: length, h: rowThickness, item });
        cursor += length;
      }
    });

    if (horizontal) {
      rx += rowThickness;
      rw -= rowThickness;
    } else {
      ry += rowThickness;
      rh -= rowThickness;
    }
  }

  return placed;
}

function worstRatio(areas: number[], side: number): number {
  const s = areas.reduce((a, b) => a + b, 0);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
}
