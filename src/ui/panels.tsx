import { useMemo, useState } from 'react';
import {
  mechanism,
  gearRows,
  epicycleEquationDeg,
  type Readout,
  type GearRow,
} from '../core/mechanism';
import {
  EPOCH_JD,
  formatLongitude,
  formatLongitudeGreek,
  formatJD,
  formatYear,
  jdToJulian,
  wrap180,
  normAngularDiff,
  ZODIAC_GLYPH,
  formatEgyptian,
} from '../core/time';
import {
  bodyLongitude,
  moonPhaseAngle,
  illuminatedFraction,
  moonAge,
  nextSyzygy,
  moonPosition,
  meanNodeLongitude,
} from '../core/ephemeris';
import { metonicDate, formatMetonic, olympiadDate, callippicDate } from '../core/calendar';
import { GLYPH_BY_MONTH, glyphSymbol, describeGlyph, eclipseSeason, EYU_PER_MONTH } from '../core/eclipses';
import { EVIDENCE, SOURCE_LIST } from '../core/sources';
import { GEAR, NEIGHBOURS } from '../core/gears';
import { pitchR, moduleOf, axisKey, placement } from '../core/layout';

const MODERN_BODIES: { id: keyof Readout['longitude']; label: string; color: string }[] = [
  { id: 'moon', label: 'Lua', color: '#cfd4dc' },
  { id: 'nodes', label: 'Linha dos nodos', color: '#c98a6a' },
  { id: 'mercury', label: 'Mercúrio', color: '#59d6c9' },
  { id: 'venus', label: 'Vénus', color: '#6fa8dc' },
  { id: 'sun', label: 'Sol', color: '#e8c25a' },
  { id: 'mars', label: 'Marte', color: '#c0553b' },
  { id: 'jupiter', label: 'Júpiter', color: '#e6dcc0' },
  { id: 'saturn', label: 'Saturno', color: '#d9b45a' },
];

const fmtArcmin = (v: number) => {
  const a = Math.abs(v);
  const sign = v >= 0 ? '+' : '−';
  if (a >= 60) return `${sign}${(a / 60).toFixed(2)}°`;
  return `${sign}${a.toFixed(1)}′`;
};

function Row({ k, v, mono, accent }: { k: string; v: React.ReactNode; mono?: boolean; accent?: string }) {
  return (
    <div className="row" style={accent ? { borderLeftColor: accent } : undefined}>
      <span className="row-k">{k}</span>
      <span className={`row-v ${mono ? 'mono' : ''}`}>{v}</span>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel-section">
      <header>
        <h3>{title}</h3>
        {sub && <p>{sub}</p>}
      </header>
      {children}
    </section>
  );
}

