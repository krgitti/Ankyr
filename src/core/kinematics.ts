/**
 * Exact kinematics of the gear graph.
 *
 * Mean rates. All couplings are linear in the angular velocities, so the
 * vector of rates (turns per year, with b1 = 1) is the solution of a linear
 * system over Q. Meshing in a frame F gives
 *
 *      N_a (ω_a − ω_F) + N_b (ω_b − ω_F) = 0            (external mesh, π ratio)
 *      (ω_b − ω_F) − (ω_a − ω_F) = 0                    (pin-and-slot, 1:1 mean)
 *      ω_a = ω_b                                        (rigid arbor)
 *      ω = 0                                            (fixed gear)
 *
 * which is solved by Gauss–Jordan elimination with exact rational pivots. No
 * ratio is ever typed in: every transmission ratio in the emulator is a
 * consequence of the tooth counts and the graph.
 *
 * Angles. θ(t) = ω·T + f, where T (years since epoch) is exact, ω·T is reduced
 * modulo one turn in BigInt before becoming a float, and f is a small bounded
 * quantity: assembly phases and the pin-and-slot anomalies. Nothing that grows
 * with time is stored as a float, so simulating 10^5 years costs no precision.
 */

import { EDGES, FRAME_GEAR, GEAR, GEARS, DRIVER, GEAR_INDEX, type Edge, type Frame } from './gears';
import { Q } from './rational';

export type Rates = Map<string, Q>;

const frameGear = (f: Frame) => (f === 'main' ? null : FRAME_GEAR[f]);

export const solveRates = (edges: Edge[] = EDGES, driver = DRIVER): Rates => {
  const ids = [...new Set(edges.flatMap((e) => (e.kind === 'fixed' ? [e.a] : [e.a, e.b])).concat(driver))];
  const index = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const rows: Q[][] = [];
  const rhs: Q[] = [];
  const row = () => Array.from({ length: n }, () => Q.ZERO);
  const teeth = (id: string): Q => {
    const g = GEAR.get(id);
    if (!g) throw new Error(`engrenagem desconhecida: ${id}`);
    return Q.of(g.teeth);
  };

  // b1 turns once per year.
  {
    const r = row();
    r[index.get(driver)!] = Q.ONE;
    rows.push(r);
    rhs.push(Q.ONE);
  }

  for (const e of edges) {
    const r = row();
    if (e.kind === 'fixed') {
      r[index.get(e.a)!] = Q.ONE;
    } else if (e.kind === 'arbor') {
      r[index.get(e.a)!] = Q.ONE;
      r[index.get(e.b)!] = Q.of(-1);
    } else {
      const [ca, cb] = e.kind === 'mesh' ? [teeth(e.a), teeth(e.b)] : [Q.of(-1), Q.ONE];
      const ia = index.get(e.a)!;
      const ib = index.get(e.b)!;
      r[ia] = r[ia].add(ca);
      r[ib] = r[ib].add(cb);
      const fg = frameGear(e.frame);
      if (fg) {
        const iF = index.get(fg)!;
        r[iF] = r[iF].sub(ca.add(cb));
      }
    }
    rows.push(r);
    rhs.push(Q.ZERO);
  }

  // Gauss–Jordan.
  const m = rows.length;
  const where = new Array<number>(n).fill(-1);
  let rank = 0;
  for (let col = 0; col < n && rank < m; col++) {
    let piv = -1;
    for (let i = rank; i < m; i++) if (!rows[i][col].isZero()) { piv = i; break; }
    if (piv < 0) continue;
    [rows[piv], rows[rank]] = [rows[rank], rows[piv]];
    [rhs[piv], rhs[rank]] = [rhs[rank], rhs[piv]];
    const p = rows[rank][col];
    for (let j = col; j < n; j++) rows[rank][j] = rows[rank][j].div(p);
    rhs[rank] = rhs[rank].div(p);
    for (let i = 0; i < m; i++) {
      if (i === rank || rows[i][col].isZero()) continue;
      const f = rows[i][col];
      for (let j = col; j < n; j++) if (!rows[rank][j].isZero()) rows[i][j] = rows[i][j].sub(f.mul(rows[rank][j]));
      rhs[i] = rhs[i].sub(f.mul(rhs[rank]));
    }
    where[col] = rank++;
  }
  for (let i = rank; i < m; i++) if (!rhs[i].isZero()) throw new Error('sistema de engrenagens inconsistente');
  const free = ids.filter((_, i) => where[i] < 0);
  if (free.length) throw new Error(`sistema subdeterminado: ${free.join(', ')}`);
  return new Map(ids.map((id, i) => [id, rhs[where[i]]]));
};

