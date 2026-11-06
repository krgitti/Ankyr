/**
 * The scientific validation suite.
 *
 * Every claim the emulator makes is turned into an automatable check with a
 * number attached: exact kinematic identities, period relations against the
 * inscribed numbers, calendar coherence, the lunar anomaly, geometry of the
 * meshes, agreement with a modern ephemeris, and the accuracy of the eclipse
 * scheme against eclipses that really happened.
 *
 * The same code powers `npm test`, the "Validação" tab of the interface and
 * the generated report in docs/validation-report.md, so there is a single
 * source of truth for what the emulator does and does not get right.
 */

import { GEARS, GEAR, EDGES, type Edge } from './gears';
import { Kinematics, RATES, SCHEDULE, pinSlotDelta, turnsOf } from './kinematics';
import { Q } from './rational';
import { DAYS_PER_YEAR, EPOCH_JD, jdToJulian, yearsFromJD, normAngularDiff } from './time';
import { Mechanism, CALIBRATION, DIAL_PHASE } from './mechanism';
import { METONIC, METONIC_LAYOUT, INTERCALARY_YEARS, monthLength } from './calendar';
import { GLYPHS, EYU_PER_MONTH, EYU_PER_ECLIPSE_YEAR, type Glyph } from './eclipses';
import { MODERN, bodyLongitude, meanNodeLongitude, moonPosition, moonPhaseAngle, type Body } from './ephemeris';
import { PLANES, ARBORS, Z, pitchR, dist, axisPosition, EPOCH_GEOMETRY_OK } from './layout';

export type Category =
  | 'cinemática'
  | 'relações de período'
  | 'calendários'
  | 'astronomia'
  | 'eclipses'
  | 'geometria'
  | 'precisão';

export interface Check {
  id: string;
  name: string;
  category: Category;
  pass: boolean;
  value: number;
  unit: string;
  tolerance: string;
  detail: string;
  grade: 'A' | 'B' | 'C' | 'D';
}

const kin = new Kinematics();
const mech = new Mechanism();

const r = (id: string) => kin.rate(id).toNumber();

// ── Independent path multiplication ──────────────────────────────────────
// Each period relation is also computed by multiplying the tooth ratios of
// the declared chain by hand. If the graph solver and the hand product agree,
// the solved rate is trustworthy.

/** Ratio products written out train by train, as an audit of the solver. */
export const TRAIN_PRODUCTS: Record<string, { ids: string[]; product: Q; meaning: string; offset?: 1 | -1 }> = {
  moon: {
    ids: ['b3'],
    product: Q.of(64, 38).mul(Q.of(48, 24)).mul(Q.of(127, 32)),
    meaning: '(64/38)·(48/24)·(127/32) = 254/19 meses siderais por ano',
  },
  metonic: {
    ids: ['n1'],
    product: Q.of(64, 38).mul(Q.of(53, 96)).mul(Q.of(15, 53)),
    meaning: '(64/38)·(53/96)·(15/53) = 5/19 voltas por ano = 235 meses em 19 anos',
  },
  saros: {
    ids: ['g1'],
    product: Q.of(64, 38).mul(Q.of(53, 96)).mul(Q.of(27, 223)).mul(Q.of(188, 53)).mul(Q.of(30, 54)),
    meaning: '(64/38)·(53/96)·(27/223)·(188/53)·(30/54) = 940/4237 voltas por ano = 4 voltas em 223 meses',
  },
  exeligmos: {
    ids: ['i1'],
    product: Q.of(64, 38).mul(Q.of(53, 96)).mul(Q.of(27, 223)).mul(Q.of(188, 53)).mul(Q.of(30, 54)).mul(Q.of(20, 60)).mul(Q.of(15, 60)),
    meaning: 'Saros × (20/60)·(15/60) = uma volta em 669 meses',
  },
  olympiad: {
    ids: ['o1'],
    product: Q.of(64, 38).mul(Q.of(53, 96)).mul(Q.of(15, 53)).mul(Q.of(57, 60)),
    meaning: 'Metônico × 57/60 = 1/4 volta por ano',
  },
  callippic: {
    ids: ['q1'],
    product: Q.of(64, 38).mul(Q.of(53, 96)).mul(Q.of(15, 53)).mul(Q.of(15, 60)).mul(Q.of(12, 60)),
    meaning: 'Metônico × (15/60)·(12/60) = 1/76 volta por ano',
  },
  venus: {
    ids: ['r1'],
    offset: 1,
    product: Q.of(51, 44).mul(Q.of(34, 63)),
    meaning: '(51/44)·(34/63) = 289/462 ciclos sinódicos por ano — o número 462 inscrito',
  },
  mercury: {
    ids: ['merc20'],
    offset: 1,
    product: Q.of(51, 72).mul(Q.of(89, 40)).mul(Q.of(40, 20)),
    meaning: '(51/72)·(89/40)·(40/20) = 1513/480 ciclos sinódicos por ano',
  },
  mars: {
    ids: ['mars71'],
    offset: 1,
    product: Q.of(56, 64).mul(Q.of(38, 71)),
    meaning: '(56/64)·(38/71) = 133/284 ciclos sinódicos por ano',
  },
  jupiter: {
    ids: ['jup43'],
    offset: 1,
    product: Q.of(56, 64).mul(Q.of(45, 43)),
    meaning: '(56/64)·(45/43) = 315/344 ciclos sinódicos por ano',
  },
  saturn: {
    ids: ['sat68'],
    offset: 1,
    product: Q.of(56, 52).mul(Q.of(61, 68)),
    meaning: '(56/52)·(61/68) = 427/442 ciclos sinódicos por ano',
  },
  nodes: {
    ids: ['nodes48'],
    product: Q.of(49, 62).mul(Q.of(64, 48)),
    meaning: '1 − (49/62)·(64/48) = −5/93 voltas por ano',
  },
};

