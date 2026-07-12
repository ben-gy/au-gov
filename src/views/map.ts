import L from 'leaflet';
import type { Entity } from '../types';
import { PORTFOLIOS, portfolioColour } from '../data/portfolios';
import { escapeHtml } from '../utils/format';
import { locate } from '../utils/locations';

interface Ctx {
  entities: Entity[];
  open: (e: Entity) => void;
}

interface FeatureCollection {
  type: string;
  features: Array<{ type: string; properties: { code: string; name: string }; geometry: unknown }>;
}

export async function renderMap(root: HTMLElement, ctx: Ctx): Promise<void> {
  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Geographic distribution</h2>
        <p class="sub">Head office location of every entity for which the AGOR records a suburb, plotted across the eight states and territories. Click a marker for the underlying entities.</p>
      </div>
      <div>
        <label style="font-size:var(--font-size-sm);">Portfolio filter:
          <select id="map-portfolio" style="margin-left:6px;padding:0.35rem 0.5rem;border:1px solid var(--border-default);border-radius:4px;font-size:var(--font-size-sm);">
            <option value="">All portfolios</option>
            ${PORTFOLIOS.map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>
    <div id="map-canvas"></div>
    <div class="map-legend">
      <span><span class="swatch" style="background:#162353;"></span>Capital cluster</span>
      <span><span class="swatch" style="background:#c89d4f;"></span>Other location</span>
      <span style="margin-left:auto;color:var(--text-tertiary);">Marker size reflects entities at the same location.</span>
    </div>
  `;

  const portfolioSelect = root.querySelector<HTMLSelectElement>('#map-portfolio')!;
  const canvas = root.querySelector<HTMLDivElement>('#map-canvas')!;

  const map = L.map(canvas, {
    minZoom: 3,
    maxZoom: 9,
    scrollWheelZoom: true,
    zoomControl: true,
  });
  map.attributionControl.setPrefix(false);
  map.getContainer().style.background = '#eef2f7';

  const AUS_BOUNDS = L.latLngBounds([-44, 112], [-10, 154]);
  map.fitBounds(AUS_BOUNDS, { padding: [8, 8] });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: 'Tiles © CARTO',
    subdomains: 'abcd',
    maxZoom: 9,
    minZoom: 3,
  }).addTo(map);

  // Entities per state for the boundary hover tooltips.
  const stateCounts = new Map<string, number>();
  for (const e of ctx.entities) {
    if (e.state) stateCounts.set(e.state, (stateCounts.get(e.state) || 0) + 1);
  }

  const gjRes = await fetch('data/au-states.geojson');
  const gj = (await gjRes.json()) as FeatureCollection;
  const stateLayer = L.geoJSON(gj as unknown as GeoJSON.GeoJsonObject, {
    attribution: 'Boundaries: ABS ASGS (CC BY 4.0)',
    style: () => ({
      color: '#162353',
      weight: 1.2,
      fillColor: '#fbfaf6',
      fillOpacity: 0.35,
    }),
    onEachFeature: (f, lyr) => {
      const props = (f as FeatureCollection['features'][number]).properties;
      const n = stateCounts.get(props.code) || 0;
      lyr.bindTooltip(
        `<strong>${escapeHtml(props.name)}</strong><br>${n.toLocaleString()} ${n === 1 ? 'entity' : 'entities'} headquartered here`,
        { sticky: true },
      );
      lyr.on({
        mouseover: () => (lyr as L.Path).setStyle({ weight: 2.5 }),
        mouseout: () => stateLayer.resetStyle(lyr as L.Path),
      });
    },
  }).addTo(map);

  // Settle defence: Leaflet mis-sizes when created in a container that hasn't
  // finished layout — re-measure once the DOM settles.
  const settle = () => {
    map.invalidateSize(false);
    map.fitBounds(AUS_BOUNDS, { padding: [8, 8] });
  };
  requestAnimationFrame(settle);
  setTimeout(settle, 300);

  const markerLayer = L.layerGroup().addTo(map);

  function refresh() {
    markerLayer.clearLayers();
    const filter = portfolioSelect.value;
    const filtered = filter ? ctx.entities.filter((e) => e.portfolio === filter) : ctx.entities;

    const clusters = new Map<string, { lat: number; lon: number; suburb: string; state: string; items: Entity[] }>();
    for (const e of filtered) {
      const coords = locate(e.suburb, e.state);
      if (!coords) continue;
      const key = `${e.suburb || ''}|${e.state || ''}`;
      if (!clusters.has(key)) {
        clusters.set(key, {
          lat: coords[0],
          lon: coords[1],
          suburb: e.suburb || '',
          state: e.state || '',
          items: [],
        });
      }
      clusters.get(key)!.items.push(e);
    }

    [...clusters.values()].forEach((c) => {
      const r = Math.max(5, Math.min(28, 4 + Math.sqrt(c.items.length) * 4));
      const colour = c.items.length > 25 ? '#162353' : c.items.length > 6 ? '#1f3061' : '#c89d4f';
      const marker = L.circleMarker([c.lat, c.lon], {
        radius: r,
        color: '#fff',
        weight: 1,
        fillColor: colour,
        fillOpacity: 0.85,
      });
      const portfolioBreakdown = topPortfolios(c.items);
      const popupHtml = `
        <strong style="font-family:var(--font-serif);color:#162353;">${escapeHtml(c.suburb || c.state)}, ${escapeHtml(c.state)}</strong>
        <div style="margin-top:4px;font-size:11px;color:#555;">${c.items.length} ${c.items.length === 1 ? 'entity' : 'entities'}</div>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:2px;max-height:240px;overflow:auto;">
          ${portfolioBreakdown.map(([p, n]) => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${portfolioColour(p)};margin-right:4px;"></span>${escapeHtml(p)}</span><span style="color:#777;">${n}</span></div>`).join('')}
        </div>
        ${c.items.length <= 8 ? `<div style="margin-top:6px;border-top:1px solid #eee;padding-top:6px;display:flex;flex-direction:column;gap:2px;">${c.items.map((e) => `<a href="#id=${escapeHtml(e.id)}" class="popup-entity" data-id="${escapeHtml(e.id)}" style="font-size:11px;color:#162353;">${escapeHtml(e.title)}</a>`).join('')}</div>` : ''}
      `;
      marker.bindPopup(popupHtml);
      marker.bindTooltip(
        `${escapeHtml(c.suburb || c.state)}, ${escapeHtml(c.state)} — ${c.items.length} ${c.items.length === 1 ? 'entity' : 'entities'}`,
        { direction: 'top', opacity: 0.95 },
      );
      marker.on('mouseover', () => marker.setStyle({ weight: 2.5 }));
      marker.on('mouseout', () => marker.setStyle({ weight: 1 }));
      marker.on('popupopen', () => {
        document.querySelectorAll<HTMLAnchorElement>('.popup-entity').forEach((a) => {
          a.addEventListener('click', (ev) => {
            ev.preventDefault();
            const id = a.dataset.id;
            const ent = ctx.entities.find((e) => e.id === id);
            if (ent) ctx.open(ent);
          });
        });
      });
      marker.addTo(markerLayer);
    });
  }

  portfolioSelect.addEventListener('change', refresh);
  refresh();
}

function topPortfolios(items: Entity[]): [string, number][] {
  const c = new Map<string, number>();
  for (const e of items) c.set(e.portfolio, (c.get(e.portfolio) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
}
