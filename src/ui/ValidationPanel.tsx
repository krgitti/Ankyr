import { useEffect, useMemo, useState } from 'react';
import { runValidation, reportToMarkdown, type ValidationReport, type Check } from '../core/validation';

const download = (name: string, text: string, type: string) => {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const fmtValue = (c: Check) => {
  if (!Number.isFinite(c.value)) return '—';
  const abs = Math.abs(c.value);
  if (abs === 0) return '0';
  if (abs < 1e-6) return c.value.toExponential(2);
  if (abs >= 1000) return c.value.toFixed(0);
  return c.value.toFixed(abs < 1 ? 5 : 3);
};

export default function ValidationPanel() {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setRunning(true);
    const id = setTimeout(() => {
      const r = runValidation();
      if (!cancelled) {
        setReport(r);
        setRunning(false);
      }
    }, 30);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  const grouped = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, Check[]>();
    for (const c of report.checks) {
      const arr = map.get(c.category) ?? [];
      arr.push(c);
      map.set(c.category, arr);
    }
    return [...map.entries()];
  }, [report]);

  if (running || !report) {
    return (
      <div className="panel">
        <div className="loader">
          <span className="spinner" />
          <p>Resolvendo o grafo, comparando 200 anos de efemérides e reconstruindo o ciclo de 223 meses…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <section className="panel-section">
        <header>
          <h3>Bateria de validação</h3>
          <p>gerada em {new Date(report.generatedAt).toLocaleString('pt-BR')} · época JD {report.epochJD.toFixed(5)}</p>
        </header>
        <div className="stat-row">
          <div className="stat">
            <b>
              {report.summary.passed}/{report.summary.total}
            </b>
            <span>verificações</span>
          </div>
          <div className="stat">
            <b>{(report.summary.passRate * 100).toFixed(1)} %</b>
            <span>aprovadas</span>
          </div>
          <div className="stat">
            <b>{report.bodies.length}</b>
            <span>corpos comparados</span>
          </div>
          <div className="stat">
            <b>
              {report.eclipses.lunarHits + report.eclipses.solarHits}/{report.eclipses.predictedLunar + report.eclipses.predictedSolar}
            </b>
            <span>glifos confirmados</span>
          </div>
        </div>
        <div className="button-row">
          <button onClick={() => download('validacao-anakyr.md', reportToMarkdown(report), 'text/markdown')}>
            Exportar relatório .md
          </button>
          <button onClick={() => download('validacao-anakyr.json', JSON.stringify(report, null, 2), 'application/json')}>
            Exportar .json
          </button>
        </div>
      </section>

      {grouped.map(([cat, checks]) => (
        <section className="panel-section" key={cat}>
          <header>
            <h3>
              {cat} <span className="dim">· {checks.filter((c) => c.pass).length}/{checks.length}</span>
            </h3>
          </header>
          <table className="data-table validation">
            <tbody>
              {checks.map((c) => (
                <tr key={c.id} className={c.pass ? '' : 'failed'}>
                  <td className="mark">{c.pass ? '✓' : '✕'}</td>
                  <td>
                    <div className="check-name">{c.name}</div>
                    <div className="fine">{c.detail}</div>
                  </td>
                  <td className="mono num">
                    {fmtValue(c)} <span className="dim">{c.unit}</span>
                  </td>
                  <td className="fine tol">tol. {c.tolerance}</td>
                  <td>
                    <span className="grade" style={{ borderColor: '#7d6a44', color: '#c8b48a' }}>
                      {c.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <section className="panel-section">
        <header>
          <h3>Comparação com efemérides independentes</h3>
          <p>250–50 a.C., amostragem de 20 em 20 dias</p>
        </header>
        <table className="data-table">
          <thead>
            <tr>
              <th>corpo</th>
              <th>RMS</th>
              <th>viés</th>
              <th>máx</th>
              <th>amostras</th>
            </tr>
          </thead>
          <tbody>
            {report.bodies.map((b) => (
              <tr key={b.body}>
                <td>{b.body}</td>
                <td className="mono">{b.rms.toFixed(2)}°</td>
                <td className="mono">{b.mean.toFixed(2)}°</td>
                <td className="mono dim">{b.max.toFixed(2)}°</td>
                <td className="mono dim">{b.samples}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel-section">
        <header>
          <h3>Previsão de eclipses</h3>
          <p>um ciclo de Saros, 223 meses, contra um efeméride moderno</p>
        </header>
        <table className="data-table">
          <tbody>
            <tr>
              <td>Glifos lunares previstos</td>
              <td className="mono">{report.eclipses.predictedLunar}</td>
              <td className="mono ok">{report.eclipses.lunarHits} confirmados</td>
            </tr>
            <tr>
              <td>Glifos solares previstos</td>
              <td className="mono">{report.eclipses.predictedSolar}</td>
              <td className="mono ok">{report.eclipses.solarHits} confirmados</td>
            </tr>
            <tr>
              <td>Precisão</td>
              <td className="mono">{(report.eclipses.precision * 100).toFixed(1)} %</td>
              <td className="fine">dos glifos previstos correspondem a eclipse real</td>
            </tr>
            <tr>
              <td>Abrangência</td>
              <td className="mono">{(report.eclipses.recall * 100).toFixed(1)} %</td>
              <td className="fine">dos eclipses reais do período estão previstos</td>
            </tr>
          </tbody>
        </table>
        <p className="fine">
          A abrangência é limitada pelo próprio mecanismo: as inscrições marcam eclipses que ocorrem perto de uma hora
          específica do dia. Eclipses reais fora dos limites inscritos (norte 20 EYu, sul 7 EYu) ficam de fora por
          construção, e são contados como não previstos.
        </p>
      </section>
    </div>
  );
}
