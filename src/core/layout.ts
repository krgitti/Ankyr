/**
 * Physical layout of the mechanism, in millimetres.
 *
 * Coordinates: x to the right and y up as seen from the FRONT, z towards the
 * viewer. The main plate is at z = 0, the back gearing at z < 0, the front
 * (Cosmos) gearing at z > 0.
 *
 * Method. Pitch radii are the measured values for the 30 surviving wheels
 * (Freeth et al. 2021, Table S8); reconstructed wheels use a module chosen so
 * that the bearings and passages seen in the fragments come out in the right
 * place (0.48 mm at the front, 0.5 mm at the back, 0.40 mm on the Circular
 * Plate). Axis positions are then obtained by intersecting circles whose radii
 * are the sums of pitch radii — that is, every meshing pair is placed at
 * exactly the distance at which it can mesh. This is not a survey of the
 * fragments; it is the geometry the evidence demands.
 *
 * Depth. Gear wheels that mesh must lie in the same plane; wheels on a common
 * arbor must lie in different planes. The planes are therefore the equivalence
 * classes of the "meshes with" relation, and the depth of each plane is a
 * colouring that keeps coaxial wheels apart. tests/geometry.test.ts verifies
 * both conditions.
 */

import { EDGES, GEAR, INFERIOR_FOLLOWER, LUNAR_OFFSET_MM, LUNAR_SLOT_ANGLE, SUPERIOR_PIN_SLOT, SUN_FOLLOWER, type Frame } from './gears';

export interface Vec2 { x: number; y: number }

export const v2 = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => v2(a.x + b.x, a.y + b.y);
export const sub = (a: Vec2, b: Vec2): Vec2 => v2(a.x - b.x, a.y - b.y);
export const len = (a: Vec2) => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2) => len(sub(a, b));
export const polar = (r: number, deg: number): Vec2 => v2(r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180));
export const angleOf = (p: Vec2) => (Math.atan2(p.y, p.x) * 180) / Math.PI;

// ── Modules and pitch radii ───────────────────────────────────────────────

export const MODULE_FRONT = 0.48;
export const MODULE_BACK = 0.5;
export const MODULE_PLATE = 0.4;

const LARGE_PLATE_GEARS = ['sat86', 'sat86s', 'jup65', 'jup65s', 'mars80', 'mars80s'];
// The node train is a planetary set: the 49 and the 48 are concentric with the
// main axis and the 62/64 pair rides at one radius. That over-determines the
// geometry — 55.5·m1 must equal 56·m2 — so the two pairs use modules that
// differ by 0.9 %, closing the train at 26.75 mm, a quarter of a millimetre
// from the 27.0 mm bearing of Spoke B.
const NODE_MODULE_A = 0.482;
const NODE_MODULE_B = (NODE_MODULE_A * 111) / 112;
const NODE_MODULES: Record<string, number> = {
  nodes49: NODE_MODULE_A, nodes62: NODE_MODULE_A, nodes64: NODE_MODULE_B, nodes48: NODE_MODULE_B,
};

export const moduleOf = (id: string): { m: number; source: 'medido' | 'reconstruido' } => {
  const g = GEAR.get(id);
  if (!g) throw new Error(`engrenagem desconhecida ${id}`);
  if (g.measured) return { m: (2 * g.measured.pitchR) / g.teeth, source: 'medido' };
  if (NODE_MODULES[id]) return { m: NODE_MODULES[id], source: 'reconstruido' };
  if (LARGE_PLATE_GEARS.includes(id)) return { m: MODULE_PLATE, source: 'reconstruido' };
  if (g.frame === 'b1' || ['inf51', 'cp56', 'b0'].includes(id)) return { m: MODULE_FRONT, source: 'reconstruido' };
  return { m: MODULE_BACK, source: 'reconstruido' };
};

