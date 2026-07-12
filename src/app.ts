import type { Aggregate, Entity, ViewName } from './types';
import { DetailPanel } from './components/detailPanel';
import { AboutModal } from './components/aboutModal';
import { installGlossary } from './components/glossaryTip';
import { initTooltip } from './components/tooltip';
import { renderTree } from './views/tree';
import { renderCabinet } from './views/cabinet';
import { renderTreemap } from './views/treemap';
import { renderMatrix } from './views/matrix';
import { renderNetwork } from './views/network';
import { renderMap } from './views/map';
import { renderTimeline } from './views/timeline';
import { renderTable, type TablePreset } from './views/table';
import { renderInsights } from './views/insights';

const TABS: Array<{ id: ViewName; label: string }> = [
  { id: 'tree', label: 'Tree' },
  { id: 'cabinet', label: 'Cabinet' },
  { id: 'treemap', label: 'Treemap' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'network', label: 'Network' },
  { id: 'map', label: 'Map' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'table', label: 'Table' },
  { id: 'insights', label: 'Insights' },
];

export class App {
  private entities: Entity[] = [];
  private byPortfolio = new Map<string, Entity[]>();
  private currentView: ViewName = 'tree';
  private tablePreset: TablePreset | undefined;
  private viewRoot: HTMLDivElement;
  private tabsBar: HTMLElement;
  private aboutModal: AboutModal;
  private detail: DetailPanel;

  constructor(private host: HTMLElement) {
    this.host.innerHTML = '';

    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      <div class="brand">
        <svg class="crest" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="none" stroke="#c89d4f" stroke-width="2.5"/>
          <g stroke="#c89d4f" stroke-width="2" stroke-linecap="round">
            <line x1="32" y1="6" x2="32" y2="18"/>
            <line x1="58" y1="32" x2="46" y2="32"/>
            <line x1="32" y1="58" x2="32" y2="46"/>
            <line x1="6" y1="32" x2="18" y2="32"/>
            <line x1="50.5" y1="13.5" x2="42" y2="22"/>
            <line x1="50.5" y1="50.5" x2="42" y2="42"/>
            <line x1="13.5" y1="50.5" x2="22" y2="42"/>
            <line x1="13.5" y1="13.5" x2="22" y2="22"/>
          </g>
          <circle cx="32" cy="32" r="6" fill="#c89d4f"/>
        </svg>
        <div>
          <h1>Machinery of Government (AU)</h1>
          <div class="tagline">Departments · Agencies · Statutory bodies · Public entities</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn" id="about-btn" type="button" aria-label="About this site">About &amp; help</button>
      </div>
    `;
    this.host.appendChild(header);

    this.tabsBar = document.createElement('nav');
    this.tabsBar.className = 'tabs-bar';
    this.tabsBar.setAttribute('aria-label', 'Views');
    this.host.appendChild(this.tabsBar);

    const main = document.createElement('main');
    main.className = 'main-content';
    this.host.appendChild(main);

    this.viewRoot = document.createElement('div');
    this.viewRoot.id = 'view-root';
    this.viewRoot.innerHTML = `<div class="loading">Loading the Australian Government…</div>`;
    main.appendChild(this.viewRoot);

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="inner">
        <div>
          <div style="font-family:var(--font-serif);font-weight:600;color:var(--accent-gold-soft);">Machinery of Government (AU)</div>
          <div class="meta" id="footer-meta">Loading data source…</div>
        </div>
        <div style="text-align:center;">
          <div class="meta">Sources: Department of Finance · directory.gov.au · PM&amp;C ministry list</div>
        </div>
        <div class="attribution">Built by <a href="https://benrichardson.dev/">benrichardson.dev</a> · <a href="https://sites.benrichardson.dev" target="_blank" rel="noopener">more tools &amp; sites</a></div>
      </div>
    `;
    this.host.appendChild(footer);

    this.aboutModal = new AboutModal(this.host);
    this.detail = new DetailPanel(this.host, { byPortfolio: this.byPortfolio }, (e) => {
      this.detail.open(e, this.entities);
    });

    header.querySelector<HTMLButtonElement>('#about-btn')!.addEventListener('click', () => {
      this.aboutModal.open();
    });

    installGlossary();
    initTooltip();

    window.addEventListener('au-gov-filter-table', (ev) => {
      const detail = (ev as CustomEvent).detail || {};
      this.tablePreset = detail;
      this.go('table');
    });
  }