export const RATES: Rates = solveRates();

// ── Angle schedule ────────────────────────────────────────────────────────

interface Step {
  gear: string;
  edge: Edge | null;
  from: string | null;
  forward: boolean;
}

const buildSchedule = (edges: Edge[], driver: string): Step[] => {
  const known = new Set<string>([driver]);
  const steps: Step[] = [{ gear: driver, edge: null, from: null, forward: true }];
  for (const e of edges) {
    if (e.kind === 'fixed' && !known.has(e.a)) {
      known.add(e.a);
      steps.push({ gear: e.a, edge: null, from: null, forward: true });
    }
  }
  let progress = true;
  while (progress) {
    progress = false;
    for (const e of edges) {
      if (e.kind === 'fixed') continue;
      const fg = e.kind === 'arbor' ? null : frameGear(e.frame);
      if (fg && !known.has(fg)) continue;
      if (known.has(e.a) && !known.has(e.b)) {
        known.add(e.b);
        steps.push({ gear: e.b, edge: e, from: e.a, forward: true });
        progress = true;
      } else if (known.has(e.b) && !known.has(e.a) && e.kind !== 'pinSlot') {
        known.add(e.a);
        steps.push({ gear: e.a, edge: e, from: e.b, forward: false });
        progress = true;
      }
    }
  }
  const missing = GEARS.filter((g) => !known.has(g.id)).map((g) => g.id);
  if (missing.length) throw new Error(`engrenagens inalcançáveis a partir do acionamento: ${missing.join(', ')}`);
  return steps;
};

export const SCHEDULE = buildSchedule(EDGES, DRIVER);

export type Phases = Record<string, number>;

/** Extra rotation of a manufactured gear at a mesh (Monte Carlo error study). */
export type MeshError = (edge: Edge, from: string, to: string, fromTurns: number) => number;

const TAU = 2 * Math.PI;
const wrapHalf = (x: number) => x - Math.round(x);

/**
 * Slot-gear angle minus pin-gear angle (turns) for a pin-and-slot coupling.
 *
 * A pin at radius `pin` on gear a engages a slot in gear b whose axis is
 * `offset` away, in direction `dirTurns` (turns) of the carrier frame. This is
 * the geometric heart of the Antikythera Mechanism: it makes a uniform rotation
 * produce a non-uniform one, exactly the epicyclic equation.
 */
export const pinSlotDelta = (alphaTurns: number, offset: number, pin: number, dirTurns = 0) => {
  const a = alphaTurns * TAU;
  const d = dirTurns * TAU;
  const beta = Math.atan2(pin * Math.sin(a) - offset * Math.sin(d), pin * Math.cos(a) - offset * Math.cos(d));
  return wrapHalf((beta - a) / TAU);
};

interface CompiledStep {
  gear: number;
  kind: 'root' | 'arbor' | 'mesh' | 'pinSlot';
  from: number;
  frame: number;
  ratio: number;
  offset: number;
  pin: number;
  dir: number;
  edge: Edge | null;
}

export class Kinematics {
  readonly rates: Rates;
  private readonly rateList: Q[];
  private readonly steps: CompiledStep[];