export const pitchR = (id: string): number => {
  const g = GEAR.get(id)!;
  return g.measured ? g.measured.pitchR : (g.teeth * moduleOf(id).m) / 2;
};

export const outerR = (id: string): number => {
  const g = GEAR.get(id)!;
  return g.measured ? g.measured.outerR : pitchR(id) + 0.9 * moduleOf(id).m;
};

export const thickness = (id: string): number => GEAR.get(id)!.measured?.thickness ?? 1.2;

// ── Back axes (frame 'main') ──────────────────────────────────────────────

const sum = (a: string, b: string) => pitchR(a) + pitchR(b);

/** Intersection of two circles, choosing the solution on one side. */
export const intersect = (c1: Vec2, r1: number, c2: Vec2, r2: number, side: 1 | -1): Vec2 => {
  const d = dist(c1, c2);
  if (d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) {
    throw new Error(`layout: círculos não se cruzam (d=${d.toFixed(2)}, r1=${r1.toFixed(2)}, r2=${r2.toFixed(2)})`);
  }
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const ux = (c2.x - c1.x) / d;
  const uy = (c2.y - c1.y) / d;
  return v2(c1.x + a * ux - side * h * uy, c1.y + a * uy + side * h * ux);
};

export const AXES: Record<string, Vec2> = (() => {
  const A: Record<string, Vec2> = {};
  A.b = v2(0, 0); // main drive axis (b1, b2, b0, b3, ma1)
  A.e = v2(0, -sum('e1', 'b3')); // lunar train axis
  A.n = v2(0, 55); // Metonic dial centre
  A.g = v2(0, -98); // Saros dial centre
  A.d = add(A.e, polar(sum('d2', 'e2'), 160));
  A.c = intersect(A.b, sum('b2', 'c1'), A.d, sum('c2', 'd1'), -1);
  A.m = intersect(A.e, sum('m3', 'e3'), A.n, sum('m2', 'n1'), -1);
  A.l = intersect(A.b, sum('b2', 'l1'), A.m, sum('l2', 'm1'), -1);
  A.o = add(A.n, polar(sum('n2', 'o1'), 205));
  A.p = add(A.n, polar(sum('n3', 'p1'), -40));
  A.q = add(A.p, polar(sum('p2', 'q1'), 35));
  A.f = intersect(A.e, sum('e4', 'f1'), A.g, sum('f2', 'g1'), 1);
  A.h = add(A.g, polar(sum('g2', 'h1'), 25));
  A.i = add(A.h, polar(sum('h2', 'i1'), 125));
  A.a = v2(pitchR('b1') + 2.2, 0); // contrate input at the rim of b1
  return A;
})();

// ── Front axes (frame 'b1', relative to the b1 axis) ──────────────────────

export const SPOKE_ANGLE = { A: 60, B: -30, C: -150, D: 150 } as const;

