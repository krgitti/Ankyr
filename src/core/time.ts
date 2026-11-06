/**
 * Time scales and calendars used by the emulator.
 *
 * Mechanism time is measured in years from EPOCH_JD, with one year = 365¼ days
 * (the Callippic year, which is the year the Mechanism's calendar ring is built
 * on: Freeth et al. 2021, Supp. §6.4.4). Dates are proleptic Julian, which is
 * the convention of the historical literature for this period.
 */

import { Q } from './rational';

export const J2000 = 2451545.0;

/**
 * Epoch of the emulator: full moon 1 of the Saros dial, 12 May 205 BC (Julian),
 * JD 1646679.04084 — the anchor derived by Freeth (2014) for the 223-month
 * eclipse sequence of the Saros dial. Mechanism time T = 0 here, and every dial
 * has a documented phase at T = 0 (see mechanism.ts).
 */
export const EPOCH_JD = 1646679.04084;

/** Hellenistic year used by the gearing: 365¼ days. */
export const DAYS_PER_YEAR = Q.of(1461, 4);

export interface CalendarDate {
  year: number; // astronomical: year 0 = 1 BC, −204 = 205 BC
  month: number; // 1–12
  day: number; // may carry a fraction
}

/** Julian calendar date → Julian Day (Meeus, Astronomical Algorithms, ch. 7). */
export const julianToJD = ({ year, month, day }: CalendarDate): number => {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day - 1524.5;
};

/** Julian Day → Julian calendar date. */
export const jdToJulian = (jd: number): CalendarDate => {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  const b = z + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e) + f;
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return { year, month, day };
};

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES_LONG = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** −204 → "205 a.C."; 0 → "1 a.C."; 1 → "1 d.C." */
export const formatYear = (year: number) => (year <= 0 ? `${1 - year} a.C.` : `${year} d.C.`);

export const formatJD = (jd: number, withTime = false): string => {
  const { year, month, day } = jdToJulian(jd);
  const d = Math.floor(day);
  let s = `${d} de ${MONTH_NAMES_LONG[month - 1]} de ${formatYear(year)}`;
  if (withTime) {
    const h = (day - d) * 24;
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    s += ` ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} UT`;
  }
  return s;
};

export const formatJDShort = (jd: number): string => {
  const { year, month, day } = jdToJulian(jd);
  return `${Math.floor(day)} ${MONTH_NAMES[month - 1]} ${formatYear(year)}`;
};

/** Fragment of astronomical year, for charts and slider labels. */
export const jdToYear = (jd: number): number => {
  const { year } = jdToJulian(jd);
  const a = julianToJD({ year, month: 1, day: 1 });
  const b = julianToJD({ year: year + 1, month: 1, day: 1 });
  return year + (jd - a) / (b - a);
};

// ── Mechanism time ────────────────────────────────────────────────────────

/** Years (exact) since the epoch, for a Julian Day. */
export const yearsFromJD = (jd: number): Q => Q.fromNumber(jd).sub(Q.fromNumber(EPOCH_JD)).div(DAYS_PER_YEAR);

export const jdFromYears = (T: Q): number => EPOCH_JD + T.mul(DAYS_PER_YEAR).toNumber();

export const daysFromJD = (jd: number): Q => Q.fromNumber(jd).sub(Q.fromNumber(EPOCH_JD));

export const jdFromDays = (d: Q): number => EPOCH_JD + d.toNumber();

// ── Egyptian civil calendar (the 365-day ring of the front dial) ──────────
// 12 months of 30 days plus 5 epagomenal days, no leap years. Era of
// Nabonassar: Thoth 1 of year 1 = 26 February 747 BC (Julian).

export const NABONASSAR_EPOCH = 1448637.5;

export const EGYPTIAN_MONTHS = [
  'Thoth', 'Phaophi', 'Athyr', 'Choiak', 'Tybi', 'Mecheir',
  'Phamenoth', 'Pharmouthi', 'Pachon', 'Payni', 'Epeiph', 'Mesore', 'Epagomenai',
];

export const EGYPTIAN_MONTHS_GREEK = [
  'ΘΩΘ', 'ΦΑΩΦΙ', 'ΑΘΥΡ', 'ΧΟΙΑΚ', 'ΤΥΒΙ', 'ΜΕΧΕΙΡ',
  'ΦΑΜΕΝΩΘ', 'ΦΑΡΜΟΥΘΙ', 'ΠΑΧΩΝ', 'ΠΑΥΝΙ', 'ΕΠΙΦΙ', 'ΜΕΣΟΡΗ', 'ΕΠΑΓΟΜΕΝΑΙ',
];

