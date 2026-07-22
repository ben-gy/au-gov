// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Domain glossary for tooltip popovers.

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  agor: {
    term: 'AGOR',
    definition: 'Australian Government Organisations Register — the official list, maintained by the Department of Finance and published quarterly at directory.gov.au, of all bodies in or connected to the Australian Government.',
  },
  portfolio: {
    term: 'Portfolio',
    definition: 'A grouping of government activity led by a single Cabinet minister and headed by a Department of State. There are 16 portfolios plus the parliamentary departments.',
  },
  'portfolio-dept': {
    term: 'Portfolio Department',
    definition: 'The Department of State at the head of a portfolio — the lead policy department that supports the responsible minister, e.g. the Department of the Treasury.',
  },
  'pgpa-act': {
    term: 'PGPA Act',
    definition: 'The Public Governance, Performance and Accountability Act 2013 — the financial framework that classifies most Commonwealth bodies as either non-corporate entities, corporate entities, or Commonwealth companies.',
  },
  'non-corporate': {
    term: 'Non-corporate Commonwealth entity',
    definition: 'A Commonwealth body that is legally part of the Commonwealth itself, not a separate legal person. Departments and most regulators are non-corporate entities under the PGPA Act.',
  },
  corporate: {
    term: 'Corporate Commonwealth entity',
    definition: 'A body corporate established by Commonwealth legislation, legally separate from the Commonwealth. Examples include the ABC, CSIRO, and the Reserve Bank.',
  },
  'commonwealth-company': {
    term: 'Commonwealth company',
    definition: 'A company incorporated under the Corporations Act in which the Commonwealth has a controlling interest, e.g. Australian Naval Infrastructure Pty Ltd.',
  },
  'statutory-office': {
    term: 'Statutory office holder',
    definition: 'A position established by an Act of Parliament with specific powers and independence — e.g. the Inspector-General of Intelligence and Security or the Commonwealth Ombudsman.',
  },
  'advisory-structure': {
    term: 'Advisory structure',
    definition: 'A board, committee, council, or panel that gives advice to a minister or department but does not deliver programs directly. Can be statutory (created by legislation) or non-statutory (created administratively).',
  },
  materiality: {
    term: 'Materiality',
    definition: 'A Department of Finance flag for the most significant bodies in AGOR. "Material" entities have the largest financial or staffing footprint; "Small" entities are tracked but minor; many are unflagged.',
  },
  'gfs-sector': {
    term: 'GFS sector',
    definition: 'Government Finance Statistics sector classification used by the ABS. GGS = General Government Sector; PNFC = Public Non-Financial Corporation; PFC = Public Financial Corporation.',
  },
  'ps-act': {
    term: 'PS Act',
    definition: 'The Public Service Act 1999 — the law that governs the Australian Public Service. A "PS Act body" employs APS-grade public servants under this Act.',
  },
  anao: {
    term: 'ANAO',
    definition: 'Australian National Audit Office — the independent national auditor that audits the financial statements of Commonwealth entities and reports to Parliament.',
  },
  abn: {
    term: 'ABN',
    definition: 'Australian Business Number — an 11-digit identifier issued by the Australian Business Register, used by every government body that transacts with suppliers, employees, or the tax system.',
  },
  'joint-venture': {
    term: 'Joint venture',
    definition: 'A commercial arrangement in which the Commonwealth participates with one or more partners, typically through a corporate entity in which it holds equity.',
  },
  'parent-organisation': {
    term: 'Parent organisation',
    definition: 'The body that controls, hosts, or appoints the leadership of another entity. A subsidiary of a Commonwealth company, or a committee whose secretariat sits inside a department, will have a parent recorded.',
  },
  'ministerial-council': {
    term: 'Ministerial council',
    definition: 'A council bringing together ministers from the Commonwealth, states, and territories to coordinate national policy in a specific area, e.g. health, energy, transport.',
  },
};

export function lookupGlossary(key: string): GlossaryEntry | undefined {
  return GLOSSARY[key];
}
