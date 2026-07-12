import { GLOSSARY } from '../data/glossary';
import { escapeHtml } from '../utils/format';

let tipEl: HTMLDivElement | null = null;

function ensureTip(): HTMLDivElement {
  if (tipEl) return tipEl;
  tipEl = document.createElement('div');
  tipEl.className = 'glossary-tooltip';
  tipEl.setAttribute('role', 'tooltip');
  document.body.appendChild(tipEl);
  return tipEl;
}

export function installGlossary(): void {
  document.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const link = target.closest<HTMLElement>('.glossary-link');
    if (link) {
      const key = link.dataset.term;
      if (!key) return;
      const entry = GLOSSARY[key];
      if (!entry) return;
      const tip = ensureTip();
      tip.innerHTML = `<strong>${escapeHtml(entry.term)}</strong>${escapeHtml(entry.definition)}`;
      const rect = link.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 340, rect.left);
      const y = rect.bottom + 6;
      tip.style.left = `${Math.max(8, x)}px`;
      tip.style.top = `${y}px`;
      tip.classList.add('show');
      ev.stopPropagation();
      return;
    }
    if (tipEl) tipEl.classList.remove('show');
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && tipEl) tipEl.classList.remove('show');
  });

  window.addEventListener('scroll', () => {
    if (tipEl) tipEl.classList.remove('show');
  }, true);
}

export function glossaryTerm(key: string, text?: string): string {
  const entry = GLOSSARY[key];
  if (!entry) return escapeHtml(text || key);
  return `<span class="glossary-link" data-term="${escapeHtml(key)}" tabindex="0">${escapeHtml(text || entry.term)}</span>`;
}