export const FRONT_AXES: Record<string, Vec2> = (() => {
  const F: Record<string, Vec2> = {};
  const CENTRE = v2(0, 0);
  // Inferior planets: the output wheel (merc20 / r1) rides on the main axis and
  // turns with the epicycle. The 89 (Mercury) and the 34 (Venus) sit at the
  // deferent radius of the Hellenistic model — 36.0 and 27.8 mm — and the 40 /
  // 26 sit between them and the output. The chain 51~72~89~40~20 closes
  // exactly: every wheel is placed by intersecting two pitch circles.
  // Mercury
  F.merc72 = polar(sum('inf51', 'merc72'), SPOKE_ANGLE.A);
  F.merc89 = intersect(F.merc72, sum('merc72', 'merc89'), CENTRE, INFERIOR_FOLLOWER.mercury.deferent, 1);
  F.merc40 = intersect(F.merc89, sum('merc89', 'merc40'), CENTRE, sum('merc40', 'merc20'), -1);
  F.merc20 = CENTRE;
  // Venus
  F.ven44 = polar(sum('inf51', 'ven44'), SPOKE_ANGLE.C);
  F.ven34 = intersect(F.ven44, sum('ven44', 'ven34'), CENTRE, INFERIOR_FOLLOWER.venus.deferent, -1);
  F.ven26 = intersect(F.ven34, sum('ven34', 'ven26'), CENTRE, sum('ven26', 'r1'), 1);
  F.r1 = CENTRE;
  // Nodes: the 62/64 arbor sits exactly on the 27.0 mm bearing of Spoke B
  F.nodes62 = polar(sum('nodes49', 'nodes62'), SPOKE_ANGLE.B);
  // True Sun on the Circular Plate
  // The Circular Plate's 52-tooth wheel: its angular position is free, and it
  // is chosen so that the Saturn slot gear (41.28 mm out) clears the axle.
  F.cp52 = polar(sum('cp56', 'cp52'), 178);
  F.sun56 = intersect(v2(0, 0), SUN_FOLLOWER.deferent, F.cp52, sum('cp52', 'sun56'), -1);
  // Superior planets: the slot gear meshes the central output ring
  F.mj64 = polar(sum('cp56', 'mj64'), -90);
  const superior = (g3: string, g4: string, g5: string, g6: string, g3axis: Vec2, p: { angle: number; offset: number }, side: 1 | -1) => {
    F[g3] = g3axis; // the compound's first wheel shares the plate axle
    F[g6] = polar(2 * pitchR(g6), p.angle);
    F[g5] = add(F[g6], polar(p.offset, p.angle + 180));
    F[g4] = intersect(g3axis, sum(g3, g4), F[g5], sum(g4, g5), side);
  };
  superior('sat61', 'sat40', 'sat68', 'sat86s', F.cp52, SUPERIOR_PIN_SLOT.saturn, 1);
  superior('jup45', 'jup40', 'jup43', 'jup65s', F.mj64, SUPERIOR_PIN_SLOT.jupiter, 1);
  superior('mars38', 'mars40', 'mars71', 'mars80s', F.mj64, SUPERIOR_PIN_SLOT.mars, -1);
  // Coaxial partners share the arbor of the wheel that was placed.
  F.nodes64 = F.nodes62;

  F.sat61 = F.cp52;
  return F;
})();

/** Axes of the gears that ride on moving carriers, relative to their carrier. */
export const CARRIER_LOCAL: Record<string, Vec2> = {
  // The moon-phase pinion rides on the main axis; its carrier (b3) is inclined
  // in the real instrument, which the flat model cannot show, so it is placed
  // concentrically and the inclination is noted in the documentation.
  ma1: v2(0, 0),
  k1: polar(sum('e5', 'k1'), 90),
  k2: add(polar(sum('e5', 'k1'), 90), polar(LUNAR_OFFSET_MM, LUNAR_SLOT_ANGLE)),
};

// ── Depth: mesh planes and their colouring ────────────────────────────────

const unionFind = (ids: string[]) => {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (x: string): string => {
    let p = parent.get(x)!;
    while (p !== parent.get(p)!) {
      parent.set(p, parent.get(parent.get(p)!)!);
      p = parent.get(p)!;
    }
    return p;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  return { find, union, parent };
};

/**
 * Mesh planes: all wheels connected through meshes (or a pin-and-slot couple,
 * which must also share a plane) lie in one plane.
 */
export const PLANES: string[][] = (() => {
  const ids = [...GEAR.keys()];
  const uf = unionFind(ids);
  // Only meshing wheels must share a plane. A pin-and-slot couple lives on two
  // adjacent planes — the pin protrudes from one into the slot of the other —
  // so those wheels are deliberately kept apart.
  for (const e of EDGES) {
    if (e.kind === 'mesh') uf.union(e.a, e.b);
  }
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const r = uf.find(id);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(id);
  }
  return [...groups.values()];
})();

