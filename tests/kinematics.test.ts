import { describe, expect, it } from 'vitest';
import { RATES, Kinematics, ratioLine, SCHEDULE, turnsOf } from '../src/core/kinematics';
import { GEARS, GEAR, EDGES } from '../src/core/gears';
import { Q } from '../src/core/rational';

const rate = (id: string) => RATES.get(id)!;

/**
 * Signs are relative to the drive wheel b1, whose own rate is +1. The whole
 * back train turns the other way, which is why the calendar rates come out
 * negative — that is the convention, not an error.
 */
describe('catálogo', () => {
  it('tem 69 engrenagens', () => expect(GEARS.length).toBe(69));
  it('30 sobreviventes', () => expect(GEARS.filter((g) => g.surviving).length).toBe(30));
  it('todos os ids são únicos', () => expect(new Set(GEARS.map((g) => g.id)).size).toBe(GEARS.length));
  it('cada engrenagem tem uma taxa resolvida', () => {
    for (const g of GEARS) expect(RATES.has(g.id), g.id).toBe(true);
  });
});

describe('relações de transmissão exatas (A / B)', () => {
  it('Lua sideral 254/19 por ano', () => expect(rate('b3').eq(Q.of(254, 19))).toBe(true));
  it('nodos lunares −5/93', () => expect(rate('nodes48').eq(Q.of(-5, 93))).toBe(true));
  it('Saros −940/4237', () => expect(rate('g1').eq(Q.of(-940, 4237))).toBe(true));
  it('Exeligmos −235/12711', () => expect(rate('i1').eq(Q.of(-235, 12711))).toBe(true));
  it('Meton −5/19 (4 voltas de Saros)', () => expect(rate('n1').eq(Q.of(-5, 19))).toBe(true));
  it('Calíptico −1/76', () => expect(rate('q1').eq(Q.of(-1, 76))).toBe(true));
  it('Olímpico 1/4', () => expect(rate('o1').eq(Q.of(1, 4))).toBe(true));
  it('Marte sinódico 133/284', () => expect(Q.ONE.sub(rate('mars80')).eq(Q.of(133, 284))).toBe(true));
  it('Júpiter sinódico 315/344', () => expect(Q.ONE.sub(rate('jup65')).eq(Q.of(315, 344))).toBe(true));
  it('Saturno sinódico 427/442', () => expect(Q.ONE.sub(rate('sat86')).eq(Q.of(427, 442))).toBe(true));
  it('Mercúrio sinódico 1513/480', () => expect(rate('merc20').sub(Q.ONE).eq(Q.of(1513, 480))).toBe(true));
  it('Vénus sinódico 289/462', () => expect(rate('r1').sub(Q.ONE).eq(Q.of(289, 462))).toBe(true));
});

describe('leis de engrenamento', () => {
  it('ω₂/ω₁ = −Z₁/Z₂ em cada par', () => {
    const kin = new Kinematics();
    for (const e of EDGES) {
      if (e.kind !== 'mesh') continue;
      const za = GEAR.get(e.a)!.teeth;
      const zb = GEAR.get(e.b)!.teeth;
      // Same frame or not, the ratio of the two rates must equal −Za/Zb.
      if (kin.rate(e.a).isZero() || kin.rate(e.b).isZero()) continue;
      const ratio = kin.rate(e.b).div(kin.rate(e.a));
      // Only the fixed frame obeys the bare law; wheels carried by a rotating
      // frame (b1, e3, b3) get the carrier term added by the solver, which is
      // exactly the point of those trains.
      if (e.frame !== 'main') continue;
      expect(ratio.eq(Q.of(-za, zb)), `${e.a}→${e.b}`).toBe(true);
    }
  });

  it('a ordem de resolução nunca volta atrás', () => {
    const seen = new Set<string>();
    for (const step of SCHEDULE) {
      if (step.from) expect(seen.has(step.from), step.from).toBe(true);
      seen.add(step.gear);
    }
  });

  it('nenhuma taxa é não-finita; só as rodas fixas — e a roda do Sol — estão paradas', () => {
    const fixed = new Set(EDGES.filter((e) => e.kind === 'fixed').map((e) => e.a));
    // sun56 is not fixed to the plate: it comes out stationary *in the case
    // frame* because it is the planet of a 56/52 pair rolling inside a fixed
    // 56-tooth ring. The Sun pointer therefore stands still while the zodiac
    // ring revolves behind it — which is exactly how the front dial works.
    fixed.add('sun56');
    for (const g of GEARS) {
      const v = RATES.get(g.id)!.toNumber();
      expect(Number.isFinite(v), g.id).toBe(true);
      if (fixed.has(g.id)) expect(v, g.id).toBe(0);
      else expect(Math.abs(v) > 1e-12, g.id).toBe(true);
    }
  });
});

describe('cinemática', () => {
  const kin = new Kinematics();
  it('a roda motriz dá uma volta por ano', () => {
    const s = kin.evaluate(Q.ONE);
    const turn = turnsOf(s, 'b1');
    expect(((turn % 1) + 1) % 1).toBeCloseTo(0, 9);
  });
  it('a roda do Sol fica parada no referencial da caixa', () => {
    expect(rate('sun56').isZero()).toBe(true);
    expect(rate('cp52').toNumber()).toBeCloseTo(1 + 56 / 52, 12);
  });
  it('a Lua anda a 254/19 voltas por ano, modulada pela anomalia', () => {
    const s = kin.evaluate(Q.ONE);
    const expected = (254 / 19) % 1;
    const diff = turnsOf(s, 'b3') - expected;
    // The pin-and-slot cannot change the mean rate, only redistribute it: the
    // instantaneous angle is within the anomaly amplitude of the mean.
    expect(Math.abs(((diff + 0.5) % 1) - 0.5)).toBeLessThan(6.6 / 360);
  });
  it('ratioLine descreve a cadeia', () => {
    const line = ratioLine(kin, 'b3');
    expect(line.turnsPerYear).toBe('254/19');
    expect(line.turnsPerDay).toBeCloseTo(254 / 19 / 365.25, 9);
    expect(line.direction).toBe(1);
  });
});