export interface EgyptianDate {
  year: number;
  dayOfYear: number; // 0–364
  month: number; // 0–12 (12 = epagomenal)
  day: number; // 1–30 (1–5 for the epagomenal days)
  fraction: number;
}

export const egyptianDate = (jd: number): EgyptianDate => {
  const n = jd - NABONASSAR_EPOCH;
  const days = Math.floor(n);
  const year = Math.floor(days / 365) + 1;
  const dayOfYear = days - (year - 1) * 365;
  const month = Math.min(12, Math.floor(dayOfYear / 30));
  const day = dayOfYear - month * 30 + 1;
  return { year, dayOfYear, month, day, fraction: n - days };
};

export const formatEgyptian = (jd: number): string => {
  const e = egyptianDate(jd);
  const month = EGYPTIAN_MONTHS[e.month];
  return `${e.day} ${month}, ano ${e.year} de Nabonassar (calendário civil de 365 dias)`;
};

// ── Zodiac ────────────────────────────────────────────────────────────────

export const ZODIAC = [
  'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
  'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes',
];

/** Names as engraved on the Mechanism's zodiac ring (Libra is ΧΗΛΑΙ, the Claws). */
export const ZODIAC_GREEK = [
  'ΚΡΙΟΣ', 'ΤΑΥΡΟΣ', 'ΔΙΔΥΜΟΙ', 'ΚΑΡΚΙΝΟΣ', 'ΛΕΩΝ', 'ΠΑΡΘΕΝΟΣ',
  'ΧΗΛΑΙ', 'ΣΚΟΡΠΙΟΣ', 'ΤΟΞΟΤΗΣ', 'ΑΙΓΟΚΕΡΩΣ', 'ΥΔΡΟΧΟΟΣ', 'ΙΧΘΥΕΣ',
];

export const ZODIAC_GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

export const wrap360 = (deg: number) => ((deg % 360) + 360) % 360;

export const formatLongitude = (deg: number): string => {
  const l = wrap360(deg);
  const sign = Math.floor(l / 30);
  const within = l - sign * 30;
  const d = Math.floor(within);
  const m = Math.floor((within - d) * 60);
  return `${ZODIAC[sign]} ${d}°${String(m).padStart(2, '0')}′`;
};

export const formatLongitudeGreek = (deg: number): string => {
  const l = wrap360(deg);
  const sign = Math.floor(l / 30);
  return `${ZODIAC_GREEK[sign]} ${(l - sign * 30).toFixed(1)}°`;
};

// ── Olympiads ─────────────────────────────────────────────────────────────
// Olympiad 1 began with the games of summer 776 BC (astronomical year −775).

export const olympiadOf = (year: number) => {
  // jdToYear returns a fractional year; the Olympiad count needs the integer.
  const k = Math.floor(year) + 775;
  return { olympiad: Math.floor(k / 4) + 1, year: (((k % 4) + 4) % 4) + 1 };
};

/** The four Panhellenic games of the periodos, by year of the Olympiad. */
export const GAMES_BY_YEAR: Record<number, string[]> = {
  1: ['ΟΛΥΜΠΙΑ', 'Ολυμπιακοί (Élis)'],
  2: ['ΙΣΘΜΙΑ', 'ΝΕΜΕΑ', 'Ístmicos (Corinto) · Nemeus (Nemeia)'],
  3: ['ΠΥΘΙΑ', 'Píticos (Delfos)'],
  4: ['ΙΣΘΜΙΑ', 'ΝΕΜΕΑ', 'Ístmicos (Corinto) · Nemeus (Nemeia)'],
};

// ── Utilities ─────────────────────────────────────────────────────────────

export const DEG = 180 / Math.PI;
export const RAD = Math.PI / 180;

/** Normalised angle in (−180, 180], for differences of longitude. */
export const wrap180 = (deg: number) => {
  const x = wrap360(deg);
  return x > 180 ? x - 360 : x;
};

export const signedArcmin = (deg: number) => wrap180(deg) * 60;

/** Signed difference a − b in (−180, 180], the workhorse for longitude errors. */
export const normAngularDiff = (a: number, b: number): number => {
  const d = wrap360(a - b);
  return d > 180 ? d - 360 : d;
};