/** Arbor groups: wheels rigidly on one axle, which must not share a plane. */
export const ARBORS: string[][] = (() => {
  const ids = [...GEAR.keys()];
  const uf = unionFind(ids);
  for (const e of EDGES) if (e.kind === 'arbor') uf.union(e.a, e.b);
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const r = uf.find(id);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(id);
  }
  return [...groups.values()];
})();

/** Depth (z of the gear's mid-plane) for every gear. */
export const Z: Record<string, number> = (() => {
  const planeOf = new Map<string, number>();
  PLANES.forEach((p, i) => p.forEach((id) => planeOf.set(id, i)));

  // Greedy colouring: adjacent planes (sharing an arbor) get different colours.
  const n = PLANES.length;
  const adjacency: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  // Pin-and-slot couples must not share a plane either.
  for (const e of EDGES) {
    if (e.kind !== 'pinSlot') continue;
    const pa = planeOf.get(e.a)!;
    const pb = planeOf.get(e.b)!;
    if (pa === pb) continue;
    adjacency[pa].add(pb);
    adjacency[pb].add(pa);
  }
  for (const arbor of ARBORS) {
    const ps = [...new Set(arbor.map((id) => planeOf.get(id)!))];
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      adjacency[ps[i]].add(ps[j]);
      adjacency[ps[j]].add(ps[i]);
    }
  }
  const color = new Array<number>(n).fill(-1);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => adjacency[b].size - adjacency[a].size);
  for (const p of order) {
    const used = new Set([...adjacency[p]].map((q) => color[q]).filter((c) => c >= 0));
    let c = 0;
    while (used.has(c)) c++;
    color[p] = c;
  }

  // Back gears behind the main plate, front gears in front of b1.
  const z: Record<string, number> = {};
  const FRONT_TRAINS = new Set(['sun', 'nodes', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'phase']);
  const frontPlanes = new Set<number>();
  for (const [id, p] of planeOf) if (FRONT_TRAINS.has(GEAR.get(id)!.train) && GEAR.get(id)!.frame !== 'main') frontPlanes.add(p);
  const backColor = new Map<number, number>();
  const frontColor = new Map<number, number>();
  let nb = 0;
  for (let p = 0; p < n; p++) {
    if (frontPlanes.has(p)) frontColor.set(p, frontColor.size);
    else backColor.set(p, nb++);
  }
  for (const [id, p] of planeOf) {
    if (id === 'b1') { z[id] = 3.0; continue; }
    if (frontPlanes.has(p)) z[id] = 8.0 + (frontColor.get(p) ?? 0) * 2.4;
    else z[id] = -2.6 - (backColor.get(p) ?? 0) * 2.0;
  }
  // b2 sits immediately behind the main plate; b3/ma1 are the outermost
  // back layer, so that the lunar pointer clears the calendar plates.
  z.b2 = -2.6;
  z.b0 = 8.0;
  return z;
})();

export interface Placement {
  id: string;
  axis: Vec2; // absolute position of the gear's axis (b1 frame applied)
  local: Vec2; // position in its carrier's frame
  frame: Frame;
  z: number;
  thickness: number;
  pitchR: number;
  outerR: number;
  module: number;
  moduleSource: 'medido' | 'reconstruido';
}

/** Absolute axis of a gear's arbor: carriers rotate, so this is instantaneous. */
export const axisOf = (id: string, carrierAngleDeg = 0): Vec2 => {
  const g = GEAR.get(id)!;
  if (g.frame === 'main') {
    const key = axisKey(id);
    const a = AXES[key];
    if (!a) throw new Error(`sem eixo para ${id}`);
    return a;
  }
  const local = g.frame === 'b1' ? FRONT_AXES[id] : CARRIER_LOCAL[id];
  if (!local) throw new Error(`sem eixo local para ${id}`);
  // Rotate the carrier's local frame by the carrier angle.
  const rad = (-carrierAngleDeg * Math.PI) / 180;
  return v2(local.x * Math.cos(rad) - local.y * Math.sin(rad), local.x * Math.sin(rad) + local.y * Math.cos(rad));
};

