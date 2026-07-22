// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
export function formatNumber(n: number, decimals = 0): string {
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-AU', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(mo, 10) - 1]} ${y}`;
}

export function yearOf(iso: string | null): number | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

export function decadeOf(iso: string | null): number | null {
  const y = yearOf(iso);
  if (y == null) return null;
  return Math.floor(y / 10) * 10;
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms = 250): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((...args: never[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function shorten(s: string | null | undefined, max = 240): string {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

export function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function compareBy<T>(getter: (t: T) => number | string, asc = true): (a: T, b: T) => number {
  const dir = asc ? 1 : -1;
  return (a, b) => {
    const av = getter(a);
    const bv = getter(b);
    if (av < bv) return -dir;
    if (av > bv) return dir;
    return 0;
  };
}

export function typeCode(typeOfBody: string | null): string {
  if (!typeOfBody) return '?';
  const m = typeOfBody.match(/^([A-Z])\./);
  return m ? m[1] : '?';
}
