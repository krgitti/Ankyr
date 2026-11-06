/**
 * The calendars of the Mechanism.
 *
 * 1. The Metonic calendar (back dial, upper left): 235 lunar months in 19
 *    years, engraved as a five-turn spiral of 47 months per turn. The month
 *    names engraved are those of the Epirote/Corinthian calendar, recovered
 *    from the Parapegma inscription (Freeth et al. 2008).
 * 2. The Callippic dial (back, inside the Metonic spiral): 76 years, i.e. four
 *    Metonic cycles less one day.
 * 3. The Olympiad dial (back, upper right): four years, with the Panhellenic
 *    games.
 * 4. The Egyptian civil calendar of 365 days, engraved on the front dial ring.
 *
 * Arithmetic of the Metonic cycle. The cycle is 235 months totalling 6940 days
 * (Meton's value), so the months are 29 or 30 days with 125 full and 110
 * hollow months. The emulator places the month boundaries at
 *
 *      start(k) = floor((k − 1) · 6940 / 235), k = 1 … 235
 *
 * which distributes the 125 full months as evenly as possible and reproduces
 * the 6940-day cycle exactly. The *inscribed* day-by-day pattern of the
 * original is not fully legible; this is a reconstruction of type C.
 */

import { Q } from './rational';
import { GAMES_BY_YEAR, formatYear, olympiadOf } from './time';
import { EVIDENCE, type EvidenceGrade } from './sources';

export const METONIC = {
  months: 235,
  days: 6940,
  years: 19,
  turns: 5,
  monthsPerTurn: 47,
  grade: 'A' as EvidenceGrade,
  note:
    '235 meses em 19 anos, espiral de cinco voltas: escala inscrita e sobrevivente; 6940 dias é o valor de Meton. A distribuição dia a dia dos meses é reconstrução (C).',
};

export const CALLIPPIC = {
  years: 76,
  cycles: 4,
  days: 76 * 365.25 - 0.25,
  grade: 'A' as EvidenceGrade,
  note:
    'Quatro ciclos metônicos menos um dia: 27759 dias em 76 anos. O ponteiro e o quadrante de quatro setores sobrevivem; a aritmética dos meses é derivada.',
};

export const SAROS = {
  months: 223,
  years: 18,
  days: 6585 + 1 / 3,
  turns: 4,
  grade: 'A' as EvidenceGrade,
  note: '223 meses sinódicos em 4 voltas de espiral; a escala de 223 divisões sobrevive no Fragmento A.',
};

export const EXELIGMOS = {
  months: 669,
  saros: 3,
  days: 19755.75,
  hours: 8,
  grade: 'A' as EvidenceGrade,
  note: 'Três Saros = 669 meses; cada setor acrescenta 8 horas ao horário do glifo (0, 8, 16 h).',
};

// ── Greek lunisolar month names (Epirote/Corinthian, from the Parapegma) ──

export interface GreekMonth {
  name: string;
  greek: string;
  note?: string;
}

export const GREEK_MONTHS: GreekMonth[] = [
  { name: 'Foinikaios', greek: 'ΦΟΙΝΙΚΑΙΟΣ' },
  { name: 'Kraneios', greek: 'ΚΡΑΝΕΙΟΣ' },
  { name: 'Lanotropios', greek: 'ΛΑΝΟΤΡΟΠΙΟΣ' },
  { name: 'Machaneus', greek: 'ΜΑΧΑΝΕΥΣ' },
  { name: 'Dodekateus', greek: 'ΔΩΔΕΚΑΤΕΥΣ' },
  { name: 'Eukleios', greek: 'ΕΥΚΛΕΙΟΣ' },
  { name: 'Artemisios', greek: 'ΑΡΤΕΜΙΣΙΟΣ' },
  { name: 'Psydreus', greek: 'ΨΥΔΡΕΥΣ' },
  { name: 'Gameilios', greek: 'ΓΑΜΕΙΛΙΟΣ' },
  { name: 'Agrianios', greek: 'ΑΓΡΙΑΝΙΟΣ' },
  { name: 'Panamos', greek: 'ΠΑΝΑΜΟΣ' },
  { name: 'Apellaios', greek: 'ΑΠΕΛΛΑΙΟΣ' },
];

export const INTERCALARY_MONTH: GreekMonth = {
  name: 'Panamos II (embolimos)',
  greek: 'ΠΑΝΑΜΟΣ ΕΜΒΟΛΙΜΟΣ',
  note: 'Mês intercalar; a inscrição repete Panamos nos anos de 13 meses.',
};

/** Years of the 19-year cycle that carry an intercalary month. */
export const INTERCALARY_YEARS = [3, 6, 8, 11, 14, 17, 19];

export const isIntercalaryYear = (yearInCycle: number) => INTERCALARY_YEARS.includes(yearInCycle);

/** Number of months in each of the 19 years of the cycle (12 or 13). */
export const MONTHS_PER_YEAR = Array.from({ length: METONIC.years }, (_, i) =>
  isIntercalaryYear(i + 1) ? 13 : 12,
);

/** Day on which month k (0-based) starts, within the 6940-day cycle. */
export const monthStartDay = (k: number): number => Math.floor((k * METONIC.days) / METONIC.months);

/** Length in days of month k (0-based): 29 or 30. */
export const monthLength = (k: number): number => monthStartDay(k + 1) - monthStartDay(k);

export interface MetonicLayoutEntry {
  index: number; // 0–234
  yearInCycle: number; // 1–19
  monthOfYear: number; // 1–13
  month: GreekMonth;
  days: number;
  startDay: number; // day within the 6940-day cycle
  turn: number; // 0–4, which turn of the spiral
  monthInTurn: number; // 0–46
}

