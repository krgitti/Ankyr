/**
 * The sky above a place.
 *
 * The mechanism knows nothing of geography: it computes ecliptic longitudes,
 * valid anywhere. To turn them into what an observer sees — altitude, azimuth,
 * rising and setting — we need a place, a sidereal clock and the obliquity.
 *
 * This module is reference-side only, exactly like `ephemeris.ts`: it never
 * feeds the gears. It exists so the emulator can answer "was the eclipse
 * visible from Rhodes?" and "how high was the Moon at dusk?".
 *
 * Formulae: Meeus, *Astronomical Algorithms*, ch. 12 (sidereal time), 13
 * (horizontal coordinates), 15 (rising/setting), 40 (topocentric parallax).
 * Truncated but standard; the honest accuracy is a few arcminutes, which is
 * what the panel claims.
 */

import { moonPosition, sunLongitude, bodyLongitude, norm360, nextSyzygy, type Body } from './ephemeris';
import { RAD, DEG } from './time';

export interface Observer {
  id: string;
  name: string;
  /** Degrees, north positive. */
  lat: number;
  /** Degrees, east positive. */
  lon: number;
  note?: string;
}

export const PLACES: Observer[] = [
  { id: 'syracuse', name: 'Siracusa', lat: 37.0755, lon: 15.2866, note: 'pátria de Arquimedes' },
  { id: 'rhodes', name: 'Rodi', lat: 36.4349, lon: 28.2176, note: 'observatório de Hiparco' },
  { id: 'alexandria', name: 'Alexandria', lat: 31.2001, lon: 29.9187, note: 'Ptolomeu, 400 anos depois' },
  { id: 'athens', name: 'Atenas', lat: 37.9838, lon: 23.7275 },
  { id: 'antikythera', name: 'Antikythera', lat: 35.8617, lon: 23.3050, note: 'onde o mecanismo foi achado' },
  { id: 'babylon', name: 'Babilónia', lat: 32.5364, lon: 44.4208, note: 'os registos que deram os períodos' },
];

/** Mean obliquity of the ecliptic, degrees (Meeus 22.2, truncated). */
export const obliquity = (jd: number): number => {
  const T = (jd - 2451545.0) / 36525;
  return 23.43929111 - 0.013004167 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
};

/** Greenwich mean sidereal time, degrees (Meeus 12.4). */
export const gmst = (jd: number): number => {
  const T = (jd - 2451545.0) / 36525;
  const theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
  return norm360(theta);
};

export interface Equatorial {
  ra: number;
  dec: number;
}

/** Ecliptic (lon, lat) → equatorial (RA, Dec), both in degrees, equinox of date. */
export const eclipticToEquatorial = (lon: number, lat: number, jd: number): Equatorial => {
  const eps = obliquity(jd) * RAD;
  const l = lon * RAD;
  const b = lat * RAD;
  const ra = Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l));
  return { ra: norm360(ra * DEG), dec: dec * DEG };
};

export interface Horizontal {
  alt: number;
  az: number;
}

/** Local hour angle in degrees (−180…180). */
export const hourAngle = (ra: number, jd: number, observer: Observer): number => {
  const lst = gmst(jd) + observer.lon;
  let h = lst - ra;
  h = ((h + 180) % 360 + 360) % 360 - 180;
  return h;
};

export const equatorialToHorizontal = (eq: Equatorial, jd: number, observer: Observer): Horizontal => {
  const H = hourAngle(eq.ra, jd, observer) * RAD;
  const dec = eq.dec * RAD;
  const lat = observer.lat * RAD;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  // Azimuth measured from North through East (Meeus §13.5 gives it from the
  // South, hence the +180).
  const az = Math.atan2(
    Math.cos(dec) * Math.sin(H),
    Math.cos(dec) * Math.cos(H) * Math.sin(lat) - Math.sin(dec) * Math.cos(lat),
  );
  return { alt: alt * DEG, az: norm360(az * DEG + 180) };
};

/** Where a body appears from a place at an instant. */
export const bodyHorizontal = (body: Body, jd: number, observer: Observer) => {
  const lon = bodyLongitude(body, jd);
  const lat = body === 'moon' ? moonPosition(jd).latitude : body === 'sun' ? 0 : 0;
  const eq = eclipticToEquatorial(lon, lat, jd);
  return { ...equatorialToHorizontal(eq, jd, observer), eq, lon };
};

// ── Rising and setting ────────────────────────────────────────────────────

