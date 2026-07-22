// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Second Albanese ministry — sworn in 13 May 2025.
// Source: PM&C ministry list (13 May 2025), Second Albanese ministry (Wikipedia).
// Curated by hand; refresh on reshuffle.

export interface Minister {
  name: string;
  title: string;
  portfolio: string;
  cabinet: boolean;
  notes?: string;
}

export const MINISTERS: Minister[] = [
  { name: 'Anthony Albanese', title: 'Prime Minister', portfolio: 'Prime Minister and Cabinet', cabinet: true },
  { name: 'Richard Marles', title: 'Deputy Prime Minister & Minister for Defence', portfolio: 'Defence', cabinet: true },
  { name: 'Penny Wong', title: 'Minister for Foreign Affairs', portfolio: 'Foreign Affairs and Trade', cabinet: true },
  { name: 'Jim Chalmers', title: 'Treasurer', portfolio: 'Treasury', cabinet: true },
  { name: 'Katy Gallagher', title: 'Minister for Finance, the Public Service & Women', portfolio: 'Finance', cabinet: true },
  { name: 'Don Farrell', title: 'Minister for Trade & Tourism, Special Minister of State', portfolio: 'Foreign Affairs and Trade', cabinet: true },
  { name: 'Tony Burke', title: 'Minister for Home Affairs, Immigration & Cyber Security', portfolio: 'Home Affairs', cabinet: true },
  { name: 'Mark Butler', title: 'Minister for Health & Ageing, NDIS', portfolio: 'Health, Disability and Ageing', cabinet: true },
  { name: 'Chris Bowen', title: 'Minister for Climate Change & Energy', portfolio: 'Climate Change, Energy, the Environment and Water', cabinet: true },
  { name: 'Catherine King', title: 'Minister for Infrastructure, Transport, Regional Development & Local Government', portfolio: 'Infrastructure, Transport, Regional Development, Communications, Sport & Arts', cabinet: true },
  { name: 'Amanda Rishworth', title: 'Minister for Employment & Workplace Relations', portfolio: 'Employment and Workplace Relations', cabinet: true },
  { name: 'Jason Clare', title: 'Minister for Education', portfolio: 'Education', cabinet: true },
  { name: 'Michelle Rowland', title: 'Attorney-General', portfolio: "Attorney-General's", cabinet: true },
  { name: 'Tanya Plibersek', title: 'Minister for Social Services', portfolio: 'Social Services', cabinet: true },
  { name: 'Julie Collins', title: 'Minister for Agriculture, Fisheries & Forestry, Small Business', portfolio: 'Agriculture, Fisheries and Forestry', cabinet: true },
  { name: "Clare O'Neil", title: 'Minister for Housing, Homelessness & Cities', portfolio: 'Infrastructure, Transport, Regional Development, Communications, Sport & Arts', cabinet: true },
  { name: 'Murray Watt', title: 'Minister for the Environment & Water', portfolio: 'Climate Change, Energy, the Environment and Water', cabinet: true },
  { name: 'Madeleine King', title: 'Minister for Resources & Northern Australia', portfolio: 'Industry, Science and Resources', cabinet: true },
  { name: 'Tim Ayres', title: 'Minister for Industry & Innovation, Science', portfolio: 'Industry, Science and Resources', cabinet: true },
  { name: 'Malarndirri McCarthy', title: 'Minister for Indigenous Australians', portfolio: 'Prime Minister and Cabinet', cabinet: true },
  { name: 'Anika Wells', title: 'Minister for Communications, Sport', portfolio: 'Infrastructure, Transport, Regional Development, Communications, Sport & Arts', cabinet: true },
  { name: 'Pat Conroy', title: 'Minister for Defence Industry & Capability Delivery, Pacific Island Affairs', portfolio: 'Defence', cabinet: false },
  { name: 'Matt Keogh', title: "Minister for Veterans' Affairs, Defence Personnel", portfolio: "Veterans' Affairs (part of the Defence Portfolio)", cabinet: false },
  { name: 'Andrew Giles', title: 'Minister for Skills & Training', portfolio: 'Employment and Workplace Relations', cabinet: false },
  { name: 'Anne Aly', title: 'Minister for Multicultural Affairs, Small Business support, International Education, Youth', portfolio: 'Home Affairs', cabinet: false },
  { name: 'Kristy McBain', title: 'Minister for Regional Development, Local Government & Territories', portfolio: 'Infrastructure, Transport, Regional Development, Communications, Sport & Arts', cabinet: false },
  { name: 'Andrew Charlton', title: 'Cabinet Secretary, Assistant Minister for Science, Technology & the Digital Economy', portfolio: 'Prime Minister and Cabinet', cabinet: false },
  { name: 'Sam Rae', title: 'Minister for Aged Care, Seniors', portfolio: 'Health, Disability and Ageing', cabinet: false },
  { name: 'Daniel Mulino', title: 'Assistant Treasurer, Minister for Financial Services', portfolio: 'Treasury', cabinet: false },
  { name: 'Andrew Leigh', title: 'Assistant Minister for Productivity, Competition, Charities, Treasury', portfolio: 'Treasury', cabinet: false },
  { name: 'Jenny McAllister', title: 'Minister for Emergency Management, Cities', portfolio: 'Home Affairs', cabinet: false },
];
