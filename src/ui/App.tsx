import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mechanism } from '../core/mechanism';
import { EPOCH_JD, DAYS_PER_YEAR, jdToJulian, julianToJD, formatJD, formatYear } from '../core/time';
import SceneView from './SceneView';
import { TRAIN_COLOURS, VIEW_NAMES } from '../three/scene';
import { AboutPanel, AstronomyPanel, CalendarPanel, GearsPanel, GearInspector } from './panels';
import ValidationPanel from './ValidationPanel';
import type { ViewName } from '../three/scene';

const TABS = [
  { id: 'sky', label: 'Céu' },
  { id: 'calendar', label: 'Calendário' },
  { id: 'gears', label: 'Engrenagens' },
  { id: 'validation', label: 'Validação' },
  { id: 'about', label: 'Sobre' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const VIEWS = VIEW_NAMES;

/** One crank turn advances the drive wheel once: 223/48 lunations. */
const DAYS_PER_CRANK_TURN = (DAYS_PER_YEAR.toNumber() * 48) / 223;
const SYNODIC = 29.530588;

interface KnobProps {
  onTurn: (turns: number) => void;
}

function Crank({ onTurn }: KnobProps) {
  const [angle, setAngle] = useState(0);
  const last = useRef<number | null>(null);
  const down = useRef(false);

  const handle = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const a = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    if (last.current === null) {
      last.current = a;
      return;
    }
    let d = a - last.current;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    last.current = a;
    setAngle((prev) => prev + d);
    onTurn(d / 360);
  };

  return (
    <div
      className="crank"
      title="Manivela: arraste em círculo para girar o mecanismo"
      onPointerDown={(e) => {
        down.current = true;
        last.current = null;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        handle(e);
      }}
      onPointerMove={(e) => {
        if (down.current) handle(e);
      }}
      onPointerUp={() => {
        down.current = false;
        last.current = null;
      }}
      onPointerCancel={() => {
        down.current = false;
        last.current = null;
      }}
    >
      <div className="crank-wheel" style={{ transform: `rotate(${angle}deg)` }}>
        <span className="crank-spoke" />
        <span className="crank-spoke crank-spoke-2" />
      </div>
      <span className="crank-label">manivela</span>
    </div>
  );
}

export default function App() {
  const [jd, setJd] = useState(EPOCH_JD);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(6); // mechanism days per second
  const [view, setView] = useState<ViewName>('front');
  const [xray, setXray] = useState(true);
  const [explode, setExplode] = useState(1);
  const [labels, setLabels] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('sky');

  const jdRef = useRef(jd);
  const speedRef = useRef(speed);
  jdRef.current = jd;
  speedRef.current = speed;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.25);
      last = now;
      acc += dt;
      if (acc > 0.06) {
        acc = 0;
        setJd((v) => v + speedRef.current * dt);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const readout = useMemo(() => mechanism.read(jd), [jd]);

  const onSelect = useCallback((id: string | null) => setSelected(id), []);

  const step = (days: number) => setJd((v) => v + days);
  const date = jdToJulian(jd);
  const [y, m, d] = [date.year, date.month, Math.floor(date.day)];
  const setDate = (field: 'year' | 'month' | 'day', value: number) => {
    const next = { year: y, month: m, day: d, [field]: value };
    if (next.month < 1 || next.month > 12) return;
    if (next.day < 1 || next.day > 31) return;
    if (!Number.isFinite(next.year)) return;
    setJd(julianToJD(next));
  };

  const indicatorCount = 9;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Α</span>
          <div>
            <h1>Ankyr</h1>
            <p>Mecanismo de Antikythera · laboratório digital</p>
          </div>
        </div>
        <div className="topbar-date">
          <div className="date-inputs">
            <input
              type="number"
              value={d}
              min={1}
              max={31}
              onChange={(e) => setDate('day', Number(e.target.value))}
              aria-label="dia"
            />
            <input
              type="number"
              value={m}
              min={1}
              max={12}
              onChange={(e) => setDate('month', Number(e.target.value))}
              aria-label="mês"
            />
            <input
              type="number"
              value={y}
              onChange={(e) => setDate('year', Number(e.target.value))}
              aria-label="ano"
              className="year"
            />
          </div>
          <div className="date-labels">
            <span>{formatYear(y)}</span>
            <span className="mono">JD {formatJD(jd, true)}</span>
          </div>
        </div>
        <div className="status-chips">
          <span className="chip">
            <b>{indicatorCount}</b> indicadores
          </span>
          <span className="chip">
            <b>69</b> engrenagens
          </span>
          <span className="chip mono">T = {readout.T.toNumber().toFixed(4)} a</span>
        </div>
      </header>

      <main className="stage">
        <section className="viewport">
          <SceneView
            readout={readout}
            view={view}
            xray={xray}
            explode={explode}
            labels={labels}
            selected={selected}
            onSelect={onSelect}
          />
          <div className="view-switch">
            {VIEWS.map((v) => (
              <button key={v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="view-tools">
            <button className={xray ? 'active' : ''} onClick={() => setXray((v) => !v)} title="Transparência por trem">
              {xray ? '◐ Raios X' : '● Sólido'}
            </button>
            <button className={labels ? 'active' : ''} onClick={() => setLabels((v) => !v)}>
              Nomes
            </button>
            <label className="layer-slider" title="Afasta as rodas ao longo do eixo do mecanismo">
              <span>camadas</span>
              <input
                type="range"
                min={1}
                max={2.6}
                step={0.05}
                value={explode}
                onChange={(e) => setExplode(Number(e.target.value))}
              />
              <span className="mono">×{explode.toFixed(2)}</span>
            </label>
          </div>
          {xray && (
            <div className="legend">
              {Object.entries(TRAIN_COLOURS).map(([key, t]) => (
                <span key={key} className="legend-item">
                  <i style={{ background: `#${t.hex.toString(16).padStart(6, '0')}` }} />
                  {t.label}
                </span>
              ))}
            </div>
          )}
          <div className="scene-hint">
            arraste para orbitar · roda do rato para ampliar · clique numa engrenagem (clique outra vez para a que está atrás)
          </div>
        </section>

        <aside className="sidebar">
          <nav className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="panel-scroll">
            {tab === 'sky' && <AstronomyPanel readout={readout} />}
            {tab === 'calendar' && <CalendarPanel readout={readout} />}
            {tab === 'gears' && (
              <>
                <GearInspector id={selected} readout={readout} />
                <GearsPanel selected={selected} onSelect={setSelected} />
              </>
            )}
            {tab === 'validation' && <ValidationPanel />}
            {tab === 'about' && <AboutPanel />}
          </div>
        </aside>
      </main>

      <footer className="transport">
        <div className="transport-left">
          <button className="primary" onClick={() => setPlaying((p) => !p)}>
            {playing ? '❚❚ Pausar' : '▶ Reproduzir'}
          </button>
          <button onClick={() => setJd(EPOCH_JD)} title="Voltar ao instante de referência">
            ⭮ Reiniciar
          </button>
          <div className="speed">
            <label htmlFor="speed">velocidade</label>
            <input
              id="speed"
              type="range"
              min={-400}
              max={400}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
            <span className="mono">{speed} d/s</span>
          </div>
        </div>
        <div className="transport-steps">
          <button onClick={() => step(-1)}>−1 d</button>
          <button onClick={() => step(1)}>+1 d</button>
          <button onClick={() => step(SYNODIC)}>+1 mês</button>
          <button onClick={() => step(DAYS_PER_YEAR.toNumber())}>+1 ano</button>
          <button onClick={() => step(DAYS_PER_YEAR.toNumber() * 10)}>+10 a</button>
          <button onClick={() => step(DAYS_PER_YEAR.toNumber() * 100)}>+1 século</button>
        </div>
        <Crank onTurn={(turns) => setJd((v) => v + turns * DAYS_PER_CRANK_TURN)} />
      </footer>
    </div>
  );
}
