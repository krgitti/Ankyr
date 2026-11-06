/**
 * Generates the machine-readable documentation:
 *
 *   docs/relatorio-validacao.md  — the validation battery, verbatim
 *   docs/mecanica.md             — the full 69-wheel catalogue with geometry
 *
 * Run with `npm run report`. Nothing here is hand-typed: both files are built
 * from the same objects the emulator uses, so they cannot drift from the code.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runValidation, reportToMarkdown, TRAIN_PRODUCTS } from '../src/core/validation';
import { gearRows, mechanism, CATALOGUE_SIZE, THIRTY_SURVIVORS } from '../src/core/mechanism';
import { GEARS, EDGES, GEAR, NEIGHBOURS } from '../src/core/gears';
import { pitchR, outerR, moduleOf, placement, Z, PLANES, CASE } from '../src/core/layout';
import { EVIDENCE, SOURCE_LIST } from '../src/core/sources';
import { EPOCH_JD, formatJD, jdToJulian, DAYS_PER_YEAR } from '../src/core/time';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const out = (name: string, text: string) => {
  const path = resolve(root, 'docs', name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, 'utf8');
  console.log(`escrito ${path} (${text.length} caracteres)`);
};

const num = (x: number, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : '—');

// ── Validation report ────────────────────────────────────────────────────
const report = runValidation();
const md: string[] = [];
md.push(reportToMarkdown(report));
md.push('');
md.push('## Produtos de dentes independentes');
md.push('');
md.push('Cada relação de período é recalculada multiplicando à mão as razões de dentes da cadeia.');
md.push('Se o produto e o solucionador concordarem, a taxa resolvida é confiável.');
md.push('');
md.push('| trem | cadeia | produto exacto | significado |');
md.push('| --- | --- | --- | --- |');
for (const [key, entry] of Object.entries(TRAIN_PRODUCTS)) {
  md.push(`| ${key} | ${entry.ids.join(' → ')} | ${entry.product.toString()} | ${entry.meaning} |`);
}
md.push('');
md.push('## Calibração');
md.push('');
md.push('Os únicos parâmetros ajustados do mecanismo. Fases de montagem e deslocamentos de anel,');
md.push('filtrados pela montagem física; nenhuma taxa depende deles.');
md.push('');
md.push('| parâmetro | valor |');
md.push('| --- | --- |');
for (const [id, p] of Object.entries(mechanism.calibration.phases)) md.push(`| fase ${id} | ${p.toFixed(12)} voltas |`);
for (const [id, m] of Object.entries(mechanism.calibration.mount)) md.push(`| deslocamento ${id} | ${m.toFixed(12)}° |`);
md.push('');
md.push('## Fontes');
md.push('');
for (const s of SOURCE_LIST) md.push(`- **${s.short}** — ${s.citation}${s.doi ? ` doi:${s.doi}` : ''}`);
out('relatorio-validacao.md', md.join('\n'));

// ── Mechanical catalogue ─────────────────────────────────────────────────
const rows = gearRows();
const d = jdToJulian(EPOCH_JD);
const mech: string[] = [];
mech.push('# Mecânica: catálogo de rodas, trens e geometria');
mech.push('');
mech.push('> Documento gerado por `npm run report` a partir do próprio código. Não editar à mão.');
mech.push('');
mech.push(`Época do emulador: JD ${formatJD(EPOCH_JD, true)} (${Math.floor(d.day)}/${d.month}/${d.year} juliano).`);
mech.push(`Ano de ${DAYS_PER_YEAR.toString()} dias. ${CATALOGUE_SIZE} rodas no catálogo, ${THIRTY_SURVIVORS} preservadas física e arqueologicamente.`);
mech.push('');
mech.push('## Graus de evidência');
mech.push('');
for (const g of ['A', 'B', 'C', 'D'] as const) {
  mech.push(`- **${g} · ${EVIDENCE[g].label}** — ${EVIDENCE[g].description}`);
}
mech.push('');
mech.push('## Catálogo');
mech.push('');
mech.push('| id | dentes | trem | módulo | r primitivo | r externo | z | eixo | voltas/ano | período | evidência |');
mech.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  const g = GEAR.get(r.id)!;
  const p = placement(r.id);
  const mod = moduleOf(r.id);
  mech.push(
    `| \`${r.id}\` | ${g.teeth} | ${g.train} | ${mod.m.toFixed(2)} (${mod.source}) | ${num(pitchR(r.id), 2)} | ${num(
      outerR(r.id),
      2,
    )} | ${num(Z[r.id] ?? 0, 2)} | ${p.axis.x.toFixed(1)}, ${p.axis.y.toFixed(1)} | ${
      r.turnsPerYear >= 0 ? '' : '−'
    }${Math.abs(r.turnsPerYear).toFixed(6)} | ${r.periodYears ? `${r.periodYears.toFixed(4)} a` : '—'} | ${r.grade} |`,
  );
}
mech.push('');
mech.push('## Acoplamentos');
mech.push('');
mech.push('| tipo | roda | roda | nota |');
mech.push('| --- | --- | --- | --- |');
for (const e of EDGES) {
  if (e.kind === 'fixed') {
    mech.push(`| fixa à placa | \`${e.a}\` | — | roda o anel; tudo o resto gira dentro dela |`);
  } else if (e.kind === 'arbor') {
    mech.push(`| eixo rígido | \`${e.a}\` | \`${e.b}\` | rodam juntas |`);
  } else if (e.kind === 'mesh') {
    mech.push(`| engrenamento | \`${e.a}\` | \`${e.b}\` | ω₂/ω₁ = −${GEAR.get(e.a)!.teeth}/${GEAR.get(e.b)!.teeth} (${e.frame}) |`);
  } else {
    mech.push(`| pino e ranhura | \`${e.a}\` | \`${e.b}\` | deslocamento ${e.offset} mm, pino ${e.pin} mm |`);
  }
}
mech.push('');
mech.push('## Planos de engrenamento');
mech.push('');
mech.push(`${PLANES.length} planos distintos, distribuídos por ${num(2 * CASE.depth, 0)} mm de profundidade.`);
mech.push('');
mech.push('| plano | z (mm) | rodas |');
mech.push('| --- | --- | --- |');
PLANES.forEach((plane, i) => {
  mech.push(`| ${i + 1} | ${num(Z[plane[0]] ?? 0, 2)} | ${plane.map((id) => `\`${id}\``).join(', ')} |`);
});
mech.push('');
mech.push('## Vizinhos de cada roda');
mech.push('');
for (const g of GEARS) {
  const n = NEIGHBOURS.get(g.id) ?? [];
  if (!n.length) continue;
  mech.push(`- **${g.id}** (${g.teeth}): ${n.map((e) => `${e.kind} → ${e.id}`).join('; ')}`);
}
out('mecanica.md', mech.join('\n'));
