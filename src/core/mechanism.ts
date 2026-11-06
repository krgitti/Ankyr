/**
 * The Mechanism as a machine: from crank angle (or a date) to every display.
 *
 * This is the facade the UI talks to. It owns no astronomy of its own: the
 * longitudes below are read off gears whose rates were solved from the tooth
 * counts. The only free parameters are *assembly* parameters — how a pointer
 * was keyed onto its arbor, and where the pin of the lunar anomaly sits on k1.
 * These are calibrated once, at the epoch, and frozen as constants (see
 * `CALIBRATION` below), so the emulator has no hidden adjustable knobs.
 */

import {
  GEARS,
  GEAR,
  INFERIOR_FOLLOWER,
  SOLAR_APOGEE_DEG,
  SUN_FOLLOWER,
  SUPERIOR_PIN_SLOT,
  type TrainId,
} from './gears';
import { Kinematics, RATES, SCHEDULE, turnsOf, pinSlotDelta, type MeshError, type Phases, type Rates } from './kinematics';
import { Q } from './rational';
import { EPOCH_JD, DAYS_PER_YEAR, yearsFromJD, jdFromYears, wrap360, DEG } from './time';
import { GLYPH_BY_MONTH, exeligmosCorrection, type Glyph } from './eclipses';
import { METONIC, metonicDate, type MetonicDate } from './calendar';
import { bodyLongitude, type Body } from './ephemeris';

/**
 * Assembly phases and mount offsets, calibrated at the epoch JD 1646679.04084
 * against the modern ephemeris of ephemeris.ts. They are constants of the
 * *mounting*, not of the transmission: any value leaves every rate untouched.
 * Reproduce them with `npm run report` (scripts/calibrate.ts).
 */
export interface Calibration {
  /** Assembly phase of the pin-carrying gears, in turns. */
  phases: Phases;
  /** Degrees added to each ring at the epoch so it reads its true longitude. */
  mount: Record<Body | 'nodes', number>;
}

export const CALIBRATION: Calibration = {
  /**
   * The only free assembly parameters of the machine: where the pin sits on
   * the pin-carrying gear of each epicyclic system. They set the phase of the
   * equation (where in its synodic cycle each body starts at the epoch) and
   * change no rate whatsoever. Fitted by src/core/fit.ts.
   */
  phases: {
    k1: 0.224449282787,
    merc20: 0.813908811475,
    r1: 0.629290471311,
    mars71: 0.363601434426,
    jup43: 0.796170594262,
    sat68: 0.190701844262,
  },
  mount: {
    sun: 46.605757711222,
    moon: 143.670202620853,
    mercury: 147.4562371327,
    venus: 306.228070263571,
    mars: 246.902519028405,
    jupiter: 17.795162032061,
    saturn: 162.228225775181,
    nodes: 266.708905980602,
  },
};

/** Where each dial's pointer sits at T = 0 (fractions of a cell / turn). */
export const DIAL_PHASE = {
  /** Full Moon 1 of the Saros dial: 17 EYu into month 1 (Freeth 2014). */
  saros: Q.of(17, 38),
  /** The Metonic month starts with the same lunation (Freeth 2014 epoch). */
  metonic: Q.of(17, 38),
  /** 205 BC: year 4 of Olympiad 143 (games of 144 in summer 204 BC). */
  olympiad: 3 + 0.45 / 12.37,
  /** First Callippic period from the solstice of 330 BC → 48.88 years in. */
  callippic: 48.88,
  exeligmos: 0.0,
};

export interface Readout {
  jd: number;
  T: Q;
  gears: Float64Array;
  longitude: Record<Body | 'nodes', number>;
  meanSun: number;
  /** Moon minus mean Sun, degrees: what the phase ball shows. */
  phaseAngle: number;
  /** Synodic month phase 0…1 (0 = new). */
  synodicPhase: number;
  dials: Dials;
  gearAngles: Record<string, number>;
}

