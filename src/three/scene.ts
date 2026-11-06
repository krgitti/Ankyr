/**
 * The 3D view of the mechanism.
 *
 * Rendering only: every angle shown here comes from `Readout` (the solved
 * kinematics), never from an animation curve. If the gears move, it is because
 * the graph moved them.
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
import { ZODIAC_GREEK, EGYPTIAN_MONTHS_GREEK, wrap360 } from '../core/time';
import {
  makeGearGeometry,
  makeZodiacTexture,
  makeCalendarRingTexture,
  makeSpiralTexture,
  makeSectorDialTexture,
  makePointerGeometry,
  canvasTexture,
} from './geometry';

export type ViewName = 'front' | 'back' | 'side' | 'top' | 'exploded' | 'mechanism';

export interface SceneOptions {
  onSelect?: (id: string | null) => void;
}

const DEG = Math.PI / 180;
const VIEW_SET = { WITH_FRONT: ['front', 'side', 'mechanism', 'exploded'] as ViewName[] };
const COPPER = 0x9a7742;
const DARK_BRONZE = 0x6d5527;
const WOOD = 0x2e1d12;
const GOLD = 0xd8b24a;

interface GearEntry {
  mesh: THREE.Mesh;
  id: string;
  baseZ: number;
  frame: string;
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

  private gears = new Map<string, GearEntry>();
  private pickables: THREE.Object3D[] = [];
  private selected: string | null = null;
  private explode = 1;
  private targetExplode = 1;
  private view: ViewName = 'front';
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private cameraGoal = new THREE.Vector3(0, 40, 320);
  private transparent = false;
  private pointerMeshes = new Map<string, THREE.Object3D>();
  private planetMarks = new Map<string, THREE.Object3D>();
  private moonBall: THREE.Group | null = null;
  private raf = 0;
  private disposed = false;
  /** Remaining seconds of camera easing after a view change. */
  private easing = 0;
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly container: HTMLElement, opts: SceneOptions = {}) {
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.addEventListener('pointerdown', this.onPointerDown);
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x0a0908);
    this.scene.fog = new THREE.Fog(0x0a0908, 500, 1400);

    this.camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 1, 4000);
    this.camera.position.set(0, 40, 320);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 40;
    this.controls.maxDistance = 1200;
    this.controls.target.set(0, 0, 0);

    this.addLights();
    this.scene.add(this.caseGroup, this.gearGroup, this.frontGroup, this.backGroup);
    this.buildCase();
    this.buildGears();
    this.buildFrontDial();
    this.buildBackDials();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.animate();
  }

  private addLights() {
    this.scene.add(new THREE.HemisphereLight(0x8a7048, 0x120c07, 0.55));
    const key = new THREE.DirectionalLight(0xffe3b0, 2.1);
    key.position.set(180, 220, 320);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.5);
    rim.position.set(-260, -120, -280);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffd9a0, 0.7);
    fill.position.set(-200, 120, -200);
    this.scene.add(fill);
  }

  // ── Materials ──────────────────────────────────────────────────────────
  private bronze = new THREE.MeshStandardMaterial({ color: COPPER, metalness: 0.9, roughness: 0.42 });
  private darkBronze = new THREE.MeshStandardMaterial({ color: DARK_BRONZE, metalness: 0.85, roughness: 0.55 });
  private gold = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.25 });
  private wood = new THREE.MeshStandardMaterial({ color: WOOD, metalness: 0.05, roughness: 0.92 });
  private plateMat = new THREE.MeshStandardMaterial({
    color: 0x7d6a44,
    metalness: 0.6,
    roughness: 0.65,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });

  private buildCase() {
    const { halfWidth: hw, halfHeight: hh, depth, woodThickness: t } = CASE;
    const side = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.wood);
      mesh.position.set(x, y, z);
      this.caseGroup.add(mesh);
      return mesh;
    };
    // Wooden frame.
    side(t, hh * 2 + t * 2, depth, -hw - t / 2, 0, 0);
    side(t, hh * 2 + t * 2, depth, hw + t / 2, 0, 0);
    side(hw * 2 + t * 2, t, depth, 0, hh + t / 2, 0);
    side(hw * 2 + t * 2, t, depth, 0, -hh - t / 2, 0);
    // Back cover with a bronze lining.
    const back = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, hh * 2, 1.2), this.wood);
    back.position.set(0, 0, BACK_PLATE_Z - 1.0);
    this.caseGroup.add(back);
    const lining = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 - 2, hh * 2 - 2), this.darkBronze);
    lining.position.set(0, 0, BACK_PLATE_Z + 0.2);
    this.caseGroup.add(lining);

    // Main plate: the bronze plate the whole machine is built on.
    const plate = new THREE.Mesh(new THREE.CircleGeometry(FRONT_RING.zodiacOuter + 4, 128), this.plateMat);
    plate.position.set(0, 0, 0.4);
    this.caseGroup.add(plate);
    plate.userData.pickIgnore = true;
  }

  private buildGears() {
    for (const g of GEARS) {
      const pitch = pitchR(g.id);
      const geo = makeGearGeometry({
        teeth: g.teeth,
        pitchRadius: pitch,
        outerRadius: outerR(g.id),
        thickness: gearThickness(g.id),
        module: moduleOf(g.id).m,
        spokes: g.spokes ?? (pitch > 20 ? 4 : 0),
      });
      const mat = this.bronze.clone();
      mat.color = new THREE.Color(g.surviving ? COPPER : 0xa98c56);
      if (!g.surviving) {
        mat.metalness = 0.65;
        mat.roughness = 0.55;
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.gearId = g.id;
      const pos = axisPosition(g.id);
      mesh.position.set(pos.x, pos.y, Z[g.id] ?? 0);
      this.gearGroup.add(mesh);
      this.gears.set(g.id, { mesh, id: g.id, baseZ: Z[g.id] ?? 0, frame: g.frame });
      this.pickables.push(mesh);
    }
    // Tubes and arbors: thin cylinders at the main axes.
    const axle = (key: string, z0: number, z1: number) => {
      const a = AXES[key];
      if (!a) return;
      const h = Math.abs(z1 - z0);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, h, 12), this.darkBronze);
      cyl.rotation.x = Math.PI / 2;
      cyl.position.set(a.x, a.y, (z0 + z1) / 2);
      this.gearGroup.add(cyl);
    };
    axle('b', BACK_PLATE_Z + 1, FRONT_BEZEL_Z - 1);
    axle('e', -16, 4);
    axle('n', -18, -1);
    axle('g', -18, -1);
  }

  // ── Front dial ─────────────────────────────────────────────────────────
  private buildFrontDial() {
    const z = FRONT_BEZEL_Z;
    const zodiac = new THREE.Mesh(
      new THREE.RingGeometry(FRONT_RING.innerRadius, FRONT_RING.zodiacOuter, 160, 1),
      new THREE.MeshBasicMaterial({
        map: makeZodiacTexture(),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    zodiac.position.set(0, 0, z);
    this.frontGroup.add(zodiac);

    const cal = new THREE.Mesh(
      new THREE.RingGeometry(FRONT_RING.calendarInner, FRONT_RING.innerRadius, 160, 1),
      new THREE.MeshBasicMaterial({
        map: makeCalendarRingTexture(),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    cal.position.set(0, 0, z - 0.2);
    this.frontGroup.add(cal);

    // Sun and Moon pointers.
    const sunArm = new THREE.Mesh(makePointerGeometry(62, 2.4), this.gold.clone());
    sunArm.position.set(0, 0, z + 1.2);
    this.frontGroup.add(sunArm);
    this.pointerMeshes.set('sun', sunArm);

    const dateArm = new THREE.Mesh(makePointerGeometry(66, 1.2), this.darkBronze.clone());
    dateArm.position.set(0, 0, z + 0.6);
    this.frontGroup.add(dateArm);
    this.pointerMeshes.set('date', dateArm);

    const moonArm = new THREE.Mesh(makePointerGeometry(48, 1.8), new THREE.MeshStandardMaterial({ color: 0xcfd4dc, metalness: 0.8, roughness: 0.35 }).clone());
    moonArm.position.set(0, 0, z + 2.0);
    this.frontGroup.add(moonArm);
    this.pointerMeshes.set('moon', moonArm);

    // Dragon Hand: double ended, shows the line of nodes.
    const dragon = new THREE.Group();
    const head = new THREE.Mesh(makePointerGeometry(40, 2.0), new THREE.MeshStandardMaterial({ color: 0x9c4a2a, metalness: 0.7, roughness: 0.5 }));
    const tail = new THREE.Mesh(makePointerGeometry(40, 2.0), new THREE.MeshStandardMaterial({ color: 0x6a3f7a, metalness: 0.7, roughness: 0.5 }));
    tail.rotation.z = Math.PI;
    dragon.add(head, tail);
    dragon.position.set(0, 0, z + 1.6);
    this.frontGroup.add(dragon);
    this.pointerMeshes.set('dragon', dragon);

    // Planet rings: five concentric tracks with a marker on each.
    const planets: { id: string; r: number; color: number; greek: string }[] = [
      { id: 'mercury', r: 20, color: 0x59d6c9, greek: 'ΕΡΜΗΣ' },
      { id: 'venus', r: 26, color: 0x6fa8dc, greek: 'ΑΦΡΟΔΙΤΗ' },
      { id: 'mars', r: 33, color: 0xc0553b, greek: 'ΑΡΗΣ' },
      { id: 'jupiter', r: 40, color: 0xe6dcc0, greek: 'ΖΕΥΣ' },
      { id: 'saturn', r: 47, color: 0xd9b45a, greek: 'ΚΡΟΝΟΣ' },
    ];
    for (const p of planets) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(p.r, 0.28, 8, 160),
        new THREE.MeshStandardMaterial({ color: DARK_BRONZE, metalness: 0.9, roughness: 0.5 }),
      );
      ring.position.set(0, 0, z - 1.0);
      this.frontGroup.add(ring);
      const marker = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), new THREE.MeshStandardMaterial({ color: p.color, metalness: 0.4, roughness: 0.25, emissive: p.color, emissiveIntensity: 0.35 }));
      marker.position.set(p.r, 0, z - 0.4);
      this.frontGroup.add(marker);
      this.planetMarks.set(p.id, marker);
    }

    // Moon phase ball at the centre.
    const ball = new THREE.Group();
    const white = new THREE.Mesh(new THREE.SphereGeometry(3.4, 32, 16, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xf3efe4, metalness: 0.1, roughness: 0.6 }));
    const black = new THREE.Mesh(new THREE.SphereGeometry(3.4, 32, 16, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: 0x101010, metalness: 0.2, roughness: 0.8 }));
    const back = new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 16), new THREE.MeshStandardMaterial({ color: 0x101010 }));
    ball.add(white, black, back);
    ball.position.set(0, 0, z - 2.4);
    this.frontGroup.add(ball);
    this.moonBall = ball;
  }

  // ── Back dials ─────────────────────────────────────────────────────────
  private buildBackDials() {
    const z = BACK_PLATE_Z + 1.4;
    const facingBack = new THREE.Group();
    facingBack.rotation.y = Math.PI;
    this.backGroup.add(facingBack);

    const disc = (center: Vec2, radius: number, texture: THREE.Texture, zz: number) => {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 96),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
      );
      mesh.position.set(center.x, center.y, zz);
      facingBack.add(mesh);
      return mesh;
    };
    const pointer = (id: string, center: Vec2, len: number, zz: number, color = GOLD) => {
      const mesh = new THREE.Mesh(makePointerGeometry(len, 1.5), new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.3 }));
      mesh.position.set(center.x, center.y, zz);
      facingBack.add(mesh);
      this.pointerMeshes.set(id, mesh);
      return mesh;
    };

    // Metonic spiral: 235 cells, five turns, month names every cell of turn 0.
    const metonicTex = makeSpiralTexture({
      cells: METONIC.months,
      turns: METONIC.turns,
      innerRadius: 18,
      outerRadius: 30,
      startAngleDeg: 90,
      label: (i) => {
        const e = METONIC_LAYOUT[i];
        return e && e.monthOfYear === 1 ? GREEK_MONTHS_SHORT[e.month.greek] ?? '' : '';
      },
    });
    disc(DIAL_CENTRES.metonic, 32, metonicTex, z);
    pointer('metonic', DIAL_CENTRES.metonic, 30, z + 2.4);

    // Saros spiral with the eclipse glyphs.
    const sarosTex = makeSpiralTexture({
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
    });
    disc(DIAL_CENTRES.saros, 32, sarosTex, z);
    pointer('saros', DIAL_CENTRES.saros, 30, z + 2.4);

    // Olympiad: four years with the games.
    disc(
      DIAL_CENTRES.olympiad,
      15,
      makeSectorDialTexture(['Ι', 'ΙΙ', 'ΙΙΙ', 'ΙV'], {
        sublabels: [['ΟΛΥΜΠΙΑ'], ['ΙΣΘΜΙΑ', 'ΝΕΜΕΑ'], ['ΠΥΘΙΑ'], ['ΙΣΘΜΙΑ', 'ΝΕΜΕΑ']],
      }),
      z - 0.2,
    );
    pointer('olympiad', DIAL_CENTRES.olympiad, 14, z + 1.6, 0xb98b4a);

    // Callippic: 76 years in four Metonic quarters.
    disc(
      DIAL_CENTRES.callippic,
      13,
      makeSectorDialTexture(['Α', 'Β', 'Γ', 'Δ'], { title: 'ΚΑΛΛΙΠΠΟΣ' }),
      z - 0.2,
    );
    pointer('callippic', DIAL_CENTRES.callippic, 12, z + 1.6, 0xb98b4a);

    // Exeligmos: three sectors, +0h, +8h, +16h.
    disc(DIAL_CENTRES.exeligmos, 11, makeSectorDialTexture(['0', 'Η', 'ΙϚ'], { title: 'ΕΞΕΛΙΓΜΟΣ' }), z - 0.2);
    pointer('exeligmos', DIAL_CENTRES.exeligmos, 10, z + 1.6, 0xb98b4a);
  }

  // ── Update from a readout ──────────────────────────────────────────────
  update(r: Readout) {
    const b1 = r.gearAngles.b1;
    const e3 = r.gearAngles.e3;
    const b3 = r.gearAngles.b3;

    for (const [id, entry] of this.gears) {
      const g = GEAR.get(id)!;
      const theta = r.gearAngles[id] ?? 0;
      // Screen angles run clockwise; the kinematics run counter-clockwise.
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
      void b3;
    }

    for (const grp of [this.frontGroup, this.backGroup, this.caseGroup]) {
      grp.position.z = 0;
    }
    this.frontGroup.position.z = (this.explode - 1) * 26;
    this.backGroup.position.z = -(this.explode - 1) * 26;

    // Front pointers.
    const setAngle = (key: string, canvasDeg: number) => {
      const m = this.pointerMeshes.get(key);
      if (m) m.rotation.z = -canvasDeg * DEG;
    };
    setAngle('sun', r.longitude.sun);
    setAngle('moon', r.longitude.moon);
    setAngle('dragon', r.longitude.nodes);
    setAngle('date', wrap360(r.gearAngles.b1 * 360));
    for (const [id, mark] of this.planetMarks) {
      const lon = r.longitude[id as 'mars'] * DEG;
      const rad = mark.userData.radius ?? Math.hypot(mark.position.x, mark.position.y);
      mark.position.x = Math.cos(-lon) * rad;
      mark.position.y = Math.sin(-lon) * rad;
    }
    if (this.moonBall) this.moonBall.rotation.y = r.phaseAngle * DEG;

    // Back pointers. The spiral canvases start at 90° and run clockwise.
    const d = r.dials;
    const spiralAngle = (index: number, perTurn: number) => 90 - (index / perTurn) * 360;
    const metonicArm = this.pointerMeshes.get('metonic');
    if (metonicArm) {
      const m = d.metonicMonth;
      const r0 = 18 + (12 / 235) * m;
      metonicArm.rotation.z = -spiralAngle(m, 47) * DEG;
      metonicArm.scale.set(r0 / 30, 1, 1);
    }
    const sarosArm = this.pointerMeshes.get('saros');
    if (sarosArm) {
      const m = d.sarosMonth;
      const r0 = 16 + (14 / 223) * m;
      sarosArm.rotation.z = -spiralAngle(m, 223 / 4) * DEG;
      sarosArm.scale.set(r0 / 30, 1, 1);
    }
    const sector = (key: string, value: number, count: number) => {
      const m = this.pointerMeshes.get(key);
      if (m) m.rotation.z = -(-90 + (value / count) * 360) * DEG;
    };
    sector('olympiad', d.olympiadYear, 4);
    sector('callippic', d.callippicYear, 76);
    sector('exeligmos', d.exeligmos, 3);
  }

  // ── Interaction ────────────────────────────────────────────────────────
  setView(view: ViewName) {
    this.view = view;
    const v = {
      front: new THREE.Vector3(0, 26, 330),
      back: new THREE.Vector3(0, 26, -330),
      side: new THREE.Vector3(330, 40, 10),
      top: new THREE.Vector3(0, 340, 12),
      exploded: new THREE.Vector3(120, 90, 330),
      mechanism: new THREE.Vector3(0, 26, 330),
    }[view];
    this.cameraGoal.copy(v);
    this.easing = 1.1;
    this.targetExplode = view === 'exploded' ? 2.1 : 1;
    this.frontGroup.visible = (VIEW_SET.WITH_FRONT as readonly string[]).includes(view);
    this.backGroup.visible = true;
    this.setTransparent(view === 'exploded' || view === 'mechanism');
  }

  setTransparent(on: boolean) {
    this.transparent = on;
    this.plateMat.opacity = on ? 0.12 : 0.42;
    for (const [, entry] of this.gears) {
      const mat = entry.mesh.material as THREE.MeshStandardMaterial;
      mat.transparent = on;
      mat.opacity = on ? 0.55 : 1;
      mat.needsUpdate = true;
    }
  }

  isTransparent() {
    return this.transparent;
  }

  select(id: string | null) {
    this.selected = id;
    for (const [gid, entry] of this.gears) {
      const mat = entry.mesh.material as THREE.MeshStandardMaterial;
      const on = gid === id;
      mat.emissive = new THREE.Color(on ? 0x704010 : 0x000000);
      mat.emissiveIntensity = on ? 1.2 : 0;
    }
  }

  private onPointerDown = (ev: PointerEvent) => {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    const id = hits.length ? (hits[0].object.userData.gearId as string) : null;
    this.select(id);
    this.opts.onSelect?.(id);
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
    this.explode += (this.targetExplode - this.explode) * Math.min(1, dt * 6);
    // Camera easing: only for a moment after a view change, otherwise it would
    // fight the user's orbit and the damping of the controls.
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
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
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

void ZODIAC_GREEK;
void EGYPTIAN_MONTHS_GREEK;
void canvasTexture;
void pitchR;
