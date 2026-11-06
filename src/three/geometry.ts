/**
 * Three.js geometry helpers: gear wheels with real tooth counts, engraved
 * dial plates drawn with the Canvas 2D API, and the small parts of the case.
 *
 * The number of teeth is never faked: a 223-tooth wheel is drawn with 223
 * teeth, so the rendering cannot drift from the kinematics.
 */

import * as THREE from 'three';

export interface GearGeomOptions {
  teeth: number;
  pitchRadius: number;
  outerRadius: number;
  thickness: number;
  module: number;
  spokes?: number;
  holeRadius?: number;
}

/** Triangular (classical) tooth outline, extruded to a plate. */
export const makeGearGeometry = ({
  teeth,
  pitchRadius,
  outerRadius,
  thickness,
  module: m,
  spokes = 0,
  holeRadius,
}: GearGeomOptions): THREE.ExtrudeGeometry => {
  const rootRadius = Math.max(pitchRadius - 1.1 * m, pitchRadius * 0.72);
  const tipRadius = Math.max(outerRadius, pitchRadius + 0.9 * m);
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const halfTooth = step * 0.28; // tooth angular half-width at the tip
  const halfSpace = step * 0.30; // half-width at the root

  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [
      [rootRadius, a - halfSpace],
      [tipRadius, a - halfTooth],
      [tipRadius, a + halfTooth],
      [rootRadius, a + halfSpace],
    ];
    pts.forEach(([r, ang], j) => {
      const x = r * Math.cos(ang);
      const y = r * Math.sin(ang);
      if (i === 0 && j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();

  const hub = holeRadius ?? Math.max(1.2, pitchRadius * 0.12);
  if (pitchRadius > 9 && spokes >= 3) {
    // Lightening windows between spokes, as on the large surviving wheels.
    const inner = Math.max(hub + 2.2, pitchRadius * 0.42);
    const outer = rootRadius - 1.6;
    if (outer > inner + 1.5) {
      for (let s = 0; s < spokes; s++) {
        const a0 = (s / spokes) * Math.PI * 2 + 0.22;
        const a1 = ((s + 1) / spokes) * Math.PI * 2 - 0.22;
        const path = new THREE.Path();
        const steps = 14;
        for (let k = 0; k <= steps; k++) {
          const ang = a0 + ((a1 - a0) * k) / steps;
          const r = outer;
          if (k === 0) path.moveTo(r * Math.cos(ang), r * Math.sin(ang));
          else path.lineTo(r * Math.cos(ang), r * Math.sin(ang));
        }
        for (let k = steps; k >= 0; k--) {
          const ang = a0 + ((a1 - a0) * k) / steps;
          path.lineTo(inner * Math.cos(ang), inner * Math.sin(ang));
        }
        path.closePath();
        shape.holes.push(path);
      }
    }
  }

  const hole = new THREE.Path();
  hole.absarc(0, 0, hub, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.translate(0, 0, -thickness / 2);
  return geo;
};

// ── Canvas textures for the dials ────────────────────────────────────────

const makeCanvas = (size: number) => {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
};

export const canvasTexture = (canvas: HTMLCanvasElement) => {
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

const BRONZE_INK = '#3b2a14';
const BRONZE_ENGRAVE = '#7a5a2c';

export interface DialStyle {
  ink?: string;
  faint?: string;
  font?: string;
}

/** The zodiac ring: twelve 30° signs, 360 ticks, Greek names. */
export const makeZodiacTexture = (size = 2048, style: DialStyle = {}): THREE.CanvasTexture => {
  const c = makeCanvas(size);
  const g = c.getContext('2d')!;
  const R = size / 2;
  const ink = style.ink ?? BRONZE_INK;
  const faint = style.faint ?? BRONZE_ENGRAVE;
  g.clearRect(0, 0, size, size);
  g.translate(R, R);

  // Sign boundaries and names (0° Aries at 3 o'clock, counter-clockwise).
  const names = ['ΚΡΙΟΣ', 'ΤΑΥΡΟΣ', 'ΔΙΔΥΜΟΙ', 'ΚΑΡΚΙΝΟΣ', 'ΛΕΩΝ', 'ΠΑΡΘΕΝΟΣ', 'ΧΗΛΑΙ', 'ΣΚΟΡΠΙΟΣ', 'ΤΟΞΟΤΗΣ', 'ΑΙΓΟΚΕΡΩΣ', 'ΥΔΡΟΧΟΟΣ', 'ΙΧΘΥΕΣ'];
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2;
    const a1 = ((i + 1) / 12) * Math.PI * 2;
    g.strokeStyle = ink;
    g.lineWidth = size / 420;
    g.beginPath();
    g.moveTo(Math.cos(a0) * R * 0.72, Math.sin(a0) * R * 0.72);
    g.lineTo(Math.cos(a0) * R * 0.97, Math.sin(a0) * R * 0.97);
    g.stroke();
    g.save();
    g.rotate((a0 + a1) / 2);
    g.fillStyle = ink;
    // Names sit between the inner edge (66.5 mm of 80) and the degree ticks,
    // so the text is not clipped by the ring's hole.
    g.font = `${Math.round(size / 42)}px Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(names[11 - i], R * 0.878, 0);
    g.restore();
    void a1;
  }
  // Degree ticks.
  for (let d = 0; d < 360; d++) {
    const a = (d / 360) * Math.PI * 2;
    const long = d % 5 === 0;
    const r0 = R * (long ? 0.90 : 0.935);
    const r1 = R * 0.965;
    g.strokeStyle = long ? ink : faint;
    g.lineWidth = size / (long ? 700 : 1400);
    g.beginPath();
    g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    g.stroke();
  }
  return canvasTexture(c);
};

/** The 365-day Egyptian calendar ring on the front dial. */
export const makeCalendarRingTexture = (size = 2048): THREE.CanvasTexture => {
  const c = makeCanvas(size);
  const g = c.getContext('2d')!;
  const R = size / 2;
  g.translate(R, R);
  const months = ['ΘΩΘ', 'ΦΑΩΦΙ', 'ΑΘΥΡ', 'ΧΟΙΑΚ', 'ΤΥΒΙ', 'ΜΕΧΕΙΡ', 'ΦΑΜΕΝΩΘ', 'ΦΑΡΜΟΥΘΙ', 'ΠΑΧΩΝ', 'ΠΑΥΝΙ', 'ΕΠΙΦΙ', 'ΜΕΣΟΡΗ'];
  g.strokeStyle = BRONZE_INK;
  // The mesh is a ring from 57 to 66.5 mm, and RingGeometry maps the texture
  // over the full 66.5 mm circle: keep the marks between 0.86 and 0.99 of R.
  for (let d = 0; d < 365; d++) {
    const a = (d / 365) * Math.PI * 2;
    const r0 = R * (d % 30 === 0 ? 0.862 : 0.905);
    const r1 = R * 0.988;
    g.lineWidth = size / (d % 30 === 0 ? 500 : 1600);
    g.beginPath();
    g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    g.stroke();
  }
  g.fillStyle = BRONZE_INK;
  g.font = `${Math.round(size / 74)}px Georgia, serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const a = ((i * 30 + 15) / 365) * Math.PI * 2;
    g.save();
    g.rotate(a);
    g.fillText(months[i], R * 0.875, 0);
    g.restore();
  }
  return canvasTexture(c);
};

export interface SpiralSpec {
  cells: number;
  turns: number;
  innerRadius: number;
  outerRadius: number;
  startAngleDeg: number;
  /** Per-cell label; return '' for none. */
  label?: (index: number) => string;
  /** 0..1 radial emphasis for a cell (e.g. eclipse glyphs). */
  mark?: (index: number) => { glyph: string; strong: boolean } | null;
}

/** Metonic (235 cells / 5 turns) and Saros (223 / 4) spirals. */
export const makeSpiralTexture = (spec: SpiralSpec, size = 2048): THREE.CanvasTexture => {
  const c = makeCanvas(size);
  const g = c.getContext('2d')!;
  const R = size / 2;
  g.translate(R, R);
  const scale = (R * 0.94) / spec.outerRadius;
  const perTurn = spec.cells / spec.turns;
  const pitch = (spec.outerRadius - spec.innerRadius) / spec.cells;

  const cellPos = (i: number) => {
    const turn = i / perTurn;
    const r = (spec.innerRadius + pitch * i) * scale;
    const ang = ((spec.startAngleDeg * Math.PI) / 180) - (turn * Math.PI * 2);
    return { r, ang, x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  };

  // Spiral line.
  g.strokeStyle = BRONZE_INK;
  g.lineWidth = size / 700;
  g.beginPath();
  for (let i = 0; i < spec.cells; i++) {
    const p = cellPos(i);
    if (i === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  }
  g.stroke();

  // Cell ticks and glyphs.
  for (let i = 0; i < spec.cells; i++) {
    const p = cellPos(i);
    const p2 = cellPos(i + 0.14);
    g.strokeStyle = BRONZE_ENGRAVE;
    g.lineWidth = size / 1500;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p2.x, p2.y);
    g.stroke();
    const mark = spec.mark?.(i);
    if (mark) {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.ang + Math.PI / 2);
      g.fillStyle = mark.strong ? '#241505' : BRONZE_ENGRAVE;
      g.font = `bold ${Math.round(size / 90)}px Georgia, serif`;
      g.textAlign = 'center';
      g.fillText(mark.glyph, 0, 0);
      g.restore();
    }
    const label = spec.label?.(i);
    if (label) {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.ang);
      g.fillStyle = BRONZE_ENGRAVE;
      g.font = `${Math.round(size / 120)}px Georgia, serif`;
      g.textAlign = 'center';
      g.fillText(label, size / 90, 0);
      g.restore();
    }
  }
  return canvasTexture(c);
};

/** Dial of four Olympiad years, or three Exeligmos sectors, or 76 Callippic years. */
export const makeSectorDialTexture = (
  labels: string[],
  opts: { rings?: number; sublabels?: string[][]; title?: string } = {},
  size = 1024,
): THREE.CanvasTexture => {
  const c = makeCanvas(size);
  const g = c.getContext('2d')!;
  const R = size / 2;
  g.translate(R, R);
  const n = labels.length;
  g.strokeStyle = BRONZE_INK;
  g.lineWidth = size / 220;
  g.beginPath();
  g.arc(0, 0, R * 0.86, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
    g.stroke();
    g.save();
    g.rotate(a + Math.PI / n);
    g.fillStyle = BRONZE_INK;
    g.font = `${Math.round(size / (n > 8 ? 30 : 16))}px Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(labels[i], R * 0.62, 0);
    const sub = opts.sublabels?.[i];
    if (sub) {
      g.font = `${Math.round(size / 46)}px Georgia, serif`;
      sub.forEach((s, k) => g.fillText(s, R * (0.86 - 0.07 * k), 0));
    }
    g.restore();
  }
  if (opts.title) {
    g.fillStyle = BRONZE_INK;
    g.font = `${Math.round(size / 28)}px Georgia, serif`;
    g.textAlign = 'center';
    g.fillText(opts.title, 0, -R * 0.28);
  }
  return canvasTexture(c);
};

/** Pointer arm with a counterweight, used for every dial. */
export const makePointerGeometry = (length: number, width = 1.6) => {
  const shape = new THREE.Shape();
  shape.moveTo(-length * 0.22, -width);
  shape.lineTo(length, -width * 0.18);
  shape.lineTo(length * 1.04, 0);
  shape.lineTo(length, width * 0.18);
  shape.lineTo(-length * 0.22, width);
  shape.lineTo(-length * 0.3, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false });
  geo.translate(0, 0, -0.35);
  return geo;
};

// ── Environment, background and labels ───────────────────────────────────

/**
 * Procedural studio environment. Metal without an environment reads as black:
 * a closed box of smooth bronze has almost nothing to reflect. This paints a
 * simple equirectangular room — warm key above, cool fill opposite, dark floor
 * with a soft horizon — which is what makes the wheels legible.
 */
export const makeEnvironmentTexture = (size = 1024): THREE.CanvasTexture => {
  const c = makeCanvas(size);
  c.width = size * 2;
  c.height = size;
  const g = c.getContext('2d')!;
  const w = c.width;
  const h = c.height;

  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#3d4a5c');
  sky.addColorStop(0.45, '#232a36');
  sky.addColorStop(0.52, '#141821');
  sky.addColorStop(1, '#07090d');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  const blob = (x: number, y: number, r: number, color: string, alpha: number) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = alpha;
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
  };

  // Key (upper right), fill (upper left), warm rim (behind) and a cool bounce.
  blob(w * 0.72, h * 0.18, h * 0.62, '#ffe6bc', 0.95);
  blob(w * 0.2, h * 0.24, h * 0.5, '#bcd6ff', 0.6);
  blob(w * 0.46, h * 0.08, h * 0.4, '#fff4dd', 0.55);
  blob(w * 0.05, h * 0.6, h * 0.45, '#2d4258', 0.5);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/** Soft radial backdrop, so the mechanism is not floating on pure black. */
export const makeBackdropTexture = (size = 1024): THREE.CanvasTexture => {
  const c = makeCanvas(size);
  const g = c.getContext('2d')!;
  const R = size / 2;
  const grad = g.createRadialGradient(R, R * 0.82, size * 0.02, R, R, R * 1.25);
  grad.addColorStop(0, '#2b3442');
  grad.addColorStop(0.35, '#1a2029');
  grad.addColorStop(0.7, '#0d1117');
  grad.addColorStop(1, '#06080b');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  // A faint warm halo behind the dial, like a museum spotlight.
  const halo = g.createRadialGradient(R, R * 0.9, 0, R, R * 0.9, R * 0.55);
  halo.addColorStop(0, 'rgba(120, 96, 58, 0.35)');
  halo.addColorStop(1, 'rgba(120, 96, 58, 0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, size, size);
  const tex = canvasTexture(c);
  return tex;
};

/** A flat label that always faces the camera. */
export const makeLabel = (text: string, subtitle = '', color = '#e8dcc0'): THREE.Sprite => {
  const pad = 18;
  const c = makeCanvas(512);
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  const w = 512;
  const h = 160;
  g.fillStyle = 'rgba(8, 10, 14, 0.72)';
  g.strokeStyle = 'rgba(200, 165, 100, 0.55)';
  g.lineWidth = 3;
  const r = 20;
  g.beginPath();
  g.moveTo(pad + r, pad);
  g.lineTo(w - pad - r, pad);
  g.quadraticCurveTo(w - pad, pad, w - pad, pad + r);
  g.lineTo(w - pad, h - pad - r);
  g.quadraticCurveTo(w - pad, h - pad, w - pad - r, h - pad);
  g.lineTo(pad + r, h - pad);
  g.quadraticCurveTo(pad, h - pad, pad, h - pad - r);
  g.lineTo(pad, pad + r);
  g.quadraticCurveTo(pad, pad, pad + r, pad);
  g.closePath();
  g.fill();
  g.stroke();
  g.textAlign = 'center';
  g.fillStyle = color;
  g.font = '600 46px Georgia, serif';
  g.fillText(text, w / 2, subtitle ? 78 : 96);
  if (subtitle) {
    g.fillStyle = 'rgba(226, 214, 190, 0.72)';
    g.font = '30px Georgia, serif';
    g.fillText(subtitle, w / 2, 122);
  }
  const tex = canvasTexture(c);
  // depthTest stays on: a label must be hidden by the plate when you are
  // looking at the other side of the machine.
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false, opacity: 0.92 }),
  );
  sprite.scale.set(30, 9.4, 1);
  sprite.renderOrder = 20;
  return sprite;
};
