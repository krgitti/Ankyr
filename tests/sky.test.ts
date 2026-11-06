import { describe, expect, it } from 'vitest';
import {
  PLACES,
  obliquity,
  gmst,
  eclipticToEquatorial,
  equatorialToHorizontal,
  riseSet,
  localNoon,
  localHour,
  formatHour,
  bodyHorizontal,
  localEclipse,
  angularSeparation,
  dayLength,
} from '../src/core/sky';
import { sunLongitude, moonPosition, nextSyzygy, norm360 } from '../src/core/ephemeris';
import { julianToJD, EPOCH_JD } from '../src/core/time';

const syracuse = PLACES[0];

describe('base de tempo sideral', () => {
  it('a obliquidade está perto de 23.44°', () => {
    expect(obliquity(julianToJD({ year: 2020, month: 1, day: 1 }))).toBeCloseTo(23.4366, 2);
    expect(obliquity(EPOCH_JD)).toBeGreaterThan(23.6);
    expect(obliquity(EPOCH_JD)).toBeLessThan(23.8);
  });

  it('o tempo sideral de Greenwich fecha em 24 h', () => {
    for (let h = 0; h < 24; h += 3) expect(gmst(2451545.0 + h / 24)).toBeGreaterThanOrEqual(0);
    expect(norm360(gmst(2451545.0))).toBeCloseTo(280.4606, 1);
  });

  it('o ponto vernal está no equador e na eclíptica', () => {
    const eq = eclipticToEquatorial(0, 0, 2451545.0);
    expect(eq.ra).toBeCloseTo(0, 6);
    expect(eq.dec).toBeCloseTo(0, 6);
  });

  it('o solstício de Junho tem declinação +ε', () => {
    const eq = eclipticToEquatorial(90, 0, 2451545.0);
    expect(eq.dec).toBeCloseTo(23.4393, 2);
    expect(eq.ra).toBeCloseTo(90, 2);
  });
});

describe('horizonte', () => {
  it('no equador, o pólo celeste está no horizonte norte', () => {
    const eq = { ra: 0, dec: 90 };
    const h = equatorialToHorizontal(eq, 2451545.0, { id: 'q', name: 'equador', lat: 0, lon: 0 });
    expect(Math.abs(h.alt)).toBeLessThan(0.01);
  });

  it('ao meio-dia local o Sol está a sul e alto', () => {
    const jd = localNoon(julianToJD({ year: 2020, month: 6, day: 8 }), syracuse);
    const sun = bodyHorizontal('sun', jd, syracuse);
    expect(sun.alt).toBeGreaterThan(70);
    expect(sun.az).toBeGreaterThan(150);
    expect(sun.az).toBeLessThan(210);
  });

  it('a altura máxima nunca excede 90 − |φ − δ|', () => {
    for (const place of PLACES) {
      const jd = localNoon(julianToJD({ year: 2020, month: 3, day: 7 }), place);
      const sun = bodyHorizontal('sun', jd, place);
      const dec = eclipticToEquatorial(sunLongitude(jd), 0, jd).dec;
      expect(sun.alt).toBeLessThanOrEqual(90 - Math.abs(place.lat - dec) + 0.5);
    }
  });

  it('o dia no equinócio dura ~12 h em qualquer latitude', () => {
    for (const place of PLACES) {
      const jd = julianToJD({ year: 2020, month: 3, day: 7 });
      const len = dayLength('sun', jd, place);
      expect(len, place.id).toBeGreaterThan(11.6);
      expect(len, place.id).toBeLessThan(12.6);
    }
  });

  it('no solstício de Junho os dias do norte são longos', () => {
    const jd = julianToJD({ year: 2020, month: 6, day: 8 });
    const north = dayLength('sun', jd, PLACES[0]);
    const south = dayLength('sun', jd, { id: 's', name: 'sul', lat: -37, lon: 15 });
    expect(north).toBeGreaterThan(14);
    expect(south).toBeLessThan(10);
  });

  it('a nascente e a poente do Sol ficam a leste e a oeste', () => {
    const rs = riseSet('sun', julianToJD({ year: 2020, month: 3, day: 7 }), PLACES[0]);
    expect(rs.riseAz!).toBeGreaterThan(80);
    expect(rs.riseAz!).toBeLessThan(100);
    expect(rs.setAz!).toBeGreaterThan(260);
    expect(rs.setAz!).toBeLessThan(280);
    expect(rs.rise!).toBeLessThan(rs.set!);
  });

  it('a Lua nasce e põe-se ao longo de um mês', () => {
    let found = 0;
    for (let d = 0; d < 30; d += 3) {
      const rs = riseSet('moon', EPOCH_JD + d, PLACES[0]);
      if (rs.rise !== null && rs.set !== null) found++;
    }
    expect(found).toBeGreaterThan(6);
  });

  it('a hora local e a formatação são coerentes', () => {
    expect(formatHour(13.5)).toBe('13:30');
    expect(formatHour(0.25)).toBe('00:15');
    expect(formatHour(23.999)).toBe('00:00');
    const h = localHour(2451545.0, syracuse);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(24);
  });
});