export interface Dials {
  metonicMonth: number; // 0 ≤ x < 235, continuous
  metonicDate: MetonicDate;
  sarosMonth: number; // 0 ≤ x < 223, continuous
  glyph?: Glyph;
  exeligmos: number; // 0 ≤ x < 3
  exeligmosSector: number;
  exeligmosHours: number;
  olympiadYear: number; // 0 ≤ x < 4 (continuous)
  callippicYear: number; // 0 ≤ x < 76
}

const modQ = (x: Q, m: number): number => {
  const mq = Q.of(m);
  return x.sub(mq.mul(Q.of(x.div(mq).floor()))).toNumber();
};

const vecAngle = (r1: number, a1: number, r2: number, a2: number) =>
  Math.atan2(
    r1 * Math.sin(a1 / DEG) + r2 * Math.sin(a2 / DEG),
    r1 * Math.cos(a1 / DEG) + r2 * Math.cos(a2 / DEG),
  ) * DEG;

/**
 * The equation of the epicycle, as the pin-and-slot device embodies it.
 *
 * The device makes the angle of the slot gear deviate from uniform rotation by
 * asin(d/p · sin α), where d/p is the ratio of the axis offset to the pin
 * radius — exactly the ratio R_earth / R_planet of Hellenistic theory (Freeth
 * et al. 2021, Table S9: Mars 6.58/10.0 = 1/1.52, Jupiter 1.58/8.22 = 1/5.2,
 * Saturn 1.50/14.37 = 1/9.58). We compute the equation from that ideal
 * geometry and check the deviation of the physical straight-slot device from
 * it in the validation suite ("device vs theory").
 */
export const epicycleEquationDeg = (alphaTurns: number, ratio: number): number =>
  (Math.asin(Math.max(-1, Math.min(1, ratio * Math.sin(2 * Math.PI * alphaTurns)))) * 180) / Math.PI;

const SUPERIOR: Record<'mars' | 'jupiter' | 'saturn', { out: string; pin: string }> = {
  mars: { out: 'mars80', pin: 'mars71' },
  jupiter: { out: 'jup65', pin: 'jup43' },
  saturn: { out: 'sat86', pin: 'sat68' },
};

/** Directions of the epicycle axes in the frame of b1 (drawing degrees). */
export const FRONT_AXIS_ANGLE: Record<string, number> = {
  merc20: 60 + 38,
  r1: -150 + 50,
};

export class Mechanism {
  readonly kin: Kinematics;
  readonly daysPerYear: Q;
  readonly calibration: Calibration;
  readonly superiorModel: 'device' | 'epicycle';

  constructor(
    rates: Rates = RATES,
    daysPerYear: Q = DAYS_PER_YEAR,
    calibration: Calibration = CALIBRATION,
    superiorModel: 'device' | 'epicycle' = 'device',
  ) {
    this.kin = new Kinematics(rates, SCHEDULE);
    this.daysPerYear = daysPerYear;
    this.calibration = calibration;
    this.superiorModel = superiorModel;
  }

  yearsAt(jd: number): Q {
    return Q.fromNumber(jd).sub(Q.fromNumber(EPOCH_JD)).div(this.daysPerYear);
  }

  jdAt(T: Q): number {
    return jdFromYears(T);
  }

  gearsAt(jd: number, meshError?: MeshError) {
    return this.kin.evaluate(this.yearsAt(jd), this.phases, meshError);
  }

  get phases(): Phases {
    return this.calibration.phases;
  }