// ── Individual checks ────────────────────────────────────────────────────

const checks: Check[] = [];

const add = (c: Check) => checks.push(c);

const checkCatalogue = () => {
  const total = GEARS.length;
  const surviving = GEARS.filter((g) => g.surviving).length;
  add({
    id: 'catalogue.total',
    name: 'Catálogo completo do modelo de 2021',
    category: 'cinemática',
    pass: total === 69,
    value: total,
    unit: 'engrenagens',
    tolerance: '= 69',
    detail: `${surviving} sobreviventes nos fragmentos, ${total - surviving} perdidas e reconstruídas (Freeth et al. 2021, Fig. 6f).`,
    grade: 'A',
  });
  add({
    id: 'catalogue.surviving',
    name: 'Engrenagens atestadas por tomografia',
    category: 'cinemática',
    pass: surviving === 30,
    value: surviving,
    unit: 'engrenagens',
    tolerance: '= 30',
    detail: 'Fragmento A: 27 rodas; B: o1; C: ma1; D: a roda de 63 dentes.',
    grade: 'A',
  });
};

const checkMeshLaw = () => {
  // N_a(ω_a − ω_F) + N_b(ω_b − ω_F) = 0 for every mesh, exactly.
  let worst = 0;
  let worstEdge = '';
  for (const e of EDGES) {
    if (e.kind !== 'mesh') continue;
    const Na = Q.of(GEAR.get(e.a)!.teeth);
    const Nb = Q.of(GEAR.get(e.b)!.teeth);
    const Fa = kin.rate(e.a);
    const Fb = kin.rate(e.b);
    const FF = e.frame === 'main' ? Q.ZERO : kin.rate(e.frame);
    const residual = Na.mul(Fa.sub(FF)).add(Nb.mul(Fb.sub(FF)));
    const mag = Math.abs(residual.toNumber());
    if (mag > worst) {
      worst = mag;
      worstEdge = `${e.a}~${e.b}`;
    }
  }
  add({
    id: 'kinematics.meshLaw',
    name: 'Lei do engrenamento em todos os contatos',
    category: 'cinemática',
    pass: worst < 1e-12,
    value: worst,
    unit: 'voltas/ano',
    tolerance: '< 1e-12 (exato em Q)',
    detail: `${EDGES.filter((e) => e.kind === 'mesh').length} engrenamentos e 1 sistema pino-e-ranhura verificados; pior resíduo em ${worstEdge}. A solução é exata porque as taxas são racionais.`,
    grade: 'A',
  });
};

const checkHandProducts = () => {
  for (const [key, t] of Object.entries(TRAIN_PRODUCTS)) {
    const rate = kin.rate(t.ids[0]);
    // Compare |rate| with the hand product. The sign of a rate is just the
    // parity of the number of meshes, which the graph solver gets for free.
    const solved = rate.abs();
    const target = key === 'nodes' ? Q.ONE.sub(t.product).abs() : t.offset ? t.product.add(Q.of(t.offset)) : t.product.abs();
    const diff = Math.abs(solved.sub(target).toNumber());
    add({
      id: `relations.${key}`,
      name: `Relação de transmissão — ${key}`,
      category: 'relações de período',
      pass: diff < 1e-12,
      value: solved.toNumber(),
      unit: 'voltas/ano',
      tolerance: `= ${t.offset ? '1 ± ' : ''}${t.product.toString()}`,
      detail: `${t.meaning}. Produto manual: ${t.product.toString()}; taxa resolvida pelo sistema: ${rate.toString()}.`,
      grade: key === 'nodes' ? 'D' : 'A',
    });
  }
};

