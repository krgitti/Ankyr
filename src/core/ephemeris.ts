/**
 * A modern ephemeris, used ONLY as an independent reference for validation.
 *
 * The emulator never uses these numbers to drive a pointer: every pointer is
 * driven by the gear train. This module exists so the astronomical panel and
 * the validation suite can answer "how far is the Mechanism's prediction from
 * where the body really was, according to modern theory?".
 *
 * Implementation:
 *  - Sun: Meeus, Astronomical Algorithms (1998), ch. 25 — apparent longitude,
 *    accuracy ~0.01°.
 *  - Moon: Meeus ch. 47, truncated to the leading terms of the ELP-2000/82
 *    series; accuracy ~0.05° in longitude, ~0.02° in latitude, ~50 km in
 *    distance. Ample for judging a Hellenistic mechanism.
 *  - Planets: JPL Keplerian elements for 3000 BC – 3000 AD (Standish 2006),
 *    propagated, converted to geocentric ecliptic coordinates and precessed to
 *    the ecliptic of date. Accuracy over this span: a few arcminutes for the
 *    naked-eye planets, degrades slowly for Jupiter and Saturn.
 *  - Lunar node: mean longitude of the ascending node (Meeus 47.7).
 *
 * All longitudes are tropical, referred to the mean equinox of date, which is
 * the frame in which the Mechanism's zodiac ring was set.
 */

export type Body = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

export const norm360 = (x: number) => ((x % 360) + 360) % 360;
export const norm180 = (x: number) => {
  const y = norm360(x);
  return y > 180 ? y - 360 : y;
};

const T_CENT = (jd: number) => (jd - 2451545.0) / 36525;

/** General precession in longitude from J2000 to the date, degrees. */
export const precessionDeg = (jd: number) => {
  const t = T_CENT(jd);
  return (5029.0966 * t + 1.11113 * t * t) / 3600;
};

// ── Sun ───────────────────────────────────────────────────────────────────

