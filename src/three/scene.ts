/**
 * The 3D view of the mechanism.
 *
 * Rendering only: every angle shown here comes from `Readout` (the solved
 * kinematics), never from an animation curve. If the gears move, it is because
 * the graph moved them.
 *
 * Two lighting modes:
 *   • «sólido»  — polished bronze under a studio environment, as an object;
 *   • «raios X» — every wheel tinted by the train it belongs to, its pitch
 *                 circle drawn as a line, so the transmission reads top-to-
 *                 bottom through the stack. Transparency alone turns a stack of
 *                 69 wheels into fog; the coloured outlines are what make it
 *                 legible.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  pitchR,
  outerR,
  thickness as gearThickness,
  moduleOf,
  axisPosition,
  AXES,
  FRONT_AXES,
  CARRIER_LOCAL,
  Z,
  CASE,
  DIAL_CENTRES,
  FRONT_RING,
  BACK_PLATE_Z,
  FRONT_BEZEL_Z,
  type Vec2,
} from '../core/layout';
import { GEARS, GEAR } from '../core/gears';
import type { Readout } from '../core/mechanism';
import { METONIC, METONIC_LAYOUT } from '../core/calendar';
import { GLYPHS } from '../core/eclipses';
import {
  makeGearGeometry,
  makeZodiacTexture,
  makeCalendarRingTexture,
  makeSpiralTexture,
  makeSectorDialTexture,
  makePointerGeometry,
  makeEnvironmentTexture,
  makeBackdropTexture,
  makeLabel,
} from './geometry';
import {
  FOV_DEG,
  VIEW_POSITIONS,
  TRAIN_COLOURS as TRAINS,
  type ViewName as ViewNameType,
} from './views';

type ViewName = ViewNameType;

export type { ViewName };
export { TRAIN_COLOURS, VIEW_NAMES } from './views';

export interface SceneOptions {
  onSelect?: (id: string | null) => void;
}

const DEG = Math.PI / 180;

// Bronze and its neighbours: warm enough to read against a cool ground.
const BRONZE = 0xc08b4a;
const BRONZE_DARK = 0x8a6631;
const BRONZE_LIGHT = 0xd9ab63;
const WOOD = 0x4a3018;
const GOLD = 0xf0c76a;
const HIGHLIGHT = new THREE.Color(0xffb266);

const trainColour = (train: string): number => TRAINS[train]?.hex ?? 0xd8cbb0;

interface GearEntry {
  mesh: THREE.Mesh;
  ring: THREE.LineLoop;
  id: string;
  train: string;
  /** Lit bronze, for the solid view. */
  solid: THREE.MeshStandardMaterial;
  /** Unlit, additive, tinted by train: legible whatever the lighting does. */
  xray: THREE.MeshBasicMaterial;
  xrayBase: THREE.Color;
}

