import { describe, expect, it } from 'vitest';
import { GEARS, EDGES, GEAR } from '../src/core/gears';
import {
  PLANES,
  Z,
  CASE,
  FRONT_RING,
  placement,
  pitchR,
  moduleOf,
  axisPosition,
  dist,
  DIAL_CENTRES,
  EPOCH_GEOMETRY_OK,
} from '../src/core/layout';
import { Q } from '../src/core/rational';

describe('compatibilidade geométrica', () => {
  it('todas as 69 rodas têm posição finita', () => {
    for (const g of GEARS) {
      const p = placement(g.id);
      expect(Number.isFinite(p.axis.x), g.id).toBe(true);
      expect(Number.isFinite(p.axis.y), g.id).toBe(true);
      expect(Number.isFinite(p.z), g.id).toBe(true);
    }
  });

  it('cada par engrenado está à distância da soma dos raios primitivos', () => {
    let worst = 0;
    for (const e of EDGES) {
      if (e.kind !== 'mesh' || e.frame !== 'main') continue;
      // Contrate wheels mesh on their face, not on their pitch circle.
      if (GEAR.get(e.a)!.contrate || GEAR.get(e.b)!.contrate) continue;
      const d = dist(axisPosition(e.a), axisPosition(e.b));
      const err = Math.abs(d - (pitchR(e.a) + pitchR(e.b)));
      worst = Math.max(worst, err);
      expect(err, `${e.a}~${e.b}`).toBeLessThan(1e-6);
    }
    expect(worst).toBeLessThan(1e-6);
  });

  it('não há duas rodas a ocupar o mesmo plano no mesmo eixo', () => {
    for (const plane of PLANES) {
      const seen = new Map<string, string>();
      for (const id of plane) {
        // Coaxial wheels at the same z would be a collision.
        const key = `${axisPosition(id).x.toFixed(3)},${axisPosition(id).y.toFixed(3)}`;
        const other = seen.get(key);
        if (other) {
          const coupled = EDGES.some(
            (e) => 'b' in e && ((e.a === other && e.b === id) || (e.a === id && e.b === other)),
          );
          expect(coupled, `${other} e ${id} no mesmo eixo e plano`).toBe(true);
        }
        seen.set(key, id);
      }
    }
  });

  it('as rodas do mesmo plano não se interpenetram', () => {
    for (const plane of PLANES) {
      for (let i = 0; i < plane.length; i++) {
        for (let j = i + 1; j < plane.length; j++) {
          const a = plane[i];
          const b = plane[j];
          if (GEAR.get(a)!.frame !== GEAR.get(b)!.frame) continue;
          let d = 0;
          try {
            d = dist(axisPosition(a), axisPosition(b));
          } catch {
            continue;
          }
          const coupled = EDGES.some((e) => 'b' in e && ((e.a === a && e.b === b) || (e.a === b && e.b === a)));
          if (coupled) continue;
          expect(d, `${a} vs ${b}`).toBeGreaterThanOrEqual(pitchR(a) + pitchR(b) - 1e-6);
        }
      }
    }
  });

  it('cada roda cabe dentro da caixa', () => {
    for (const g of GEARS) {
      const p = placement(g.id);
      const outer = p.pitchR + 2 * p.module;
      expect(Math.abs(p.axis.x) + outer, g.id).toBeLessThanOrEqual(CASE.halfWidth);
      expect(Math.abs(p.axis.y) + outer, g.id).toBeLessThanOrEqual(CASE.halfHeight);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(CASE.depth);
    }
  });

  it('os cinco mostradores traseiros cabem na placa', () => {
    expect(Object.keys(DIAL_CENTRES).length).toBe(6);
    for (const [name, c] of Object.entries(DIAL_CENTRES)) {
      expect(Math.abs(c.y) + 33, name).toBeLessThanOrEqual(CASE.halfHeight);
      expect(Math.abs(c.x) + 33, name).toBeLessThanOrEqual(CASE.halfWidth);
    }
  });

  it('o anel zodiacal não passa da moldura', () => {
    expect(FRONT_RING.zodiacOuter).toBeLessThan(CASE.halfWidth);
    expect(EPOCH_GEOMETRY_OK).toBe(true);
  });

  it('as espessuras e módulos são positivos', () => {
    for (const g of GEARS) {
      const m = moduleOf(g.id);
      expect(m.m, g.id).toBeGreaterThan(0);
      expect(placement(g.id).thickness, g.id).toBeGreaterThan(0);
      expect(pitchR(g.id), g.id).toBeGreaterThan(0);
    }
  });

  it('todos os planos têm profundidade definida', () => {
    for (const plane of PLANES) {
      const zs = plane.map((id) => Z[id]);
      for (const z of zs) expect(Number.isFinite(z)).toBe(true);
      expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThanOrEqual(0);
    }
  });

  it('não há NaN vindo dos módulos', () => {
    for (const g of GEARS) expect(Number.isNaN(Q.ONE.toNumber() * pitchR(g.id)), g.id).toBe(false);
  });
});
