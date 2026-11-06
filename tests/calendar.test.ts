import { describe, expect, it } from 'vitest';
import {
  METONIC,
  METONIC_LAYOUT,
  SAROS,
  EXELIGMOS,
  CALLIPPIC,
  monthLength,
  metonicDate,
  olympiadDate,
  callippicDate,
  INTERCALARY_YEARS,
  monthStartDay,
} from '../src/core/calendar';
import { GLYPHS, EYU_PER_MONTH, EYU_PER_ECLIPSE_YEAR, nodeDistance } from '../src/core/eclipses';
import { EPOCH_JD, DAYS_PER_YEAR, jdToJulian } from '../src/core/time';

describe('ciclo metônico', () => {
  it('235 meses em 19 anos', () => {
    expect(METONIC.months).toBe(235);
    expect(METONIC.years).toBe(19);
    expect(METONIC_LAYOUT.length).toBe(235);
  });

  it('soma 6940 dias exactos', () => {
    const total = METONIC_LAYOUT.reduce((a, e) => a + e.days, 0);
    expect(total).toBe(6940);
    expect(METONIC.days).toBe(6940);
  });

  it('os meses só têm 29 ou 30 dias', () => {
    for (let k = 0; k < 235; k++) expect([29, 30]).toContain(monthLength(k));
  });

  it('sete anos intercalares, com o 13.º mês', () => {
    expect(INTERCALARY_YEARS).toEqual([3, 6, 8, 11, 14, 17, 19]);
    const yearsWith13 = new Set(METONIC_LAYOUT.filter((e) => e.monthOfYear === 13).map((e) => e.yearInCycle));
    expect([...yearsWith13].sort((a, b) => a - b)).toEqual(INTERCALARY_YEARS);
  });

  it('os anos têm 12 ou 13 meses e fecham em 19', () => {
    for (let y = 1; y <= 19; y++) {
      const n = METONIC_LAYOUT.filter((e) => e.yearInCycle === y).length;
      expect([12, 13]).toContain(n);
    }
  });

  it('os dias de início são estritamente crescentes', () => {
    for (let k = 0; k < 234; k++) expect(monthStartDay(k + 1)).toBeGreaterThan(monthStartDay(k));
  });

  it('a data contínua devolve o mês e o dia certos', () => {
    for (const x of [0, 0.5, 1.25, 47.9, 100, 234.99]) {
      const d = metonicDate(x);
      expect(d.index).toBe(Math.floor(x));
      expect(d.day).toBeLessThanOrEqual(d.entry.days);
      expect(d.day).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('Saros, exeligmo, olimpíadas e calíptico', () => {
  it('223 meses, 4 voltas, 3 setores', () => {
    expect(SAROS.months).toBe(223);
    expect(SAROS.turns).toBe(4);
    expect(EXELIGMOS.saros).toBe(3);
    expect(EXELIGMOS.hours).toBe(8);
    expect(EXELIGMOS.months).toBe(669);
  });

  it('76 anos calípticos = 4 Saros = 19 anos × 4', () => {
    expect(CALLIPPIC.years).toBe(76);
    expect(CALLIPPIC.cycles * METONIC.months).toBe(940);
    expect(CALLIPPIC.years).toBe(4 * 19);
  });

  it('a olimpíada tem 4 anos e jogos associados', () => {
    const o = olympiadDate(EPOCH_JD);
    expect(o.year).toBeGreaterThanOrEqual(1);
    expect(o.year).toBeLessThanOrEqual(4);
    expect(o.games.length).toBe(2);
  });

  it('a era calíptica avança um ano por ano', () => {
    const a = callippicDate(EPOCH_JD);
    const b = callippicDate(EPOCH_JD + DAYS_PER_YEAR.toNumber());
    expect(a.yearInPeriod).toBeGreaterThanOrEqual(1);
    expect(b.yearInPeriod).toBe(a.yearInPeriod + 1);
  });

  it('a época cai no século III a.C.', () => {
    const d = jdToJulian(EPOCH_JD);
    expect(d.year).toBeLessThan(-200);
    expect(d.year).toBeGreaterThan(-210);
  });
});

describe('previsão de eclipses (Freeth 2014)', () => {
  it('38 glifos lunares e 28 solares num Saros', () => {
    expect(GLYPHS.filter((g) => g.lunar).length).toBe(38);
    expect(GLYPHS.filter((g) => g.solar).length).toBe(28);
  });

  it('todos os meses glifados estão dentro do ciclo', () => {
    for (const g of GLYPHS) {
      expect(g.month).toBeGreaterThanOrEqual(1);
      expect(g.month).toBeLessThanOrEqual(223);
    }
  });

  it('as distâncias ao nodo respeitam os limites inscritos', () => {
    for (const g of GLYPHS) {
      if (g.lunar) expect(Math.abs(g.lunarDistance!)).toBeLessThanOrEqual(20);
      if (g.solar) expect(Math.abs(g.solarDistance!)).toBeLessThanOrEqual(20);
    }
  });

  it('1 mês = 38 EYu e 1 ano de eclipse = 446 EYu', () => {
    expect(EYU_PER_MONTH).toBe(38);
    expect(EYU_PER_ECLIPSE_YEAR).toBe(446);
    expect(EYU_PER_MONTH * 12).toBe(456); // 12 lunations overshoot the eclipse year by 10 EYu
  });

  it('a distância ao nodo é periódica e limitada', () => {
    for (let p = 0; p < 446; p += 7) {
      const d = nodeDistance(p);
      expect(Math.abs(d.distance)).toBeLessThanOrEqual(223);
      expect(['ascending', 'descending']).toContain(d.node);
    }
  });
});