export interface RiseSet {
  rise: number | null;
  set: number | null;
  /** Altitude at the requested instant, degrees. */
  alt: number;
  az: number;
  /** Azimuth of rising and setting, degrees. */
  riseAz: number | null;
  setAz: number | null;
  circumpolar: 'never' | 'always' | 'normal';
}

/**
 * Rising and setting for the civil day containing `jd` (UTC, longitude-corrected
 * through the sidereal time). Uses the standard hour-angle formula with the
 * body's declination at transit; one refinement pass.
 */
export const riseSet = (body: Body, jd: number, observer: Observer): RiseSet => {
  // h0: the altitude of the centre at the geometric event.
  // Sun: −0.833° (refraction + semi-diameter). Moon: +0.125° (parallax −
  // refraction − semi-diameter), Meeus §15.
  const h0 = body === 'sun' ? -0.8333 : body === 'moon' ? 0.125 : -0.5667;
  const at = bodyHorizontal(body, jd, observer);
  let dec = at.eq.dec;
  let ra = at.eq.ra;
  // Refine at the transit time.
  const H0 = hourAngle(ra, jd, observer);
  const transitJD = jd - H0 / 360.98564736629;
  const atTransit = bodyHorizontal(body, transitJD, observer);
  dec = atTransit.eq.dec;
  ra = atTransit.eq.ra;

  const cosH = (Math.sin(h0 * RAD) - Math.sin(observer.lat * RAD) * Math.sin(dec * RAD)) /
    (Math.cos(observer.lat * RAD) * Math.cos(dec * RAD));
  if (cosH < -1) return { rise: null, set: null, alt: at.alt, az: at.az, riseAz: null, setAz: null, circumpolar: 'always' };
  if (cosH > 1) return { rise: null, set: null, alt: at.alt, az: at.az, riseAz: null, setAz: null, circumpolar: 'never' };
  const H = Math.acos(cosH) * DEG;
  const transit = transitJD;
  const rise = transit - H / 360.98564736629;
  const set = transit + H / 360.98564736629;
  const risePos = bodyHorizontal(body, rise, observer);
  const setPos = bodyHorizontal(body, set, observer);
  return {
    rise,
    set,
    alt: at.alt,
    az: at.az,
    riseAz: risePos.az,
    setAz: setPos.az,
    circumpolar: 'normal',
  };
};

/** Local mean time as a decimal hour (UT + lon/15). */
export const localHour = (jd: number, observer: Observer): number => {
  const dayFraction = ((jd + 0.5) % 1 + 1) % 1;
  return (dayFraction * 24 + observer.lon / 15 + 24) % 24;
};