/** Full 235-month layout of the cycle, derived once from the arithmetic above. */
export const METONIC_LAYOUT: MetonicLayoutEntry[] = (() => {
  const out: MetonicLayoutEntry[] = [];
  let index = 0;
  for (let y = 1; y <= METONIC.years; y++) {
    const count = MONTHS_PER_YEAR[y - 1];
    for (let mo = 1; mo <= count; mo++) {
      const month = mo === 13 ? INTERCALARY_MONTH : GREEK_MONTHS[mo - 1];
      out.push({
        index,
        yearInCycle: y,
        monthOfYear: mo,
        month,
        days: monthLength(index),
        startDay: monthStartDay(index),
        turn: Math.floor(index / METONIC.monthsPerTurn),
        monthInTurn: index % METONIC.monthsPerTurn,
      });
      index++;
    }
  }
  return out;
})();

export interface MetonicDate {
  index: number; // 0–234
  entry: MetonicLayoutEntry;
  day: number; // 1–30
  fraction: number; // 0–1 within the month
  continuousMonth: number; // the raw continuous position, for the pointer
}

/**
 * Continuous month position (0 … 235) → calendar date.
 * The pointer of the Mechanism moves continuously, so the day of the month is
 * the fraction of the pointer's travel through that month, scaled by its length.
 */
export const metonicDate = (continuousMonth: number): MetonicDate => {
  const x = ((continuousMonth % METONIC.months) + METONIC.months) % METONIC.months;
  let index = Math.floor(x);
  if (index >= METONIC.months) index = METONIC.months - 1;
  const entry = METONIC_LAYOUT[index];
  const fraction = x - index;
  const day = Math.min(entry.days, Math.floor(fraction * entry.days) + 1);
  return { index, entry, day, fraction, continuousMonth: x };
};

export const formatMetonic = (d: MetonicDate) =>
  `${d.day} ${d.entry.month.name}, ano ${d.entry.yearInCycle} do ciclo metônico (${d.entry.month.greek})`;

// ── Callippic era ─────────────────────────────────────────────────────────
// The first Callippic period began at the summer solstice of 330 BC. Year 1 of
// the era is 330/329 BC, and the era runs in 76-year periods.

export const CALLIPPIC_ERA_START_JD = 1602813.5; // 1 July 330 BC (Julian), approx. summer solstice

export interface CallippicDate {
  period: number; // 1, 2, 3 …
  yearInPeriod: number; // 1–76
  label: string;
}

export const callippicDate = (jd: number, eraStartJD = CALLIPPIC_ERA_START_JD): CallippicDate => {
  const years = (jd - eraStartJD) / 365.25;
  const n = Math.floor(years / CALLIPPIC.years);
  const within = years - n * CALLIPPIC.years;
  const yearInPeriod = Math.floor(within) + 1;
  const calendarYear = -329 + n * CALLIPPIC.years + (yearInPeriod - 1);
  return {
    period: n + 1,
    yearInPeriod,
    label: `Período calíptico ${n + 1}, ano ${yearInPeriod} (${formatYear(calendarYear)})`,
  };
};

// ── Olympiad ──────────────────────────────────────────────────────────────

export interface OlympiadDate {
  olympiad: number;
  year: number; // 1–4
  games: string[];
  gamesGreek: string[];
}

export const olympiadDate = (jd: number): OlympiadDate => {
  const e = olympiadOf(jdYear(jd));
  const g = GAMES_BY_YEAR[e.year];
  return { olympiad: e.olympiad, year: e.year, games: [g[0], g[1]], gamesGreek: [g[0], g[1]] };
};

// Local import to avoid a cycle in the module graph.
import { jdToYear } from './time';
const jdYear = (jd: number) => jdToYear(jd);

/**
 * The Metonic spiral as a list of engraved cells: (turn, monthInTurn, length
 * in the spiral). Used by the 3D dial and by the "where is the pointer" panel.
 */
export const SPIRAL_GEOMETRY = {
  innerRadius: 18.0, // mm
  outerRadius: 33.0,
  turnPitch: (33.0 - 18.0) / METONIC.turns,
  startAngleDeg: 90,
  sweepDeg: 360 * METONIC.turns,
  direction: -1 as 1 | -1,
};

export const SAROS_SPIRAL_GEOMETRY = {
  innerRadius: 16.0,
  outerRadius: 33.0,
  turnPitch: (33.0 - 16.0) / SAROS.turns,
  startAngleDeg: 90,
  sweepDeg: 360 * SAROS.turns,
  direction: -1 as 1 | -1,
};

/** Exact relations, for the documentation panel. */
export const CALENDAR_RELATIONS = [
  { name: 'Metônico', relation: '235 meses sinódicos = 19 anos', terms: '235/19', grade: 'A', color: EVIDENCE.A.color },
  { name: 'Calíptico', relation: '4 × 235 meses = 76 anos − 1 dia', terms: '940/76', grade: 'A', color: EVIDENCE.A.color },
  { name: 'Saros', relation: '223 meses sinódicos = 18 anos 11 dias 8 h', terms: '223/18', grade: 'A', color: EVIDENCE.A.color },
  { name: 'Exeligmos', relation: '3 Saros = 669 meses = 54 anos 33 dias', terms: '669/54', grade: 'A', color: EVIDENCE.A.color },
  { name: 'Olímpico', relation: '4 anos por Olimpíada', terms: '1/4', grade: 'A', color: EVIDENCE.A.color },
];

/** Days in a Metonic cycle as exact rational. */
export const METONIC_DAYS_Q = Q.of(METONIC.days);
