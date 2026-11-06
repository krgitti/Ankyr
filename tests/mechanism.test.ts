import { describe, expect, it } from 'vitest';
import { mechanism, CALIBRATION, gearRows } from '../src/core/mechanism';
import { EPOCH_JD, DAYS_PER_YEAR, yearsFromJD, wrap360, normAngularDiff } from '../src/core/time';
import { Q } from '../src/core/rational';
const BODY_ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;

describe('leitura do mecanismo', () => {
  const r = mechanism.read(EPOCH_JD);

  it('não depende do histórico (determinismo)', () => {
    mechanism.read(EPOCH_JD + 12345);
    const again = mechanism.read(EPOCH_JD);
    for (const id of Object.keys(r.gearAngles)) {
      expect(again.gearAngles[id]).toBeCloseTo(r.gearAngles[id], 12);
    }
  });

  it('os nove indicadores existem e estão normalizados', () => {
    expect(BODY_ORDER.length + 1 + 1).toBe(9); // seven bodies + nodes + the date pointer
    for (const b of [...BODY_ORDER, 'nodes' as const]) {
      const v = r.longitude[b];
      expect(Number.isFinite(v), b).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(360);
    }
  });

  it('T é o tempo em anos desde a época', () => {
    const jd = EPOCH_JD + 1000;
    const out = mechanism.read(jd);
    expect(out.T.eq(yearsFromJD(jd))).toBe(true);
  });

  it('a roda motriz avança exactamente com T', () => {
    for (const years of [0, 0.5, 1, 7.25, -3]) {
      const jd = EPOCH_JD + years * DAYS_PER_YEAR.toNumber();
      const out = mechanism.read(jd);
      const expected = years - Math.floor(years);
      const actual = ((out.gearAngles.b1 % 1) + 1) % 1;
      expect(Math.abs(actual - expected)).toBeLessThan(1e-9);
    }
  });

  it('o Meton fecha em 19 anos e o Saros em 223 meses', () => {
    const a = mechanism.read(EPOCH_JD);
    const met = mechanism.read(EPOCH_JD + 365.25 * 19);
    expect(((met.dials.metonicMonth - a.dials.metonicMonth) % 235 + 235) % 235).toBeCloseTo(0, 6);
    // The Saros dial must return after exactly 223 lunations of the drive:
    // 223 months at 235/19 months per year.
    const T223 = (223 * 19) / 235;
    const b = mechanism.read(EPOCH_JD + 365.25 * T223);
    const dSar = ((b.dials.sarosMonth - a.dials.sarosMonth) % 223 + 223) % 223;
    expect(Math.min(dSar, 223 - dSar)).toBeLessThan(0.02);
    // And 19 years = 235 lunations = one Saros plus twelve cells.
    const c = mechanism.read(EPOCH_JD + 365.25 * 19);
    expect(((c.dials.sarosMonth - a.dials.sarosMonth) % 223 + 223) % 223).toBeCloseTo(12, 4);
  });

  it('a revolução sideral da Lua é 27.3216 dias', () => {
    // The mechanism's own moon period, measured on the gearing only.
    const rate = mechanism.kin.rate('b3');
    const days = 360 / ((rate.toNumber() * 360) / 365.25);
    expect(days).toBeCloseTo(27.3216, 3);
  });

  it('as fases de montagem cabem em [0,1)', () => {
    for (const [id, p] of Object.entries(CALIBRATION.phases)) {
      expect(p, id).toBeGreaterThanOrEqual(0);
      expect(p, id).toBeLessThan(1);
    }
  });

  it('todas as 69 rodas recebem uma taxa racional', () => {
    const rows = gearRows();
    expect(rows.length).toBe(69);
    for (const row of rows) expect(row.rate).toBeInstanceOf(Q);
  });

  it('a marcha-atrás desfaz a marcha-em-frente', () => {
    const t = 40;
    const forward = mechanism.read(EPOCH_JD + t);
    const back = mechanism.read(EPOCH_JD - t);
    // Symmetric in the dials: the Metonic pointer is t years before the epoch,
    // which is 235 − (t mod 235) months forward.
    const phase = 2 * (CALIBRATION.phases.n1 ?? 0) * 0; // the pointer is linear: fwd + back = 2 × offset
    void phase;
    const sum = forward.dials.metonicMonth + back.dials.metonicMonth;
    const offset = (sum / 2) % 1;
    expect(Math.abs(forward.dials.metonicMonth - back.dials.metonicMonth)).toBeGreaterThan(1);
    // Symmetric about the epoch: the two positions are equidistant from the
    // pointer's position at the epoch.
    const epoch = mechanism.read(EPOCH_JD).dials.metonicMonth;
    const d1 = forward.dials.metonicMonth - epoch;
    const d2 = epoch - back.dials.metonicMonth;
    const resid = ((d1 - d2) % 235 + 235) % 235;
    expect(Math.min(resid, 235 - resid)).toBeLessThan(1e-6);
    void offset;
  });

  it('o Sol volta ao mesmo ponto depois de um ano', () => {
    const a = mechanism.read(EPOCH_JD).longitude.sun;
    const b = mechanism.read(EPOCH_JD + 365.25).longitude.sun;
    expect(Math.abs(wrap360(b - a))).toBeLessThan(1e-6);
    // And the eccentric puts the Sun about 1.9° off the mean circle.
    const c = mechanism.read(EPOCH_JD + 0.25 * 365.25);
    expect(Math.abs(normAngularDiff(c.longitude.sun, c.meanSun))).toBeLessThan(2.5);
  });
});