  constructor(rates: Rates = RATES, schedule: Step[] = SCHEDULE) {
    this.rates = rates;
    this.rateList = GEARS.map((g) => {
      const r = rates.get(g.id);
      if (!r) throw new Error(`sem taxa para ${g.id}`);
      return r;
    });
    this.steps = schedule.map((s) => {
      const g = GEAR_INDEX.get(s.gear)!;
      if (!s.edge) return { gear: g, kind: 'root', from: -1, frame: -1, ratio: 0, offset: 0, pin: 0, dir: 0, edge: null };
      const from = GEAR_INDEX.get(s.from!)!;
      if (s.edge.kind === 'arbor') return { gear: g, kind: 'arbor', from, frame: -1, ratio: 0, offset: 0, pin: 0, dir: 0, edge: s.edge };
      if (s.edge.kind === 'fixed') throw new Error('aresta fixa é raiz');
      const fg = frameGear(s.edge.frame);
      const frame = fg ? GEAR_INDEX.get(fg)! : -1;
      if (s.edge.kind === 'mesh') {
        const ratio = GEAR.get(s.from!)!.teeth / GEAR.get(s.gear)!.teeth;
        return { gear: g, kind: 'mesh', from, frame, ratio, offset: 0, pin: 0, dir: 0, edge: s.edge };
      }
      return { gear: g, kind: 'pinSlot', from, frame, ratio: 1, offset: s.edge.offset, pin: s.edge.pin, dir: s.edge.dir, edge: s.edge };
    });
  }

  rate(id: string): Q {
    const r = this.rates.get(id);
    if (!r) throw new Error(`sem taxa para ${id}`);
    return r;
  }

  /** Exact mean angles at time T (years since epoch), each reduced mod 1 turn. */
  meanTurns(T: Q): Float64Array {
    const out = new Float64Array(this.rateList.length);
    for (let i = 0; i < out.length; i++) out[i] = this.rateList[i].mul(T).frac().toNumber();
    return out;
  }

  /** Full angles in turns: mean + assembly phases + pin-and-slot anomalies. */
  propagate(mean: Float64Array, phases: Phases = {}, meshError?: MeshError): Float64Array {
    const f = new Float64Array(mean.length);
    for (const s of this.steps) {
      const ph = phases[GEARS[s.gear].id] ?? 0;
      if (s.kind === 'root') {
        f[s.gear] = ph;
      } else if (s.kind === 'arbor') {
        f[s.gear] = f[s.from] + ph;
      } else {
        const fF = s.frame >= 0 ? f[s.frame] : 0;
        const mF = s.frame >= 0 ? mean[s.frame] : 0;
        const fa = f[s.from];
        const rel = mean[s.from] - mF + fa - fF;
        if (s.kind === 'mesh') {
          let v = fF - s.ratio * (fa - fF) + ph;
          if (meshError) v += meshError(s.edge!, GEARS[s.from].id, GEARS[s.gear].id, rel);
          f[s.gear] = v;
        } else {
          f[s.gear] = fa + pinSlotDelta(rel, s.offset, s.pin, s.dir) + ph;
        }
      }
    }
    for (let i = 0; i < f.length; i++) f[i] += mean[i];
    return f;
  }

  evaluate(T: Q, phases: Phases = {}, meshError?: MeshError): Float64Array {
    return this.propagate(this.meanTurns(T), phases, meshError);
  }
}

/** Turns of a gear in a state vector. */
export const turnsOf = (state: Float64Array, id: string) => state[GEAR_INDEX.get(id)!];

/** Compact description of a train's transmission, derived from the rates. */
export interface RatioLine {
  output: string;
  turnsPerYear: string;
  turnsPerDay: number;
  degPerDay: number;
  direction: 1 | -1;
  periodYears: string | null;
}

export const ratioLine = (kin: Kinematics, id: string): RatioLine => {
  const r = kin.rate(id);
  const perDay = r.div(Q.of(1461, 4));
  const years = r.isZero() ? null : Q.ONE.div(r.abs());
  return {
    output: id,
    turnsPerYear: r.toString(),
    turnsPerDay: perDay.toNumber(),
    degPerDay: perDay.toNumber() * 360,
    direction: r.isNeg() ? -1 : 1,
    periodYears: years ? (years.d === 1n ? `${years.n}` : `${years.toNumber().toFixed(5)}`) : null,
  };
};