// ── Sky ──────────────────────────────────────────────────────────────────
export function AstronomyPanel({ readout }: { readout: Readout }) {
  const jd = readout.jd;
  const before = useMemo(() => mechanism.read(jd - 0.75), [jd]);
  const after = useMemo(() => mechanism.read(jd + 0.75), [jd]);
  const nextNew = useMemo(() => nextSyzygy(jd, 0), [jd]);
  const nextFull = useMemo(() => nextSyzygy(jd, 180), [jd]);
  const newLat = moonPosition(nextNew).latitude;
  const fullLat = moonPosition(nextFull).latitude;
  const node = meanNodeLongitude(jd);
  const season = eclipseSeason(bodyLongitude('sun', jd), node);
  const phase = moonPhaseAngle(jd);
  const lit = illuminatedFraction(jd);
  const age = moonAge(jd);
  const date = jdToJulian(jd);

  return (
    <div className="panel">
      <Section title="Indicadores do mostrador frontal" sub="posição mecânica, comparação independente e erro">
        <table className="data-table">
          <thead>
            <tr>
              <th />
              <th>Mecanismo</th>
              <th>Referência</th>
              <th>Δ</th>
              <th>Mov.</th>
            </tr>
          </thead>
          <tbody>
            {MODERN_BODIES.map((b) => {
              const mech = readout.longitude[b.id];
              const ref = b.id === 'nodes' ? node : bodyLongitude(b.id as 'sun', jd);
              const diff = normAngularDiff(mech, ref);
              const dMechanism = wrap180(after.longitude[b.id] - before.longitude[b.id]);
              return (
                <tr key={b.id}>
                  <td>
                    <span className="dot" style={{ background: b.color }} /> {b.label}
                  </td>
                  <td className="mono">{formatLongitude(mech)}</td>
                  <td className="mono dim">{formatLongitude(ref)}</td>
                  <td className={`mono ${Math.abs(diff) > 3 ? 'warn' : 'ok'}`}>{fmtArcmin(diff)}</td>
                  <td className="mono dim">{dMechanism >= 0 ? 'direto' : 'retrógrado'}</td>
                </tr>
              );
            })}
            <tr>
              <td>
                <span className="dot" style={{ background: '#e8c25a' }} /> Data
              </td>
              <td className="mono">
                {date.day}/{date.month}/{date.year}
              </td>
              <td className="mono dim">calendário juliano</td>
              <td className="mono ok">—</td>
              <td className="mono dim">contínuo</td>
            </tr>
          </tbody>
        </table>
        <p className="fine">
          A coluna “Referência” não alimenta o mecanismo: é um efeméride moderno truncado (Meeus / ELP reduzido /
          Standish) usado apenas para medir a divergência. Nenhum mostrador lê essa coluna.
        </p>
      </Section>

      <Section title="Lua" sub="anomalia, fase e idade">
        <Row k="Longitude mecânica" v={formatLongitudeGreek(readout.longitude.moon)} mono />
        <Row k="Ângulo de fase (elongação)" v={`${phase.toFixed(2)}°`} mono />
        <Row k="Fase" v={`${(lit * 100).toFixed(1)} % iluminada${lit < 0.5 ? ' · crescente' : ' · minguante'}`} mono />
        <Row k="Idade sinódica" v={`${age.toFixed(2)} dias`} mono />
        <Row k="Período sideral (b3)" v="27.3216 d (mecanismo) vs 27.3217 d (moderno)" mono />
        <Row k="Período anomalístico (k1)" v="27.5546 d" mono />
      </Section>

      <Section title="Nodos e eclipses" sub="a linha dos nodos e a temporada">
        <Row k="Nodo ascendente (mecanismo)" v={formatLongitude(readout.longitude.nodes)} mono />
        <Row k="Nodo ascendente (referência)" v={formatLongitude(node)} mono />
        <Row k="Distância angular Sol–nodo" v={`${season.distance.toFixed(2)}°`} mono />
        <Row
          k="Temporada de eclipses"
          v={
            <span className={season.inSeason ? 'ok' : 'dim'}>
              {season.inSeason ? 'dentro dos limites (±17.4°)' : 'fora dos limites'}
            </span>
          }
        />
        <Row
          k="Próxima Lua nova"
          v={`${formatJD(nextNew, true)} · latitude ${newLat.toFixed(2)}° ${Math.abs(newLat) < 1.55 ? '→ eclipse solar possível' : ''}`}
          mono
        />
        <Row
          k="Próxima Lua cheia"
          v={`${formatJD(nextFull, true)} · latitude ${fullLat.toFixed(2)}° ${Math.abs(fullLat) < 1.55 ? '→ eclipse lunar possível' : ''}`}
          mono
        />
      </Section>

      <Section title="Engrenagens do sistema lunar" sub="o dispositivo de pino e ranhura">
        <Row k="Razão do par excêntrico" v="d/p = 1.1 mm / 9.6 mm = 0.1146" mono />
        <Row
          k="Equação do epiciclo (teoria)"
          v={`${epicycleEquationDeg(readout.gearAngles.k1 ?? 0, 1.1 / 9.6).toFixed(3)}° hoje`}
          mono
        />
        <Row k="Amplitude da anomalia" v="±6.53° (mecanismo) vs ±6.29° (moderno)" mono />
      </Section>
    </div>
  );
}

