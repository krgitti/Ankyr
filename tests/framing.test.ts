import { describe, expect, it } from 'vitest';
import {
  FOV_DEG,
  VIEW_POSITIONS,
  VIEW_NAMES,
  visibleHalfHeight,
  REQUIRED_HALF_HEIGHT,
  REQUIRED_HALF_WIDTH,
} from '../src/three/views';
import { CASE, FRONT_BEZEL_Z, BACK_PLATE_Z, FRONT_RING } from '../src/core/layout';

/**
 * The 3D view is not testable in Node (no WebGL), but the *framing* is pure
 * arithmetic: it is the single thing most likely to make the machine look
 * broken, so it is checked here.
 */
describe('enquadramento da câmara', () => {
  it('a face do mecanismo cabe em todas as vistas', () => {
    for (const { id } of VIEW_NAMES) {
      const [x, y, z] = VIEW_POSITIONS[id];
      const distance = Math.hypot(x, y, z);
      const half = visibleHalfHeight(distance);
      expect(half, id).toBeGreaterThan(REQUIRED_HALF_HEIGHT * 1.05);
    }
  });

  it('sobra margem para a moldura e para a profundidade', () => {
    for (const { id } of VIEW_NAMES) {
      const [x, y, z] = VIEW_POSITIONS[id];
      const half = visibleHalfHeight(Math.hypot(x, y, z));
      expect(half / REQUIRED_HALF_HEIGHT, id).toBeGreaterThan(1.05);
      expect(half / REQUIRED_HALF_HEIGHT, id).toBeLessThan(1.6);
    }
  });

  it('a vista lateral e a de topo não cortam a espessura', () => {
    const thickness = Math.abs(FRONT_BEZEL_Z - BACK_PLATE_Z) / 2;
    for (const id of ['side', 'top'] as const) {
      const [x, y, z] = VIEW_POSITIONS[id];
      const half = visibleHalfHeight(Math.hypot(x, y, z));
      expect(half, id).toBeGreaterThan(thickness + CASE.halfWidth / 2);
    }
  });

  it('o campo de visão é o esperado e o anel zodiacal cabe', () => {
    expect(FOV_DEG).toBe(38);
    expect(FRONT_RING.zodiacOuter).toBeLessThan(CASE.halfWidth);
    expect(REQUIRED_HALF_WIDTH).toBeGreaterThan(FRONT_RING.zodiacOuter);
  });

  it('as três vistas ortogonais apontam para o eixo certo', () => {
    expect(VIEW_POSITIONS.front[2]).toBeGreaterThan(0);
    expect(VIEW_POSITIONS.back[2]).toBeLessThan(0);
    expect(Math.abs(VIEW_POSITIONS.top[1])).toBeGreaterThan(VIEW_POSITIONS.top[0]);
    expect(Math.abs(VIEW_POSITIONS.side[0])).toBeGreaterThan(VIEW_POSITIONS.side[1]);
  });
});
