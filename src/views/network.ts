import type { Entity } from '../types';
import { PORTFOLIOS, portfolioColour } from '../data/portfolios';
import { escapeHtml } from '../utils/format';

interface Ctx {
  entities: Entity[];
  open: (e: Entity) => void;
}

interface Node {
  id: string;
  title: string;
  portfolio: string;
  isDept: boolean;
  isMaterial: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  el?: SVGGElement;
}
interface Link {
  source: Node;
  target: Node;
  el?: SVGLineElement;
}

export function renderNetwork(root: HTMLElement, ctx: Ctx): void {
  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Relationship graph</h2>
        <p class="sub">Edges connect each entity to its parent organisation. Departments of State and Material bodies are highlighted larger. Filter by portfolio to isolate a sub-tree. Built with a hand-rolled force simulation.</p>
      </div>
    </div>
    <div class="network-wrap">
      <div class="network-controls">
        <label style="font-size:var(--font-size-sm);">Portfolio:
          <select id="net-portfolio" style="margin-left:6px;padding:0.35rem 0.5rem;border:1px solid var(--border-default);border-radius:4px;font-size:var(--font-size-sm);">
            <option value="">All portfolios</option>
            ${PORTFOLIOS.map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </label>
        <label style="font-size:var(--font-size-sm);">
          <input type="checkbox" id="net-material" /> Only Material bodies
        </label>
        <span style="font-size:var(--font-size-xs);color:var(--text-tertiary);" id="net-stats"></span>
      </div>
      <div class="network-svg-wrap" id="net-host"></div>
    </div>
  `;

  const host = root.querySelector<HTMLDivElement>('#net-host')!;
  const portfolioSelect = root.querySelector<HTMLSelectElement>('#net-portfolio')!;
  const materialCheckbox = root.querySelector<HTMLInputElement>('#net-material')!;
  const statsEl = root.querySelector<HTMLSpanElement>('#net-stats')!;

  portfolioSelect.addEventListener('change', () => simulate());
  materialCheckbox.addEventListener('change', () => simulate());

  let stopFlag = false;
  let nodes: Node[] = [];
  let links: Link[] = [];

  function buildGraph(): void {
    const portfolio = portfolioSelect.value;
    const materialOnly = materialCheckbox.checked;
    const filtered = ctx.entities.filter(
      (e) =>
        (!portfolio || e.portfolio === portfolio) &&
        (!materialOnly || e.materiality === 'Material' || e.isPortfolioDept),
    );

    const w = host.clientWidth || 1200;
    const h = host.clientHeight || 640;

    const byTitle = new Map(filtered.map((e) => [e.title, e]));

    nodes = filtered.map((e) => ({
      id: e.id,
      title: e.title,
      portfolio: e.portfolio,
      isDept: e.isPortfolioDept,
      isMaterial: e.materiality === 'Material',
      x: w / 2 + (Math.random() - 0.5) * w * 0.8,
      y: h / 2 + (Math.random() - 0.5) * h * 0.8,
      vx: 0,
      vy: 0,
      r: e.isPortfolioDept ? 8 : e.materiality === 'Material' ? 6 : 4,
    }));
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    links = [];
    for (const e of filtered) {
      if (!e.parentOrg) continue;
      const parent = byTitle.get(e.parentOrg);
      if (!parent) continue;
      const src = nodeById.get(e.id);
      const tgt = nodeById.get(parent.id);
      if (src && tgt) links.push({ source: src, target: tgt });
    }

    statsEl.textContent = `${nodes.length} nodes · ${links.length} edges`;
  }

  function setupSvg(): void {
    const w = host.clientWidth || 1200;
    const h = host.clientHeight || 640;
    host.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.style.width = '100%';
    svg.style.height = '100%';
    host.appendChild(svg);

    const linkLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linkLayer.setAttribute('id', 'links');
    const nodeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeLayer.setAttribute('id', 'nodes');
    svg.appendChild(linkLayer);
    svg.appendChild(nodeLayer);

    links.forEach((l) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'net-link');
      linkLayer.appendChild(line);
      l.el = line;
    });
    nodes.forEach((n) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'net-node');
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', String(n.r));
      c.setAttribute('fill', portfolioColour(n.portfolio));
      c.setAttribute('stroke', n.isDept ? '#c89d4f' : '#fff');
      c.setAttribute('stroke-width', n.isDept ? '2' : '1');
      g.appendChild(c);
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${n.title} — ${n.portfolio}`;
      g.appendChild(title);
      g.addEventListener('click', () => {
        const ent = ctx.entities.find((e) => e.id === n.id);
        if (ent) ctx.open(ent);
      });
      nodeLayer.appendChild(g);
      n.el = g;
    });
  }

  function tick(): void {
    const w = host.clientWidth || 1200;
    const h = host.clientHeight || 640;
    const cx = w / 2;
    const cy = h / 2;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy + 0.01;
        const dist = Math.sqrt(distSq);
        if (dist > 220) continue;
        const force = 200 / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
    }
    for (const l of links) {
      const dx = l.target.x - l.source.x;
      const dy = l.target.y - l.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
      const targetDist = 60;
      const force = (dist - targetDist) * 0.04;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      l.source.vx += fx; l.source.vy += fy;
      l.target.vx -= fx; l.target.vy -= fy;
    }
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.001;
      n.vy += (cy - n.y) * 0.001;
      n.vx *= 0.82;
      n.vy *= 0.82;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(8, Math.min(w - 8, n.x));
      n.y = Math.max(8, Math.min(h - 8, n.y));
    }

    nodes.forEach((n) => {
      if (n.el) n.el.setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
    });
    links.forEach((l) => {
      if (l.el) {
        l.el.setAttribute('x1', l.source.x.toFixed(1));
        l.el.setAttribute('y1', l.source.y.toFixed(1));
        l.el.setAttribute('x2', l.target.x.toFixed(1));
        l.el.setAttribute('y2', l.target.y.toFixed(1));
      }
    });
  }

  function simulate(): void {
    stopFlag = true;
    // Build immediately so at least a static graph is present even in
    // environments where requestAnimationFrame is throttled (0×0 preview).
    stopFlag = false;
    buildGraph();
    setupSvg();
    // Run some initial ticks synchronously so the layout has a chance to
    // settle even before RAF gets a chance to fire.
    for (let i = 0; i < 30; i++) tick();
    // Then continue with RAF for smooth animation.
    let frame = 0;
    const loop = () => {
      if (stopFlag) return;
      tick();
      frame++;
      if (frame < 320) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  simulate();
}
