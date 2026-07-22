// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
export interface Entity {
  id: string;
  slug: string;
  title: string;
  portfolio: string;
  portfolioCode: string;
  isPortfolioDept: boolean;
  classification: string | null;
  typeOfBody: string | null;
  gfsSector: string | null;
  materiality: string | null;
  description: string | null;
  establishedBy: string | null;
  establishedInfo: string | null;
  created: string | null;
  function: string | null;
  psAct: string | null;
  auditor: string | null;
  abn: string | null;
  parentOrg: string | null;
  streetAddress: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  website: string | null;
  corporatePlan: string | null;
  annualReports: string | null;
  budgetDocs: string | null;
}

export interface Aggregate {
  totals: {
    entityCount: number;
    portfolioCount: number;
    departmentCount: number;
    materialCount: number;
    smallCount: number;
    materialitySet: number;
    byType: Record<string, number>;
    byState: Record<string, number>;
    byClassification: Record<string, number>;
    byPortfolio: Record<string, number>;
    sourceName: string;
    sourceUrl: string;
    sourceModified: string;
    generatedAt: string;
  };
  portfolios: PortfolioSummary[];
}

export interface PortfolioSummary {
  portfolio: string;
  code: string;
  total: number;
  byType: Record<string, number>;
  byClassification: Record<string, number>;
  byState: Record<string, number>;
  material: number;
  small: number;
}

export type ViewName =
  | 'tree'
  | 'cabinet'
  | 'treemap'
  | 'matrix'
  | 'network'
  | 'map'
  | 'timeline'
  | 'table'
  | 'insights';