const AXIS_KEY: Record<string, string> = {
  b1: 'b', b2: 'b', b0: 'b', b3: 'b', ma1: 'b', a1: 'a',
  // The planet output tubes are concentric with the main axis.
  mars80: 'b', jup65: 'b', sat86: 'b',
  // "Fixed" wheels (the 51 of the inferior planets, the 56 of the Sun and the
  // 49/48 of the nodes) are concentric with the main axis: each 52/62/64 planet
  // rides at exactly the sum of the pitch radii from the centre — which is how
  // the 27.0 mm bearing on Spoke B comes out at the right place.
  inf51: 'b', cp56: 'b', nodes48: 'b', nodes49: 'b',
  c1: 'c', c2: 'c', d1: 'd', d2: 'd',
  e1: 'e', e2: 'e', e5: 'e', e6: 'e', e3: 'e', e4: 'e',
  l1: 'l', l2: 'l', m1: 'm', m2: 'm', m3: 'm',
  n1: 'n', n2: 'n', n3: 'n', o1: 'o', p1: 'p', p2: 'p', q1: 'q',
  f1: 'f', f2: 'f', g1: 'g', g2: 'g', h1: 'h', h2: 'h', i1: 'i',
};

export const axisKey = (id: string): string => AXIS_KEY[id] ?? id;

/** Absolute axis of a gear with every carrier at its zero angle. */
export const axisPosition = (id: string): Vec2 => {
  const g = GEAR.get(id)!;
  if (g.frame === 'main') {
    const a = AXES[axisKey(id)];
    if (!a) throw new Error(`sem eixo para ${id}`);
    return a;
  }
  if (g.frame === 'b1') {
    const a = FRONT_AXES[id];
    if (!a) throw new Error(`sem eixo frontal para ${id}`);
    return a;
  }
  return CARRIER_LOCAL[id];
};

export const placement = (id: string, carrierAngleDeg = 0): Placement => {
  const g = GEAR.get(id)!;
  const { m, source } = moduleOf(id);
  return {
    id,
    axis: axisOf(id, carrierAngleDeg),
    local: g.frame === 'main' ? axisOf(id) : g.frame === 'b1' ? FRONT_AXES[id] : CARRIER_LOCAL[id],
    frame: g.frame,
    z: Z[id] ?? 0,
    thickness: thickness(id),
    pitchR: pitchR(id),
    outerR: outerR(id),
    module: m,
    moduleSource: source,
  };
};

// ── Dial centres and the case ─────────────────────────────────────────────

export const DIAL_CENTRES = {
  front: AXES.b,
  metonic: AXES.n,
  saros: AXES.g,
  olympiad: AXES.o,
  callippic: AXES.q,
  exeligmos: AXES.i,
};

const Z_VALUES = Object.values(Z);
const Z_MIN = Math.min(...Z_VALUES);
const Z_MAX = Math.max(...Z_VALUES);

export const CASE = {
  halfWidth: 88,
  halfHeight: 142,
  // Derived: the case must contain the whole stack of mesh planes plus 6 mm of
  // clearance on each face.
  depth: Z_MAX - Z_MIN + 12,
  plateThickness: 2.0,
  woodThickness: 6.0,
};

export const FRONT_RING = {
  innerRadius: 66.5,
  zodiacOuter: 80,
  calendarInner: 57,
};

/** The back plate sits behind every back-train wheel; the main plate at z = 0. */
export const BACK_PLATE_Z = Z_MIN - 3;
/** The front bezel sits in front of every front-train wheel. */
export const FRONT_BEZEL_Z = Z_MAX + 3;

/** The drive wheel and the case are compatible (b1 radius well inside the case). */
export const EPOCH_GEOMETRY_OK = pitchR('b1') + 2 < CASE.halfWidth && pitchR('b1') + 6 < CASE.halfHeight;