// ── Calendar ─────────────────────────────────────────────────────────────
export function CalendarPanel({ readout }: { readout: Readout }) {
  const d = readout.dials;
  const md = metonicDate(d.metonicMonth);
  const ol = olympiadDate(readout.jd);
  const call = callippicDate(readout.jd);
  const glyph = d.glyph ?? GLYPH_BY_MONTH.get(Math.floor(d.sarosMonth) + 1);
  const julian = jdToJulian(readout.jd);
  const sunSign = Math.floor((readout.longitude.sun % 360) / 30);

  return (
    <div className="panel">
      <Section title="Ciclo metônico" sub="235 meses sinódicos em 19 anos">
        <Row k="Mês contínuo" v={`${d.metonicMonth.toFixed(3)} / 235`} mono />
        <Row k="Data" v={formatMetonic(md)} />
        <Row k="Mês grego" v={`${md.entry.month.name} (${md.entry.month.greek}) · ${md.entry.days} dias`} />
        <Row k="Ano do ciclo" v={`${md.entry.yearInCycle} / 19`} mono />
        <Row k="Intercalar" v={md.entry.monthOfYear === 13 ? 'sim · mês embolismo' : 'não'} />
        <Row k="Comprimento do mês" v={`${md.entry.days} dias ${md.entry.days === 30 ? '(pleno)' : '(oco)'}`} mono />
      </Section>

      <Section title="Saros e exeligmo" sub="223 meses · 3 Saros = 669 meses">
        <Row k="Mês do Saros" v={`${d.sarosMonth.toFixed(3)} / 223`} mono />
        <Row k="Glifo da célula" v={glyph ? `${glyphSymbol(glyph)} · ${describeGlyph(glyph)}` : 'sem glifo (mês sem eclipse previsto)'} />
        <Row k="Setor do exeligmo" v={`${d.exeligmosSector + 1} / 3 · correção ${d.exeligmosHours} h`} mono />
        <Row k="Posição do ponteiro" v={`${d.exeligmos.toFixed(3)} / 3`} mono />
      </Section>

      <Section title="Olimpíadas e era calíptica">
        <Row k="Olimpíada" v={`${ol.olympiad}ª · ano ${ol.year}`} mono />
        <Row k="Jogos" v={ol.games.join(' · ') || '—'} />
        <Row k="Calíptico" v={call.label} />
      </Section>

      <Section title="Calendário egípcio e zodíaco" sub="anel frontal de 365 dias">
        <Row k="Data egípcia" v={formatEgyptian(readout.jd)} mono />
        <Row k="Sol no zodíaco" v={`${ZODIAC_GLYPH[sunSign]} ${formatLongitude(readout.longitude.sun)}`} mono />
        <Row k="Estrela fixa de referência" v="o anel zodiacal é sideral; o calendário egípcio roda por 365 dias" />
        <Row k="Data juliana" v={`${julian.day}/${julian.month}/${formatYear(julian.year)}`} mono />
      </Section>

      <Section title="Constantes inscritas" sub="o que o mecanismo usa, não o que seria exacto">
        <Row k="Mês sinódico (Meton)" v="235 meses / 19 anos = 29.5319 d" mono />
        <Row k="Mês do mecanismo (g1)" v="29.5309 d" mono />
        <Row k="Mês sinódico moderno" v="29.5306 d" mono />
        <Row k="Saros" v="223 meses = 6585.32 d" mono />
        <Row k="Ano de eclipse" v="223/19 anos = 346.62 d" mono />
        <Row k="1 mês = 38 EYu" v={`${EYU_PER_MONTH} unidades de eclipse`} mono />
      </Section>
    </div>
  );
}

