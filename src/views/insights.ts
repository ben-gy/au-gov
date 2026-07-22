// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Entity } from '../types';
import { PORTFOLIOS, portfolioShort } from '../data/portfolios';
import { escapeHtml, formatDate, yearOf } from '../utils/format';
import { glossaryTerm } from '../components/glossaryTip';

interface Ctx {
  entities: Entity[];
  open: (e: Entity) => void;
}

export function renderInsights(root: HTMLElement, ctx: Ctx): void {
  const insights = computeInsights(ctx.entities);

  root.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Insights</h2>
        <p class="sub">Auto-computed observations from the latest ${glossaryTerm('agor', 'AGOR')} snapshot. These are leaderboards and findings rather than navigation — useful for journalists looking for the lead.</p>
      </div>
    </div>
    <div class="insights-grid">
      ${insights.map((card) => `
        <div class="insight-card ${card.tone}" ${card.entity ? `data-id="${escapeHtml(card.entity.id)}" style="cursor:pointer;"` : ''}>
          <div class="label">${card.label}</div>
          ${card.number != null ? `<div class="number">${escapeHtml(card.number)}</div>` : ''}
          ${card.value ? `<div class="value">${escapeHtml(card.value)}</div>` : ''}
          <div class="note">${card.note}</div>
        </div>
      `).join('')}
    </div>

    <h3 style="font-family:var(--font-serif);color:var(--accent-navy);margin-top:2rem;margin-bottom:0.5rem;">Materiality leaderboard</h3>
    <p style="color:var(--text-tertiary);font-size:var(--font-size-sm);margin-bottom:0.75rem;">Portfolios with the most "${glossaryTerm('materiality', 'Material')}" bodies — the agencies the Department of Finance has flagged as financially or operationally significant.</p>
    <div class="card" style="overflow:hidden;padding:0;">
      <table style="width:100%;border-collapse:collapse;font-size:var(--font-size-sm);">
        <thead>
          <tr style="background:var(--bg-elevated);text-align:left;">
            <th style="padding:0.6rem 0.9rem;border-bottom:1px solid var(--border-subtle);">Portfolio</th>
            <th style="padding:0.6rem 0.9rem;border-bottom:1px solid var(--border-subtle);text-align:right;">Material bodies</th>
            <th style="padding:0.6rem 0.9rem;border-bottom:1px solid var(--border-subtle);text-align:right;">Small bodies</th>
            <th style="padding:0.6rem 0.9rem;border-bottom:1px solid var(--border-subtle);text-align:right;">Total bodies</th>
          </tr>
        </thead>
        <tbody>
          ${leaderboard(ctx.entities).map((row, i) => `
            <tr style="border-top:1px solid var(--border-subtle);${i % 2 ? 'background:var(--bg-elevated);' : ''}">
              <td style="padding:0.5rem 0.9rem;color:var(--accent-navy);font-weight:500;">${escapeHtml(row.portfolio)}</td>
              <td style="padding:0.5rem 0.9rem;text-align:right;font-variant-numeric:tabular-nums;"><strong>${row.material}</strong></td>
              <td style="padding:0.5rem 0.9rem;text-align:right;font-variant-numeric:tabular-nums;color:var(--text-tertiary);">${row.small}</td>
              <td style="padding:0.5rem 0.9rem;text-align:right;font-variant-numeric:tabular-nums;color:var(--text-secondary);">${row.total}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  root.querySelectorAll<HTMLDivElement>('.insight-card[data-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const ent = ctx.entities.find((e) => e.id === id);
      if (ent) ctx.open(ent);
    });
  });
}

interface Card {
  label: string;
  value?: string;
  number?: string;
  note: string;
  tone: 'gold' | 'green' | 'amber' | '';
  entity?: Entity;
}

function computeInsights(entities: Entity[]): Card[] {
  const cards: Card[] = [];

  cards.push({
    label: 'Entities in the register',
    number: entities.length.toLocaleString(),
    note: `Across ${new Set(entities.map((e) => e.portfolio)).size} portfolios — ${entities.filter((e) => e.isPortfolioDept).length} are Departments of State.`,
    tone: '',
  });

  const material = entities.filter((e) => e.materiality === 'Material').length;
  cards.push({
    label: 'Material bodies',
    number: material.toLocaleString(),
    note: `Bodies flagged "Material" carry the heaviest financial or operational weight.`,
    tone: 'gold',
  });

  const withYear = entities.filter((e) => yearOf(e.created) != null);
  const oldest = withYear.slice().sort((a, b) => (a.created || '').localeCompare(b.created || ''))[0];
  if (oldest) {
    cards.push({
      label: 'Oldest entity recorded',
      value: oldest.title,
      note: `Established ${formatDate(oldest.created)} under ${oldest.establishedInfo || oldest.establishedBy || '—'}.`,
      tone: 'green',
      entity: oldest,
    });
  }
  const youngest = withYear.slice().sort((a, b) => (b.created || '').localeCompare(a.created || ''))[0];
  if (youngest) {
    cards.push({
      label: 'Most recently created',
      value: youngest.title,
      note: `Stood up ${formatDate(youngest.created)} in the ${youngest.portfolio} portfolio.`,
      tone: 'amber',
      entity: youngest,
    });
  }

  const byPortfolio = new Map<string, number>();
  for (const e of entities) byPortfolio.set(e.portfolio, (byPortfolio.get(e.portfolio) || 0) + 1);
  const largest = [...byPortfolio.entries()].sort((a, b) => b[1] - a[1])[0];
  if (largest) {
    cards.push({
      label: 'Largest portfolio (by entity count)',
      value: largest[0],
      note: `Holds ${largest[1]} entities — many are sub-funds of the Future Fund or Commonwealth investment vehicles.`,
      tone: '',
    });
  }

  const byType = new Map<string, number>();
  for (const e of entities) {
    if (!e.typeOfBody) continue;
    byType.set(e.typeOfBody, (byType.get(e.typeOfBody) || 0) + 1);
  }
  const topType = [...byType.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topType) {
    cards.push({
      label: 'Most common body type',
      value: topType[0].replace(/^[A-Z]\.\s*/, ''),
      note: `${topType[1].toLocaleString()} of the ${entities.length.toLocaleString()} entries fall into this category — about ${Math.round((topType[1] / entities.length) * 100)}% of the register.`,
      tone: '',
    });
  }

  const byState = new Map<string, number>();
  for (const e of entities) {
    if (!e.state) continue;
    byState.set(e.state, (byState.get(e.state) || 0) + 1);
  }
  const sortedStates = [...byState.entries()].sort((a, b) => b[1] - a[1]);
  const actCount = byState.get('ACT') || 0;
  if (sortedStates.length) {
    const withState = entities.filter((e) => e.state).length;
    cards.push({
      label: 'Canberra dominance',
      number: actCount.toLocaleString(),
      note: `Entities with a head office in the ACT — ${Math.round((actCount / Math.max(1, withState)) * 100)}% of those with a recorded state. Next biggest: ${sortedStates.find(([s]) => s !== 'ACT')?.[0] ?? '—'} (${sortedStates.find(([s]) => s !== 'ACT')?.[1] ?? 0}).`,
      tone: '',
    });
  }

  const cutoff = new Date().getFullYear() - 3;
  const recent = entities.filter((e) => {
    const y = yearOf(e.created);
    return y != null && y >= cutoff;
  }).length;
  cards.push({
    label: 'New bodies in last 3 years',
    number: recent.toLocaleString(),
    note: `Entities created since ${cutoff} — the rate of new statutory bodies in the Albanese era.`,
    tone: 'amber',
  });

  const jv = entities.filter((e) => e.typeOfBody?.startsWith('L.')).length;
  cards.push({
    label: 'Joint ventures & interests',
    number: jv.toLocaleString(),
    note: `Commercial vehicles in which the Commonwealth holds equity — Future Fund and corporate Commonwealth entities account for most.`,
    tone: '',
  });

  return cards;
}

function leaderboard(entities: Entity[]) {
  const map = new Map<string, { portfolio: string; material: number; small: number; total: number }>();
  for (const p of PORTFOLIOS) map.set(p.name, { portfolio: portfolioShort(p.name), material: 0, small: 0, total: 0 });
  for (const e of entities) {
    const row = map.get(e.portfolio);
    if (!row) continue;
    row.total++;
    if (e.materiality === 'Material') row.material++;
    if (e.materiality === 'Small') row.small++;
  }
  return [...map.values()].sort((a, b) => b.material - a.material || b.total - a.total);
}
