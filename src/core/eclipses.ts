/**
 * Eclipse prediction: the Saros dial and its glyf catalogue.
 *
 * The Saros dial (lower back) is a four-turn spiral of 223 cells, one per
 * synodic month. In an eclipse month the cell carries a glyph: Σ for a lunar
 * eclipse, Η for a solar eclipse, with an hour letter and an "is" mark. The
 * Exeligmos dial then corrects the hour by 0, 8 or 16 hours.
 *
 * The catalogue is generated with Freeth's *Eclipse Year Model* (EYM;
 * Freeth 2014, PLoS ONE 9, e103275), a purely integer scheme that reproduces
 * the inscribed pattern far better than chance and which the ancient designer
 * could have used:
 *
 *   - 19 eclipse years = 223 synodic months = 446 × 19 eclipse-year units,
 *     so one eclipse year is 446 EYu and one synodic month is exactly 38 EYu.
 *   - Full Moon of month n:  38(n − 1) + 17  (mod 446)
 *   - New Moon of month n:   38(n − 1) + 36  (mod 446)
 *   - Descending node at 66 EYu, ascending node at 289 = 66 + 223.
 *   - A lunar eclipse is predicted when Full Moon is within 20 EYu of a node;
 *     a solar eclipse when New Moon is within 20 EYu north of a node or 7 EYu
 *     south of it (solar eclipses are more easily seen when the Moon is north
 *     of the node as seen from Greece).
 *
 * The model is a *prediction scheme*, not a modern eclipse theory: it flags
 * eclipse seasons, and its accuracy is measured in the validation suite
 * against eclipses that really happened (see validation.ts).
 */

import { EVIDENCE } from './sources';

export const EYU_PER_MONTH = 38;
export const EYU_PER_ECLIPSE_YEAR = 446;
export const NODE_DESCENDING = 66;
export const NODE_ASCENDING = NODE_DESCENDING + 223;
export const LUNAR_LIMIT = 20;
export const SOLAR_LIMIT_NORTH = 20;
export const SOLAR_LIMIT_SOUTH = 7;
export const FULL_MOON_EYU = 17;
export const NEW_MOON_EYU = 36;

export interface Glyph {
  month: number; // 1–223
  lunar: boolean;
  solar: boolean;
  /** Signed distance from the nearest node, in EYu; > 0 means north of the node. */
  lunarDistance?: number;
  solarDistance?: number;
  node: 'ascending' | 'descending';
  /** Hour of the day, in hours, from the Saros 8-hour progression. */
  hour: number;
  hourLetter: string;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

const GREEK_NUMERALS = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'ΙΑ', 'ΙΒ'];

export const nodeDistance = (pos: number): { distance: number; node: 'ascending' | 'descending' } => {
  let best = { d: Infinity, node: 'descending' as 'ascending' | 'descending' };
  for (const [np, node] of [
    [NODE_DESCENDING, 'descending'],
    [NODE_ASCENDING, 'ascending'],
  ] as const) {
    for (const k of [-1, 0, 1]) {
      const raw = pos - (np + k * EYU_PER_ECLIPSE_YEAR);
      if (Math.abs(raw) < Math.abs(best.d)) best = { d: raw, node };
    }
  }
  const north = best.node === 'descending' ? -best.d : best.d;
  return { distance: north, node: best.node };
};

export const fullMoonEYu = (month: number) => mod(EYU_PER_MONTH * (month - 1) + FULL_MOON_EYU, EYU_PER_ECLIPSE_YEAR);
export const newMoonEYu = (month: number) => mod(EYU_PER_MONTH * (month - 1) + NEW_MOON_EYU, EYU_PER_ECLIPSE_YEAR);

/**
 * Generate the 223-month catalogue.
 *
 * The "consecutive month" rule (never two lunar predictions in successive
 * months) is part of Freeth's model: the second of two such eclipses is almost
 * always penumbral and the ancient scheme omits it.
 */
export const generateGlyphs = (horizonHour = 18): Glyph[] => {
  const glyphs: Glyph[] = [];
  let lastLunar = -10;
  for (let n = 1; n <= 223; n++) {
    const fm = nodeDistance(fullMoonEYu(n));
    const nm = nodeDistance(newMoonEYu(n));
    const lunar = Math.abs(fm.distance) <= LUNAR_LIMIT && n - lastLunar > 1;
    if (lunar) lastLunar = n;
    const solar = nm.distance >= 0 ? nm.distance <= SOLAR_LIMIT_NORTH : -nm.distance <= SOLAR_LIMIT_SOUTH;
    if (lunar || solar) {
      // Saros progression: successive eclipses fall about 8 h later in the day.
      const hour = (horizonHour + (n - 1) * 8) % 24;
      const letter = GREEK_NUMERALS[Math.floor(hour / 2) % 12];
      glyphs.push({
        month: n,
        lunar,
        solar,
        lunarDistance: lunar ? fm.distance : undefined,
        solarDistance: solar ? nm.distance : undefined,
        node: (lunar ? fm : nm).node,
        hour,
        hourLetter: letter,
      });
    }
  }
  return glyphs;
};

export const GLYPHS = generateGlyphs();
export const GLYPH_BY_MONTH = new Map(GLYPHS.map((g) => [g.month, g]));

export const glyphSymbol = (g: Glyph) => {
  if (g.lunar && g.solar) return 'ΣΗ';
  return g.lunar ? 'Σ' : 'Η';
};

export const describeGlyph = (g: Glyph): string => {
  const parts: string[] = [];
  if (g.lunar) parts.push('eclipse lunar');
  if (g.solar) parts.push('eclipse solar');
  return `${parts.join(' + ')} · hora ${g.hour.toString().padStart(2, '0')}h (${g.hourLetter}) · nó ${
    g.node === 'ascending' ? 'ascendente' : 'descendente'
  } · ${Math.abs(g.lunar ? g.lunarDistance! : g.solarDistance!).toFixed(0)} EYu do nó`;
};

/** Exeligmos sector: 0, 1 or 2 → +0 h, +8 h, +16 h. */
export const exeligmosCorrection = (sector: number) => {
  const s = ((Math.floor(sector) % 3) + 3) % 3;
  return { sector: s, hours: s * 8, label: ['0 h', '+8 h', '+16 h'][s] };
};

/**
 * Eclipse season test used by the astronomical panel: a solar eclipse can only
 * occur near new moon when the Sun is within ~17° of a lunar node.
 */
export const eclipseSeason = (sunLongitude: number, nodeLongitude: number): { inSeason: boolean; distance: number } => {
  let d = ((sunLongitude - nodeLongitude) % 180 + 180) % 180;
  if (d > 90) d = 180 - d; // distance to the nearest node axis
  return { inSeason: d < 17, distance: d };
};

export const ECLIPSE_SOURCES = {
  model: {
    citation:
      'Freeth, T. Eclipse prediction on the ancient Greek astronomical calculating machine known as the Antikythera Mechanism. PLoS ONE 9(7), e103275 (2014).',
    doi: '10.1371/journal.pone.0103275',
    grade: EVIDENCE.A.grade,
  },
  glyphs: {
    citation: 'Freeth, T., Jones, A., Steele, J. M. & Bitsakis, Y. Nature 454, 614–617 (2008), Supplementary Table S1.',
    doi: '10.1038/nature07130',
    grade: EVIDENCE.C.grade,
  },
};