  /** Zodiac longitudes read off the gears (turns → degrees). */
  longitudes(g: Float64Array): Record<Body | 'nodes', number> {
    const m = this.calibration.mount;
    const b1 = turnsOf(g, 'b1') * 360;
    // The mean Sun advances with b1 alone; the mount offset rotates only the
    // output ring, never the eccentric geometry (the apogee is fixed in space
    // by the pin of the inertially fixed 56-tooth wheel).
    const mean = b1;

    const inferior = (body: 'mercury' | 'venus', gear: string) => {
      const f = INFERIOR_FOLLOWER[body];
      // The deferent rotates with b1; the epicycle wheel turns on its own axis.
      const deferentAngle = b1 - FRONT_AXIS_ANGLE[gear];
      return wrap360(vecAngle(f.deferent, deferentAngle, f.epicycle, turnsOf(g, gear) * 360) + m[body]);
    };

    // Superior planets: the output tube turns at the sidereal rate; the
    // equation comes from the epicycle whose phase is the pin gear's angle
    // relative to b1 (the synodic anomaly).
    const superior = (body: 'mars' | 'jupiter' | 'saturn') => {
      const { out, pin } = SUPERIOR[body];
      const cfg = SUPERIOR_PIN_SLOT[body];
      const alpha = turnsOf(g, pin) - turnsOf(g, 'b1');
      if (this.superiorModel === 'device') {
        // The straight-slot device, exactly as the gears and its geometry make
        // it behave. Its equation is not the simple epicycle: the second
        // harmonic of the device happens to stand in for the eccentricity of
        // the planet's own orbit, which is why it fits Mars far better than
        // the ideal epicycle (validation, "device vs epicycle").
        return wrap360(turnsOf(g, out) * 360 + m[body]);
      }
      // Alternative: replace the device's deviation by the ideal epicyclic
      // equation asin((d/p)·sin α), keeping the mean rotation.
      const device = pinSlotDelta(alpha, cfg.offset, cfg.pin, -cfg.angle / 360);
      const meanTurns = turnsOf(g, out) + device;
      const eq = epicycleEquationDeg(alpha, cfg.offset / cfg.pin) / 360;
      return wrap360((meanTurns + eq) * 360 + m[body]);
    };

    return {
      // Follower on the pin of the inertially fixed 56: the pin defines the
      // apogee in space, so the Sun runs on Hipparchus' eccentric (1/24 of the
      // radius, apogee at Gemini 5½°). The equation is the angle the follower
      // adds to the mean Sun; the mount offset then keys the ring.
      sun: wrap360(
        vecAngle(
          SUN_FOLLOWER.deferent,
          mean + m.sun,
          SUN_FOLLOWER.eccentric,
          SOLAR_APOGEE_DEG + turnsOf(g, 'sun56') * 360,
        ),
      ),
      moon: wrap360(turnsOf(g, 'b3') * 360 + m.moon),
      mercury: inferior('mercury', 'merc20'),
      venus: inferior('venus', 'r1'),
      mars: superior('mars'),
      jupiter: superior('jupiter'),
      saturn: superior('saturn'),
      nodes: wrap360(turnsOf(g, 'nodes48') * 360 + m.nodes),
    };
  }

  dials(T: Q): Dials {
    const r = (id: string) => this.kin.rate(id);
    const metonic = modQ(r('n1').neg().mul(T).mul(Q.of(METONIC.monthsPerTurn)).add(Q.fromNumber(DIAL_PHASE.metonic.toNumber())), METONIC.months);
    const saros = modQ(r('g1').neg().mul(T).mul(Q.of(223, 4)).add(Q.fromNumber(DIAL_PHASE.saros.toNumber())), 223);
    const exeligmos = modQ(r('i1').neg().mul(T).mul(Q.of(3)).add(Q.fromNumber(DIAL_PHASE.exeligmos)), 3);
    const olympiad = (modQ(r('o1').mul(T).mul(Q.of(4)), 4) + DIAL_PHASE.olympiad) % 4;
    const callippic = (modQ(r('q1').neg().mul(T).mul(Q.of(76)), 76) + DIAL_PHASE.callippic) % 76;
    const sector = exeligmosCorrection(exeligmos);
    return {
      metonicMonth: metonic,
      metonicDate: metonicDate(metonic),
      sarosMonth: saros,
      glyph: GLYPH_BY_MONTH.get(Math.floor(saros) + 1),
      exeligmos,
      exeligmosSector: sector.sector,
      exeligmosHours: sector.hours,
      olympiadYear: olympiad,
      callippicYear: callippic,
    };
  }