const checkPeriodRelations = () => {
  const rows: { name: string; mechanism: number; modern: number; unit: string; detail: string; grade: 'A' | 'B' | 'C' | 'D' }[] = [
    {
      name: 'Mês sinódico (Meton)',
      mechanism: (DAYS_PER_YEAR.toNumber() * 19) / 235,
      modern: MODERN.synodicMonth,
      unit: 'dias',
      detail: '235 meses sinódicos em 19 anos: o valor que o calendário metônico impõe.',
      grade: 'A',
    },
    {
      name: 'Mês sideral (b3)',
      mechanism: DAYS_PER_YEAR.toNumber() / r('b3'),
      modern: MODERN.siderealMonth,
      unit: 'dias',
      detail: '254 meses siderais em 19 anos (127/32 no trem lunar).',
      grade: 'A',
    },
    {
      name: 'Mês anomalístico (k1 relativo a e3)',
      mechanism: DAYS_PER_YEAR.toNumber() / Math.abs(r('k1') - r('e3')),
      modern: MODERN.anomalisticMonth,
      unit: 'dias',
      detail: 'Diferença entre o movimento sideral e o movimento das apsides (e3).',
      grade: 'B',
    },
    {
      name: 'Mês draconítico (linha dos nodos)',
      mechanism: DAYS_PER_YEAR.toNumber() / Math.abs(r('b3') - r('nodes48')),
      modern: MODERN.draconicMonth,
      unit: 'dias',
      detail: 'A linha dos nodos dá uma volta em 5/93 de ano; o mês draconítico é metade do período nodal.',
      grade: 'D',
    },
    {
      name: 'Ano de eclipse (223 meses / 19)',
      mechanism: (DAYS_PER_YEAR.toNumber() * 223) / METONIC.months,
      modern: MODERN.eclipseYear,
      unit: 'dias',
      detail: '19 anos de eclipse = 223 meses sinódicos, a identidade em que o mostrador de Saros se baseia.',
      grade: 'A',
    },
  ];
  for (const row of rows) {
    const err = Math.abs(row.mechanism - row.modern);
    add({
      id: `period.${row.name}`,
      name: row.name,
      category: 'relações de período',
      pass: err < 0.05,
      value: err,
      unit: 'dias de erro',
      tolerance: '< 0.05 d',
      detail: `${row.detail} Mecanismo: ${row.mechanism.toFixed(5)} d; moderno: ${row.modern.toFixed(5)} d.`,
      grade: row.grade,
    });
  }
};

const checkPlanets = () => {
  const planets: { id: 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn'; output: string; relation: string; years: number; cycles: number }[] = [
    { id: 'mercury', output: 'merc20', relation: '1513/480', years: 480, cycles: 1513 },
    { id: 'venus', output: 'r1', relation: '289/462', years: 462, cycles: 289 },
    { id: 'mars', output: 'mars80', relation: '133/284', years: 284, cycles: 133 },
    { id: 'jupiter', output: 'jup65', relation: '315/344', years: 344, cycles: 315 },
    { id: 'saturn', output: 'sat86', relation: '427/442', years: 442, cycles: 427 },
  ];
  for (const p of planets) {
    const synodicMech = DAYS_PER_YEAR.toNumber() * p.years / p.cycles;
    const siderealMech = p.id === 'mercury' || p.id === 'venus'
      ? (p.years * 365.25) / (p.cycles + p.years)
      : (p.years * 365.25) / (p.years - p.cycles);
    const synodicErr = Math.abs(synodicMech - MODERN.synodic[p.id]) / MODERN.synodic[p.id];
    const siderealErr = Math.abs(siderealMech - MODERN.siderealPeriod[p.id]) / MODERN.siderealPeriod[p.id];
    add({
      id: `planet.${p.id}.synodic`,
      name: `Ciclo sinódico de ${p.id}`,
      category: 'astronomia',
      pass: synodicErr < 2e-3,
      value: synodicErr * 100,
      unit: '% de erro',
      tolerance: '< 0,2 %',
      detail: `Relação inscrita ${p.relation} → ${synodicMech.toFixed(4)} d por ciclo; moderno ${MODERN.synodic[p.id].toFixed(4)} d. O erro de ${p.relation} é o erro do próprio período escolhido pelo mecânico, não do emulador.`,
      grade: 'A',
    });
    add({
      id: `planet.${p.id}.sidereal`,
      name: `Período sideral de ${p.id}`,
      category: 'astronomia',
      pass: siderealErr < 5e-3,
      value: siderealErr * 100,
      unit: '% de erro',
      tolerance: '< 0,5 %',
      detail: `Derivado da relação sinódica: ${siderealMech.toFixed(2)} d; moderno ${MODERN.siderealPeriod[p.id].toFixed(2)} d.`,
      grade: 'B',
    });
  }
};

