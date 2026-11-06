import { describe, expect, it } from 'vitest';
import { CALIBRATION, Mechanism } from '../src/core/mechanism';
import { fit } from '../src/core/fit';
import { normAngularDiff } from '../src/core/time';

/**
 * The calibration is the only fitted part of the model. This test re-runs the
 * fit and checks that the frozen values are reproducible, so nobody can quietly
 * tune the machine to match an ephemeris without the change showing up here.
 */
describe('calibração', () => {
  it('a montagem é reproduzível', () => {
    const { calibration } = fit(730, 240);
    for (const [id, p] of Object.entries(calibration.phases)) {
      const frozen = CALIBRATION.phases[id];
      expect(Math.abs(normAngularDiff(p * 360, frozen * 360)), id).toBeLessThan(1.5);
    }
    for (const [id, m] of Object.entries(calibration.mount)) {
      const frozen = CALIBRATION.mount[id as 'sun'];
      expect(Math.abs(normAngularDiff(m, frozen)), id).toBeLessThan(3);
    }
  }, 120_000);

  it('o erro quadrático médio fica dentro do tolerável', () => {
    const { rms } = fit(730, 240);
    expect(rms.sun).toBeLessThan(1);
    expect(rms.moon).toBeLessThan(2);
    expect(rms.mars).toBeLessThan(8);
    expect(rms.jupiter).toBeLessThan(2);
    expect(rms.saturn).toBeLessThan(2);
    expect(rms.mercury).toBeLessThan(8);
    expect(rms.venus).toBeLessThan(3);
    expect(rms.nodes).toBeLessThan(0.1);
  }, 120_000);

  it('as fases só mudam a equação, nunca as taxas', () => {
    const a = new Mechanism();
    const b = new Mechanism(undefined, undefined, {
      ...CALIBRATION,
      phases: { k1: 0.5, merc20: 0.1, r1: 0.9, mars71: 0.2, jup43: 0.4, sat68: 0.7 },
    });
    for (const id of ['b3', 'g1', 'n1', 'mars80', 'jup65', 'sat86']) {
      expect(b.kin.rate(id).eq(a.kin.rate(id)), id).toBe(true);
    }
  });
});