export const formatHour = (h: number): string => {
  const total = ((h % 24) + 24) % 24;
  const hours = Math.floor(total);
  const minutes = Math.round((total - hours) * 60);
  const hh = minutes === 60 ? (hours + 1) % 24 : hours;
  const mm = minutes === 60 ? 0 : minutes;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

/** Julian Day of local mean noon on the civil day containing jd (for a place). */
export const localNoon = (jd: number, observer: Observer): number => {
  const day = Math.floor(jd + 0.5) - 0.5;
  return day + 0.5 - observer.lon / 360;
};

// ── Eclipses from a place ─────────────────────────────────────────────────

export interface LocalEclipse {
  kind: 'solar' | 'lunar';
  jd: number;
  altitude: number;
  azimuth: number;
  /** Angular separation of the discs, degrees (topocentric). */
  separation: number;
  /** Sum of the apparent radii, degrees. */
  contact: number;
  /** 0 = none, 1 = grazing, >1 = the Moon's disc enters the Sun's / Earth's shadow. */
  magnitude: number;
  visible: boolean;
  /** Why it is or is not visible. */
  reason: string;
}

const moonParallaxDeg = 0.9508; // mean horizontal parallax of the Moon

/**
 * Topocentric separation of the Moon from the Sun (solar) or from the shadow
 * axis (lunar) at a syzygy. The Moon's parallax moves it by up to a degree, so
 * a geocentric check would be wrong about which places see the eclipse.
 */
export const localEclipse = (
  kind: 'solar' | 'lunar',
  jd: number,
  observer: Observer,
): LocalEclipse => {
  const sunLon = sunLongitude(jd);
  const moon = moonPosition(jd);
  const moonEq = eclipticToEquatorial(moon.longitude, moon.latitude, jd);
  const H = hourAngle(moonEq.ra, jd, observer) * RAD;
  const dec = moonEq.dec * RAD;
  const lat = observer.lat * RAD;
  const pi = moonParallaxDeg * RAD;
  // Meeus §40, ignoring the observer's elevation and the lunar distance
  // variation beyond the mean parallax.
  // Observer's geocentric coordinates at sea level (Meeus §11).
  const rhoCos = Math.cos(lat);
  const rhoSin = 0.99664719 * Math.sin(lat);
  const dRa = Math.atan2(-rhoCos * Math.sin(pi) * Math.sin(H), Math.cos(dec) - rhoCos * Math.sin(pi) * Math.cos(H));
  const topoRa = moonEq.ra + dRa * DEG;
  const topoDec =
    Math.atan2(
      (Math.sin(dec) - rhoSin * Math.sin(pi)) * Math.cos(dRa),
      Math.cos(dec) - rhoCos * Math.sin(pi) * Math.cos(H),
    ) * DEG;

  const topo = equatorialToHorizontal({ ra: topoRa, dec: topoDec }, jd, observer);
  const sunEq = eclipticToEquatorial(sunLon, 0, jd);
  const sunHor = equatorialToHorizontal(sunEq, jd, observer);

  const sunRadius = 0.2666;
  const moonRadius = 0.2591;
  const moonShadow = 0.7;

  let separation: number;
  let contact: number;
  let altitude: number;
  let azimuth: number;
  if (kind === 'solar') {
    separation = angularSeparation(topoRa, topoDec, sunEq.ra, sunEq.dec);
    contact = sunRadius + moonRadius;
    altitude = sunHor.alt;
    azimuth = sunHor.az;
  } else {
    // For a lunar eclipse the relevant test is the Moon against the shadow
    // axis, i.e. against the anti-solar point.
    const antiLon = norm360(sunLon + 180);
    const shadowEq = eclipticToEquatorial(antiLon, 0, jd);
    separation = angularSeparation(topoRa, topoDec, shadowEq.ra, shadowEq.dec);
    contact = moonRadius + moonShadow;
    altitude = topo.alt;
    azimuth = topo.az;
  }
  // 0 at first contact, 1 when the discs are concentric.
  const magnitude = contact > 0 ? Math.max(0, (contact - separation) / contact) : 0;
  const visible = altitude > 0 && separation < contact;
  const reason = altitude <= 0
    ? 'abaixo do horizonte nesta hora'
    : separation >= contact
      ? 'os discos não se sobrepõem vistos daqui'
      : 'dentro dos contactos, acima do horizonte';
  return { kind, jd, altitude, azimuth, separation, contact, magnitude, visible, reason };
};

/** Great-circle separation of two equatorial positions, degrees. */
export const angularSeparation = (ra1: number, dec1: number, ra2: number, dec2: number): number => {
  const a1 = ra1 * RAD;
  const d1 = dec1 * RAD;
  const a2 = ra2 * RAD;
  const d2 = dec2 * RAD;
  const cos = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(a1 - a2);
  return Math.acos(Math.max(-1, Math.min(1, cos))) * DEG;
};

/** Length of the day, hours, between sunrise and sunset. */
export const dayLength = (body: Body, jd: number, observer: Observer): number => {
  const rs = riseSet(body, jd, observer);
  if (rs.rise === null || rs.set === null) return rs.circumpolar === 'always' ? 24 : 0;
  return (rs.set - rs.rise) * 24;
};

/**
 * Next syzygy at which an eclipse is possible at all (geocentric test: the
 * Moon within 1.55° of the node axis). Searches at most `maxLunations` ahead;
 * a solar eclipse always occurs within six lunations.
 */
export const nextEclipse = (jd: number, kind: 'solar' | 'lunar', maxLunations = 40): number | null => {
  let t = jd;
  for (let i = 0; i < maxLunations; i++) {
    t = nextSyzygy(t, kind === 'solar' ? 0 : 180);
    const beta = Math.abs(moonPosition(t).latitude);
    if (beta < 1.55) return t;
    t += 0.5;
  }
  return null;
};

/** Local circumstances of the next eclipse of either kind, whichever comes first. */
export const nextLocalEclipse = (jd: number, observer: Observer): LocalEclipse | null => {
  const solar = nextEclipse(jd, 'solar');
  const lunar = nextEclipse(jd, 'lunar');
  if (solar === null && lunar === null) return null;
  if (solar !== null && (lunar === null || solar <= lunar)) return localEclipse('solar', solar, observer);
  return localEclipse('lunar', lunar!, observer);
};