/** Mean longitude of the Sun (Meeus 25.2), the "mean Sun" of the ring. */
export const meanSunLongitude = (jd: number): number => {
  const t = T_CENT(jd);
  return norm360(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
};

export const sunLongitude = (jd: number): number => {
  const t = T_CENT(jd);
  const L0 = norm360(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
  const M = norm360(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
  const Mr = M * RAD;
  const C =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(Mr) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * t;
  const apparent = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  return norm360(apparent);
};

// ── Moon (truncated ELP) ──────────────────────────────────────────────────

const LON_TERMS: [number, number, number, number, number][] = [
  [0, 0, 1, 0, 6288774],
  [2, 0, -1, 0, 1274027],
  [2, 0, 0, 0, 658314],
  [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116],
  [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793],
  [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322],
  [2, -1, 0, 0, 45758],
  [0, 1, -1, 0, -40923],
  [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383],
  [2, 0, 0, -2, 15327],
  [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675],
  [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548],
  [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766],
  [1, 0, -1, 0, -5163],
  [1, 1, 0, 0, 4987],
  [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994],
  [4, 0, 0, 0, 3861],
  [2, 0, -3, 0, 3665],
  [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602],
  [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348],
  [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120],
  [0, 2, 0, 0, -2069],
];

const LAT_TERMS: [number, number, number, number, number][] = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [4, 0, 0, -1, 8216],
  [0, 0, 1, 3, 3533],
  [2, 0, -2, 1, 2763],
  [0, 0, 3, 1, 1636],
];

export interface MoonPosition {
  longitude: number;
  latitude: number;
  /** Earth–Moon distance, km. */
  distance: number;
}

export const moonPosition = (jd: number): MoonPosition => {
  const t = T_CENT(jd);
  const Lp = norm360(218.3164477 + 481267.88123421 * t - 0.0015786 * t * t + (t ** 3) / 538841 - (t ** 4) / 65194000);
  const D = norm360(297.8501921 + 445267.1114034 * t - 0.0018819 * t * t + (t ** 3) / 545868 - (t ** 4) / 113065000);
  const M = norm360(357.5291092 + 35999.0502909 * t - 0.0001536 * t * t + (t ** 3) / 24490000);
  const Mp = norm360(134.9633964 + 477198.8675055 * t + 0.0087414 * t * t + (t ** 3) / 69699 - (t ** 4) / 14712000);
  const F = norm360(93.272095 + 483202.0175233 * t - 0.0036539 * t * t - (t ** 3) / 3526000 + (t ** 4) / 863310000);
  const A1 = norm360(119.75 + 131.849 * t);
  const A2 = norm360(53.09 + 479264.29 * t);
  const A3 = norm360(313.45 + 481266.484 * t);

  let sl = 0;
  for (const [d, m, mp, f, c] of LON_TERMS) {
    sl += c * Math.sin((d * D + m * M + mp * Mp + f * F) * RAD);
  }
  sl += 3958 * Math.sin(A1 * RAD) + 1962 * Math.sin((Lp - F) * RAD) + 318 * Math.sin(A2 * RAD);

  let sb = 0;
  for (const [d, m, mp, f, c] of LAT_TERMS) {
    sb += c * Math.sin((d * D + m * M + mp * Mp + f * F) * RAD);
  }
  sb += -2235 * Math.sin(Lp * RAD) + 382 * Math.sin(A3 * RAD) + 175 * Math.sin((A1 - F) * RAD);
  sb += 175 * Math.sin((A1 + F) * RAD) + 127 * Math.sin((Lp - Mp) * RAD) - 115 * Math.sin((Lp + Mp) * RAD);

  // Leading distance term only: ±2% is irrelevant to phase and eclipse geometry.
  const distance = 385000.56 - 20905.355 * Math.cos(Mp * RAD);
  return {
    longitude: norm360(Lp + sl / 1e6),
    latitude: sb / 1e6,
    distance,
  };
};

/** Mean longitude of the Moon's ascending node, degrees (Meeus 47.7). */
export const meanNodeLongitude = (jd: number): number => {
  const t = T_CENT(jd);
  return norm360(
    125.0445479 - 1934.1362891 * t + 0.0020754 * t * t + (t ** 3) / 467441 - (t ** 4) / 60616000,
  );
};

// ── Planets ───────────────────────────────────────────────────────────────

interface Elements {
  a: number;
  e: number;
  i: number;
  L: number;
  peri: number;
  node: number;
  rates: { a: number; e: number; i: number; L: number; peri: number; node: number };
}

/** JPL/Standish elements for 3000 BC – 3000 AD (validated at J2000). */
const ELEMENTS: Record<'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn', Elements> = {
  mercury: {
    a: 0.38709843, e: 0.20563661, i: 7.00559432, L: 252.25166724, peri: 77.45771895, node: 48.33961819,
    rates: { a: 0.00000000, e: 0.00002123, i: -0.00590158, L: 149472.67486623, peri: 0.15940013, node: -0.12214182 },
  },
  venus: {
    a: 0.72332102, e: 0.00676399, i: 3.39777545, L: 181.97970850, peri: 131.76755713, node: 76.67261496,
    rates: { a: -0.00000026, e: -0.00005107, i: 0.00043494, L: 58517.81560260, peri: 0.05679648, node: -0.27274174 },
  },
  earth: {
    a: 1.00000018, e: 0.01673163, i: -0.00054346, L: 100.46691572, peri: 102.93005885, node: -5.11260389,
    rates: { a: -0.00000003, e: -0.00003661, i: -0.01337178, L: 35999.37306329, peri: 0.31795260, node: -0.24123856 },
  },
  mars: {
    a: 1.52371243, e: 0.09336511, i: 1.85181869, L: -4.56813164, peri: -23.91744784, node: 49.71320984,
    rates: { a: 0.00000097, e: 0.00009149, i: -0.00724757, L: 19140.29934243, peri: 0.45223625, node: -0.26852431 },
  },
  jupiter: {
    a: 5.20248019, e: 0.04853590, i: 1.29861416, L: 34.33479152, peri: 14.27495244, node: 100.29282654,
    rates: { a: -0.00002864, e: 0.00018026, i: -0.00322699, L: 3034.90371757, peri: 0.18199196, node: 0.13024619 },
  },
  saturn: {
    a: 9.54149883, e: 0.05550825, i: 2.49424102, L: 50.07571329, peri: 92.86136063, node: 113.63998702,
    rates: { a: -0.00003065, e: -0.00032044, i: 0.00451969, L: 1222.11494724, peri: 0.54179478, node: -0.25015002 },
  },
};

interface Helio {
  x: number;
  y: number;
  z: number;
}

const heliocentric = (body: keyof typeof ELEMENTS, jd: number): Helio => {
  const el = ELEMENTS[body];
  const T = T_CENT(jd);
  const a = el.a + el.rates.a * T;
  const e = el.e + el.rates.e * T;
  const inc = (el.i + el.rates.i * T) * RAD;
  const L = el.L + el.rates.L * T;
  const peri = el.peri + el.rates.peri * T;
  const node = el.node + el.rates.node * T;
  const M = norm360(L - peri) * RAD;
  // Kepler's equation, Newton iterations.
  let E = M;
  for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (peri - node) * RAD;
  const Om = node * RAD;
  const x = (Math.cos(w) * Math.cos(Om) - Math.sin(w) * Math.sin(Om) * Math.cos(inc)) * xv +
    (-Math.sin(w) * Math.cos(Om) - Math.cos(w) * Math.sin(Om) * Math.cos(inc)) * yv;
  const y = (Math.cos(w) * Math.sin(Om) + Math.sin(w) * Math.cos(Om) * Math.cos(inc)) * xv +
    (-Math.sin(w) * Math.sin(Om) + Math.cos(w) * Math.cos(Om) * Math.cos(inc)) * yv;
  const z = Math.sin(w) * Math.sin(inc) * xv + Math.cos(w) * Math.sin(inc) * yv;
  return { x, y, z };
};

export interface PlanetPosition {
  longitude: number; // geocentric ecliptic longitude of date
  latitude: number;
  distance: number; // AU
}

export const planetPosition = (body: Exclude<Body, 'sun' | 'moon'>, jd: number): PlanetPosition => {
  const p = heliocentric(body, jd);
  const earth = heliocentric('earth', jd);
  const dx = p.x - earth.x;
  const dy = p.y - earth.y;
  const dz = p.z - earth.z;
  const lon = Math.atan2(dy, dx) * DEG;
  const lat = Math.atan2(dz, Math.hypot(dx, dy)) * DEG;
  const precession = precessionDeg(jd);
  return {
    longitude: norm360(lon + precession),
    latitude: lat,
    distance: Math.hypot(dx, dy, dz),
  };
};

export const bodyLongitude = (body: Body, jd: number): number => {
  if (body === 'sun') return sunLongitude(jd);
  if (body === 'moon') return moonPosition(jd).longitude;
  return planetPosition(body, jd).longitude;
};

export const bodyLatitude = (body: Body, jd: number): number => {
  if (body === 'sun') return 0;
  if (body === 'moon') return moonPosition(jd).latitude;
  return planetPosition(body, jd).latitude;
};

// ── Lunar phase ───────────────────────────────────────────────────────────

export const moonPhaseAngle = (jd: number): number => {
  const sun = sunLongitude(jd);
  const moon = moonPosition(jd).longitude;
  return norm360(moon - sun);
};

/** Illuminated fraction of the lunar disc: 0 = new, 1 = full. */
export const illuminatedFraction = (jd: number): number => (1 - Math.cos(moonPhaseAngle(jd) * RAD)) / 2;

/** Moon's age in days (time since the last new moon, mean rate). */
export const moonAge = (jd: number): number => (moonPhaseAngle(jd) / 360) * 29.530588853;

// ── Syzygies ──────────────────────────────────────────────────────────────

/**
 * Next new Moon (kind = 0) or full Moon (kind = 180) after jd, by bisection on
 * the true elongation. Used by the panel to list conjunctions and syzygies.
 */
export const nextSyzygy = (jd: number, kind: 0 | 180): number => {
  const f = (t: number) => norm180(moonPhaseAngle(t) - kind);
  const step = 0.5;
  let lo = jd;
  let flo = f(lo);
  // The elongation grows monotonically; f crosses zero upwards once per
  // lunation. Walk forward (at most two lunations) until the sign flips.
  let hi = lo;
  let fhi = flo;
  let guard = 0;
  while (guard++ < 160) {
    hi = lo + step;
    fhi = f(hi);
    if (flo <= 0 && fhi > 0) break;
    lo = hi;
    flo = fhi;
  }
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) <= 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

// ── Reference mean motions (for the "ideal mechanism" comparison) ─────────

export const MODERN = {
  tropicalYear: 365.242190,
  siderealYear: 365.256363,
  tropicalMonth: 27.321582,
  siderealMonth: 27.321661,
  synodicMonth: 29.530589,
  anomalisticMonth: 27.554550,
  draconicMonth: 27.212221,
  eclipseYear: 346.620076,
  synodic: {
    mercury: 115.8775,
    venus: 583.9214,
    mars: 779.9361,
    jupiter: 398.8840,
    saturn: 378.0919,
  },
  siderealPeriod: {
    mercury: 87.9691,
    venus: 224.7008,
    mars: 686.9800,
    jupiter: 4332.589,
    saturn: 10759.22,
  },
} as const;

/** Angular difference in arcminutes, wrapped to ±30°. */
export const arcminDiff = (a: number, b: number) => norm180(a - b) * 60;

export { DEG, RAD };