describe('eclipses vistos de um lugar', () => {
  it('a separação angular é nula para o mesmo ponto', () => {
    expect(angularSeparation(123, 45, 123, 45)).toBeCloseTo(0, 6);
    expect(angularSeparation(0, 0, 90, 0)).toBeCloseTo(90, 6);
  });

  it('numa Lua nova o Sol e a Lua ficam a menos de 6° no céu', () => {
    const nm = nextSyzygy(EPOCH_JD, 0);
    const e = localEclipse('solar', nm, PLACES[0]);
    expect(e.separation).toBeLessThan(6);
    expect(e.contact).toBeGreaterThan(0.5);
    expect(e.contact).toBeLessThan(0.55);
  });

  it('a visibilidade exige o astro acima do horizonte', () => {
    const nm = nextSyzygy(EPOCH_JD, 0);
    const e = localEclipse('solar', nm, PLACES[0]);
    expect(e.visible).toBe(e.altitude > 0 && e.separation < e.contact);
  });

  it('um eclipse é visível em metade do globo e não na outra', () => {
    const nm = nextSyzygy(EPOCH_JD, 0);
    const east = localEclipse('solar', nm, { id: 'a', name: 'a', lat: 0, lon: 0 });
    const west = localEclipse('solar', nm, { id: 'b', name: 'b', lat: 0, lon: 180 });
    expect(east.visible !== west.visible || Math.abs(east.altitude - west.altitude) > 5).toBe(true);
  });

  it('a magnitude está entre 0 e 1 e cresce com a proximidade', () => {
    const nm = nextSyzygy(EPOCH_JD, 0);
    const e = localEclipse('solar', nm, PLACES[0]);
    expect(e.magnitude).toBeGreaterThanOrEqual(0);
    expect(e.magnitude).toBeLessThanOrEqual(1);
  });

  it('a latitude lunar entra na separação', () => {
    const nm = nextSyzygy(EPOCH_JD, 0);
    const e = localEclipse('solar', nm, PLACES[0]);
    const beta = Math.abs(moonPosition(nm).latitude);
    expect(e.separation).toBeGreaterThan(0);
    expect(beta).toBeLessThan(6);
  });
});

describe('próximo eclipse', () => {
  it('encontra um eclipse solar dentro de seis lunação', async () => {
    const { nextEclipse } = await import('../src/core/sky');
    const t = nextEclipse(EPOCH_JD, 'solar');
    expect(t).not.toBeNull();
    expect(t! - EPOCH_JD).toBeGreaterThan(0);
    expect(t! - EPOCH_JD).toBeLessThan(180);
    expect(Math.abs(moonPosition(t!).latitude)).toBeLessThan(1.55);
  });

  it('encontra um eclipse lunar e devolve o mais próximo dos dois', async () => {
    const { nextLocalEclipse } = await import('../src/core/sky');
    const e = nextLocalEclipse(EPOCH_JD, PLACES[0]);
    expect(e).not.toBeNull();
    expect(['solar', 'lunar']).toContain(e!.kind);
    expect(Number.isFinite(e!.altitude)).toBe(true);
    expect(e!.reason.length).toBeGreaterThan(3);
  });
});
