// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Entity } from '../types';
import { PORTFOLIOS, portfolioColour } from '../data/portfolios';
import { escapeHtml } from '../utils/format';
import { forceLayout, mulberry32, type SimLink } from '../utils/forceLayout';
import { radialLayout, type RadialNode } from '../utils/radialLayout';
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
  band: 0 | 1 | 2;
  parentIdx: number;
  childIdx: number[];
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

type Mode = 'radial' | 'clusters';

const NS = 'http://www.w3.org/2000/svg';

export function renderNetwork(root: HTMLElement, ctx: Ctx): void {
  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Relationship graph</h2>
        <p class="sub">Each portfolio radiates from its Department of State (gold ring); bodies hang off their parent organisation. Filter to one portfolio to read its structure clearly. Hover for detail · Click to select a body and its tree · Scroll to zoom · Drag to pan.</p>
      </div>
    </div>
    <div class="network-wrap">
      <div class="network-controls">
        <div class="seg" role="tablist" aria-label="Layout mode">
          <button type="button" class="seg-btn active" data-mode="radial" role="tab">Radial</button>
          <button type="button" class="seg-btn" data-mode="clusters" role="tab">Clusters</button>
        </div>
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
        <span style="font-size:var(--font-size-xs);color:var(--accent-gold-strong,#9a7420);margin-left:auto;" id="net-tip">Tip: pick a single portfolio to read its hierarchy clearly.</span>
      </div>
      <div class="network-svg-wrap" id="net-host">
        <div class="net-legend">
          <span><span class="net-lg-dot dept"></span>Department of State</span>
          <span><span class="net-lg-dot material"></span>Material body</span>
          <span><span class="net-lg-dot other"></span>Other body</span>
          <span class="net-lg-note">Colour = portfolio</span>
        </div>
      </div>
    </div>
  `;

  const host = root.querySelector<HTMLDivElement>('#net-host')!;
  const portfolioSelect = root.querySelector<HTMLSelectElement>('#net-portfolio')!;
  const materialCheckbox = root.querySelector<HTMLInputElement>('#net-material')!;
  const statsEl = root.querySelector<HTMLSpanElement>('#net-stats')!;
  const segBtns = [...root.querySelectorAll<HTMLButtonElement>('.seg-btn')];

  let mode: Mode = 'radial';
  let nodes: Node[] = [];
  let links: Link[] = [];
  let zoom: SvgZoomHandle | null = null;
  let selected = -1;
  let labelLayerRef: SVGGElement | null = null;

  portfolioSelect.addEventListener('change', () => render());
  materialCheckbox.addEventListener('change', () => render());
  segBtns.forEach((b) =>
    b.addEventListener('click', () => {
      const m = b.dataset.mode as Mode;
      if (m === mode) return;
      mode = m;
      segBtns.forEach((x) => x.classList.toggle('active', x === b));
      render();
    }),
  );

  function buildGraph(): { portfoliosPresent: string[]; single: string | null } {
    const portfolio = portfolioSelect.value;
    const materialOnly = materialCheckbox.checked;
    const filtered = ctx.entities.filter(
      (e) =>
        (!portfolio || e.portfolio === portfolio) &&
        (!materialOnly || e.materiality === 'Material' || e.isPortfolioDept),
    );

    const byTitle = new Map(filtered.map((e) => [e.title, e]));
    const indexById = new Map<string, number>();
    filtered.forEach((e, i) => indexById.set(e.id, i));

    nodes = filtered.map((e) => ({
      id: e.id,
      title: e.title,
      portfolio: e.portfolio,
      typeOfBody: e.typeOfBody,
      isDept: e.isPortfolioDept,
      isMaterial: e.materiality === 'Material',
      band: 2 as 0 | 1 | 2,
      parentIdx: -1,
      childIdx: [],
      x: 0,
      y: 0,
      r: e.isPortfolioDept ? 9 : e.materiality === 'Material' ? 6 : 4,
    }));

    // Resolve parent links and hierarchy bands.
    links = [];
    filtered.forEach((e, i) => {
      if (!e.parentOrg) return;
      const parent = byTitle.get(e.parentOrg);
      if (!parent) return;
      const pIdx = indexById.get(parent.id);
      if (pIdx == null || pIdx === i) return;
      nodes[i].parentIdx = pIdx;
      nodes[pIdx].childIdx.push(i);
      links.push({ source: pIdx, target: i });
    });
    nodes.forEach((n) => {
      n.band = n.isDept ? 0 : n.parentIdx >= 0 ? 1 : 2;
    });

    statsEl.textContent = `${nodes.length} nodes · ${links.length} edges`;

    const present = PORTFOLIOS.map((p) => p.name).filter((name) => nodes.some((n) => n.portfolio === name));
    return { portfoliosPresent: present, single: portfolio || null };
  }

  function layout(w: number, h: number, portfoliosPresent: string[], single: string | null): void {
    if (mode === 'radial') {
      const counts: Record<string, number> = {};
      for (const n of nodes) counts[n.portfolio] = (counts[n.portfolio] || 0) + 1;
      const radialNodes: RadialNode[] = nodes.map((n) => ({ portfolio: n.portfolio, band: n.band, r: n.r }));
      const res = radialLayout(radialNodes, { width: w, height: h, portfolios: portfoliosPresent, counts, singlePortfolio: single });
      nodes.forEach((n, i) => {
        n.x = res.positions[i].x;
        n.y = res.positions[i].y;
      });
    } else {
      // Clusters: settled force layout, seeded per-portfolio for fast convergence.
      const rand = mulberry32(42);
      const anchor = new Map<string, [number, number]>();
      portfoliosPresent.forEach((p, i) => {
        const a = (2 * Math.PI * i) / Math.max(1, portfoliosPresent.length) - Math.PI / 2;
        anchor.set(p, [w / 2 + Math.cos(a) * w * 0.34, h / 2 + Math.sin(a) * h * 0.34]);
      });
      nodes.forEach((n) => {
        const [ax, ay] = anchor.get(n.portfolio) ?? [w / 2, h / 2];
        n.x = n.isDept ? ax : ax + (rand() - 0.5) * 120;
        n.y = n.isDept ? ay : ay + (rand() - 0.5) * 120;
      });
      forceLayout(nodes, links as SimLink[], { width: w, height: h, clamp: false });
    }
  }

  function ancestorsAndSelf(idx: number): Set<number> {
    const set = new Set<number>();
    let cur = idx;
    let guard = 0;
    while (cur >= 0 && !set.has(cur) && guard++ < 100) {
      set.add(cur);
      cur = nodes[cur].parentIdx;
    }
    return set;
  }
  function descendants(idx: number, into: Set<number>): void {
    for (const c of nodes[idx].childIdx) {
      if (into.has(c)) continue;
      into.add(c);
      descendants(c, into);
    }
  }
  function subtreeOf(idx: number): Set<number> {
    const set = ancestorsAndSelf(idx);
    descendants(idx, set);
    return set;
  }

  function clearSelection(svg: SVGSVGElement): void {
    selected = -1;
    svg.classList.remove('net-select-active');
    svg.querySelectorAll('.in-sel').forEach((el) => el.classList.remove('in-sel'));
    labelLayerRef?.querySelectorAll('.sel-label').forEach((el) => el.remove());
  }

  function select(svg: SVGSVGElement, idx: number): void {
    clearSelection(svg);
    selected = idx;
    svg.classList.add('net-select-active');
    const set = subtreeOf(idx);
    set.forEach((i) => {
      nodes[i].el?.classList.add('in-sel');
      // On-demand label for each node in the selected tree (skip depts — they
      // already have a permanent label).
      const n = nodes[i];
      if (!n.isDept && labelLayerRef) {
        const label = document.createElementNS(NS, 'text');
        label.setAttribute('class', 'net-label sel-label');
        label.setAttribute('x', n.x.toFixed(1));
        label.setAttribute('y', (n.y - n.r - 4).toFixed(1));
        label.setAttribute('text-anchor', 'middle');
        label.textContent = n.title.length > 30 ? n.title.slice(0, 28) + '…' : n.title;
        labelLayerRef.appendChild(label);
      }
    });
    links.forEach((l) => {
      if (set.has(l.source) && set.has(l.target)) l.el?.classList.add('in-sel');
    });
    const ent = ctx.entities.find((e) => e.id === nodes[idx].id);
    if (ent) ctx.open(ent);
  }

  function render(): void {
    zoom?.destroy();
    // Fixed logical canvas — display scaling is handled by the fitted viewBox,
    // so layout no longer depends on the live (and mid-transition unreliable)
    // container size.
    const w = 1200;
    const h = 760;
    const { portfoliosPresent, single } = buildGraph();
    layout(w, h, portfoliosPresent, single);

    // Fit viewBox to the settled node extent (+ label padding).
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.r);
      minY = Math.min(minY, n.y - n.r);
      maxX = Math.max(maxX, n.x + n.r);
      maxY = Math.max(maxY, n.y + n.r);
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = w; maxY = h; }
    const pad = 40;
    const vbX = minX - pad, vbY = minY - pad;
    const vbW = Math.max(1, maxX - minX + pad * 2), vbH = Math.max(1, maxY - minY + pad * 2);

    host.querySelector('svg')?.remove();
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    svg.style.width = '100%';
    svg.style.height = '100%';
    host.appendChild(svg);

    const linkLayer = document.createElementNS(NS, 'g');
    const nodeLayer = document.createElementNS(NS, 'g');
    const labelLayer = document.createElementNS(NS, 'g');
    labelLayer.setAttribute('class', 'net-labels');
    svg.appendChild(linkLayer);
    svg.appendChild(nodeLayer);
    svg.appendChild(labelLayer);

    const incident = new Map<number, Link[]>();
    links.forEach((l) => {
      const line = document.createElementNS(NS, 'line');
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

    const cx = w / 2;
    const cy = h / 2;
    // Label rule: department hubs are always labelled (fanned radially so they
    // don't pile up near the centre). Everything else is labelled on demand
    // when its subtree is selected — keeps a 1,381-node canvas readable.
    const placeDeptLabel = (n: Node): SVGTextElement => {
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('class', 'net-label dept');
      const text = n.title.replace(/^Department of (the )?/, '');
      label.textContent = text.length > 26 ? text.slice(0, 24) + '…' : text;
      if (mode === 'radial' && !single) {
        const ang = Math.atan2(n.y - cy, n.x - cx);
        const ux = Math.cos(ang), uy = Math.sin(ang);
        label.setAttribute('x', (n.x + ux * (n.r + 6)).toFixed(1));
        label.setAttribute('y', (n.y + uy * (n.r + 6) + 3).toFixed(1));
        label.setAttribute('text-anchor', ux >= 0 ? 'start' : 'end');
      } else {
        label.setAttribute('x', n.x.toFixed(1));
        label.setAttribute('y', (n.y - n.r - 4).toFixed(1));
        label.setAttribute('text-anchor', 'middle');
      }
      return label;
    };

    nodes.forEach((n, i) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', `net-node${n.isDept ? ' dept' : ''}`);
      g.setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
      const tipText = `${n.title} — ${n.portfolio} · ${n.isDept ? 'Department of State' : n.typeOfBody?.replace(/^[A-Z]\.\s*/, '') || 'Body'}`;
      g.setAttribute('data-tip', tipText);
      g.setAttribute('aria-label', tipText);
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', String(n.r));
      c.setAttribute('fill', portfolioColour(n.portfolio));
      c.setAttribute('stroke', n.isDept ? '#c89d4f' : '#fff');
      c.setAttribute('stroke-width', n.isDept ? '2.5' : '1');
      g.appendChild(c);
      g.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (selected === i) { clearSelection(svg); return; }
        select(svg, i);
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

      if (n.isDept) labelLayer.appendChild(placeDeptLabel(n));
    });

    // Click on empty canvas clears the selection.
    svg.addEventListener('click', () => clearSelection(svg));

    // Expose the label layer so selection can add on-demand labels.
    labelLayerRef = labelLayer;

    zoom = attachSvgZoom(svg);
  }

  // Clear selection on Escape (panel Escape-close is separate).
  root.addEventListener('keydown', (ev) => {
    if ((ev as KeyboardEvent).key === 'Escape') {
      const svg = host.querySelector('svg');
      if (svg) clearSelection(svg);
    }
  });

  render();
}