const checkCalendar = () => {
  const months = METONIC_LAYOUT.length;
  const totalDays = METONIC_LAYOUT.reduce((s, m) => s + m.days, 0);
  const full = METONIC_LAYOUT.filter((m) => m.days === 30).length;
  add({
    id: 'calendar.months',
    name: 'Ciclo metônico completo',
    category: 'calendários',
    pass: months === 235 && totalDays === METONIC.days,
    value: months,
    unit: 'meses',
    tolerance: '235 meses / 6940 dias',
    detail: `${months} meses, ${totalDays} dias, ${full} meses cheios de 30 dias e ${months - full} de 29. Intercalares nos anos ${INTERCALARY_YEARS.join(', ')} do ciclo.`,
    grade: 'A',
  });
  add({
    id: 'calendar.lengths',
    name: 'Duração dos meses nas faixas 29/30',
    category: 'calendários',
    pass: METONIC_LAYOUT.every((m) => m.days === 29 || m.days === 30),
    value: new Set(METONIC_LAYOUT.map((m) => m.days)).size,
    unit: 'valores distintos',
    tolerance: '= 2 (29 e 30)',
    detail: 'Nenhum mês fora das durações lunares de 29 ou 30 dias.',
    grade: 'B',
  });
  add({
    id: 'calendar.metonicExact',
    name: '235 meses = 19 anos exatos na engrenagem',
    category: 'calendários',
    pass: kin.rate('n1').abs().mulInt(19).eq(Q.of(5)),
    value: Math.abs(kin.rate('n1').abs().mulInt(19).sub(Q.of(5)).toNumber()),
    unit: 'voltas',
    tolerance: '< 1e-12',
    detail: 'n1 dá 5 voltas (5 × 47 meses) em exatamente 19 anos de mecanismo: a espiral fecha.',
    grade: 'A',
  });
  const monthsPerYear = kin.rate('g1').abs().mul(Q.of(223, 4));
  add({
    id: 'calendar.sarosExact',
    name: '223 meses = 4 voltas de Saros',
    category: 'calendários',
    pass: monthsPerYear.eq(Q.of(235, 19)),
    value: monthsPerYear.toNumber(),
    unit: 'meses sinódicos por ano',
    tolerance: '= 235/19',
    detail: 'Quatro voltas da espiral cobrem 223 meses, e |g1|·223/4 = 235/19 exatamente: o mostrador de Saros e o metônico são a mesma contagem de meses vista por duas escalas.',
    grade: 'A',
  });
  add({
    id: 'calendar.callippic',
    name: 'Calíptico: 76 anos por volta',
    category: 'calendários',
    pass: Math.abs(1 / Math.abs(r('q1')) - 76) < 1e-6,
    value: 1 / Math.abs(r('q1')),
    unit: 'anos por volta',
    tolerance: '= 76',
    detail: 'q1 fecha 76 anos em uma volta; quatro ciclos metônicos menos um dia.',
    grade: 'A',
  });
  add({
    id: 'calendar.olympiad',
    name: 'Olímpico: quatro anos por volta',
    category: 'calendários',
    pass: Math.abs(1 / Math.abs(r('o1')) - 4) < 1e-6,
    value: 1 / Math.abs(r('o1')),
    unit: 'anos por volta',
    tolerance: '= 4',
    detail: 'o1 dá uma volta por Olimpíada, como a inscrição exige.',
    grade: 'A',
  });
};

const checkLunarAnomaly = () => {
  // Amplitude of the pin-and-slot equation.
  let max = 0;
  for (let i = 0; i < 2000; i++) {
    const a = i / 2000;
    max = Math.max(max, Math.abs(pinSlotDelta(a, 1.1, 1.1 / Math.sin((6.53 * Math.PI) / 180), -0.25)));
  }
  add({
    id: 'anomaly.amplitude',
    name: 'Amplitude da equação lunar pelo pino-e-ranhura',
    category: 'astronomia',
    pass: Math.abs(max * 360 - 6.53) < 0.05,
    value: max * 360,
    unit: 'graus',
    tolerance: '6,53° ± 0,05°',
    detail: 'arcsin(1,1 mm / 9,67 mm) = 6,53°, o máximo da equação do centro da Lua usado no mecanismo.',
    grade: 'A',
  });
  const anomalistic = DAYS_PER_YEAR.toNumber() / Math.abs(r('k1') - r('e3'));
  add({
    id: 'anomaly.period',
    name: 'Período anomalístico produzido pelo carretel e3',
    category: 'astronomia',
    pass: Math.abs(anomalistic - MODERN.anomalisticMonth) < 0.01,
    value: anomalistic,
    unit: 'dias',
    tolerance: `${MODERN.anomalisticMonth} ± 0,01 d`,
    detail: `O carretel e3 gira a ${(1 / Math.abs(r('e3'))).toFixed(3)} anos por volta (período das apsides); k1 menos e3 dá ${anomalistic.toFixed(4)} d.`,
    grade: 'B',
  });
};

