import type { Entity } from '../types';
import { PORTFOLIOS, portfolioColour } from '../data/portfolios';
import { yearOf } from '../utils/format';

interface Ctx {
  entities: Entity[];
  open: (e: Entity) => void;
}

export function renderTimeline(root: HTMLElement, ctx: Ctx): void {
  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Timeline of creation</h2>
        <p class="sub">When each entity was established, grouped by decade. Each column is stacked by portfolio. Reveals the growth of regulation and oversight in the post-war era and the burst of agency creation since 2010.</p>
      </div>
      <div>
        <label style="font-size:var(--font-size-sm);">Bucket:
          <select id="tl-bucket" style="margin-left:6px;padding:0.35rem 0.5rem;border:1px solid var(--border-default);border-radius:4px;font-size:var(--font-size-sm);">
            <option value="decade" selected>By decade</option>
            <option value="year">By year (last 25)</option>
          </select>
        </label>
      </div>
    </div>
    <div class="timeline-wrap">
      <div class="timeline-svg-wrap" id="tl-host"></div>
      <p style="margin-top:0.75rem;font-size:var(--font-size-xs);color:var(--text-tertiary);">${ctx.entities.filter((e) => e.created).length.toLocaleString()} of ${ctx.entities.length.toLocaleString()} entities have a recorded creation date.</p>
    </div>
  `;

  const host = root.querySelector<HTMLDivElement>('#tl-host')!;
  const sel = root.querySelector<HTMLSelectElement>('#tl-bucket')!;
  sel.addEventListener('change', () => draw());

  function draw() {
    const mode = sel.value;
    const withYear = ctx.entities.filter((e) => yearOf(e.created) != null);
    const now = new Date().getFullYear();
    const buckets = new Map<number, Entity[]>();

    if (mode === 'decade') {
      for (const e of withYear) {
        const y = yearOf(e.created)!;
        const dec = Math.floor(y / 10) * 10;
        if (!buckets.has(dec)) buckets.set(dec, []);
        buckets.get(dec)!.push(e);
      }
    } else {
      for (const e of withYear) {
        const y = yearOf(e.created)!;
        if (y < now - 24) continue;
        if (!buckets.has(y)) buckets.set(y, []);
        buckets.get(y)!.push(e);
      }
    }

    const sortedKeys = [...buckets.keys()].sort((a, b) => a - b);
    const maxCount = Math.max(0, ...sortedKeys.map((k) => buckets.get(k)!.length));

    const W = host.clientWidth || 1200;
    const H = 420;
    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 50;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const bw = Math.max(8, innerW / Math.max(sortedKeys.length, 1) - 6);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const ticks = niceTicks(maxCount, 5);
    const tickMax = ticks[ticks.length - 1] || 1;
    ticks.forEach((t) => {
      const y = padT + innerH - (t / tickMax) * innerH;
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', String(padL));
      ln.setAttribute('x2', String(W - padR));
      ln.setAttribute('y1', String(y));
      ln.setAttribute('y2', String(y));
      ln.setAttribute('stroke', '#e3decf');
      ln.setAttribute('stroke-width', '1');
      svg.appendChild(ln);
      const lb = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lb.setAttribute('class', 'tl-tick-label');
      lb.setAttribute('x', String(padL - 8));
      lb.setAttribute('y', String(y + 4));
      lb.setAttribute('text-anchor', 'end');
      lb.textContent = String(t);
      svg.appendChild(lb);
    });

    sortedKeys.forEach((k, i) => {
      const ents = buckets.get(k)!;
      const total = ents.length;
      const xCenter = padL + ((i + 0.5) / sortedKeys.length) * innerW;
      const x = xCenter - bw / 2;
      let yCursor = padT + innerH;
      const portfolioOrder = PORTFOLIOS.map((p) => p.name);
      const portfolioCounts = new Map<string, number>();
      for (const e of ents) {
        portfolioCounts.set(e.portfolio, (portfolioCounts.get(e.portfolio) || 0) + 1);
      }
      portfolioOrder.forEach((p) => {
        const n = portfolioCounts.get(p) || 0;
        if (!n) return;
        const segH = (n / tickMax) * innerH;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', 'tl-bar');
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', String(yCursor - segH));
        rect.setAttribute('width', String(bw));
        rect.setAttribute('height', String(segH));
        rect.setAttribute('fill', portfolioColour(p));
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${k}${mode === 'decade' ? 's' : ''} · ${p}: ${n}`;
        rect.appendChild(title);
        rect.addEventListener('click', () => {
          window.dispatchEvent(new CustomEvent('au-gov-filter-table', { detail: { portfolio: p, yearStart: mode === 'decade' ? k : k, yearEnd: mode === 'decade' ? k + 9 : k } }));
        });
        svg.appendChild(rect);
        yCursor -= segH;
      });
      if (sortedKeys.length < 30 || i % 2 === 0) {
        const lb = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lb.setAttribute('class', 'tl-tick-label');
        lb.setAttribute('x', String(xCenter));
        lb.setAttribute('y', String(H - padB + 16));
        lb.setAttribute('text-anchor', 'middle');
        lb.textContent = mode === 'decade' ? `${k}s` : String(k);
        svg.appendChild(lb);
      }
      if (total >= maxCount * 0.5) {
        const lb = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lb.setAttribute('class', 'tl-tick-label');
        lb.setAttribute('x', String(xCenter));
        lb.setAttribute('y', String(yCursor - 4));
        lb.setAttribute('text-anchor', 'middle');
        lb.setAttribute('font-weight', '600');
        lb.textContent = String(total);
        svg.appendChild(lb);
      }
    });

    const yl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yl.setAttribute('class', 'tl-axis-label');
    yl.setAttribute('x', '0');
    yl.setAttribute('y', String(padT - 6));
    yl.textContent = 'Entities created';
    svg.appendChild(yl);

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

function niceTicks(max: number, count = 5): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.5; v += step) ticks.push(Math.round(v));
  return ticks;
}
