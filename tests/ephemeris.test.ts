import { describe, expect, it } from 'vitest';
import {
  sunLongitude,
  moonPosition,
  bodyLongitude,
  moonPhaseAngle,
  illuminatedFraction,
  nextSyzygy,
  meanNodeLongitude,
  meanSunLongitude,
  norm180,
} from '../src/core/ephemeris';
import { EPOCH_JD, julianToJD } from '../src/core/time';

describe('efeméride de referência (só para verificação)', () => {
  it('o Sol está em 0° no equinócio de Março de 2020', () => {
    const lon = sunLongitude(julianToJD({ year: 2020, month: 3, day: 7.1 }));
    expect(Math.abs(norm180(lon))).toBeLessThan(0.6);
  });

  it('o Sol está em 180° no equinócio de Setembro', () => {
    const lon = sunLongitude(julianToJD({ year: 2020, month: 9, day: 9.4 }));
    expect(Math.abs(norm180(lon - 180))).toBeLessThan(0.6);
  });

  it('a Lua fica a menos de 6° do Sol numa Lua nova', () => {
    const jd = nextSyzygy(EPOCH_JD, 0);
    expect(Math.abs(norm180(bodyLongitude('moon', jd) - sunLongitude(jd)))).toBeLessThan(6);
  });

  it('a latitude lunar máxima está perto de 5,1°', () => {
    let max = 0;
    for (let d = 0; d < 7000; d += 3) {
      const b = Math.abs(moonPosition(EPOCH_JD + d).latitude);
      if (b > max) max = b;
    }
    expect(max).toBeGreaterThan(4.7);
    expect(max).toBeLessThan(5.6);
  });

  it('o ângulo de fase da época é o de uma Lua cheia (≈180°)', () => {
    expect(Math.abs(moonPhaseAngle(EPOCH_JD) - 180)).toBeLessThan(5);
  });

  it('a fracção iluminada está em [0,1]', () => {
    for (let d = 0; d < 400; d += 7) {
      const f = illuminatedFraction(EPOCH_JD + d);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it('o nodo retrogada ~19,34° por ano', () => {
    const a = meanNodeLongitude(EPOCH_JD);
    const b = meanNodeLongitude(EPOCH_JD + 365.25);
    expect(norm180(b - a)).toBeCloseTo(-19.34, 0);
  });

  it('a Lua nova seguinte resolve-se para fase 0', () => {
    const start = EPOCH_JD + 100;
    const t = nextSyzygy(start, 0);
    expect(t).toBeGreaterThan(start);
    const elapsed = t - start;
    expect(elapsed).toBeLessThanOrEqual(29.6 + 1e-6);
    expect(Math.abs(norm180(bodyLongitude('moon', t) - sunLongitude(t)))).toBeLessThan(0.02);
  });

  it('o Sol médio não coincide com o Sol verdadeiro', () => {
    const jd = EPOCH_JD + 90;
    const d = norm180(sunLongitude(jd) - meanSunLongitude(jd));
    expect(Math.abs(d)).toBeGreaterThan(0.2);
    expect(Math.abs(d)).toBeLessThan(2.5);
  });
});