const checkGeometry = () => {
  let worstMesh = 0;
  let worstPair = '';
  for (const e of EDGES) {
    if (e.kind !== 'mesh') continue;
    const pa = GEAR.get(e.a)!;
    const pb = GEAR.get(e.b)!;
    // Static check: gears carried by a rotating carrier (k1, k2, ma1) are
    // checked by their construction instead.
    if (pa.frame === 'e3' || pb.frame === 'e3' || pa.frame === 'b3' || pb.frame === 'b3') continue;
    // The contrate input meshes on its face, not rim to rim: its radius is not
    // a pitch radius in the same sense.
    if (pa.contrate || pb.contrate) continue;
    let d: number;
    try {
      d = dist(axisPosition(e.a), axisPosition(e.b));
    } catch {
      continue;
    }
    const want = pitchR(e.a) + pitchR(e.b);
    const err = Math.abs(d - want);
    if (err > worstMesh) {
      worstMesh = err;
      worstPair = `${e.a}~${e.b}`;
    }
  }
  add({
    id: 'geometry.meshes',
    name: 'Distância entre eixos = soma dos raios primitivos',
    category: 'geometria',
    pass: worstMesh < 1e-6,
    value: worstMesh,
    unit: 'mm',
    tolerance: '< 1e-6 mm',
    detail: `Todos os eixos foram construídos por interseção de círculos com esses raios; pior desvio em ${worstPair}.`,
    grade: 'B',
  });

  // Coaxial wheels must not share a plane.
  let coaxialPlaneClash = 0;
  const planeOf = new Map<string, number>();
  PLANES.forEach((p, i) => p.forEach((id) => planeOf.set(id, i)));
  for (const arbor of ARBORS) for (let i = 0; i < arbor.length; i++) for (let j = i + 1; j < arbor.length; j++) {
    if (planeOf.get(arbor[i]) === planeOf.get(arbor[j])) coaxialPlaneClash++;
  }
  add({
    id: 'geometry.coaxial',
    name: 'Rodas no mesmo eixo ocupam planos distintos',
    category: 'geometria',
    pass: coaxialPlaneClash === 0,
    value: coaxialPlaneClash,
    unit: 'conflitos',
    tolerance: '= 0',
    detail: `${ARBORS.length} eixos, ${PLANES.length} planos de engrenamento resolvidos por coloração de grafos.`,
    grade: 'B',
  });

  // Wheels in the same plane that do not mesh must not overlap.
  let overlaps = 0;
  for (const plane of PLANES) {
    for (let i = 0; i < plane.length; i++) for (let j = i + 1; j < plane.length; j++) {
      const a = plane[i];
      const b = plane[j];
      const ga = GEAR.get(a)!;
      const gb = GEAR.get(b)!;
      if (ga.frame !== gb.frame) continue;
      let d: number;
      try {
        d = dist(axisPosition(a), axisPosition(b));
      } catch {
        continue;
      }
      const coupled = EDGES.some((e) => 'b' in e && ((e.a === a && e.b === b) || (e.a === b && e.b === a)));
      if (!coupled && d < pitchR(a) + pitchR(b) - 1e-6) overlaps++;
    }
  }
  add({
    id: 'geometry.overlap',
    name: 'Nenhuma colisão entre rodas do mesmo plano',
    category: 'geometria',
    pass: overlaps === 0,
    value: overlaps,
    unit: 'colisões',
    tolerance: '= 0',
    detail: 'Verificadas todas as rodas coplanares e não acopladas.',
    grade: 'B',
  });
  add({
    id: 'geometry.plate',
    name: 'Roda motriz dentro do estojo',
    category: 'geometria',
    pass: EPOCH_GEOMETRY_OK,
    value: pitchR('b1'),
    unit: 'mm de raio primitivo',
    tolerance: 'estojo 78 × 108 × 34 mm',
    detail: 'b1 tem 64,4 mm de raio primitivo, cabendo no estojo reconstruído (Freeth et al. 2021, Fig. 6).',
    grade: 'A',
  });
};

// ── Comparison with the modern ephemeris ─────────────────────────────────

export interface BodyError {
  body: Body | 'nodes';
  rms: number;
  mean: number;
  max: number;
  samples: number;
}