  async start(): Promise<void> {
    const [entRes, aggRes] = await Promise.all([
      fetch('data/entities.json'),
      fetch('data/aggregate.json'),
    ]);
    if (!entRes.ok) throw new Error(`entities.json ${entRes.status}`);
    if (!aggRes.ok) throw new Error(`aggregate.json ${aggRes.status}`);
    this.entities = await entRes.json();
    const aggregate: Aggregate = await aggRes.json();

    this.byPortfolio.clear();
    for (const e of this.entities) {
      if (!this.byPortfolio.has(e.portfolio)) this.byPortfolio.set(e.portfolio, []);
      this.byPortfolio.get(e.portfolio)!.push(e);
    }

    this.aboutModal.setSource({
      name: aggregate.totals.sourceName,
      url: aggregate.totals.sourceUrl,
      modified: aggregate.totals.sourceModified,
      generatedAt: aggregate.totals.generatedAt,
    });

    const footerMeta = document.querySelector<HTMLDivElement>('#footer-meta');
    if (footerMeta) {
      footerMeta.textContent = `Snapshot: ${aggregate.totals.sourceName} · ${this.entities.length.toLocaleString()} entities`;
    }

    this.buildTabs();

    const hashView = location.hash.match(/^#view=([a-z]+)/)?.[1] as ViewName | undefined;
    const savedView = (localStorage.getItem('au-gov:view') as ViewName | null) || 'tree';
    const initial = hashView && TABS.some((t) => t.id === hashView) ? hashView : savedView;
    this.go(initial);

    const idHash = location.hash.match(/^#id=(.+)/)?.[1];
    if (idHash) {
      const target = this.entities.find((e) => e.id === decodeURIComponent(idHash));
      if (target) this.detail.open(target, this.entities);
    }
  }

  private buildTabs(): void {
    this.tabsBar.innerHTML = '';
    TABS.forEach((tab) => {
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.type = 'button';
      btn.dataset.view = tab.id;
      btn.textContent = tab.label;
      btn.addEventListener('click', () => this.go(tab.id));
      this.tabsBar.appendChild(btn);
    });
  }

  private go(view: ViewName): void {
    if (this.currentView !== view) this.tablePreset = undefined;
    this.currentView = view;
    localStorage.setItem('au-gov:view', view);
    if (location.hash.startsWith('#view=') || !location.hash) {
      history.replaceState(null, '', `#view=${view}`);
    }
    this.tabsBar.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === view);
    });

    const ctx = {
      entities: this.entities,
      open: (e: Entity) => this.detail.open(e, this.entities),
    };
    this.viewRoot.innerHTML = '';

    switch (view) {
      case 'tree': renderTree(this.viewRoot, ctx); break;
      case 'cabinet': renderCabinet(this.viewRoot, ctx); break;
      case 'treemap': renderTreemap(this.viewRoot, ctx); break;
      case 'matrix': renderMatrix(this.viewRoot, ctx); break;
      case 'network': renderNetwork(this.viewRoot, ctx); break;
      case 'map':
        this.viewRoot.innerHTML = `<div class="loading">Loading map…</div>`;
        renderMap(this.viewRoot, ctx).catch((err) => {
          this.viewRoot.innerHTML = `<div class="card">Map failed to load: ${err}</div>`;
        });
        break;
      case 'timeline': renderTimeline(this.viewRoot, ctx); break;
      case 'table': renderTable(this.viewRoot, { ...ctx, preset: this.tablePreset }); break;
      case 'insights': renderInsights(this.viewRoot, ctx); break;
    }
  }
}
