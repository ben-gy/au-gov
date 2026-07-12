import type { Entity } from '../types';
import { PORTFOLIOS, portfolioColour } from '../data/portfolios';
import { escapeHtml } from '../utils/format';
import { forceLayout, mulberry32, type SimLink } from '../utils/forceLayout';
import { attachSvgZoom, type SvgZoomHandle } from '../utils/svgZoom';

interface Ctx {
  entities: Entity[];
  open: (e: Entity) => void;
}

interface Node {
  id: string;
  title: string;
  portfolio: string;
  typeOfBody: string | null;
  isDept: boolean;
  isMaterial: boolean;
  x: number;
  y: number;
  r: number;
  el?: SVGGElement;
}
interface Link {
  source: number;
  target: number;
  el?: SVGLineElement;
}

export function renderNetwork(root: HTMLElement, ctx: Ctx): void {
  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Relationship graph</h2>
        <p class="sub">Edges connect each entity to its parent organisation. Departments of State and Material bodies are highlighted larger. Filter by portfolio to isolate a sub-tree. Scroll to zoom, drag to pan, hover a node for detail.</p>
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

  portfolioSelect.addEventListener('change', () => render());
  materialCheckbox.addEventListener('change', () => render());

  let nodes: Node[] = [];
  let links: Link[] = [];
  let zoom: SvgZoomHandle | null = null;

  function buildGraph(w: number, h: number): void {
    const portfolio = portfolioSelect.value;
    const materialOnly = materialCheckbox.checked;
    const filtered = ctx.entities.filter(
      (e) =>
        (!portfolio || e.portfolio === portfolio) &&
        (!materialOnly || e.materiality === 'Material' || e.isPortfolioDept),
    );

    // Deterministic clustered seeding: each portfolio gets an anchor on an
    // ellipse; departments sit at the anchor, other bodies jitter around it.
    // Starting near the final neighbourhood slashes iterations-to-settle.
    const rand = mulberry32(42);
    const portfolios = [...new Set(filtered.map((e) => e.portfolio))].sort();
    const anchor = new Map<string, [number, number]>();
    portfolios.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, portfolios.length) - Math.PI / 2;
      anchor.set(p, [w / 2 + Math.cos(angle) * w * 0.34, h / 2 + Math.sin(angle) * h * 0.34]);
    });

    nodes = filtered.map((e) => {
      const [ax, ay] = anchor.get(e.portfolio) ?? [w / 2, h / 2];
      return {
        id: e.id,
        title: e.title,
        portfolio: e.portfolio,
        typeOfBody: e.typeOfBody,
        isDept: e.isPortfolioDept,
        isMaterial: e.materiality === 'Material',
        x: e.isPortfolioDept ? ax : ax + (rand() - 0.5) * 120,
        y: e.isPortfolioDept ? ay : ay + (rand() - 0.5) * 120,
        r: e.isPortfolioDept ? 8 : e.materiality === 'Material' ? 6 : 4,
      };
    });

    const byTitle = new Map(filtered.map((e) => [e.title, e]));
    const indexById = new Map(nodes.map((n, i) => [n.id, i]));
    links = [];
    for (const e of filtered) {
      if (!e.parentOrg) continue;
      const parent = byTitle.get(e.parentOrg);
      if (!parent) continue;
      const src = indexById.get(e.id);
      const tgt = indexById.get(parent.id);
      if (src != null && tgt != null) links.push({ source: src, target: tgt });
    }

    statsEl.textContent = `${nodes.length} nodes · ${links.length} edges`;
  }

  function setupSvg(w: number, h: number): void {
    zoom?.destroy();
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

    // Incident-edge lookup for hover highlighting.
    const incident = new Map<number, Link[]>();
    links.forEach((l) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'net-link');
      line.setAttribute('x1', nodes[l.source].x.toFixed(1));
      line.setAttribute('y1', nodes[l.source].y.toFixed(1));
      line.setAttribute('x2', nodes[l.target].x.toFixed(1));
      line.setAttribute('y2', nodes[l.target].y.toFixed(1));
      linkLayer.appendChild(line);
      l.el = line;
      for (const idx of [l.source, l.target]) {
        if (!incident.has(idx)) incident.set(idx, []);
        incident.get(idx)!.push(l);
      }
    });

    nodes.forEach((n, i) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'net-node');
      g.setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
      const tipText = `${n.title} — ${n.portfolio} · ${n.isDept ? 'Department of State' : n.typeOfBody?.replace(/^[A-Z]\.\s*/, '') || 'Body'}`;
      g.setAttribute('data-tip', tipText);
      g.setAttribute('aria-label', tipText);
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', String(n.r));
      c.setAttribute('fill', portfolioColour(n.portfolio));
      c.setAttribute('stroke', n.isDept ? '#c89d4f' : '#fff');
      c.setAttribute('stroke-width', n.isDept ? '2' : '1');
      g.appendChild(c);
      g.addEventListener('click', () => {
        const ent = ctx.entities.find((e) => e.id === n.id);
        if (ent) ctx.open(ent);
      });
      g.addEventListener('mouseenter', () => {
        svg.classList.add('net-focus');
        (incident.get(i) || []).forEach((l) => l.el?.classList.add('hot'));
      });
      g.addEventListener('mouseleave', () => {
        svg.classList.remove('net-focus');
        (incident.get(i) || []).forEach((l) => l.el?.classList.remove('hot'));
      });
      nodeLayer.appendChild(g);
      n.el = g;
    });

    zoom = attachSvgZoom(svg);
  }

  function render(): void {
    const w = host.clientWidth || 1200;
    const h = host.clientHeight || 640;
    buildGraph(w, h);
    // Settle the layout fully BEFORE any DOM exists — the graph never moves on screen.
    forceLayout(nodes, links as SimLink[], { width: w, height: h });
    setupSvg(w, h);
  }

  render();
}