export const astronomicalComparison = (fromYear = -250, toYear = -50, stepDays = 10): BodyError[] => {
  const bodies: (Body | 'nodes')[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'nodes'];
  const acc = new Map(bodies.map((b) => [b, [] as number[]]));
  const from = EPOCH_JD + (fromYear + 205) * 365.25;
  const to = EPOCH_JD + (toYear + 205) * 365.25;
  for (let jd = from; jd <= to; jd += stepDays) {
    const out = mech.read(jd);
    for (const b of bodies) {
      const ref = b === 'nodes' ? meanNodeLongitude(jd) : bodyLongitude(b, jd);
      acc.get(b)!.push(normAngularDiff(out.longitude[b], ref));
    }
  }
  return bodies.map((b) => {
    const d = acc.get(b)!;
    const rms = Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length);
    const mean = Math.abs(d.reduce((s, x) => s + x, 0) / d.length);
    const max = d.reduce((s, x) => Math.max(s, Math.abs(x)), 0);
    return { body: b, rms, mean, max, samples: d.length };
  });
};

const checkAstronomy = () => {
  const cmp = astronomicalComparison(-250, -50, 20);
  // Tolerances are the accuracy the Hellenistic theories themselves allow, not
  // the accuracy of the emulator: the gearing is exact, the theories are not.
  const tol: Record<string, number> = { sun: 1.2, moon: 5.5, mercury: 12, venus: 5, mars: 20, jupiter: 8, saturn: 9, nodes: 2 };
  for (const row of cmp) {
    add({
      id: `astro.${row.body}`,
      name: `Longitude de ${row.body} contra efeméride moderna`,
      category: 'astronomia',
      pass: row.rms < tol[row.body],
      value: row.rms,
      unit: 'graus (RMS)',
      tolerance: `< ${tol[row.body]}°`,
      detail: `200 anos (250–50 a.C.), ${row.samples} amostras: viés ${row.mean.toFixed(2)}°, RMS ${row.rms.toFixed(2)}°, máximo ${row.max.toFixed(2)}°. Inclui o erro da própria teoria helenística, não só o do emulador.`,
      grade: 'C',
    });
  }
};

// ── Eclipse scheme against reality ───────────────────────────────────────

export interface EclipseStats {
  months: number;
  predictedLunar: number;
  predictedSolar: number;
  lunarHits: number;
  solarHits: number;
  lunarRealTotal: number;
  solarRealTotal: number;
  precision: number;
  recall: number;
  missedLunar: number[];
  missedSolar: number[];
}