export class MechanismScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly clock = new THREE.Clock();
  private readonly opts: SceneOptions;

  readonly gearGroup = new THREE.Group();
  readonly frontGroup = new THREE.Group();
  readonly backGroup = new THREE.Group();
  readonly caseGroup = new THREE.Group();
  readonly labelGroup = new THREE.Group();

  private gears = new Map<string, GearEntry>();
  private pickables: THREE.Object3D[] = [];
  private dialMeshes: THREE.Mesh[] = [];
  private pointerMeshes = new Map<string, THREE.Object3D>();
  private planetMarks = new Map<string, THREE.Object3D>();
  private planetRings: THREE.Mesh[] = [];
  private moonBall: THREE.Group | null = null;
  private plateMesh: THREE.Mesh | null = null;
  private caseMaterials: THREE.MeshStandardMaterial[] = [];
  private backPanelMaterials: THREE.MeshStandardMaterial[] = [];

  private selected: string | null = null;
  private xray = false;
  private labels = true;
  private plates = true;
  private showHypothetical = true;
  private finish: 'new' | 'patina' = 'new';
  private explode = 1;
  private targetExplode = 1;
  private view: ViewName = 'front';
  private cameraGoal = new THREE.Vector3(...VIEW_POSITIONS.front);
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private easing = 0;
  private raf = 0;
  private disposed = false;
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly container: HTMLElement, opts: SceneOptions = {}) {
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.addEventListener('pointerdown', this.onPointerDown);
    container.addEventListener('pointermove', this.onPointerMove);
    container.appendChild(this.renderer.domElement);

    this.buildEnvironment();

    this.camera = new THREE.PerspectiveCamera(FOV_DEG, container.clientWidth / container.clientHeight, 1, 4000);
    const [cx, cy, cz] = VIEW_POSITIONS.front;
    this.camera.position.set(cx, cy, cz);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 60;
    this.controls.maxDistance = 1400;
    this.controls.zoomSpeed = 0.9;

    this.addLights();
    this.scene.add(this.caseGroup, this.gearGroup, this.frontGroup, this.backGroup, this.labelGroup);
    this.buildCase();
    this.buildGears();
    this.buildFrontDial();
    this.buildBackDials();
    this.buildLabels();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.animate();
  }

  // ── Environment and light ──────────────────────────────────────────────
  private buildEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envTex = makeEnvironmentTexture(512);
    const env = pmrem.fromEquirectangular(envTex).texture;
    this.scene.environment = env;
    this.scene.environmentIntensity = 1.0;
    envTex.dispose();
    pmrem.dispose();

    const backdrop = makeBackdropTexture(1024);
    this.scene.background = backdrop;
    this.scene.fog = new THREE.Fog(0x0d1117, 900, 2000);
  }

  private addLights() {
    // A small ambient floor guarantees that nothing is ever pitch black, even
    // if the environment map fails on a weak GPU.
    this.scene.add(new THREE.AmbientLight(0xd8e2f2, 0.45));
    this.scene.add(new THREE.HemisphereLight(0xa9c2e8, 0x37281a, 1.25));

    const key = new THREE.DirectionalLight(0xfff1d6, 2.7);
    key.position.set(210, 280, 360);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xbfd8ff, 1.5);
    fill.position.set(-300, 140, 220);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffd9a8, 2.2);
    rim.position.set(-180, -220, -360);
    this.scene.add(rim);

    const under = new THREE.DirectionalLight(0x9db6d8, 0.9);
    under.position.set(60, -320, 120);
    this.scene.add(under);
  }

  // ── Materials ──────────────────────────────────────────────────────────
  private bronze = new THREE.MeshStandardMaterial({ color: BRONZE, metalness: 0.8, roughness: 0.36, envMapIntensity: 1.3 });
  private bronzeLight = new THREE.MeshStandardMaterial({ color: BRONZE_LIGHT, metalness: 0.72, roughness: 0.34, envMapIntensity: 1.35 });
  private bronzeDark = new THREE.MeshStandardMaterial({ color: BRONZE_DARK, metalness: 0.65, roughness: 0.52, envMapIntensity: 1.0 });
  private gold = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.24, envMapIntensity: 1.3 });
  private silver = new THREE.MeshStandardMaterial({ color: 0xd9e2ee, metalness: 0.95, roughness: 0.2, envMapIntensity: 1.2 });
  private wood = new THREE.MeshStandardMaterial({ color: WOOD, metalness: 0.05, roughness: 0.9, envMapIntensity: 0.5 });
  private plateMat = new THREE.MeshStandardMaterial({
    color: 0x9c8352,
    metalness: 0.75,
    roughness: 0.55,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    envMapIntensity: 1.0,
  });

  // ── Case ───────────────────────────────────────────────────────────────
  private buildCase() {
    const { halfWidth: hw, halfHeight: hh, depth, woodThickness: t } = CASE;
    const bar = (w: number, h: number, d: number, x: number, y: number, mat: THREE.MeshStandardMaterial) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.clone());
      mesh.position.set(x, y, 0);
      this.caseGroup.add(mesh);
      this.caseMaterials.push(mesh.material as THREE.MeshStandardMaterial);
      return mesh;
    };
    // A slim bronze frame, not a solid box: the traces must stay readable.
    bar(t, hh * 2 + t * 2, depth, -hw - t / 2, 0, this.bronzeDark);
    bar(t, hh * 2 + t * 2, depth, hw + t / 2, 0, this.bronzeDark);
    bar(hw * 2 + t * 2, t, depth, 0, hh + t / 2, this.bronzeDark);
    bar(hw * 2 + t * 2, t, depth, 0, -hh - t / 2, this.bronzeDark);

    // Back panel in wood with a bronze lining.
    const back = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, hh * 2, 1.6), this.wood.clone());
    back.position.set(0, 0, BACK_PLATE_Z - 1.4);
    this.caseGroup.add(back);
    this.backPanelMaterials.push(back.material as THREE.MeshStandardMaterial);
    const liningMat = new THREE.MeshStandardMaterial({ color: 0x5d4826, metalness: 0.6, roughness: 0.6 });
    const lining = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 - 2, hh * 2 - 2), liningMat);
    lining.position.set(0, 0, BACK_PLATE_Z + 0.3);
    this.caseGroup.add(lining);
    this.backPanelMaterials.push(liningMat);

    // The main plate the machine is built on.
    const plate = new THREE.Mesh(new THREE.CircleGeometry(FRONT_RING.zodiacOuter + 4, 128), this.plateMat);
    plate.position.set(0, 0, 0.4);
    this.caseGroup.add(plate);
    this.plateMesh = plate;

    // Plate rim, so its edge reads from the side.
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(FRONT_RING.zodiacOuter + 4, 0.7, 8, 160),
      this.bronzeLight,
    );
    rim.position.set(0, 0, 0.4);
    this.caseGroup.add(rim);
  }

  // ── Wheels ─────────────────────────────────────────────────────────────
  private buildGears() {
    for (const g of GEARS) {
      const pitch = pitchR(g.id);
      const radius = outerR(g.id);
      const geo = makeGearGeometry({
        teeth: g.teeth,
        pitchRadius: pitch,
        outerRadius: radius,
        thickness: gearThickness(g.id),
        module: moduleOf(g.id).m,
        spokes: g.spokes ?? (pitch > 20 ? 4 : 0),
      });
      const solid = (g.surviving ? this.bronze : this.bronzeLight).clone();
      // Surviving wheels in warm bronze; reconstructed ones paler; hypothesis
      // (grade D) with a copper cast, so the eye can tell them apart at once.
      solid.color = new THREE.Color(g.grade === 'D' ? 0xd08a6a : g.surviving ? BRONZE : BRONZE_LIGHT);

      // Unlit additive material: the X-ray view cannot go dark, because it does
      // not depend on lights or on the environment map at all. Overlapping
      // wheels add up, which is exactly what makes the stack read as a stack.
      const xrayBase = new THREE.Color(trainColour(g.train));
      const xray = new THREE.MeshBasicMaterial({
        color: xrayBase.clone(),
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });

      const mesh = new THREE.Mesh(geo, solid);
      mesh.userData.gearId = g.id;
      const pos = axisPosition(g.id);
      mesh.position.set(pos.x, pos.y, Z[g.id] ?? 0);
      this.gearGroup.add(mesh);

      // Pitch-circle outline: cheap, and the thing that makes X-ray legible.
      const pts: THREE.Vector3[] = [];
      const seg = 128;
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const ring = new THREE.LineLoop(
        ringGeo,
        new THREE.LineBasicMaterial({
          color: trainColour(g.train),
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        }),
      );
      ring.position.copy(mesh.position);
      ring.renderOrder = 6;
      this.gearGroup.add(ring);

      this.gears.set(g.id, { mesh, ring, id: g.id, train: g.train, solid, xray, xrayBase });
      this.pickables.push(mesh);
    }

    const axle = (key: string, z0: number, z1: number) => {
      const a = AXES[key];
      if (!a) return;
      const h = Math.abs(z1 - z0);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, h, 16), this.bronzeDark);
      cyl.rotation.x = Math.PI / 2;
      cyl.position.set(a.x, a.y, (z0 + z1) / 2);
      this.gearGroup.add(cyl);
    };
    axle('b', BACK_PLATE_Z + 1, FRONT_BEZEL_Z - 1);
    axle('e', -20, 6);
    axle('n', BACK_PLATE_Z + 1, -1);
    axle('g', BACK_PLATE_Z + 1, -1);
  }

  // ── Front dial ─────────────────────────────────────────────────────────
  private buildFrontDial() {
    const z = FRONT_BEZEL_Z;
    const disc = (geo: THREE.BufferGeometry, map: THREE.Texture, zz: number) => {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 1 }),
      );
      mesh.position.set(0, 0, zz);
      mesh.renderOrder = 4;
      this.frontGroup.add(mesh);
      this.dialMeshes.push(mesh);
      return mesh;
    };

    disc(new THREE.RingGeometry(FRONT_RING.innerRadius, FRONT_RING.zodiacOuter, 160, 1), makeZodiacTexture(), z);
    disc(new THREE.RingGeometry(FRONT_RING.calendarInner, FRONT_RING.innerRadius, 160, 1), makeCalendarRingTexture(), z - 0.2);

    const sunArm = new THREE.Mesh(makePointerGeometry(62, 2.4), this.gold);
    sunArm.position.set(0, 0, z + 1.2);
    sunArm.renderOrder = 8;
    this.frontGroup.add(sunArm);
    this.pointerMeshes.set('sun', sunArm);

    const dateArm = new THREE.Mesh(makePointerGeometry(66, 1.3), this.bronzeLight);
    dateArm.position.set(0, 0, z + 0.6);
    dateArm.renderOrder = 7;
    this.frontGroup.add(dateArm);
    this.pointerMeshes.set('date', dateArm);

    const moonArm = new THREE.Mesh(makePointerGeometry(48, 1.8), this.silver);
    moonArm.position.set(0, 0, z + 2.0);
    moonArm.renderOrder = 9;
    this.frontGroup.add(moonArm);
    this.pointerMeshes.set('moon', moonArm);

    const dragon = new THREE.Group();
    const head = new THREE.Mesh(
      makePointerGeometry(40, 2.0),
      new THREE.MeshStandardMaterial({ color: 0xc4633a, metalness: 0.8, roughness: 0.35, envMapIntensity: 1.1 }),
    );
    const tail = new THREE.Mesh(
      makePointerGeometry(40, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x8f6ad4, metalness: 0.8, roughness: 0.35, envMapIntensity: 1.1 }),
    );
    tail.rotation.z = Math.PI;
    dragon.add(head, tail);
    dragon.position.set(0, 0, z + 1.6);
    this.frontGroup.add(dragon);
    this.pointerMeshes.set('dragon', dragon);

    const planets: { id: string; r: number; color: number }[] = [
      { id: 'mercury', r: 20, color: 0x54e0c4 },
      { id: 'venus', r: 26, color: 0x74c8ff },
      { id: 'mars', r: 33, color: 0xff8a63 },
      { id: 'jupiter', r: 40, color: 0xffe4a8 },
      { id: 'saturn', r: 47, color: 0xe9b959 },
    ];
    for (const p of planets) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(p.r, 0.32, 8, 180),
        new THREE.MeshStandardMaterial({ color: 0xb08b52, metalness: 0.95, roughness: 0.35, envMapIntensity: 1.2 }),
      );
      ring.position.set(0, 0, z - 1.0);
      ring.renderOrder = 5;
      this.frontGroup.add(ring);
      this.planetRings.push(ring);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(1.9, 20, 20),
        new THREE.MeshStandardMaterial({
          color: p.color,
          metalness: 0.35,
          roughness: 0.2,
          emissive: p.color,
          emissiveIntensity: 0.55,
        }),
      );
      marker.position.set(p.r, 0, z - 0.2);
      marker.userData.radius = p.r;
      marker.renderOrder = 9;
      this.frontGroup.add(marker);
      this.planetMarks.set(p.id, marker);
    }

    // Lunar phase ball.
    const ball = new THREE.Group();
    const white = new THREE.Mesh(
      new THREE.SphereGeometry(3.6, 32, 16, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xf7f2e6, metalness: 0.05, roughness: 0.55, emissive: 0x1a1710, emissiveIntensity: 0.4 }),
    );
    const black = new THREE.Mesh(
      new THREE.SphereGeometry(3.6, 32, 16, Math.PI, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x1a1c22, metalness: 0.3, roughness: 0.7 }),
    );
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(3.6, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1c22, metalness: 0.3, roughness: 0.7 }),
    );
    ball.add(white, black, shell);
    ball.position.set(0, 0, z - 2.6);
    this.frontGroup.add(ball);
    this.moonBall = ball;
  }

  // ── Back dials ─────────────────────────────────────────────────────────
  private buildBackDials() {
    const z = BACK_PLATE_Z + 1.6;

    const holder = (center: Vec2, zz: number) => {
      const g = new THREE.Group();
      g.position.set(center.x, center.y, zz);
      g.rotation.y = Math.PI;
      this.backGroup.add(g);
      return g;
    };
    const disc = (parent: THREE.Group, radius: number, texture: THREE.Texture) => {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 96),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
      );
      mesh.renderOrder = 4;
      parent.add(mesh);
      this.dialMeshes.push(mesh);
      return mesh;
    };
    const pointer = (parent: THREE.Group, id: string, len: number, zz: number, color = GOLD) => {
      const mesh = new THREE.Mesh(
        makePointerGeometry(len, 1.6),
        new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.2 }),
      );
      mesh.position.set(0, 0, zz);
      mesh.renderOrder = 8;
      parent.add(mesh);
      this.pointerMeshes.set(id, mesh);
    };

    const metonicHolder = holder(DIAL_CENTRES.metonic, z);
    disc(
      metonicHolder,
      32,
      makeSpiralTexture({
        cells: METONIC.months,
        turns: METONIC.turns,
        innerRadius: 18,
        outerRadius: 30,
        startAngleDeg: 90,
        label: (i) => {
          const e = METONIC_LAYOUT[i];
          return e && e.monthOfYear === 1 ? GREEK_MONTHS_SHORT[e.month.greek] ?? '' : '';
        },
      }),
    );
    pointer(metonicHolder, 'metonic', 30, 2.6);

    const sarosHolder = holder(DIAL_CENTRES.saros, z);
    disc(
      sarosHolder,
      32,
      makeSpiralTexture({
        cells: 223,
        turns: 4,
        innerRadius: 16,
        outerRadius: 30,
        startAngleDeg: 90,
        mark: (i) => {
          const g = GLYPHS.find((x) => x.month === i + 1);
          if (!g) return null;
          return { glyph: g.lunar ? 'Σ' : 'Η', strong: g.lunar };
        },
      }),
    );
    pointer(sarosHolder, 'saros', 30, 2.6);

    const olympiadHolder = holder(DIAL_CENTRES.olympiad, z);
    disc(
      olympiadHolder,
      15,
      makeSectorDialTexture(['Ι', 'ΙΙ', 'ΙΙΙ', 'ΙV'], {
        sublabels: [['ΟΛΥΜΠΙΑ'], ['ΙΣΘΜΙΑ', 'ΝΕΜΕΑ'], ['ΠΥΘΙΑ'], ['ΙΣΘΜΙΑ', 'ΝΕΜΕΑ']],
      }),
    );
    pointer(olympiadHolder, 'olympiad', 14, 1.8, 0xc79a52);

    const callippicHolder = holder(DIAL_CENTRES.callippic, z);
    disc(callippicHolder, 13, makeSectorDialTexture(['Α', 'Β', 'Γ', 'Δ'], { title: 'ΚΑΛΛΙΠΠΟΣ' }));
    pointer(callippicHolder, 'callippic', 12, 1.8, 0xc79a52);

    const exeligmosHolder = holder(DIAL_CENTRES.exeligmos, z);
    disc(exeligmosHolder, 11, makeSectorDialTexture(['0', 'Η', 'ΙϚ'], { title: 'ΕΞΕΛΙΓΜΟΣ' }));
    pointer(exeligmosHolder, 'exeligmos', 10, 1.8, 0xc79a52);
  }

  // ── Labels ─────────────────────────────────────────────────────────────
  private buildLabels() {
    const back = BACK_PLATE_Z - 3.5;
    const add = (text: string, subtitle: string, x: number, y: number, z: number, scale = 1) => {
      const sprite = makeLabel(text, subtitle);
      sprite.position.set(x, y, z);
      sprite.scale.multiplyScalar(scale);
      this.labelGroup.add(sprite);
      return sprite;
    };
    add('ΜΕΤΩΝ', '235 meses', DIAL_CENTRES.metonic.x + 40, DIAL_CENTRES.metonic.y + 2, back, 1);
    add('ΣΑΡΟΣ', '223 meses', DIAL_CENTRES.saros.x + 42, DIAL_CENTRES.saros.y - 2, back, 1);
    add('ΟΛΥΜΠΙΑ', '4 anos', DIAL_CENTRES.olympiad.x - 30, DIAL_CENTRES.olympiad.y + 22, back, 0.8);
    add('ΚΑΛΛΙΠΠΟΣ', '76 anos', DIAL_CENTRES.callippic.x + 28, DIAL_CENTRES.callippic.y + 20, back, 0.8);
    add('ΕΞΕΛΙΓΜΟΣ', '+8 h por Saros', DIAL_CENTRES.exeligmos.x - 4, DIAL_CENTRES.exeligmos.y - 24, back, 0.75);
    add('ΖΩΔΙΑΚΟΣ', 'anel zodiacal · 12 signos', 0, FRONT_RING.zodiacOuter + 12, FRONT_BEZEL_Z + 6, 1.05);
    add('ΠΑΡΑΠΗΓΜΑ', 'calendário egípcio · 365 dias', 0, -FRONT_RING.zodiacOuter - 14, FRONT_BEZEL_Z + 6, 0.95);
    this.labelGroup.visible = this.labels;
  }

  // ── Update ─────────────────────────────────────────────────────────────
  update(r: Readout) {
    const b1 = r.gearAngles.b1;
    const e3 = r.gearAngles.e3;

    for (const [id, entry] of this.gears) {
      const g = GEAR.get(id)!;
      const theta = r.gearAngles[id] ?? 0;
      entry.mesh.rotation.z = -theta * Math.PI * 2;
      if (g.frame === 'b1') {
        const p = FRONT_AXES[id];
        if (p) {
          const rot = -b1 * Math.PI * 2;
          entry.mesh.position.x = p.x * Math.cos(rot) - p.y * Math.sin(rot);
          entry.mesh.position.y = p.x * Math.sin(rot) + p.y * Math.cos(rot);
        }
      } else if (g.frame === 'e3') {
        const p = CARRIER_LOCAL[id];
        if (p) {
          const rot = -e3 * Math.PI * 2;
          const base = AXES.e;
          entry.mesh.position.x = base.x + p.x * Math.cos(rot) - p.y * Math.sin(rot);
          entry.mesh.position.y = base.y + p.x * Math.sin(rot) + p.y * Math.cos(rot);
        }
      } else if (g.frame === 'b3') {
        entry.mesh.position.x = 0;
        entry.mesh.position.y = 0;
      }
      entry.mesh.position.z = (Z[id] ?? 0) * this.explode;
      entry.ring.position.copy(entry.mesh.position);
    }

    this.frontGroup.position.z = (this.explode - 1) * 24;
    this.backGroup.position.z = -(this.explode - 1) * 24;
    this.labelGroup.position.z = 0;

    const setAngle = (key: string, canvasDeg: number) => {
      const m = this.pointerMeshes.get(key);
      if (m) m.rotation.z = -canvasDeg * DEG;
    };
    setAngle('sun', r.longitude.sun);
    setAngle('moon', r.longitude.moon);
    setAngle('dragon', r.longitude.nodes);
    setAngle('date', r.gearAngles.b1 * 360);
    for (const [id, mark] of this.planetMarks) {
      const lon = r.longitude[id as 'mars'] * DEG;
      const rad = (mark.userData.radius as number) ?? Math.hypot(mark.position.x, mark.position.y);
      mark.position.x = Math.cos(-lon) * rad;
      mark.position.y = Math.sin(-lon) * rad;
    }
    if (this.moonBall) this.moonBall.rotation.y = r.phaseAngle * DEG;

    const d = r.dials;
    const spiralAngle = (index: number, perTurn: number) => 90 - (index / perTurn) * 360;
    const metonicArm = this.pointerMeshes.get('metonic');
    if (metonicArm) {
      const m = d.metonicMonth;
      metonicArm.rotation.z = -spiralAngle(m, 47) * DEG;
      metonicArm.scale.set((18 + (12 / 235) * m) / 30, 1, 1);
    }
    const sarosArm = this.pointerMeshes.get('saros');
    if (sarosArm) {
      const m = d.sarosMonth;
      sarosArm.rotation.z = -spiralAngle(m, 223 / 4) * DEG;
      sarosArm.scale.set((16 + (14 / 223) * m) / 30, 1, 1);
    }
    const sector = (key: string, value: number, count: number) => {
      const m = this.pointerMeshes.get(key);
      if (m) m.rotation.z = -(-90 + (value / count) * 360) * DEG;
    };
    sector('olympiad', d.olympiadYear, 4);
    sector('callippic', d.callippicYear, 76);
    sector('exeligmos', d.exeligmos, 3);
  }

  // ── Modes ──────────────────────────────────────────────────────────────
  setView(view: ViewName) {
    this.view = view;
    const [x, y, z] = VIEW_POSITIONS[view];
    const v = new THREE.Vector3(x, y, z);
    this.cameraGoal.copy(v);
    this.easing = 1.1;
    if (view === 'exploded') this.setExplode(2.2);
    else if (this.view !== 'exploded') this.setExplode(1);
    this.frontGroup.visible = view !== 'back' && view !== 'top';
  }

  setExplode(factor: number) {
    this.targetExplode = Math.max(1, Math.min(3.2, factor));
    this.easing = Math.max(this.easing, 0.6);
  }

  getExplode() {
    return this.targetExplode;
  }

  /** X-ray: wheels tinted by train, outlines bright, plates faded. */
  setXray(on: boolean) {
    this.xray = on;
    for (const [, entry] of this.gears) {
      entry.mesh.material = on ? entry.xray : entry.solid;
      entry.xray.color.copy(entry.xrayBase);
      const line = entry.ring.material as THREE.LineBasicMaterial;
      line.opacity = on ? 0.9 : 0.16;
      line.blending = on ? THREE.AdditiveBlending : THREE.NormalBlending;
      line.needsUpdate = true;
    }
    if (this.plateMesh) {
      this.plateMat.opacity = on ? 0.1 : 0.55;
      this.plateMat.needsUpdate = true;
    }
    // The frame would otherwise cut the view from the side, and the back panel
    // would turn the interior into a black wall.
    for (const mat of this.caseMaterials) {
      mat.transparent = on;
      mat.opacity = on ? 0.2 : 1;
      mat.needsUpdate = true;
    }
    for (const mat of this.backPanelMaterials) {
      mat.transparent = on;
      mat.opacity = on ? 0.12 : 1;
      mat.needsUpdate = true;
    }
    for (const mesh of this.dialMeshes) {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = on ? 0.4 : 1;
      mat.needsUpdate = true;
    }
    // The planet tracks are metal rings drawn across the whole dial; in X-ray
    // they would cross every wheel, so they fade with the plates.
    for (const ring of this.planetRings) {
      const mat = ring.material as THREE.MeshStandardMaterial;
      mat.transparent = on;
      mat.opacity = on ? 0.35 : 1;
      mat.needsUpdate = true;
    }
    this.labelGroup.visible = this.labels;
    this.select(this.selected);
  }

  isXray() {
    return this.xray;
  }

  setLabels(on: boolean) {
    this.labels = on;
    this.labelGroup.visible = on;
  }

  /** Plates and case: hide them to see the trains alone. */
  setPlates(on: boolean) {
    this.plates = on;
    for (const mat of this.backPanelMaterials) {
      mat.visible = on;
    }
    if (this.plateMesh) this.plateMesh.visible = on;
    for (const mesh of this.caseGroup.children) {
      const m = mesh as THREE.Mesh;
      if (m === this.plateMesh) continue;
      m.visible = on;
    }
  }

  /** Wheels of grade D are hypotheses about the artefact, not parts of it. */
  setHypothetical(on: boolean) {
    this.showHypothetical = on;
    for (const [, entry] of this.gears) {
      const grade = GEAR.get(entry.id)!.grade;
      const visible = on || grade !== 'D';
      entry.mesh.visible = visible;
      entry.ring.visible = visible;
    }
  }

  /** Museum finish: fresh bronze, or the corroded surface of the artefact. */
  setFinish(finish: 'new' | 'patina') {
    this.finish = finish;
    for (const [, entry] of this.gears) {
      const g = GEAR.get(entry.id)!;
      if (finish === 'new') {
        entry.solid.color = new THREE.Color(g.grade === 'D' ? 0xd08a6a : g.surviving ? BRONZE : BRONZE_LIGHT);
        entry.solid.roughness = 0.36;
      } else {
        // Verdigris over cuprite: greener, duller, and slightly lighter where
        // the bronze has corroded through.
        entry.solid.color = new THREE.Color(
          g.surviving ? 0x7f8a63 : g.grade === 'D' ? 0x8d6f5a : 0x93a07c,
        );
        entry.solid.roughness = 0.62;
      }
      entry.solid.needsUpdate = true;
    }
    for (const mat of this.caseMaterials) {
      mat.color = new THREE.Color(finish === 'new' ? BRONZE_DARK : 0x5c5a42);
      mat.needsUpdate = true;
    }
  }

  select(id: string | null) {
    this.selected = id;
    for (const [gid, entry] of this.gears) {
      const on = gid === id;
      if (this.xray) {
        entry.xray.color.copy(on ? HIGHLIGHT : entry.xrayBase);
        entry.xray.opacity = on ? 0.62 : 0.32;
      } else {
        entry.solid.emissive = new THREE.Color(on ? 0xff8a2c : 0x000000);
        entry.solid.emissiveIntensity = on ? 0.7 : 0;
      }
    }
  }

  // ── Interaction ────────────────────────────────────────────────────────
  private onPointerDown = (ev: PointerEvent) => {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    // In X-ray the nearest wheel may be a ghost; step through stacked wheels on
    // repeated clicks, as on the reference viewer.
    const ids = hits.map((h) => h.object.userData.gearId as string).filter(Boolean);
    const unique = [...new Set(ids)];
    if (!unique.length) {
      this.select(null);
      this.opts.onSelect?.(null);
      return;
    }
    const current = this.selected ? unique.indexOf(this.selected) : -1;
    const next = unique[(current + 1) % unique.length];
    this.select(next);
    this.opts.onSelect?.(next);
  };

  private lastHover = 0;
  private onPointerMove = (ev: PointerEvent) => {
    const now = performance.now();
    if (now - this.lastHover < 80) return;
    this.lastHover = now;
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
    this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
  };

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.1);

    if (Math.abs(this.explode - this.targetExplode) > 0.001) {
      this.explode += (this.targetExplode - this.explode) * Math.min(1, dt * 6);
      this.easing = Math.max(this.easing, 0.4);
    }
    if (this.easing > 0) {
      const k = Math.min(1, dt * 5);
      this.camera.position.lerp(this.cameraGoal, k);
      this.controls.target.lerp(this.cameraTarget, k);
      this.easing -= dt;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    this.container.removeEventListener('pointermove', this.onPointerMove);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    for (const [, entry] of this.gears) {
      entry.xray.dispose();
      entry.solid.dispose();
      entry.ring.geometry.dispose();
      (entry.ring.material as THREE.Material).dispose();
    }
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  }
}

const GREEK_MONTHS_SHORT: Record<string, string> = {
  ΦΟΙΝΙΚΑΙΟΣ: 'ΦΟΙΝ',
  ΚΡΑΝΕΙΟΣ: 'ΚΡΑΝ',
  ΛΑΝΟΤΡΟΠΙΟΣ: 'ΛΑΝΟ',
  ΜΑΧΑΝΕΥΣ: 'ΜΑΧΑ',
  ΔΩΔΕΚΑΤΕΥΣ: 'ΔΩΔΕ',
  ΕΥΚΛΕΙΟΣ: 'ΕΥΚΛ',
  ΑΡΤΕΜΙΣΙΟΣ: 'ΑΡΤΕ',
  ΨΥΔΡΕΥΣ: 'ΨΥΔΡ',
  ΓΑΜΕΙΛΙΟΣ: 'ΓΑΜΕ',
  ΑΓΡΙΑΝΙΟΣ: 'ΑΓΡΙ',
  ΠΑΝΑΜΟΣ: 'ΠΑΝΑ',
  ΑΠΕΛΛΑΙΟΣ: 'ΑΠΕΛ',
};
