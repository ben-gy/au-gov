// Portfolio metadata — colours, codes, ordering. Used by every view for
// consistent colour and labelling.

export interface PortfolioMeta {
  name: string;
  code: string;
  colour: string;
  short: string;
  description: string;
}

export const PORTFOLIOS: PortfolioMeta[] = [
  {
    name: 'Prime Minister and Cabinet',
    code: 'PMC',
    colour: '#162353',
    short: 'PM&C',
    description: 'The central agency that supports the Prime Minister and Cabinet, manages whole-of-government coordination, and houses Indigenous policy.',
  },
  {
    name: 'Treasury',
    code: 'TRY',
    colour: '#5b3a98',
    short: 'Treasury',
    description: 'Economic policy, the federal budget, tax, financial system, and competition. Includes ATO, ACCC, APRA, RBA, ABS.',
  },
  {
    name: 'Finance',
    code: 'FIN',
    colour: '#1f6f9d',
    short: 'Finance',
    description: 'Financial framework, public sector governance, procurement, government business enterprises, public service workforce. Includes AEC and DTA.',
  },
  {
    name: 'Foreign Affairs and Trade',
    code: 'DFAT',
    colour: '#a64b2a',
    short: 'DFAT',
    description: 'Foreign policy, diplomatic representation, trade negotiation, development assistance, Antarctic affairs.',
  },
  {
    name: 'Defence',
    code: 'DEF',
    colour: '#3a4a25',
    short: 'Defence',
    description: 'Australian Defence Force, defence capability, intelligence, defence industry, and the nuclear-powered submarine program.',
  },
  {
    name: 'Home Affairs',
    code: 'HA',
    colour: '#2f3b4a',
    short: 'Home Affairs',
    description: 'Border protection, immigration and citizenship, national security, cyber security, emergency management, multicultural affairs.',
  },
  {
    name: "Attorney-General's",
    code: 'AG',
    colour: '#7a1f1f',
    short: 'AG',
    description: 'Justice system, federal courts, family law, native title, integrity bodies, privacy and human rights.',
  },
  {
    name: 'Health, Disability and Ageing',
    code: 'HDA',
    colour: '#1d6b4d',
    short: 'Health',
    description: 'Medicare, PBS, hospital funding, aged care, NDIS, mental health, public health emergencies. Now includes the Australian CDC.',
  },
  {
    name: 'Education',
    code: 'EDU',
    colour: '#1c5f8a',
    short: 'Education',
    description: 'Schools, higher education, vocational education and training, early childhood education, research.',
  },
  {
    name: 'Employment and Workplace Relations',
    code: 'EWR',
    colour: '#b87317',
    short: 'EWR',
    description: 'Labour market, Fair Work system, workplace safety, skills and training programs.',
  },
  {
    name: 'Social Services',
    code: 'SS',
    colour: '#8a5a3d',
    short: 'DSS',
    description: 'Income support, families and welfare, disability policy, gambling regulation, National Disability Insurance Scheme policy lead.',
  },
  {
    name: 'Climate Change, Energy, the Environment and Water',
    code: 'CCEEW',
    colour: '#386b30',
    short: 'CCEEW',
    description: 'Emissions reduction, energy policy, environmental protection, water resources, biodiversity, the Great Barrier Reef.',
  },
  {
    name: 'Industry, Science and Resources',
    code: 'ISR',
    colour: '#6d2e6d',
    short: 'Industry',
    description: 'Manufacturing, science, resources sector, space, geoscience, intellectual property, the National Reconstruction Fund.',
  },
  {
    name: 'Infrastructure, Transport, Regional Development, Communications, Sport & Arts',
    code: 'ITRDCSA',
    colour: '#1b4e6b',
    short: 'Infrastructure',
    description: 'Transport regulation and infrastructure investment, regional grants, communications and broadcasting, sport, arts and culture, territories.',
  },
  {
    name: 'Agriculture, Fisheries and Forestry',
    code: 'AFF',
    colour: '#6b6125',
    short: 'Agriculture',
    description: 'Farm policy, fisheries, forestry, biosecurity, agricultural trade, drought response.',
  },
  {
    name: "Veterans' Affairs (part of the Defence Portfolio)",
    code: 'DVA',
    colour: '#6b3a2d',
    short: 'DVA',
    description: 'Veteran support, military compensation, health and wellbeing services for ex-service personnel and families.',
  },
  {
    name: 'Parliamentary Departments (not a portfolio)',
    code: 'PARL',
    colour: '#444444',
    short: 'Parliament',
    description: 'The four parliamentary departments that serve the Parliament directly: Senate, House of Representatives, Parliamentary Services, and the Parliamentary Budget Office.',
  },
];

export const PORTFOLIO_BY_NAME = new Map(PORTFOLIOS.map((p) => [p.name, p]));

export function portfolioColour(name: string): string {
  return PORTFOLIO_BY_NAME.get(name)?.colour ?? '#777';
}

export function portfolioShort(name: string): string {
  return PORTFOLIO_BY_NAME.get(name)?.short ?? name;
}
