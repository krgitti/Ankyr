/**
 * Camera set-up, kept in a module with no three.js dependency so the framing
 * can be checked in a headless test (`tests/framing.test.ts`).
 */

import { CASE } from '../core/layout';

export type ViewName = 'front' | 'back' | 'side' | 'top' | 'exploded';

export const FOV_DEG = 38;

/** Camera position per view, in millimetres, in the mechanism's own frame. */
export const VIEW_POSITIONS: Record<ViewName, [number, number, number]> = {
  front: [0, 26, 470],
  back: [0, 26, -470],
  side: [470, 40, 12],
  top: [0, 470, 14],
  exploded: [170, 120, 520],
};

export const VIEW_NAMES: { id: ViewName; label: string }[] = [
  { id: 'front', label: 'Frente' },
  { id: 'back', label: 'Traseira' },
  { id: 'side', label: 'Lateral' },
  { id: 'top', label: 'Topo' },
  { id: 'exploded', label: 'Explodido' },
];

/** Colour per train, used by the X-ray mode and by the on-screen legend. */
export const TRAIN_COLOURS: Record<string, { hex: number; label: string }> = {
  drive: { hex: 0xf2efe6, label: 'acionamento' },
  moon: { hex: 0x6fa8ff, label: 'Lua' },
  phase: { hex: 0xa9c4ff, label: 'fase lunar' },
  nodes: { hex: 0xb98cff, label: 'nodos' },
  sun: { hex: 0xffcf5c, label: 'Sol' },
  mercury: { hex: 0x54e0c4, label: 'Mercúrio' },
  venus: { hex: 0x74c8ff, label: 'Vénus' },
  mars: { hex: 0xff8a63, label: 'Marte' },
  jupiter: { hex: 0xffe4a8, label: 'Júpiter' },
  saturn: { hex: 0xe9b959, label: 'Saturno' },
  metonic: { hex: 0x8ff0a4, label: 'Meton' },
  saros: { hex: 0x62d6b4, label: 'Saros' },
  exeligmos: { hex: 0x5fc4d8, label: 'Exeligmo' },
  olympiad: { hex: 0xc7a8ff, label: 'Olimpíadas' },
  callippic: { hex: 0xa99be8, label: 'Calíptico' },
};

/**
 * Half-height of the visible frustum at the distance of the mechanism, in mm.
 * The machine's face is 2·CASE.halfHeight tall plus the frame, so this is the
 * number that decides whether the dial fits without cropping.
 */
export const visibleHalfHeight = (distance: number): number =>
  Math.abs(distance) * Math.tan((FOV_DEG / 2) * (Math.PI / 180));

/** Height that must fit in the frame, including the 6 mm frame bars. */
export const REQUIRED_HALF_HEIGHT = CASE.halfHeight + 6;
export const REQUIRED_HALF_WIDTH = CASE.halfWidth + 6;
