/**
 * Calibration of the machine's assembly parameters.
 *
 * The tooth counts fix every rate exactly; what they cannot fix is how the
 * maker keyed a pointer onto its tube and where he soldered a pin onto an
 * epicycle wheel. Those are the only free parameters in this emulator, and
 * they are fitted once at the epoch against the modern ephemeris:
 *
 *   1. pin phase of each pin-carrying epicyclic gear — sets the phase of the
 *      equation of the epicycle (where in the synodic cycle the body is at the
 *      epoch); fitted by scanning the phase and minimising the RMS error of
 *      that body's longitude over a window around the epoch;
 *   2. mount offset of every ring — a constant rotation, set so the ring reads
 *      its true longitude at the epoch.
 *
 * Nothing else is adjustable. `tests/calibration.test.ts` recomputes these
 * numbers and checks them against the frozen values in mechanism.ts, so the
 * provenance of every constant is auditable.
 */

import { Mechanism, type Calibration, CALIBRATION } from './mechanism';
import { EPOCH_JD, wrap360, normAngularDiff } from './time';
import { bodyLongitude, meanNodeLongitude, meanSunLongitude, type Body } from './ephemeris';

export interface FitResult {
  calibration: Calibration;
  /** RMS error in degrees over the fitting window, per body. */
  rms: Record<string, number>;
  windowDays: number;
}

const PIN_GEAR_FOR: Partial<Record<Body | 'nodes', string>> = {
  moon: 'k1',
  mercury: 'merc20',
  venus: 'r1',
  mars: 'mars71',
  jupiter: 'jup43',
  saturn: 'sat68',
};

const referenceFor = (body: Body | 'nodes', jd: number) =>
  body === 'nodes' ? meanNodeLongitude(jd) : bodyLongitude(body, jd);

export const sampleTimes = (windowDays: number, count = 61): number[] =>
  Array.from({ length: count }, (_, i) => EPOCH_JD + (i / (count - 1) - 0.5) * windowDays);

/**
 * RMS of the mechanism minus reference longitude over the window, in degrees,
 * after removing the mean offset (the mount is fitted afterwards, so the
 * offset must not bias the pin-phase fit).
 */
export const rmsError = (mech: Mechanism, body: Body, times: number[]): number => {
  const deltas = times.map((jd) => normAngularDiff(mech.read(jd).longitude[body], bodyLongitude(body, jd)));
  let sx = 0;
  let cx = 0;
  for (const d of deltas) {
    sx += Math.sin((d * Math.PI) / 180);
    cx += Math.cos((d * Math.PI) / 180);
  }
  const mean = (Math.atan2(sx, cx) * 180) / Math.PI;
  let sum = 0;
  for (const d of deltas) sum += normAngularDiff(d, mean) ** 2;
  return Math.sqrt(sum / deltas.length);
};

export const fit = (windowDays = 730, steps = 720): FitResult => {
  const times = sampleTimes(windowDays);
  const phases: Record<string, number> = { ...CALIBRATION.phases };
  // Start from zero mounts: the offsets are absolute, not increments, so the
  // fit must not inherit the frozen values.
  const calibration: Calibration = {
    phases,
    mount: { sun: 0, moon: 0, mercury: 0, venus: 0, mars: 0, jupiter: 0, saturn: 0, nodes: 0 },
  };
  let mech = new Mechanism(undefined, undefined, calibration);

  // 1. Pin phases, body by body.
  const bodies: Body[] = ['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  for (const body of bodies) {
    const gearId = PIN_GEAR_FOR[body]!;
    let best = { phase: 0, rms: Infinity };
    for (let i = 0; i < steps; i++) {
      const p = i / steps;
      phases[gearId] = p;
      const rms = rmsError(mech, body, times);
      if (rms < best.rms) best = { phase: p, rms };
    }
    // Refine: the coarse scan locates the minimum to half a degree; four
    // successive bracketing passes take it to ~1e-4 of a turn.
    let span = 1 / steps;
    for (let round = 0; round < 4; round++) {
      let step = { phase: best.phase, rms: best.rms };
      for (let i = -4; i <= 4; i++) {
        const p = best.phase + (i * span) / 4;
        phases[gearId] = p;
        const rms = rmsError(mech, body, times);
        if (rms < step.rms) step = { phase: p, rms };
      }
      best = step;
      span /= 4;
    }
    phases[gearId] = best.phase;
  }

  // 2. Mount offsets at the epoch.
  mech = new Mechanism(undefined, undefined, calibration);
  const at = mech.read(EPOCH_JD);
  const mountKeys: (Body | 'nodes')[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'nodes'];
  for (const key of mountKeys) {
    if (key === 'sun') {
      // The Sun is special: its apogee is fixed in space by the pin, so the
      // mount must align the MEAN longitude, not swallow the whole equation.
      calibration.mount.sun = wrap360(meanSunLongitude(EPOCH_JD) - at.meanSun);
    } else {
      const r = referenceFor(key, EPOCH_JD);
      calibration.mount[key] = wrap360(r - at.longitude[key]);
    }
  }

  const rms: Record<string, number> = {};
  const after = new Mechanism(undefined, undefined, calibration);
  for (const key of mountKeys) {
    const ref = key === 'nodes' ? (jd: number) => meanNodeLongitude(jd) : (jd: number) => bodyLongitude(key as Body, jd);
    let sum = 0;
    for (const jd of times) sum += normAngularDiff(after.read(jd).longitude[key], ref(jd)) ** 2;
    rms[key] = Math.sqrt(sum / times.length);
  }
  return { calibration, rms, windowDays };
};