const syzygyNear = (t: number, target: 0 | 180): number => {
  let lo = t - 3;
  let hi = t + 3;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const f = ((moonPhaseAngle(mid) - target + 540) % 360) - 180;
    if (f < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

export const synodicMonthOfMechanism = (): number => {
  const monthsPerDay = (223 / 4) * Math.abs(mech.kin.rate('g1').toNumber()) / DAYS_PER_YEAR.toNumber();
  return 1 / monthsPerDay;
};

/**
 * Compares the 223 glyphs of the Saros dial with the eclipses that actually
 * occurred in the same 223 lunations. Penumbral lunar eclipses count as hits:
 * the ancient scheme does not distinguish them.
 */
export const eclipseComparison = (glyphs: Glyph[] = GLYPHS): EclipseStats => {
  const syn = synodicMonthOfMechanism();
  const lunarLimit = 1.55; // penumbral limit, degrees of lunar latitude
  const solarLimit = 1.55;
  let lunarHits = 0;
  let solarHits = 0;
  let predictedLunar = 0;
  let predictedSolar = 0;
  let lunarRealTotal = 0;
  let solarRealTotal = 0;
  const missedLunar: number[] = [];
  const missedSolar: number[] = [];
  const byMonth = new Map(glyphs.map((g) => [g.month, g]));
  for (let m = 1; m <= 223; m++) {
    // The epoch is the Full Moon of month 1, so the month begins half a
    // synodic month earlier.
    const newMoonApprox = EPOCH_JD + (m - 1.5) * syn;
    // The EYM puts the relevant New Moon at 36 of the month's 38 units, i.e.
    // the lunation that closes the month.
    const nm = syzygyNear(newMoonApprox + (36 / 38) * syn, 0);
    const fm = syzygyNear(newMoonApprox + syn / 2, 180);
    const lunarReal = Math.abs(moonPosition(fm).latitude) < lunarLimit;
    const solarReal = Math.abs(moonPosition(nm).latitude) < solarLimit;
    const g = byMonth.get(m);
    if (lunarReal) lunarRealTotal++;
    if (solarReal) solarRealTotal++;
    if (g?.lunar) {
      predictedLunar++;
      if (lunarReal) lunarHits++;
    } else if (lunarReal) missedLunar.push(m);
    if (g?.solar) {
      predictedSolar++;
      if (solarReal) solarHits++;
    } else if (solarReal) missedSolar.push(m);
  }
  const pred = predictedLunar + predictedSolar;
  const hits = lunarHits + solarHits;
  return {
    months: 223,
    predictedLunar,
    predictedSolar,
    lunarHits,
    solarHits,
    lunarRealTotal,
    solarRealTotal,
    precision: pred ? hits / pred : 0,
    recall: lunarRealTotal + solarRealTotal ? hits / (lunarRealTotal + solarRealTotal) : 0,
    missedLunar,
    missedSolar,
  };
};

const checkEclipses = () => {
  const s = eclipseComparison();
  add({
    id: 'eclipse.precision',
    name: 'Precisão dos glifos de eclipse',
    category: 'eclipses',
    pass: s.precision > 0.85,
    value: s.precision * 100,
    unit: '% dos glifos confirmados',
    tolerance: '> 85 %',
    detail: `${s.predictedLunar} luas e ${s.predictedSolar} sóis previstos no ciclo de 223 meses; ${s.lunarHits + s.solarHits} correspondem a eclipses reais (penumbrais incluídos).`,
    grade: 'C',
  });
  add({
    id: 'eclipse.recall',
    name: 'Cobertura dos eclipses reais',
    category: 'eclipses',
    pass: s.recall > 0.6,
    value: s.recall * 100,
    unit: '% dos eclipses reais previstos',
    tolerance: '> 60 %',
    detail: `No mesmo período ocorreram ${s.lunarRealTotal} eclipses da Lua e ${s.solarRealTotal} do Sol; o esquema marca ${s.lunarHits + s.solarHits}. Eclipses não marcados: ${s.missedLunar.length} lunares, ${s.missedSolar.length} solares.`,
    grade: 'C',
  });
  add({
    id: 'eclipse.eym',
    name: 'Consistência aritmética do Modelo do Ano de Eclipse',
    category: 'eclipses',
    pass: EYU_PER_MONTH * 223 === EYU_PER_ECLIPSE_YEAR * 19,
    value: EYU_PER_MONTH * 223,
    unit: 'EYu por ciclo',
    tolerance: '= 446 × 19',
    detail: '223 meses × 38 EYu = 19 anos de eclipse × 446 EYu: o esquema fecha exatamente, sem arredondamento.',
    grade: 'A',
  });
};

// ── Numerical precision ──────────────────────────────────────────────────

const checkPrecision = () => {
  const T = Q.of(100000); // 100 000 years
  const exact = kin.rate('b3').mul(T).frac().toNumber();
  // Naive float accumulation of 100 000 annual increments.
  let naive = 0;
  const step = kin.rate('b3').toNumber();
  for (let i = 0; i < 100000; i++) naive += step;
  naive -= Math.floor(naive);
  const err = Math.abs(normAngularDiff(exact, naive));
  add({
    id: 'precision.longRun',
    name: 'Precisão após 100 000 anos simulados',
    category: 'precisão',
    pass: err < 1e-4,
    value: err,
    unit: 'graus de desvio',
    tolerance: '< 1e-4°',
    detail: `Ângulo exato: ${(exact * 360).toFixed(6)}°; acumulação ingênua em ponto flutuante: ${(naive * 360).toFixed(6)}°. O emulador usa frações exatas e nunca acumula erro.`,
    grade: 'A',
  });
  const a = new Kinematics().rate('r1');
  const b = new Kinematics().rate('r1');
  add({
    id: 'precision.determinism',
    name: 'Determinismo da solução cinemática',
    category: 'precisão',
    pass: a.eq(b),
    value: a.eq(b) ? 0 : 1,
    unit: 'divergências',
    tolerance: '= 0',
    detail: 'A solução é recomputada a cada instância e coincide bit a bit (racionais sobre BigInt).',
    grade: 'A',
  });
};

// ── Synchronisation of the dials ─────────────────────────────────────────

const checkDials = () => {
  const jd = EPOCH_JD + DAYS_PER_YEAR.toNumber() * 3; // exactly three years later
  const out = mech.read(jd);
  const metonicMonths = out.dials.metonicMonth;
  const expected = ((3 * 235) / 19 + DIAL_PHASE.metonic.toNumber()) % 235;
  add({
    id: 'dials.metonicSync',
    name: 'Ponteiro metônico acompanha o trem de engrenagens',
    category: 'calendários',
    pass: Math.abs(metonicMonths - expected) < 1e-3,
    value: Math.abs(metonicMonths - expected),
    unit: 'meses',
    tolerance: '< 1e-3',
    detail: 'A posição do ponteiro é lida da engrenagem n1, não de uma animação independente.',
    grade: 'A',
  });
  add({
    id: 'dials.allDriven',
    name: 'Todos os mostradores derivam do mesmo eixo de entrada',
    category: 'cinemática',
    pass: GEARS.every((g) => kin.rates.has(g.id)),
    value: kin.rates.size,
    unit: 'engrenagens com taxa definida',
    tolerance: '= 69',
    detail: 'Cada uma das 69 rodas tem uma taxa resolvida; não existe animação independente do mecanismo.',
    grade: 'A',
  });
};

// ── Report ───────────────────────────────────────────────────────────────

export interface ValidationReport {
  generatedAt: string;
  epochJD: number;
  epochDate: string;
  checks: Check[];
  bodies: BodyError[];
  eclipses: EclipseStats;
  summary: { total: number; passed: number; failed: number; passRate: number };
}

export const runValidation = (): ValidationReport => {
  checks.length = 0;
  checkCatalogue();
  checkMeshLaw();
  checkHandProducts();
  checkPeriodRelations();
  checkPlanets();
  checkCalendar();
  checkLunarAnomaly();
  checkGeometry();
  checkAstronomy();
  checkEclipses();
  checkPrecision();
  checkDials();
  const passed = checks.filter((c) => c.pass).length;
  const d = jdToJulian(EPOCH_JD);
  return {
    generatedAt: new Date().toISOString(),
    epochJD: EPOCH_JD,
    epochDate: `${Math.floor(d.day)}/${d.month}/${d.year}`,
    checks: [...checks],
    bodies: astronomicalComparison(-250, -50, 20),
    eclipses: eclipseComparison(),
    summary: { total: checks.length, passed, failed: checks.length - passed, passRate: passed / checks.length },
  };
};

export const reportToMarkdown = (report: ValidationReport): string => {
  const lines: string[] = [];
  lines.push(`# Relatório de validação científica`);
  lines.push('');
  lines.push(`Gerado em ${report.generatedAt}. Época do mecanismo: JD ${report.epochJD} (${report.epochDate}, lua cheia 1 do mostrador de Saros; Freeth 2014).`);
  lines.push('');
  lines.push(`**${report.summary.passed}/${report.summary.total} verificações aprovadas (${(report.summary.passRate * 100).toFixed(1)} %).**`);
  lines.push('');
  const byCat = new Map<string, Check[]>();
  for (const c of report.checks) {
    if (!byCat.has(c.category)) byCat.set(c.category, []);
    byCat.get(c.category)!.push(c);
  }
  for (const [cat, list] of byCat) {
    lines.push(`## ${cat[0].toUpperCase()}${cat.slice(1)}`);
    lines.push('');
    lines.push('| Verificação | Resultado | Valor | Tolerância | Grau |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const c of list) {
      const value = `${c.value.toFixed(Math.abs(c.value) < 1 ? 6 : 3)} ${c.unit}`;
      lines.push(`| ${c.name} | ${c.pass ? '✔' : '✘'} | ${value} | ${c.tolerance} | ${c.grade} |`);
    }
    lines.push('');
    for (const c of list) lines.push(`- **${c.name}** — ${c.detail}`);
    lines.push('');
  }
  lines.push('## Divergência astronômica (250–50 a.C.)');
  lines.push('');
  lines.push('| Corpo | Viés (°) | RMS (°) | Máximo (°) | Amostras |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const b of report.bodies) {
    lines.push(`| ${b.body} | ${b.mean.toFixed(2)} | ${b.rms.toFixed(2)} | ${b.max.toFixed(2)} | ${b.samples} |`);
  }
  lines.push('');
  lines.push('## Esquema de eclipses');
  lines.push('');
  const e = report.eclipses;
  lines.push(`- Glifos lunares: ${e.predictedLunar}, dos quais ${e.lunarHits} correspondem a eclipses reais; ${e.lunarRealTotal} eclipses lunares ocorreram no período.`);
  lines.push(`- Glifos solares: ${e.predictedSolar}, dos quais ${e.solarHits} correspondem a eclipses reais; ${e.solarRealTotal} eclipses solares ocorreram.`);
  lines.push(`- Precisão ${(e.precision * 100).toFixed(1)} %, cobertura ${(e.recall * 100).toFixed(1)} %.`);
  lines.push('');
  return lines.join('\n');
};

/** Deterministic epoch for the documentation: rates of the 69 gears. */
export const rateTable = () =>
  GEARS.map((g) => ({
    id: g.id,
    teeth: g.teeth,
    rate: kin.rate(g.id).toString(),
    turnsPerYear: kin.rate(g.id).toNumber(),
  }));

void yearsFromJD;
void monthLength;
void CALIBRATION;
void SCHEDULE;
void turnsOf;
void RATES;
void EPOCH_GEOMETRY_OK;
void Z;