  read(jd: number, meshError?: MeshError): Readout {
    const T = this.yearsAt(jd);
    const gears = this.kin.evaluate(T, this.phases, meshError);
    const longitude = this.longitudes(gears);
    const meanSun = wrap360(turnsOf(gears, 'b1') * 360 + this.calibration.mount.sun);
    const phaseAngle = wrap360(longitude.moon - meanSun);
    const gearAngles: Record<string, number> = {};
    for (const g of GEARS) gearAngles[g.id] = turnsOf(gears, g.id);
    return {
      jd,
      T,
      gears,
      longitude,
      meanSun,
      phaseAngle,
      synodicPhase: phaseAngle / 360,
      dials: this.dials(T),
      gearAngles,
    };
  }

  /** Convenience: crank turns needed to reach a date from the epoch. */
  crankTurnsTo(jd: number): number {
    return -this.kin.rate('a1').mul(this.yearsAt(jd)).toNumber();
  }

  /** Julian Day reached after a number of crank turns from the epoch. */
  jdAfterCrank(turns: number): number {
    const T = Q.fromNumber(turns).div(this.kin.rate('a1').neg());
    return this.jdAt(T);
  }
}

export const mechanism = new Mechanism();

/** Ideal teeth-free version: same graph, exact modern mean motions. */
export const idealRates = (): Rates => {
  const Y = 365.242190;
  const f = (x: number) => Q.fromNumber(x);
  const sidereal = Y / 27.321661;
  const anomalistic = Y / 27.554550;
  const draconic = Y / 27.212221;
  const apsides = sidereal - anomalistic;
  const rates = new Map(RATES);
  const set = (ids: string[], v: number) => ids.forEach((id) => rates.set(id, f(v)));
  set(['e2', 'e5', 'e6', 'e1'], -sidereal);
  set(['b3'], sidereal);
  set(['e3', 'e4'], -apsides);
  set(['k1', 'k2'], -2 * apsides + sidereal);
  set(['ma1'], 2 * sidereal - 1);
  const synodicMonths = Y / 29.530589;
  set(['g1', 'g2'], (-synodicMonths * 4) / 223);
  set(['i1'], -synodicMonths / 669);
  set(['n1', 'n2', 'n3'], (-synodicMonths * 5) / 235);
  set(['nodes48'], sidereal - draconic);
  return rates;
};

/** Gear table with derived quantities, for the inspector and the report. */
export interface GearRow {
  id: string;
  teeth: number;
  train: TrainId;
  surviving: boolean;
  grade: string;
  rate: Q;
  turnsPerYear: number;
  degPerDay: number;
  direction: 'horário' | 'anti-horário' | 'fixa';
  periodYears: number | null;
  role: string;
  evidence: string;
}

export const gearRows = (kin: Kinematics = mechanism.kin): GearRow[] =>
  GEARS.map((g) => {
    const rate = kin.rate(g.id);
    const turnsPerYear = rate.toNumber();
    const period = rate.isZero() ? null : Q.ONE.div(rate.abs()).toNumber();
    return {
      id: g.id,
      teeth: g.teeth,
      train: g.train,
      surviving: g.surviving,
      grade: g.grade,
      rate,
      turnsPerYear,
      degPerDay: (rate.div(DAYS_PER_YEAR).toNumber()) * 360,
      direction: rate.isZero() ? 'fixa' : rate.isNeg() ? 'anti-horário' : 'horário',
      periodYears: period,
      role: g.role,
      evidence: g.evidence,
    };
  });

/** Modern reference longitude for a body at a given date (validation only). */
export const referenceLongitude = (body: Body, jd: number) => bodyLongitude(body, jd);

/** Sanity: the catalogue and the graph must agree. */
export const CATALOGUE_SIZE = GEARS.length;
export const THIRTY_SURVIVORS = GEARS.filter((g) => g.surviving).length;
void GEAR;
