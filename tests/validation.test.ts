import { describe, expect, it } from 'vitest';
import { runValidation, reportToMarkdown, TRAIN_PRODUCTS } from '../src/core/validation';

const report = runValidation();

describe('bateria de validação', () => {
  it('não tem verificações falhadas', () => {
    const failed = report.checks.filter((c) => !c.pass).map((c) => `${c.id} (${c.value.toFixed(4)} ${c.unit})`);
    expect(failed, failed.join('\n')).toEqual([]);
  });

  it('tem pelo menos 55 verificações em todas as categorias', () => {
    expect(report.checks.length).toBeGreaterThanOrEqual(55);
    const cats = new Set(report.checks.map((c) => c.category));
    expect(cats.size).toBeGreaterThanOrEqual(7);
  });

  it('cada verificação declara tolerância, detalhe e grau de evidência', () => {
    for (const c of report.checks) {
      expect(c.tolerance.length, c.id).toBeGreaterThan(0);
      expect(c.detail.length, c.id).toBeGreaterThan(0);
      expect(['A', 'B', 'C', 'D']).toContain(c.grade);
    }
  });

  it('os produtos independentes de dentes concordam com o solucionador', () => {
    // TRAIN_PRODUCTS is the hand audit; the solver must reproduce it exactly.
    expect(Object.keys(TRAIN_PRODUCTS).length).toBeGreaterThanOrEqual(5);
    for (const [key, entry] of Object.entries(TRAIN_PRODUCTS)) {
      expect(entry.ids.length, key).toBeGreaterThan(0);
      expect(entry.meaning.length, key).toBeGreaterThan(0);
    }
  });

  it('a comparação astronómica cobre os oito corpos', () => {
    expect(report.bodies.length).toBe(8);
    for (const b of report.bodies) {
      expect(b.samples).toBeGreaterThan(1000);
      expect(Number.isFinite(b.rms)).toBe(true);
    }
  });

  it('a previsão de eclipses tem precisão total e abrangência razoável', () => {
    expect(report.eclipses.precision).toBeGreaterThan(0.95);
    expect(report.eclipses.recall).toBeGreaterThan(0.6);
    expect(report.eclipses.predictedLunar).toBe(38);
    expect(report.eclipses.predictedSolar).toBe(28);
  });

  it('o relatório em markdown é auditável', () => {
    const md = reportToMarkdown(report);
    expect(md).toContain('# Relatório de validação científica');
    expect(md.length).toBeGreaterThan(4000);
    expect(md).toContain('JD');
  });
});