// ── Gears ────────────────────────────────────────────────────────────────
export function GearsPanel({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [onlySurviving, setOnlySurviving] = useState(false);
  const rows = useMemo(() => gearRows(), []);
  const filtered = rows.filter((r) => {
    if (onlySurviving && !r.surviving) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return r.id.toLowerCase().includes(q) || r.train.toLowerCase().includes(q) || r.role.toLowerCase().includes(q);
  });
  return (
    <section className="panel-section">
      <header>
        <h3>Catálogo de engrenagens</h3>
        <p>
          {rows.length} rodas · {rows.filter((r) => r.surviving).length} preservadas · taxas exactas em voltas por ano
        </p>
      </header>
      <div className="filters">
        <input placeholder="filtrar por id, trem ou função…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="toggle">
          <input type="checkbox" checked={onlySurviving} onChange={(e) => setOnlySurviving(e.target.checked)} /> só preservadas
        </label>
      </div>
      <table className="data-table gears">
        <thead>
          <tr>
            <th>id</th>
            <th>dentes</th>
            <th>voltas/ano</th>
            <th>período</th>
            <th>grau</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} className={selected === r.id ? 'selected' : ''} onClick={() => onSelect(r.id)}>
              <td className="mono">{r.id}</td>
              <td className="mono">{r.teeth}</td>
              <td className="mono">{r.turnsPerYear >= 0 ? '' : '−'}{Math.abs(r.turnsPerYear).toFixed(4)}</td>
              <td className="mono dim">{r.periodYears ? `${r.periodYears.toFixed(3)} a` : '—'}</td>
              <td>
                <span className="grade" style={{ color: EVIDENCE[r.grade as 'A'].color, borderColor: EVIDENCE[r.grade as 'A'].color }}>
                  {r.grade}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const dirLabel = (r: GearRow) => (r.turnsPerYear >= 0 ? 'horário' : 'anti-horário');

export function GearInspector({ id, readout }: { id: string | null; readout: Readout }) {
  if (!id) {
    return (
      <section className="panel-section inspector empty">
        <p>Clique numa roda do desenho 3D — ou numa linha da tabela — para ver a sua ficha.</p>
      </section>
    );
  }
  const g = GEAR.get(id);
  if (!g) return null;
  const row = gearRows().find((r) => r.id === id)!;
  const mod = moduleOf(id);
  const place = placement(id);
  const neigh = NEIGHBOURS.get(id) ?? [];
  const angle = readout.gearAngles[id] ?? 0;
  const turns = (angle % 1) * 360;
  return (
    <section className="panel-section inspector">
      <header>
        <h3>
          {id} <span className="dim">· {g.teeth} dentes</span>
        </h3>
        <p>{g.role}</p>
      </header>
      <Row k="Trem" v={g.train} mono />
      <Row k="Eixo" v={`${axisKey(id)} · (${place.axis.x.toFixed(2)}, ${place.axis.y.toFixed(2)}) mm`} mono />
      <Row k="Plano z" v={`${place.z.toFixed(2)} mm`} mono />
      <Row k="Módulo" v={`${mod.m.toFixed(3)} mm (${mod.source})`} mono />
      <Row k="Raio primitivo" v={`${pitchR(id).toFixed(2)} mm`} mono />
      <Row k="Passo angular" v={`${(360 / g.teeth).toFixed(4)}° · ${g.teeth} dentes`} mono />
      <Row k="Taxa" v={`${row.turnsPerYear.toFixed(6)} voltas/ano (${dirLabel(row)})`} mono />
      <Row k="Velocidade" v={`${row.degPerDay.toFixed(6)} °/dia`} mono />
      <Row k="Ângulo agora" v={`${turns.toFixed(2)}° dentro da revolução`} mono />
      <Row
        k="Evidência"
        v={
          <span>
            <span className="grade" style={{ color: EVIDENCE[g.grade as 'A'].color, borderColor: EVIDENCE[g.grade as 'A'].color }}>
              {g.grade}
            </span>{' '}
            {EVIDENCE[g.grade as 'A'].label} · {g.evidence}
          </span>
        }
      />
      <Row k="Preservada" v={g.surviving ? 'sim — fragmento físico' : 'não — reconstruída'} />
      {neigh.length > 0 && (
        <>
          <h4 className="sub">Acoplamentos</h4>
          {neigh.map((e) => (
            <Row
              key={e.id}
              k={`${e.kind === 'mesh' ? 'engrena com' : e.kind === 'pinSlot' ? 'pino-ranhura com' : e.kind} ${e.id}`}
              v={e.note}
              mono
            />
          ))}
        </>
      )}
      <p className="fine">
        {g.role} — {g.evidence}
      </p>
    </section>
  );
}

// ── About ────────────────────────────────────────────────────────────────
export function AboutPanel() {
  return (
    <div className="panel">
      <Section title="O que é isto" sub="um emulador, não uma animação">
        <p className="body-text">
          Cada movimento neste ecrã vem de uma única entrada: a rotação da roda motriz <b>b1</b>. A partir dela, as
          taxas de todas as 69 rodas são resolvidas de forma exacta (números racionais de 64 bits) percorrendo o grafo
          de acoplamentos; o instante escolhido convertido num ângulo de entrada; e cada mostrador lido do estado
          resultante. Não existe nenhuma rotação “artística”: se uma roda gira, é porque a cadeia a faz girar.
        </p>
        <p className="body-text">
          Os nove indicadores frontais (Lua, nodos, Mercúrio, Vénus, Sol, Marte, Júpiter, Saturno, data) e os cinco
          mostradores traseiros (Meton, Saros, Exeligmo, Olimpíadas, Calíptico) respondem ao mesmo instante.
        </p>
      </Section>

      <Section title="Graus de evidência" sub="nunca uma hipótese apresentada como facto">
        {(['A', 'B', 'C', 'D'] as const).map((g) => (
          <div className="evidence-card" key={g} style={{ borderColor: EVIDENCE[g].color }}>
            <b style={{ color: EVIDENCE[g].color }}>
              {g} · {EVIDENCE[g].label}
            </b>
            <p>{EVIDENCE[g].description}</p>
          </div>
        ))}
      </Section>

      <Section title="Limites declarados">
        <ul className="limits">
          <li>
            A posição 3D das rodas é <b>derivada</b> das distâncias de engrenamento e da ordem dos planos; não é uma
            medição tomográfica roda a roda. O que é medido: raios de algumas rodas, número de dentes preservados e a
            ordem das placas.
          </li>
          <li>
            Os cinco planetas usam o modelo epicíclico grego materializado em pino-e-ranhura. A equação que o
            dispositivo produz (<i>asin</i> da razão de excentricidade) é a mesma do epiciclo de Hiparco, mas o
            mecanismo não modela a segunda excentricidade nem a inclinação das órbitas — daí a divergência de vários
            graus face às posições modernas.
          </li>
          <li>
            A “Mão do Dragão” (nodos) é hipótese (grau D) na literatura de 2021; aqui é implementada e marcada como tal.
          </li>
          <li>A datação do instante de referência e o calendário juliano são aproximações declaradas.</li>
        </ul>
      </Section>

      <Section title="Fontes" sub="literatura até 31 de Dezembro de 2021">
        <ul className="sources">
          {SOURCE_LIST.map((s) => (
            <li key={s.key}>
              <b>{s.short}</b> — {s.citation}
              {s.doi ? (
                <>
                  {' '}
                  <a href={`https://doi.org/${s.doi}`} target="_blank" rel="noreferrer">
                    doi:{s.doi}
                  </a>
                </>
              ) : null}
              <span className="dim"> · {s.usedFor}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Instante de referência">
        <Row k="JD" v={formatJD(EPOCH_JD, true)} mono />
        <Row k="Efeméride" v="última Lua cheia antes do eclipse de 205 a.C. (manhã)" />
        <Row k="T" v={`${((EPOCH_JD - 2451545.0) / 365.25).toFixed(3)} séculos desde J2000`} mono />
        <Row k="Ano" v={formatYear(jdToJulian(EPOCH_JD).year)} mono />
      </Section>

      <Section title="Como foi verificado">
        <p className="body-text">
          A aba <b>Validação</b> corre a bateria completa: leis de engrenamento, produtos de dentes inscritos,
          períodos planetários, coerência metônica e sárica, amplitude da anomalia, compatibilidade geométrica,
          comparação com efemérides independentes e previsão de eclipses. Cada verificação tem tolerância justificada
          e o relatório é exportável.
        </p>
      </Section>
    </div>
  );
}

