// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Approximate lat/lon for suburbs common in AGOR. Used by the map view.

export const SUBURB_COORDS: Record<string, [number, number]> = {
  CANBERRA: [-35.282, 149.128],
  Canberra: [-35.282, 149.128],
  Barton: [-35.305, 149.137],
  Parkes: [-35.298, 149.121],
  Forrest: [-35.317, 149.133],
  Phillip: [-35.349, 149.092],
  Symonston: [-35.378, 149.108],
  Deakin: [-35.319, 149.107],
  Acton: [-35.276, 149.118],
  Bruce: [-35.245, 149.087],
  Greenway: [-35.421, 149.063],
  Fyshwick: [-35.328, 149.166],
  Belconnen: [-35.238, 149.064],
  Tuggeranong: [-35.421, 149.063],
  Woden: [-35.345, 149.087],
  Mitchell: [-35.214, 149.121],
  Majura: [-35.260, 149.198],
  Yarralumla: [-35.305, 149.094],
  'Capital Hill': [-35.308, 149.124],
  Kingston: [-35.319, 149.144],
  Sydney: [-33.868, 151.207],
  SYDNEY: [-33.868, 151.207],
  Parramatta: [-33.815, 151.003],
  'Surry Hills': [-33.886, 151.211],
  Haymarket: [-33.879, 151.204],
  'North Sydney': [-33.840, 151.207],
  Melbourne: [-37.814, 144.963],
  MELBOURNE: [-37.814, 144.963],
  Docklands: [-37.815, 144.945],
  Carlton: [-37.799, 144.967],
  'East Melbourne': [-37.815, 144.984],
  Brisbane: [-27.469, 153.025],
  BRISBANE: [-27.469, 153.025],
  Perth: [-31.953, 115.857],
  PERTH: [-31.953, 115.857],
  Adelaide: [-34.928, 138.601],
  ADELAIDE: [-34.928, 138.601],
  Hobart: [-42.881, 147.327],
  HOBART: [-42.881, 147.327],
  Darwin: [-12.464, 130.846],
  DARWIN: [-12.464, 130.846],
};

export const STATE_CAPITALS: Record<string, [number, number]> = {
  NSW: [-33.868, 151.207],
  VIC: [-37.814, 144.963],
  QLD: [-27.469, 153.025],
  WA: [-31.953, 115.857],
  SA: [-34.928, 138.601],
  TAS: [-42.881, 147.327],
  NT: [-12.464, 130.846],
  ACT: [-35.282, 149.128],
};

export function locate(suburb: string | null, state: string | null): [number, number] | null {
  if (suburb && SUBURB_COORDS[suburb]) return SUBURB_COORDS[suburb];
  if (state && STATE_CAPITALS[state]) return STATE_CAPITALS[state];
  return null;
}
