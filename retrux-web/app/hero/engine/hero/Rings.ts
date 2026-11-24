import * as THREE from "three";
import { HERO_CENTER, REST_CAMERA, RING_NAMES } from "../config";
import type { Drivers } from "../Choreography";
import { hash1, lerp, smoothstep } from "../math";
import type { SharedUniforms } from "../uniforms";
import { createBackDepthMaterial, createIceMaterial, iceSilhouette, type IceQuality } from "./IceMaterial";
import { A_TURN_AXIS, HOLD_SPIN, HOLD_TUNE, holdViewFrame, SPIN_P2B, SPIN_S3, targetA, targetB, targetBPop, targetCD, type HoldMode, type IdleMode } from "./HoldR11";
import { P4_SEAMREL } from "./HoldR11";
import { RING_MOCAP, RING_MOCAP_STEP } from "./ringMocap";

/**
 * The ice gyroscope. Four rings (A outer, in four quarters; B in two halves;
 * C and D solid) share the orb as pivot. Blender stores them as a flat
 * bullseye; each ring's axis is measured from its vertices (best-fit plane) and
 * the geometry is rotated face-on (axis +Z). The idle tumble is motion-captured
 * from Default Loop.mp4 (ringMocap.ts, hero-pipeline/ringfit): A and B follow
 * their exact constant-rate rotations (A = Ry(90 t) Rx(180 t), B = Ry(90 t)
 * Rx(-135 t), deg/s), C and D the smoothed measured tracks; at t = 0 A is an
 * edge-on horizontal band and B face-on (F000), at 1 s and 3 s B crosses A as
 * the "X", and there is no all-face-on moment. The old hand-tuned chains remain
 * as a fallback. The choreography drivers blend in the frontal alignment, the
 * collapse (flatten, splay) and the hold (expand) poses.
 */

const OMEGA = (2 * Math.PI) / 4; // a quarter turn per second (fallback chains)
// Where the intro lands on the loop: t = 1.5 s, the Default Loop F045 vortex (the Figma KV pose). With the
// fallback chains every ring is face-on here.
const EYE_TIME = 1.5;
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const DEG = Math.PI / 180;

type RingDef = {
  id: "A" | "B" | "C" | "D";
  nodes: string[];
  /** Tumble chain, applied first to last: [axis, rate in quarter turns per second]. */
  tumble: [THREE.Vector3, number][];
  frost: number;
  /** Small "open up" tilt during the collapse (radians about X / Y). */
  open: [number, number];
};

// Frost coverage per ring (IceMaterial uFrost). QC round 5: 0.74-0.84 frosted nearly every pixel (blur, scatter, frosted
// sheen: the milky veil); the reference is clear ice with frosted patches and edges.
const DEFS: RingDef[] = [
  // In-plane spin, half a turn per second about X, slow precession about Y.
  { id: "A", nodes: RING_NAMES.outerQuarters, tumble: [[Z, 1], [X, 2], [Y, 0.5]], frost: 0.5, open: [0.22, -0.1] },
  // Face-on at t = 0 and at the eye, near edge-on around t = 0.6 s.
  { id: "B", nodes: RING_NAMES.halves, tumble: [[X, 4 / 3], [Y, -4 / 3]], frost: 0.48, open: [-0.18, 0.16] },
  { id: "C", nodes: [RING_NAMES.middle], tumble: [[X, 3], [Y, -1]], frost: 0.44, open: [0.3, 0.2] },
  { id: "D", nodes: [RING_NAMES.inner], tumble: [[Y, -3], [X, 1]], frost: 0.4, open: [-0.26, -0.24] },
];

/**
 * Round 11 P2b (rings lane, the user's QC of 15 Nov 19:20: the inner rings "rock back and forth" at rest): the idle tumble of
 * rings C / D, measured from Default Loop.mp4 (work2/rings/LOG.md 20:10). Each is a constant-rate flip about the rest camera's
 * horizontal axis (one of its own diameters), like A's and B's own flips (A +180, B -135 deg/s about that axis, inside their
 * shared 90 deg/s precession; C / D have none: at F030 / F090, where A and B are both edge-on, the inner rings are not):
 *   C: -90 deg/s, one full turn per 4 s loop; D: +45 deg/s, half a turn per loop (a symmetry of a solid ring).
 * The ring's axis at tau 0 is tipped a0 from facing the camera (camera space (0, sin a0, cos a0)): C +34 deg (its lower half
 * nearer), D -36 deg (its upper half nearer). Rate and phase: the rings' four projected rim circles against the edges of all 121
 * loop frames (C: every other rate scores lower, phase peak 34; D: 45 deg/s, peak -36), also the best constant-rate fits of the
 * mocap's own ellipses (C +-90, D +-45 among the 4 s loops). Sense: which half passes in front of the orb (the ice in front darkens
 * it): C -90 in every frame with a large test region (F21-F31, F69-F78), D +45 in all frames where D alone crosses the orb
 * (F41-F53). The motion-captured tracks (`?idle=r10`) fold back at edge-on (C, t 2.6-2.8 s) or never turn over (D): the nod.
 * The ring's local X is put on the flip axis, so q(tau) = q0 * Rx(rate * tau): a fixed-axis spin, exactly periodic, no 8 s track.
 */
const IDLE_CD = [
  { rate: -90, a0: 34 },
  { rate: 45, a0: -36 },
];
const IDLE_CD_Q0 = IDLE_CD.map(({ a0 }) => {
  // The rest camera's frame as hero-pipeline/ringfit/fit_mocap.py builds it (yaw / pitch of REST_CAMERA), world space.
  const yaw = REST_CAMERA.yawDeg * DEG;
  const pitch = REST_CAMERA.pitchDeg * DEG;
  const fwd = new THREE.Vector3(-Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw));
  const right = new THREE.Vector3().crossVectors(fwd, Y).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd);
  const n0 = up.multiplyScalar(Math.sin(a0 * DEG)).addScaledVector(fwd, -Math.cos(a0 * DEG)).normalize();
  const yAxis = new THREE.Vector3().crossVectors(n0, right);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, yAxis, n0));
});

/** Face-on ring laid flat (axis +Y): edge-on to the camera. */
const Q_FLAT = new THREE.Quaternion().setFromAxisAngle(X, -Math.PI / 2);
/** Hold pose of ring A: face-on, the quarter set turned this far anticlockwise (F420). */
const A_EXPAND_TURN = 17.5 * DEG;
/**
 * Hold pose of ring B: lying flat, its near edge dipped ~18 deg, so it reads as an open ellipse
 * showing the inner face of its far side above the near band (F404-F428).
 */
// (F420 measured: B's centre-line ellipse ~0.27, i.e. ~74 deg from face-on; -62 read as an open bowl. QC round 4:
// the bbox ratio with the section is ~0.42 at -70 once B holds its pose at 0.97. Round 6, T16: -86 inside the hold
// frame's +20 deg pitch, i.e. ~-66 on screen: a bowl round the orb. Round 7: -94, i.e. back to ~-74 on screen, F420's flat
// "lips" that hide most of the orb; the open bowl read as a bright dome.)
const B_TILT_DEG = -94;
const Q_B_EXPAND = new THREE.Quaternion().setFromAxisAngle(X, B_TILT_DEG * DEG);
/** Hold: the B / C / D bowl rides this far above the orb (world up, m), so it hides the orb down to a cap. */
// (With B's halves held fully split, the raised near band covers the orb and only a small cap shows above it, F420:
// 0.1. A partial split read as an open bowl with the dome on top at 0.12 and at 0.3.)
// (0 since QC round 8, T09 with B_SPLIT_HELD 0.35: the lips sit level around the orb.)
const BOWL_LIFT = 0.0;
/**
 * The reference never shows a flat bullseye: its "aligned" moments (press F335-F343, reassembly F453-F462)
 * are a near-frontal 3D vortex. Each ring keeps this residual tilt when it aligns (world rotation).
 */
const Q_RES = [
  new THREE.Quaternion().setFromAxisAngle(X, 28 * DEG),
  new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 0).normalize(), 30 * DEG),
  new THREE.Quaternion().setFromAxisAngle(X, 70 * DEG),
  new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, -1, 0).normalize(), 22 * DEG),
];
/** Pop (F357-F363): A an edge-on level band, B an edge-on slab rolled 50 deg (the X), C face-on behind. */
const POP_AXIS: (THREE.Vector3 | null)[] = [
  // Rolled ~7 deg: the band rises to the right as at F358 (QC round 5: level band).
  new THREE.Vector3(-Math.sin(7 * DEG), Math.cos(7 * DEG), 0),
  // Upper-left to lower-right (QC round 1: the X was mirrored against F358).
  new THREE.Vector3(Math.sin(50 * DEG), Math.cos(50 * DEG), 0),
  new THREE.Vector3(0, 0, 1),
  // D tipped 15 deg so it no longer sits flat on C as one smooth hoop (QC round 6, T15).
  new THREE.Vector3(0, Math.sin(15 * DEG), Math.cos(15 * DEG)),
];
// (B 0.9 until QC round 6: nearly edge-on, a thin short bar vs F358's ~100 px wide one.)
const POP_WEIGHT = [0.9, 0.8, 0.8, 0.6];
/**
 * Hold (F404-F428), per ring-A quarter by its on-screen place when the hold starts, counter-clockwise from
 * 12 o'clock (top, left, bottom, right): tilt about the arc tangent (shows the deep face), offset along the
 * ring axis, a small slide along the ring (uneven gaps of ~12-38 deg) and how far it drifts out (m).
 */
// QC round 1 (p06 vs F420): top / right quarters show their broad faces, the set pairs up (big gaps near 1 and
// 7 o'clock) and stays ~40 px inside the frame at the 12.7 m dolly.
// QC round 5 (p05 / p06 vs F402 / F420: "a cracked ring, the reference an explosion"): deeper tilts that show the
// slabs' faces, wider uneven slides and each quarter spun in A's plane about its own centre (A_SLOT_SPIN_DEG), so the
// arcs no longer line up on one circle. (48 / -30 / 45 / -48 tilts and 11 / -9 slides before.)
const A_SLOT_TILT_DEG = [55, -42, 48, -55];
// Purely radial in A's own plane (QC round 2: the axial push brought one arc up to the camera as a tube cut off by the frame).
const A_SLOT_AXIAL = [0, 0, 0, 0];
// (16 / -14 butted end caps into neighbouring arcs, QC round 4: F420 keeps clear gaps.)
// ([20, -12, 18, -20] until QC round 9: the quarters overlapped in pairs into a closed cage; alternating +-24 opens it into
// separate arcs with sky between them and a near-vertical right arc, as F420. holdvar20 / 21.)
const A_SLOT_SLIDE_DEG = [-24, 24, -24, 24];
// (Per-slot spins [-30, 25, -30, 30] lifted a top arc past the frame at some press moments: the spin follows the screen
// angle now, Rings.tune.aSpinAmp.)
const A_SLOT_SPIN_DEG = [0, 0, 0, 0];
// (0.5 / 0.4 still let the top quarter leave the frame with the pointer at the bottom edge; sweep 2.)
const A_SLOT_OUT = [0.28, 0.12, -0.1, 0.3];
/** Ring B's axis in that pose (nearly vertical: B lies almost flat). */
const N_B_HOLD = new THREE.Vector3(0, 0, 1).applyQuaternion(Q_B_EXPAND);
/**
 * Safety net for continuity: no ring group turns faster than this. An alignment whose side was latched can
 * meet a ring tumbling through the far pole of its target, where the shortest turn is undefined and the
 * ring snapped up to ~100 deg in a frame (probe_interact, B at its face-on moment during a press). The real
 * motion stays below it: the Default Loop tumble peaks at ~200 deg/s (A), the pop at ~15 deg per 60 Hz frame.
 */
const MAX_TURN = 900 * DEG;
/** Ring A's centre-line radius (m): its quarters' cut faces span 1.979-2.401 m. */
const A_CENTRE_R = 2.19;
/** Share of ring B's world-Y split kept once the hold pose is in (the pop opens it fully first). */
// F404-F428 hold the GLB split (+0.47 / -0.57 m): two stacked near-edge-on bands with the orb behind them. (0.55 with
// the raised half left to chance read as a coil with the orb exposed, QC round 2; 0.3 as an open bowl, round 4.)
// (1.0 until QC round 8, T09: the halves parted ~1 m, each lip a thin ribbon with the core between them; 0.35 with the hold
// frame's pitch and the orb's luminous rim reads as F402's concentric portal / F420's lips. Frame bounds unchanged:
// probe_holdbounds worst top 24, bottom 704.)
const B_SPLIT_HELD = 0.35;

/**
 * Rotating hold, frame guard: the largest push p >= 0 for which a point whose clip coordinate along one axis is c + p d (w:
 * cw + p dw) stays within -L w .. L w; 0 if it is outside already at p = 0.
 */
function pushLimit(c: number, d: number, cw: number, dw: number, L: number) {
  const up = L * cw - c;
  const dn = L * cw + c;
  if (up < 0 || dn < 0) return 0;
  let m = Infinity;
  const su = d - L * dw;
  if (su > 1e-9) m = Math.min(m, up / su);
  const sd = -(d + L * dw);
  if (sd > 1e-9) m = Math.min(m, dn / sd);
  return m;
}
/** C1 saturation with sat(x) <= min(x, 1): identity up to 0.75, 1 from 1.25 (the guard never pushes past its limit). */
function sat(x: number) {
  if (x <= 0.75) return Math.max(0, x);
  if (x >= 1.25) return 1;
  return x - (x - 0.75) * (x - 0.75);
}
/** Points of a geometry that are extreme in one of `n` directions (Fibonacci sphere): its convex hull's main vertices. */
function hullPoints(g: THREE.BufferGeometry, n = 96) {
  const pos = g.attributes.position;
  const pick = new Set<number>();
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let k = 0; k < n; k++) {
    const y = 1 - (2 * (k + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const dx = Math.cos(golden * k) * r, dz = Math.sin(golden * k) * r;
    let best = -Infinity, bi = 0;
    for (let i = 0; i < pos.count; i++) {
      const v = pos.getX(i) * dx + pos.getY(i) * y + pos.getZ(i) * dz;
      if (v > best) {
        best = v;
        bi = i;
      }
    }
    pick.add(bi);
  }
  const out: number[] = [];
  for (const i of pick) out.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  return out;
}

/** Unit normal of the best-fit plane (smallest principal axis) from a packed covariance [xx xy xz yy yz zz]. */
function smallestPrincipalAxis(m: number[]) {
  const a = [
    [m[0], m[1], m[2]],
    [m[1], m[3], m[4]],
    [m[2], m[4], m[5]],
  ];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  // Cyclic Jacobi rotations (Numerical Recipes form) on the symmetric 3x3.
  for (let sweep = 0; sweep < 32; sweep++) {
    if (a[0][1] ** 2 + a[0][2] ** 2 + a[1][2] ** 2 < 1e-24) break;
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ]) {
      const apq = a[p][q];
      if (Math.abs(apq) < 1e-30) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * apq);
      const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      const r = 3 - p - q;
      const arp = a[r][p];
      const arq = a[r][q];
      a[p][p] -= t * apq;
      a[q][q] += t * apq;
      a[p][q] = a[q][p] = 0;
      a[r][p] = a[p][r] = c * arp - s * arq;
      a[r][q] = a[q][r] = s * arp + c * arq;
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p];
        const vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq;
        v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  let i = 0;
  if (a[1][1] < a[i][i]) i = 1;
  if (a[2][2] < a[i][i]) i = 2;
  return new THREE.Vector3(v[0][i], v[1][i], v[2][i]).normalize();
}

/** Axis of a ring from all of its pieces' vertices (hero frame). Oriented towards +Z. */
/**
 * One level of midpoint subdivision: every triangle into four, midpoints shared per edge (keyed by its two vertex
 * indices, so split vertices along hard edges stay split), every attribute interpolated, normals renormalised. The
 * shape does not change; the vertex shader's displacement gets the density to carve it.
 */
function subdivideMidpoint(g: THREE.BufferGeometry) {
  const n0 = g.attributes.position.count;
  const idx = g.index ? Array.from(g.index.array) : Array.from({ length: n0 }, (_, i) => i);
  const names = Object.keys(g.attributes);
  const data: Record<string, number[]> = {};
  const size: Record<string, number> = {};
  for (const a of names) {
    // Through getComponent, so a normalized integer attribute arrives as its float value.
    const at = g.attributes[a] as THREE.BufferAttribute;
    const d: number[] = [];
    for (let i = 0; i < at.count; i++) for (let c = 0; c < at.itemSize; c++) d.push(at.getComponent(i, c));
    data[a] = d;
    size[a] = at.itemSize;
  }
  const mid = new Map<number, number>();
  let count = n0;
  const midOf = (i: number, j: number) => {
    const key = i < j ? i * 1048576 + j : j * 1048576 + i;
    const m = mid.get(key);
    if (m !== undefined) return m;
    const k = count++;
    for (const a of names) {
      const s = size[a];
      const d = data[a];
      for (let c = 0; c < s; c++) d.push((d[i * s + c] + d[j * s + c]) / 2);
    }
    mid.set(key, k);
    return k;
  };
  const out: number[] = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const ab = midOf(a, b), bc = midOf(b, c), ca = midOf(c, a);
    out.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  const ng = new THREE.BufferGeometry();
  for (const a of names) ng.setAttribute(a, new THREE.BufferAttribute(new Float32Array(data[a]), size[a]));
  ng.setIndex(out);
  const nr = ng.attributes.normal as THREE.BufferAttribute | undefined;
  if (nr) {
    for (let i = n0; i < count; i++) {
      const x = nr.getX(i), y = nr.getY(i), z = nr.getZ(i);
      const l = Math.hypot(x, y, z) || 1;
      nr.setXYZ(i, x / l, y / l, z / l);
    }
  }
  ng.computeBoundingBox();
  ng.computeBoundingSphere();
  g.dispose();
  return ng;
}

/** Angles (ring frame, rad) of a piece's two cut ends: the extreme vertex angles around its centroid's angle. */
function pieceCutAngles(geo: THREE.BufferGeometry, centroid: THREE.Vector3): [number, number] {
  const pos = geo.attributes.position;
  const c0 = Math.atan2(centroid.y, centroid.x);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getY(i) + centroid.y, pos.getX(i) + centroid.x) - c0;
    const r = Math.atan2(Math.sin(a), Math.cos(a));
    lo = Math.min(lo, r);
    hi = Math.max(hi, r);
  }
  return [c0 + lo, c0 + hi];
}

function ringAxis(geos: THREE.BufferGeometry[]) {
  let n = 0;
  const mean = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (const g of geos) {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) mean.add(p.fromBufferAttribute(pos, i));
    n += pos.count;
  }
  mean.divideScalar(Math.max(1, n));
  const m = [0, 0, 0, 0, 0, 0];
  for (const g of geos) {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).sub(mean);
      m[0] += p.x * p.x;
      m[1] += p.x * p.y;
      m[2] += p.x * p.z;
      m[3] += p.y * p.y;
      m[4] += p.y * p.z;
      m[5] += p.z * p.z;
    }
  }
  const axis = smallestPrincipalAxis(m);
  return axis.z < 0 ? axis.negate() : axis;
}

type Piece = {
  ring: number;
  pivot: THREE.Group;
  mesh: THREE.Mesh;
  rest: THREE.Vector3;
  radial: THREE.Vector3;
  tangent: THREE.Vector3;
  wobbleAxis: THREE.Vector3;
  rand: number;
  /** Ring B: +1 upper half, -1 lower half (world-Y split, from the GLB keyframes). */
  half: number;
  /** Ring B: which way this half moves in the split, latched from its world height when the split starts. */
  splitSign: number;
  /** Ring A, hold pose: 1 for the quarter facing up-right, 0 down-left (F420 spreads unevenly). */
  holdW: number;
  /** Ring A: hold slot 0-3 (top, left, bottom, right on screen), latched when the hold starts. */
  slot: number;
  /** Rings A / B: hull points of the piece (pivot frame, flat xyz), for the rotating hold's frame guard. */
  hull: number[] | null;
};

export class Rings {
  readonly root = new THREE.Group();
  readonly groups: THREE.Group[] = [];
  readonly pieces: Piece[] = [];
  readonly materials: THREE.ShaderMaterial[] = [];
  /** Ring axes measured in the stored pose (hero frame), one per DEFS entry. */
  readonly axes: THREE.Vector3[] = [];
  private tau = 0;
  private q = new THREE.Quaternion();
  private qa = new THREE.Quaternion();
  private qb = new THREE.Quaternion();
  private qLim = new THREE.Quaternion();
  /** Last frame's group orientations (turn-rate limit). */
  private prevQ = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
  private prevValid = false;
  private qt = new THREE.Quaternion();
  private qr = new THREE.Quaternion();
  private qs = new THREE.Quaternion();
  private qInv = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();
  private v4 = new THREE.Vector3();

  constructor(gltfScene: THREE.Object3D, shared: SharedUniforms, envDefines: Record<string, string>, quality: IceQuality) {
    this.root.name = "rings";
    this.root.position.fromArray(HERO_CENTER);
    const center = new THREE.Vector3().fromArray(HERO_CENTER);
    const toHero = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
    gltfScene.updateMatrixWorld(true);

    DEFS.forEach((def, ri) => {
      const group = new THREE.Group();
      group.name = `ring-${def.id}`;
      this.root.add(group);
      this.groups.push(group);

      // Every piece in the hero frame (orb at the origin).
      const geos: THREE.BufferGeometry[] = [];
      for (const nodeName of def.nodes) {
        const src = gltfScene.getObjectByName(nodeName) as THREE.Mesh | undefined;
        if (!src || !src.isMesh) {
          console.warn(`[hero] ring mesh ${nodeName} missing`);
          continue;
        }
        const geo = src.geometry.clone();
        geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toHero, src.matrixWorld));
        geos.push(geo);
      }
      // The ring axis from the vertices themselves (the node rotations hide the mesh's own frame).
      const axis = geos.length ? ringAxis(geos) : Z.clone();
      this.axes.push(axis);
      const toFrontM = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(axis, Z));
      // Centre-line radius (mean distance from the axis), for the displacement direction.
      let rSum = 0;
      let rN = 0;
      for (const geo of geos) {
        geo.applyMatrix4(toFrontM);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) rSum += Math.hypot(pos.getX(i), pos.getY(i));
        rN += pos.count;
      }
      const sectionRadius = rN ? rSum / rN : 0;
      // Section half-extents (radial a, axial b), for the slab remap in the ice shader.
      let secA = 0;
      let secB = 0;
      for (const geo of geos) {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          secA = Math.max(secA, Math.abs(Math.hypot(pos.getX(i), pos.getY(i)) - sectionRadius));
          secB = Math.max(secB, Math.abs(pos.getZ(i)));
        }
      }

      geos.forEach((geo, pi) => {
        geo.computeBoundingBox();
        const centroid = geos.length > 1 ? geo.boundingBox!.getCenter(new THREE.Vector3()) : new THREE.Vector3();
        centroid.z = 0;
        geo.translate(-centroid.x, -centroid.y, -centroid.z);
        geo.computeBoundingSphere();

        const seed = ri * 3.17 + pi * 1.31;
        // One noise domain per ring (uNoiseOffset keeps it continuous across the pieces): a per-piece seed made
        // the frost, chisel cells and cracks jump at every cut (QC round 1: a hard line across ring A).
        const mat = createIceMaterial(shared, envDefines, quality, { seed: ri * 3.17, objScale: 1, frost: def.frost });
        mat.uniforms.uNoiseOffset.value.copy(centroid);
        mat.uniforms.uSectionRadius.value = sectionRadius;
        mat.uniforms.uSectionHalf.value.set(secA, secB);
        // Round 11 (IceMaterial): the piece's two cut planes in the ring frame, for the joint seams.
        if (mat.uniforms.uPieceCuts) {
          const cuts = pieceCutAngles(geo, centroid);
          mat.uniforms.uPieceCuts.value.set(cuts[0], cuts[1], geos.length > 1 ? 1 : 0, 1);
        }
        this.materials.push(mat);
        // T1+: x4 triangles (midpoint split, still indexed and welded) so the vertex displacement can carve the outline
        // (~0.1 m per segment along the ring sampled each 0.4 m bump ~4x: "perfect circles", QC round 8).
        const mesh = new THREE.Mesh(iceSilhouette(quality) ? subdivideMidpoint(geo) : geo, mat);
        mesh.name = `ring-${def.id}-${pi}`;
        mesh.userData.iceMaterial = mat;
        mesh.userData.backMaterial = createBackDepthMaterial(mat);
        const pivot = new THREE.Group();
        pivot.position.copy(centroid);
        pivot.add(mesh);
        group.add(pivot);

        const radial = centroid.lengthSq() > 1e-6 ? centroid.clone().normalize() : new THREE.Vector3(1, 0, 0);
        const rand = hash1(seed * 9.1 + 0.37);
        this.pieces.push({
          ring: ri,
          pivot,
          mesh,
          rest: centroid.clone(),
          radial,
          tangent: new THREE.Vector3().crossVectors(Z, radial).normalize(),
          wobbleAxis: new THREE.Vector3(hash1(seed + 1) - 0.5, hash1(seed + 2) - 0.5, hash1(seed + 3) - 0.5).normalize(),
          rand,
          half: def.id === "B" ? (centroid.y >= 0 ? 1 : -1) : 0,
          splitSign: def.id === "B" ? (centroid.y >= 0 ? 1 : -1) : 0,
          holdW: 0.5,
          slot: def.id === "A" ? pi % 4 : -1,
          hull: def.id === "A" || def.id === "B" ? hullPoints(mesh.geometry) : null,
        });
      });
    });

    // Ring A hold pose: face-on, turned so the quarter nearest 12 o'clock sits A_EXPAND_TURN
    // anticlockwise of it (F420: the top arc's centre moves left of the orb).
    let topAngle = Math.PI / 2;
    let best = Infinity;
    for (const p of this.pieces) {
      if (p.ring !== 0 || p.rest.lengthSq() < 1e-6) continue;
      const a = Math.atan2(p.rest.y, p.rest.x);
      const off = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)));
      if (off < best) {
        best = off;
        topAngle = a;
      }
    }
    const turn = Math.PI / 2 + A_EXPAND_TURN - topAngle;
    // F420, measured from the orb: the top and right quarters sit ~315 / 287 px out, the bottom and
    // left ones tuck in to ~250 / 230 px. Weight each quarter by its on-screen angle in the hold.
    for (const p of this.pieces) {
      if (p.ring !== 0 || p.rest.lengthSq() < 1e-6) continue;
      const a = Math.atan2(p.rest.y, p.rest.x) + turn;
      p.holdW = 0.5 + 0.5 * Math.cos(a - 65 * DEG);
    }
  }

  /**
   * Which side each ring turns to when it aligns (+1 / -1). It is chosen while no alignment is active
   * and then held for the whole alignment, so the target never flips half a turn while a ring passes
   * edge-on: the motion stays continuous.
   */
  private faceSign = [1, 1, 1, 1];

  /** Tumble clock in seconds (the intro lands at EYE_TIME). */
  get clock() {
    return this.tau;
  }
  set clock(t: number) {
    this.tau = t;
  }
  static readonly EYE_TIME = EYE_TIME;

  /**
   * Near face-on orientation for q (on the ring's current side, plus `share` of its residual tilt), keeping its
   * spin.
   */
  private faceOn(q: THREE.Quaternion, out: THREE.Quaternion, ring: number, share = 1, resQ: THREE.Quaternion = Q_RES[ring]) {
    const n = this.v.copy(Z).applyQuaternion(q);
    this.v2.set(0, 0, this.faceSign[ring]);
    const res = share >= 0.999 ? resQ : this.qr.identity().slerp(resQ, Math.max(0, share));
    return out.setFromUnitVectors(n, this.v2).multiply(q).premultiply(res);
  }
  /** Ring D's residual in the release's reassembly (QC round 6, T15), from the snap (F453) to home (F460). */
  private qDRel = new THREE.Quaternion();
  private qDSnap = new THREE.Quaternion();
  private qDHome = new THREE.Quaternion();

  /** Side (+1 / -1) each ring takes in the pop pose, chosen before the pop starts. */
  private popSign = [1, 1, 1, 1];

  /** Side (+1 / -1) each ring takes in the hold pose, chosen before the hold starts and then kept. */
  private holdSign = [1, 1, 1, 1];

  /** Side (+1 / -1) of the hold's cut-across turn of ring B, chosen before the hold starts. */
  private cutSign = [1, 1, 1, 1];

  /**
   * Turns q about its own axis so its local Y (the direction that separates ring B's halves) points along the
   * view direction projected onto the ring plane: the cut line then runs across the view and the split halves
   * stack as near / far bands. `latch` picks the nearer side while the hold weight is still ~0.
   */
  private spinCutAcross(q: THREE.Quaternion, ring: number, latch: boolean, w: number) {
    const n = this.v.copy(Z).applyQuaternion(q);
    const yw = this.v2.copy(Y).applyQuaternion(q);
    const t = this.v3.copy(Z).addScaledVector(n, -n.z);
    if (t.lengthSq() < 1e-6) return;
    t.normalize();
    if (latch) {
      // F420: the half that rose in the split is the NEAR band, in front of the orb (only the orb's top cap above it,
      // its light through the gap between the stacked bands). Taking the nearer side at the latch instead left it to
      // the press moment whether the raised half sat in front or behind (an open bowl with the orb on top).
      const up = this.pieces.find((p) => p.ring === ring && p.half === 1);
      this.cutSign[ring] = up ? (up.splitSign > 0 ? 1 : -1) : yw.dot(t) >= 0 ? 1 : -1;
    }
    if (w <= 0) return;
    t.multiplyScalar(this.cutSign[ring]);
    const ang = Math.atan2(this.v4.crossVectors(yw, t).dot(n), yw.dot(t));
    q.premultiply(this.qa.setFromAxisAngle(n, ang * Math.min(1, w)));
  }

  /** Gives each ring-A quarter its hold slot (0 top, 1 left, 2 bottom, 3 right) from its screen place. */
  private latchSlots() {
    const ga = this.groups[0].quaternion;
    const n = this.v.copy(Z).applyQuaternion(ga);
    this.v2.set(0, 0, this.holdSign[0]);
    const face = this.qt.setFromUnitVectors(n, this.v2).multiply(ga);
    const quarters: { p: Piece; a: number }[] = [];
    for (const p of this.pieces) {
      if (p.ring !== 0 || p.rest.lengthSq() < 1e-6) continue;
      const wr = this.v.copy(p.radial).applyQuaternion(face);
      // Counter-clockwise from 12 o'clock, 0..2pi.
      const a = (((Math.atan2(wr.y, wr.x) - Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      quarters.push({ p, a });
    }
    if (!quarters.length) return;
    // The quarter nearest 12 o'clock is "top", then counter-clockwise.
    let top = 0;
    quarters.forEach((e, i) => {
      const d0 = Math.min(e.a, 2 * Math.PI - e.a);
      const dt = Math.min(quarters[top].a, 2 * Math.PI - quarters[top].a);
      if (d0 < dt) top = i;
    });
    const a0 = quarters[top].a;
    quarters
      .map((e) => ({ e, rel: (e.a - a0 + 2 * Math.PI) % (2 * Math.PI) }))
      .sort((x, y) => x.rel - y.rel)
      .forEach((x, i) => (x.e.p.slot = i % 4));
  }

  /**
   * Turns q by `w` of the smallest rotation that brings the ring's axis onto `sign * target`. The ring keeps
   * its own spin and keeps tumbling underneath, and the result is continuous in q (no shortest-path flip),
   * so a hold can start, end or restart at any moment without a jump.
   */
  private toward(q: THREE.Quaternion, target: THREE.Vector3, sign: number, w: number) {
    if (w <= 0) return q;
    const n = this.v.copy(Z).applyQuaternion(q);
    this.v2.copy(target).multiplyScalar(sign);
    this.qt.setFromUnitVectors(n, this.v2);
    this.qa.identity().slerp(this.qt, Math.min(1, w));
    return q.premultiply(this.qa);
  }

  /**
   * Hold-pose parameters, read every frame (tunable at runtime for captures: `__hero.rings.tune`). Defaults are the
   * module constants: B's tilt from face-on (deg), the B / C / D bowl lift (m), B's held split share, ring A's
   * per-slot drift (m, top / left / bottom / right) and a lift of the whole A set (m).
   */
  readonly tune = {
    /**
     * World-up lift of the whole hero (rings, orb, shards, the shared orb centre) with the dolly, x camExpand (m). The camera
     * stays on the hold plate's pose, so the plate keeps its registration. HeroEngine applies it. (QC round 9: the orb sat
     * 40-55 px low at F358 / F402 / F420.) 0 = off. 0.28 with the opened arcs and holdCompact 0.78: probe_holdbounds worst
     * press moment top -4 / bottom 689 (bounding boxes, which overestimate a little).
     */
    holdLift: 0.28,
    bTiltDeg: B_TILT_DEG,
    bowlLift: BOWL_LIFT,
    bSplitHeld: B_SPLIT_HELD,
    aSlotOut: [...A_SLOT_OUT],
    // (0.06 until round 6: with the hold frame's roll the left quarter's AABB reached the frame's top edge.)
    aLift: 0,
    /** Extra world-up lift of the quarters in the lower half of the screen during the hold (m). */
    // (0.45 until round 6: with the hold frame and holdCompact the worst p06 bottom is 666 px, AABBs, F420 ~680.)
    aLowerLift: 0.7,
    /** Ring A's hold drift by screen angle th (from +x, ccw): base + amp cos(th - phase), m. */
    // (More drift, -0.08 + 0.22 cos(th - 10), pushed arcs past the frame at some press moments: probe_holdbounds.
    // -0.17 + 0.2 until round 6, T05.)
    aOutBase: -0.22,
    aOutAmp: 0.15,
    /** Extra drift of the quarters at the sides (cos^2 of the screen angle, m): F420's swirl is wide, not tall. */
    // (QC round 7: "a compact tangle, ~72 % of the reference's width": 0.35, AABBs 307-1170 px, top / bottom unchanged.)
    aOutH: 0.35,
    aOutPhaseDeg: 65,
    /** Per hold slot (top, left, bottom, right): tilt about the arc tangent (deg), step along A's axis (m), slide (deg). */
    aSlotTilt: A_SLOT_TILT_DEG.slice(),
    aSlotAxial: A_SLOT_AXIAL.slice(),
    aSlotSlide: A_SLOT_SLIDE_DEG.slice(),
    /** Tilt cap of the quarters in the lower half (deg) and the random roll about their radial axis (rad). */
    aLowerTiltCap: 18,
    aRoll: 0.25,
    /** Hold: ring A's axis tilted away from face-on (deg) about the in-plane axis at aHoldAxisDeg (from +x, ccw). */
    aHoldTiltDeg: 0,
    aHoldAxisDeg: 45,
    /** Hold: each quarter spun in A's plane about its own centre (deg per slot), so the arcs stop lining up on one circle. */
    aSlotSpin: A_SLOT_SPIN_DEG.slice(),
    /** Spin by screen angle th: aSpinAmp cos(th) (deg): the side quarters lean, the top / bottom ones stay level. */
    aSpinAmp: 22,
    /**
     * Idle loop: an extra tip of each ring (A, B, C, D; deg about world X) around its loop time loopTipAt (s, on the
     * 4 s loop, so 8 s tracks get it twice), a cosine bump of half-width loopTipWidth s: continuous, no pops.
     * QC round 5 (q01 vs loop_F015): B and C lie too flat at t 0.5, so the orb's dome sat on a flat band; tipped, they
     * read as the reference's bowl around the orb. A at rest (t 0): its band sat ~12 px high over a small orb cap.
     */
    // (D 0 until QC round 6, T15: at t 0.5 the mocap leaves D ~14 deg, the reference's inner ring is tipped further.
    // B / C 13 / 20 until QC round 7: too open, the orb a full white dome where loop F015 shows a slit; loopvar4.)
    // (-6 / 0 in round 7 overshot to an edge-on ribbon across the orb; QC round 8 T10, loopvar5 b2c8: the bowl tilted
    // ~25 deg toward the camera, bbox ~625-875 x 290-460 vs F015's 610-870 x 295-450, white orb 2416 px vs 1380, ref 2993.)
    loopTipDeg: [5, 2, 8, 8],
    loopTipAt: [0, 0.5, 0.5, 0.5],
    loopTipWidth: 0.45,
    /**
     * Ring A's in-plane phase (round 11): a turn of A about its own axis (deg, + = counter-clockwise in its face-on frame)
     * on top of the mocap, which cannot see a symmetric ring's spin. HeroEngine sets it from `?aphase` (0 = the round-10
     * phase, bit-identical). aLoopPhaseRate (deg / s of the loop clock) must keep the 4 s loop closed (a multiple of 90).
     */
    aLoopPhaseDeg: 0,
    aLoopPhaseRate: 0,
    /** Ring D's residual tilt in the release's reassembly: at the snap (F453, about (1, 0.35, 0)) and home (F460, about X). */
    dRelSnapDeg: 38,
    dRelHomeDeg: 45,
    /**
     * Hold frame (QC round 6, T16): every hold target (A's face, B's bowl, C / D's bowl and portal) turned about world Y
     * (deg) and then tipped back about X (deg), so the held set reads as a 3D swirl seen at an angle (F402 / F420), not
     * a flat logo spinning face-on. 0 / 0 = the screen-plane hold.
     */
    // Probed in qc\holdvar11-17: a yaw made TALL ellipses (the reference's are wide); +20 pitch shows the set from a
    // little above (B a bowl round the orb, C / D a tunnel), -15 roll lays B's band diagonally (F402's eye).
    holdYawDeg: 0,
    holdPitchDeg: 20,
    /** ... and rolled in the screen plane (deg, + = anticlockwise): F402's slabs wrap diagonally, an eye. */
    holdRollDeg: -15,
    /** C / D at the portal (F402): tipped this far (deg) about the hold frame's X instead of face-on (ellipses). */
    portalTiltDeg: 20,
    /**
     * Ring A's in-plane phase in the hold. Off (0): whatever the slowed tumble gives, so the arrangement depends on the
     * press moment (quarters top / bottom at some, left / right at others). On (1): from the hold's start A is turned
     * about its axis (blended in with the pose) to the nearest of aPhaseDeg + k 90 deg, then drifts at aPhaseDrift
     * deg/s (it keeps moving).
     */
    aPhaseOn: 1,
    aPhaseDeg: 22,
    aPhaseDrift: 6,
    /** Ring A's quarters pulled towards the orb in the hold (scale of their rest offset at full spread; 1 = none). */
    // (0.82 until QC round 9; 0.78 keeps the lifted, opened set inside the frame at every press moment.)
    holdCompact: 0.78,
    /** B's halves part this much further at the portal (F402: no band across the orb), back by F420 (Choreography portal). */
    bPortalSplit: 0.6,
  };
  private nBHold = N_B_HOLD.clone();
  private tunedTilt = B_TILT_DEG;
  private nAHold = new THREE.Vector3(0, 0, 1);
  private tunedATilt = 0;
  private tunedAAxis = 45;
  /** Hold frame rotation and the hold targets in it (recomputed every frame from the tune). */
  private qHold = new THREE.Quaternion();
  private nBHoldF = new THREE.Vector3();
  private nAHoldF = new THREE.Vector3();
  private zPortal = new THREE.Vector3();
  private hx = new THREE.Vector3();
  private hy = new THREE.Vector3();
  /** Ring A's latched hold phase (rad), the time the hold started, its unwrapped tumble phase and the last raw one. */
  private aPhiStar = 0;
  private aHoldT0 = 0;
  private aPhiAcc = 0;
  private aPhiPrev = 0;

  /**
   * "r11" (default): the rotating hold (the tumble slowed, A / B opened on top, C / D flipping forward); "r11a" (`?hold=r11a`):
   * the step-2 deterministic arrangement of HoldR11.ts; "r10" (`?hold=r10`): the round-10 hold below, unchanged.
   */
  holdMode: HoldMode = "r11";
  /** Idle tumble of rings C / D: "p2b" (default, IDLE_CD) or "r10" (`?idle=r10`: ringMocap.ts). Set by HeroEngine. */
  idleMode: IdleMode = "p2b";
  /** r11: the hold view frame, each ring's latched symmetry (which congruent piece takes which slot) and scratch. */
  private r11View = new THREE.Quaternion();
  private r11G = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
  private r11GInv = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
  private r11T = new THREE.Quaternion();
  private r11Q = new THREE.Quaternion();
  private r11V = new THREE.Vector3();

  /** Rotating hold (r11): the camera of this frame (set by HeroEngine; CameraRig updates it before the rings), for the guard. */
  camera: THREE.PerspectiveCamera | null = null;
  private vp = new THREE.Matrix4();
  private hasVP = false;
  /**
   * Rotating hold, rings C / D: the extra flip E = base * R(k, theta) on the ring's own frame (identity until the first hold),
   * its rate (deg/s), the latched diameter k (in the ring's plane) and the landing plan after a release. A landed flip is a
   * multiple of 180 deg about a diameter, a symmetry of a solid ring, and becomes the new base.
   */
  private cdE = [0, 1, 2, 3].map(() => new THREE.Quaternion());
  private cdBase = [0, 1, 2, 3].map(() => new THREE.Quaternion());
  private cdK = [0, 1, 2, 3].map(() => new THREE.Vector3(1, 0, 0));
  private cdTheta = [0, 0, 0, 0];
  private cdOmega = [0, 0, 0, 0];
  private cdLatched = [false, false, false, false];
  private cdUsed = [false, false, false, false];
  private cdPlan: ({ t: number; T: number; th0: number; w0: number; dlt: number } | null)[] = [null, null, null, null];
  /** Last frame's ring orientation without the flip (tumble * base), and whether it is valid, for the flip's floor. */
  private cdPrevPre = [0, 1, 2, 3].map(() => new THREE.Quaternion());
  private cdPrevOk = [false, false, false, false];
  /** The flip rate applied last frame (deg/s; the held rate raised by the floor), where a landing starts from. */
  private cdApplied = [0, 0, 0, 0];
  private cdView = new THREE.Quaternion();
  /** Debug / probes: rings C / D's flip (deg), its rate (deg/s) and the world axis it turns about. */
  readonly cdState = [0, 1, 2, 3].map(() => ({ theta: 0, omega: 0, axis: [0, 0, 0] as number[], landing: false }));

  /**
   * Rotating hold: the landing of a flip after the release, forward to the next multiple of 180 deg, as a cubic Hermite from
   * (theta, omega) to (target, 0). With T = 1.5 dlt / omega the rate is omega (1 - u^2): it only decelerates, from the
   * release on, with no jerk at the start. Targets nearer than HOLD_SPIN.cdLandNear wait for the next multiple (a softer
   * stop); a long way is capped at cdLandMax s (the rate then first rises a little, still never negative: omega T <= 3 dlt).
   */
  private planLanding(theta: number, omega: number) {
    const S = HOLD_SPIN;
    const step = 180;
    const below = Math.floor(theta / step) * step;
    let dlt = below + step - theta;
    let T: number;
    if (theta - below < S.cdBack && omega < 25) {
      // A flip that has barely started (a hold released early) settles back by those few degrees.
      dlt = below - theta;
      T = Math.min(2, Math.max(0.8, Math.abs(dlt) / 20));
    } else {
      while (dlt < S.cdLandNear) dlt += step;
      // (cdLandMin <= T: with dlt >= cdLandNear = 40 deg and omega <= ~80 deg/s, omega T <= 3 dlt still holds.)
      T = Math.max(S.cdLandMin, Math.min(S.cdLandMax, (1.5 * dlt) / Math.max(omega, 1e-3)));
      // Fix round 2: a fast flip (the floor's compensation can lift it past 100 deg/s) lands one symmetry further on, so the
      // Hermite rate omega (1 - u)(1 - 3u) + 6 dlt u (1 - u) / T never turns negative (omega T <= 3 dlt).
      if (!SPIN_S3) {
        while (omega * T > 3 * dlt + 1e-9) {
          dlt += step;
          T = Math.max(S.cdLandMin, Math.min(S.cdLandMax, (1.5 * dlt) / Math.max(omega, 1e-3)));
        }
      }
    }
    return { t: 0, T, th0: theta, w0: omega, dlt };
  }

  /** Rotating hold: advances ring i's (C / D) extra flip and applies it on q's own frame (q = tumble -> q * E). */
  private flipCD(i: number, q: THREE.Quaternion, dt: number, d: Drivers) {
    const S = HOLD_SPIN;
    const w = d.cdSpin;
    if (w > 0) {
      if (!this.cdLatched[i]) {
        // The flip continues the ring's own motion: k = the in-plane part of its current angular velocity in its own frame
        // (the turn about a diameter that it is making right now), so the rotation keeps its sense and only slows. A ring
        // that is momentarily still takes the diameter nearest the hold view axis (clockwise on screen).
        this.cdBase[i].copy(this.cdE[i]);
        this.cdTheta[i] = 0;
        const qb = this.qs.copy(q).multiply(this.cdBase[i]);
        const k = this.v.set(0, 0, 0);
        if (this.prevValid && dt > 1e-4) {
          // World angular velocity from last frame's orientation to this one (both with the same base), into the ring frame.
          const dq = this.qa.copy(qb).multiply(this.qb.copy(this.prevQ[i]).invert());
          if (dq.w < 0) dq.set(-dq.x, -dq.y, -dq.z, -dq.w);
          k.set(dq.x, dq.y, dq.z).applyQuaternion(this.qr.copy(qb).invert());
          k.z = 0;
          if (k.lengthSq() < (0.5 * DEG * dt) ** 2) k.set(0, 0, 0);
        }
        if (k.lengthSq() === 0) {
          holdViewFrame(this.cdView);
          k.set(0, 0, 1).applyQuaternion(this.cdView).applyQuaternion(this.qr.copy(qb).invert());
          k.z = 0;
          if (k.lengthSq() < 1e-6) k.set(1, 0, 0);
          k.negate();
        }
        this.cdK[i].copy(k.normalize());
        this.cdLatched[i] = true;
        this.cdUsed[i] = true;
      }
      this.cdPlan[i] = null;
      this.cdOmega[i] += (w * S.cdRate[i] - this.cdOmega[i]) * (1 - Math.exp(-dt * S.cdResp));
      // Floor: the slowed tumble underneath may turn against the flip for a while (C's own nod); the flip then speeds up so
      // the ring's total turn about the flip axis stays >= cdFloor of its rate (the compensation is capped at cdFloorCap).
      let rate = this.cdOmega[i];
      if (this.cdPrevOk[i] && dt > 1e-4) {
        const pre = this.qs.copy(q).multiply(this.cdBase[i]);
        const dq = this.qa.copy(pre).multiply(this.qb.copy(this.cdPrevPre[i]).invert());
        if (dq.w < 0) dq.set(-dq.x, -dq.y, -dq.z, -dq.w);
        const kw = this.v.copy(this.cdK[i]).applyQuaternion(pre);
        const m = (2 * (dq.x * kw.x + dq.y * kw.y + dq.z * kw.z)) / dt / DEG;
        const wf = SPIN_S3 ? w : Math.min(1, w * S.cdFloorRamp);
        rate = Math.max(rate, wf * S.cdFloor * S.cdRate[i] - Math.max(m, -S.cdFloorCap));
      }
      this.cdApplied[i] = rate;
      this.cdTheta[i] += rate * dt;
    } else if (this.cdLatched[i]) {
      const plan = (this.cdPlan[i] ??= this.planLanding(this.cdTheta[i], this.cdApplied[i]));
      plan.t = Math.min(plan.T, plan.t + dt);
      const u = plan.t / plan.T;
      const h10 = u * u * u - 2 * u * u + u;
      const h01 = -2 * u * u * u + 3 * u * u;
      this.cdTheta[i] = plan.th0 + plan.T * plan.w0 * h10 + plan.dlt * h01;
      this.cdOmega[i] = (plan.T * plan.w0 * (3 * u * u - 4 * u + 1) + plan.dlt * (6 * u - 6 * u * u)) / plan.T;
      this.cdApplied[i] = this.cdOmega[i];
      if (plan.t >= plan.T) {
        // Landed on a multiple of 180 deg: a symmetry of the ring, kept as the new base.
        this.cdBase[i].multiply(this.qa.setFromAxisAngle(this.cdK[i], (plan.th0 + plan.dlt) * DEG)).normalize();
        this.cdE[i].copy(this.cdBase[i]);
        this.cdTheta[i] = 0;
        this.cdOmega[i] = 0;
        this.cdLatched[i] = false;
        this.cdPlan[i] = null;
      }
    }
    if (this.cdLatched[i]) this.cdE[i].copy(this.cdBase[i]).multiply(this.qa.setFromAxisAngle(this.cdK[i], this.cdTheta[i] * DEG));
    // The tumble * base of this frame for next frame's floor (invalid for a frame when the base changes at a landing).
    this.cdPrevOk[i] = this.cdLatched[i] || !this.cdPlan[i];
    this.cdPrevPre[i].copy(q).multiply(this.cdBase[i]);
    const st = this.cdState[i];
    st.theta = this.cdTheta[i];
    st.omega = this.cdApplied[i];
    st.landing = !!this.cdPlan[i];
    const ax = this.v.copy(this.cdK[i]).applyQuaternion(this.qs.copy(q).multiply(this.cdBase[i]));
    st.axis[0] = ax.x;
    st.axis[1] = ax.y;
    st.axis[2] = ax.z;
    // Never touched (no hold yet): the idle stays bit-identical.
    if (this.cdUsed[i]) q.multiply(this.cdE[i]);
  }

  /**
   * Rotating hold: the push (m, <= want) of piece p along its radial (ring frame q) that keeps every hull point inside the frame
   * by HOLD_SPIN.guardMargin, solved exactly (a point's clip coordinates are linear in the push), through a C1 saturation.
   */
  private guardPush(p: Piece, q: THREE.Quaternion, want: number) {
    const hull = p.hull;
    if (!(want > 0) || !hull || !this.hasVP) return want;
    const e = this.vp.elements;
    const margin = HOLD_SPIN.guardMargin;
    const Ly = 1 - margin;
    const Lx = 1 - margin / Math.max(0.1, this.camera?.aspect ?? 1);
    const D = this.v3.copy(p.radial).applyQuaternion(q);
    const dx = e[0] * D.x + e[4] * D.y + e[8] * D.z;
    const dy = e[1] * D.x + e[5] * D.y + e[9] * D.z;
    const dw = e[3] * D.x + e[7] * D.y + e[11] * D.z;
    const root = this.root.position;
    const P = this.v4;
    let pMax = want * 1.25;
    for (let j = 0; j < hull.length; j += 3) {
      P.set(p.rest.x + hull[j], p.rest.y + hull[j + 1], p.rest.z + hull[j + 2]).applyQuaternion(q).add(root);
      const cx = e[0] * P.x + e[4] * P.y + e[8] * P.z + e[12];
      const cy = e[1] * P.x + e[5] * P.y + e[9] * P.z + e[13];
      const cw = e[3] * P.x + e[7] * P.y + e[11] * P.z + e[15];
      if (cw <= 1e-6) continue;
      pMax = Math.min(pMax, pushLimit(cx, dx, cw, dw, Lx), pushLimit(cy, dy, cw, dw, Ly));
      if (pMax <= 0) return 0;
    }
    return want * sat(pMax / want);
  }

  /**
   * Rotating hold (fix round 2): the share s (0..1) of a piece's offset `off` (ring frame q) that keeps every hull point inside
   * the frame by HOLD_SPIN.guardMargin, solved exactly as guardPush does for a radial push, through the same C1 saturation.
   */
  private guardScale(p: Piece, q: THREE.Quaternion, off: THREE.Vector3) {
    const hull = p.hull;
    if (!hull || !this.hasVP || !(off.lengthSq() > 1e-12)) return 1;
    const e = this.vp.elements;
    const margin = HOLD_SPIN.guardMargin;
    const Ly = 1 - margin;
    const Lx = 1 - margin / Math.max(0.1, this.camera?.aspect ?? 1);
    const D = this.v3.copy(off).applyQuaternion(q);
    const dx = e[0] * D.x + e[4] * D.y + e[8] * D.z;
    const dy = e[1] * D.x + e[5] * D.y + e[9] * D.z;
    const dw = e[3] * D.x + e[7] * D.y + e[11] * D.z;
    const root = this.root.position;
    const P = this.v4;
    let sMax = 1.25;
    for (let j = 0; j < hull.length; j += 3) {
      P.set(p.rest.x + hull[j], p.rest.y + hull[j + 1], p.rest.z + hull[j + 2]).applyQuaternion(q).add(root);
      const cx = e[0] * P.x + e[4] * P.y + e[8] * P.z + e[12];
      const cy = e[1] * P.x + e[5] * P.y + e[9] * P.z + e[13];
      const cw = e[3] * P.x + e[7] * P.y + e[11] * P.z + e[15];
      if (cw <= 1e-6) continue;
      sMax = Math.min(sMax, pushLimit(cx, dx, cw, dw, Lx), pushLimit(cy, dy, cw, dw, Ly));
      if (sMax <= 0) return 0;
    }
    return sat(sMax);
  }
  private offV = new THREE.Vector3();
  private spinQ = new THREE.Quaternion();
  /** Rotating hold: each piece's guard share last frame (-1: not opened) and its opening last frame. */
  private guardS: number[] = [];
  private openLast: number[] = [];

  /** Debug / probes: the last rotating-hold push of each piece (m) and what was asked for. */
  readonly pushState: { want: number; got: number }[] = [];

  /** P2b: each ring's frame-guard share last frame (-1: not opened) and its opening last frame (A, B). */
  private guardRingS = [-1, -1];
  private openRingLast = [0, 0];

  private openRCache = { push: NaN, r: 0 };
  /**
   * Steady hold (HOLD_SPIN.steady): the radius (m, about the ring centre) of the sphere that holds ring A with its quarters
   * pushed out `push` m along their radials: every vertex of every quarter plus the ice shader's largest outward displacement
   * (half its uDisplace amplitude). Ring A's pieces only move in its own plane and the ring turns about its centre, so its
   * silhouette stays inside this sphere's at any tumble phase and press moment (B / C / D lie inside A). Cached per push.
   */
  openRadiusA(push: number) {
    const c = this.openRCache;
    if (c.push === push) return c.r;
    let r2 = 0;
    let disp = 0;
    for (const p of this.pieces) {
      if (p.ring !== 0) continue;
      const pos = p.mesh.geometry.attributes.position;
      const ox = p.rest.x + p.radial.x * push;
      const oy = p.rest.y + p.radial.y * push;
      const oz = p.rest.z + p.radial.z * push;
      for (let i = 0; i < pos.count; i++) {
        const x = ox + pos.getX(i), y = oy + pos.getY(i), z = oz + pos.getZ(i);
        r2 = Math.max(r2, x * x + y * y + z * z);
      }
      const mat = (p.mesh.userData.iceMaterial ?? p.mesh.material) as THREE.ShaderMaterial;
      const u = mat.uniforms?.uDisplace;
      if (u) disp = Math.max(disp, 0.5 * Math.abs(u.value as number));
    }
    c.push = push;
    c.r = Math.sqrt(r2) + disp;
    return c.r;
  }

  /**
   * P2b rotating hold, piece offsets (the user, 15 Nov 19:20: the split rings must stay aligned, one ring turning as a unit): every
   * ring-A quarter and ring-B half keeps exactly its ring's rotation (pivot rotation identity: its world rotation IS the ring
   * group's) and moves only along its own radial in the ring's plane (A's quarters out along their bisectors, B's halves apart
   * across their cut), all pieces of a ring by the same amount. The frame guard scales the whole ring's opening by one share (the
   * smallest any piece needs), so a ring near the frame edge opens less as a whole and never tilts or slides one piece; it
   * tightens at once and lets the opening out again only through a smooth follower, never while the opening closes. Exactly the
   * rest pose when the opening is 0. The guard runs only under `?spin=p2b`: the default steady hold (HOLD_SPIN.steady) has
   * none, so the opening is the choreography's own, constant through the sustain, and the camera frames the opened ring.
   */
  private poseRigid(d: Drivers, dt: number) {
    const S = HOLD_SPIN;
    for (let ring = 0; ring < 2; ring++) {
      const open = Math.max(0, ring === 0 ? d.spreadA : d.splitB);
      const push = (ring === 0 ? S.pushA : S.pushB) * open;
      const q = this.groups[ring].quaternion;
      if (!(push > 0)) {
        for (let k = 0; k < this.pieces.length; k++) {
          const p = this.pieces[k];
          if (p.ring !== ring) continue;
          p.pivot.position.copy(p.rest);
          p.pivot.quaternion.identity();
          this.pushState[k] = { want: 0, got: 0 };
          this.guardS[k] = -1;
        }
        this.guardRingS[ring] = -1;
        this.openRingLast[ring] = open;
        continue;
      }
      const closing = open < this.openRingLast[ring] - 1e-7;
      const follow = (now: number, last: number) =>
        last >= 0 && now > last ? (closing ? last : Math.min(now, last + (now - last) * (1 - Math.exp(-dt * S.guardRelax)))) : now;
      let sRing = 1;
      if (S.steady) {
        // Steady hold (default): no frame guard; the opening is the choreography's own, constant through the sustain (the
        // camera frames the opened ring instead, CameraRig.frameShare).
        this.guardRingS[ring] = -1;
      } else if (S.guardRing) {
        let sNow = 1;
        for (const p of this.pieces) if (p.ring === ring) sNow = Math.min(sNow, this.guardScale(p, q, this.offV.copy(p.radial).multiplyScalar(push)));
        sRing = follow(sNow, this.guardRingS[ring]);
        this.guardRingS[ring] = sRing;
      }
      for (let k = 0; k < this.pieces.length; k++) {
        const p = this.pieces[k];
        if (p.ring !== ring) continue;
        let s = sRing;
        if (!S.guardRing && !S.steady) {
          // (Runtime option: a share per piece, as `?spin=f2`.)
          s = follow(this.guardScale(p, q, this.offV.copy(p.radial).multiplyScalar(push)), this.guardS[k] ?? -1);
          this.guardS[k] = s;
        }
        p.pivot.position.copy(p.radial).multiplyScalar(push * s).add(p.rest);
        p.pivot.quaternion.identity();
        this.pushState[k] = { want: push, got: push * s };
      }
      this.openRingLast[ring] = open;
    }
  }

  /**
   * Rotating hold, piece offsets: ring A's quarters move out along their radials (more when the push points sideways on
   * screen, where the frame is wide) and ring B's halves apart along theirs, both in the ring's own frame, so they keep turning
   * with the ring; exactly the rest pose when the opening is 0.
   */
  private poseSpin(p: Piece, d: Drivers, k: number, dt: number) {
    const ring = DEFS[p.ring].id;
    if (ring !== "A" && ring !== "B") return;
    const open = ring === "A" ? d.spreadA : d.splitB;
    if (!(open > 0)) {
      p.pivot.position.copy(p.rest);
      p.pivot.quaternion.identity();
      this.pushState[k] = { want: 0, got: 0 };
      this.guardS[k] = -1;
      return;
    }
    const q = this.groups[p.ring].quaternion;
    const S = HOLD_SPIN;
    if (!SPIN_S3) {
      // Fix round 2: one offset vector in the ring's own frame (so it turns with the ring): A's radial push plus the flex
      // along A's axis, B's radial split; the frame guard scales the whole vector. No rotation is added to any piece.
      const off = this.offV;
      if (ring === "A") {
        let side = 0;
        let flex = 0;
        if (this.camera) {
          const D = this.v3.copy(p.radial).applyQuaternion(q).transformDirection(this.camera.matrixWorldInverse);
          // Share of the push along the frame's long side: x on landscape (exactly step 3's D.x^2), y on portrait.
          const wx = smoothstep(0.8, 1.2, this.camera.aspect);
          side = wx * D.x * D.x + (1 - wx) * D.y * D.y;
          if (S.flexA > 0) {
            // View direction in the ring frame (ring centre -> camera); the quarter's radial u is in the ring plane.
            const vr = this.v4.setFromMatrixPosition(this.camera.matrixWorld).sub(this.root.position).normalize();
            vr.applyQuaternion(this.spinQ.copy(q).invert());
            flex = -S.flexA * (p.radial.x * vr.x + p.radial.y * vr.y) * vr.z;
          }
        }
        off.copy(p.radial).multiplyScalar(S.pushA + S.pushASide * side);
        off.z += flex;
      } else off.copy(p.radial).multiplyScalar(S.pushB);
      off.multiplyScalar(open);
      const len = off.length();
      // The guard's share never exceeds what the frame allows (sNow). It tightens at once, but it lets a piece out again
      // only through a smooth follower, and never while the opening closes: at a release the camera pulls back and the
      // frame suddenly allows more, which made a guarded quarter fly out and back (a 3 m/s jolt 0.17 s after the release).
      const sNow = this.guardScale(p, q, off);
      const last = this.guardS[k] ?? -1;
      let s = sNow;
      if (last >= 0 && sNow > last) {
        const closing = open < (this.openLast[k] ?? open) - 1e-7;
        s = closing ? last : Math.min(sNow, last + (sNow - last) * (1 - Math.exp(-dt * S.guardRelax)));
      }
      this.guardS[k] = s;
      this.openLast[k] = open;
      this.pushState[k] = { want: len, got: len * s };
      p.pivot.position.copy(off).multiplyScalar(s).add(p.rest);
      p.pivot.quaternion.identity();
      return;
    }
    let want: number;
    if (ring === "A") {
      // Sideways share of the push direction in view space (the frame is ~1.9x wider than tall).
      let side = 0;
      if (this.camera) {
        const D = this.v3.copy(p.radial).applyQuaternion(q).transformDirection(this.camera.matrixWorldInverse);
        side = D.x * D.x;
      }
      want = open * (S.pushA + S.pushASide * side);
    } else want = open * S.pushB;
    const got = this.guardPush(p, q, want);
    this.pushState[k] = { want, got };
    p.pivot.position.copy(p.radial).multiplyScalar(got).add(p.rest);
    p.pivot.quaternion.identity();
  }

  /**
   * r11: picks the symmetry g of ring i (a rotation of its local frame that maps the ring onto itself) for which
   * canonical * g is nearest to the ring's current orientation q, so the press moment never changes the arrangement on
   * screen, only which congruent piece goes where. A: 4 quarter turns x flip; B: 2 half turns x flip; C / D: any turn
   * about the axis x flip.
   */
  private latchSymmetry(i: number, q: THREE.Quaternion, canonical: THREE.Quaternion) {
    const g = this.r11G[i];
    const m = this.r11Q.copy(canonical).invert().multiply(q); // q = canonical * m: the symmetry nearest to m
    if (i >= 2) {
      // Twist of m about z, or of Rx(pi)^-1 m (flipped), whichever is nearer.
      let best = -1;
      for (const flip of [false, true]) {
        const f = this.qr.identity();
        if (flip) f.setFromAxisAngle(X, Math.PI);
        const r = this.qs.copy(f).invert().multiply(m);
        const len = Math.hypot(r.w, r.z) || 1;
        const tw = this.qt.set(0, 0, r.z / len, r.w / len);
        const cand = this.qa.copy(f).multiply(tw);
        const dot = Math.abs(cand.dot(m));
        if (dot > best) {
          best = dot;
          g.copy(cand);
        }
      }
    } else {
      const steps = i === 0 ? 4 : 2;
      let best = -1;
      for (const flip of [false, true]) {
        for (let k = 0; k < steps; k++) {
          const cand = this.qa.setFromAxisAngle(Z, (k * 2 * Math.PI) / steps);
          if (flip) cand.premultiply(this.qb.setFromAxisAngle(X, Math.PI));
          const dot = Math.abs(cand.dot(m));
          if (dot > best) {
            best = dot;
            g.copy(cand);
          }
        }
      }
    }
    this.r11GInv[i].copy(g).invert();
    if (i === 0) {
      // Slots (0 top, 1 left, 2 bottom, 3 right) from where g puts each quarter in the canonical frame.
      for (const p of this.pieces) {
        if (p.ring !== 0) continue;
        const v = this.r11V.copy(p.radial).applyQuaternion(g);
        const a = Math.atan2(v.y, v.x);
        p.slot = (((Math.round(a / (Math.PI / 2)) - 1) % 4) + 4) % 4;
      }
    }
  }

  /**
   * r11 piece pose. Ring A: the canonical slot transform (slide about the ring axis, radial push, tilt about the arc
   * tangent), conjugated by the latched symmetry so it lands on whichever quarter holds that slot; exactly the rest pose
   * when the hold is out. Ring B: the halves part along their own radial, in B's plane (the GLB split): across the view in
   * the hold, so the lid never reads as two bands.
   */
  private poseR11(p: Piece, d: Drivers, time: number) {
    const H = d.hold;
    if (p.ring === 0) {
      const s = p.slot;
      const key = (["T", "L", "B", "R"] as const)[s];
      const th = (Math.PI / 2) * (s + 1);
      const sig = H[`sig${key}`] * DEG, push = H[`push${key}`], tilt = H[`tilt${key}`] * DEG;
      const roll = H[`roll${key}`] * DEG, spin = H[`spin${key}`] * DEG, hng = H[`hng${key}`] * DEG;
      if (!sig && !push && !tilt && !roll && !spin && !hng) {
        // Out of the hold: exactly the rest pose (no float noise from the slot math; uJoined holds, idle is bit-identical).
        p.pivot.position.copy(p.rest);
        p.pivot.quaternion.identity();
        return;
      }
      const g = this.r11G[0], gi = this.r11GInv[0];
      const rLen = p.rest.length();
      // Canonical position and orientation of slot s.
      const slide = this.qt.setFromAxisAngle(Z, sig);
      const pos = this.v.set(Math.cos(th), Math.sin(th), 0).multiplyScalar(rLen + push).applyQuaternion(slide);
      const tan = this.v2.set(-Math.sin(th), Math.cos(th), 0);
      const rad = this.v3.set(Math.cos(th), Math.sin(th), 0);
      // Rotation about the piece's own centre: spin (ring axis), then roll (radial), then tilt (tangent), all in the slot's
      // canonical frame before the slide carries it along the ring.
      const qs = this.qs
        .copy(slide)
        .multiply(this.qa.setFromAxisAngle(Z, spin))
        .multiply(this.qb.setFromAxisAngle(rad, roll))
        .multiply(this.qr.setFromAxisAngle(tan, tilt));
      if (hng) {
        // Hinge: a rigid turn about the line through the counter-clockwise cap (centre line, mid section) that lies in the
        // screen plane of the hold view (HOLD_TUNE.hingeAxisDeg from vertical, clockwise), so that cap stays put and the
        // clockwise end swings towards (+) or away from the camera: the arc is foreshortened with that cut face turned to
        // the camera. Canonical slot frame = hold view * roll * turn (targetA), so the view axis is mapped back through them.
        const c = this.r11V.set(Math.cos(th + Math.PI / 4), Math.sin(th + Math.PI / 4), 0).multiplyScalar(A_CENTRE_R).addScaledVector(rad, -rLen);
        const cap = c.applyQuaternion(qs).add(pos);
        const ha = HOLD_TUNE.hingeAxisDeg[s] * DEG;
        const qv = this.qa.setFromAxisAngle(Z, H.rollA * DEG).multiply(this.qb.setFromAxisAngle(A_TURN_AXIS, (H.phi - 120) * DEG)).invert();
        const ax = this.v4.set(Math.sin(ha), Math.cos(ha), 0).applyQuaternion(qv);
        const qh = this.qt.setFromAxisAngle(ax, -hng);
        pos.sub(cap).applyQuaternion(qh).add(cap);
        qs.premultiply(qh);
      }
      p.pivot.position.copy(pos).applyQuaternion(gi);
      p.pivot.quaternion.copy(gi).multiply(qs).multiply(g);
    } else if (p.half !== 0) {
      // The halves slide past each other along the cut line (canonical x: the far half right, the near half left), so the
      // lid never parts: F358's bar grows longer, F416-F448's lid sits left of the orb with the far half's end showing as
      // the seam block at its right (A2 R6). Expressed through the latched symmetry so either physical half can be "far".
      const far = this.r11V.copy(p.radial).applyQuaternion(this.r11G[1]).y > 0;
      const dx = d.splitB * H.splitB * (far ? 0.47 : -0.57);
      p.pivot.position.copy(this.v.set(dx, 0, 0).applyQuaternion(this.r11GInv[1])).add(p.rest);
      this.qb.setFromAxisAngle(p.wobbleAxis, d.splay * 0.3 * Math.sin(time * 1.3 + p.rand * 6.28));
      p.pivot.quaternion.copy(this.qb);
    }
  }

  /** Poses every ring; returns how face-on the set is (mean |axis.z|^4, 1 = the eye). */
  update(dt: number, time: number, d: Drivers): number {
    if (this.tune.bTiltDeg !== this.tunedTilt) {
      this.tunedTilt = this.tune.bTiltDeg;
      this.nBHold.set(0, 0, 1).applyQuaternion(this.qa.setFromAxisAngle(X, this.tunedTilt * DEG));
    }
    if (this.tune.aHoldTiltDeg !== this.tunedATilt || this.tune.aHoldAxisDeg !== this.tunedAAxis) {
      this.tunedATilt = this.tune.aHoldTiltDeg;
      this.tunedAAxis = this.tune.aHoldAxisDeg;
      const ax = this.tunedAAxis * DEG;
      this.nAHold.set(0, 0, 1).applyQuaternion(this.qa.setFromAxisAngle(this.v.set(Math.cos(ax), Math.sin(ax), 0), this.tunedATilt * DEG));
    }
    // The hold frame (T16): all hold targets turned together, so the set keeps its arrangement but is seen at an angle.
    const tnh = this.tune;
    this.qHold
      .setFromAxisAngle(Z, tnh.holdRollDeg * DEG)
      .multiply(this.qb.setFromAxisAngle(Y, tnh.holdYawDeg * DEG))
      .multiply(this.qb.setFromAxisAngle(X, tnh.holdPitchDeg * DEG));
    const N_B = this.nBHoldF.copy(this.nBHold).applyQuaternion(this.qHold);
    const N_A = this.nAHoldF.copy(this.nAHold).applyQuaternion(this.qHold);
    const Z_PORTAL = this.zPortal.set(0, 0, 1).applyQuaternion(this.qa.setFromAxisAngle(X, tnh.portalTiltDeg * DEG)).applyQuaternion(this.qHold);
    // The hold plane's in-plane axes (ring A's phase is measured against them).
    const HX = this.hx.set(1, 0, 0).applyQuaternion(this.qHold);
    const HY = this.hy.set(0, 1, 0).applyQuaternion(this.qHold);
    // Hold modes: r11 the rotating hold (default), r11a the step-2 arrangement (`?hold=r11a`), r10 (`?hold=r10`).
    const r11 = this.holdMode === "r11a";
    const spinHold = this.holdMode === "r11";
    const r10 = this.holdMode === "r10";
    const H = d.hold;
    // r11a: the tumble clock stops while the hold owns the rings (it resumes in the release's hand-over), so the release
    // returns the rings to the pose they left at the charge's eye. r11 / r10: the clock runs at d.spin (slowed in a hold).
    this.tau += r11 ? dt * d.spin * (1 - H.freeze) : dt * d.spin;
    if (r11) holdViewFrame(this.r11View);
    this.hasVP = false;
    if (spinHold && this.camera) {
      this.vp.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
      this.hasVP = true;
    }
    const phase = (this.tau - EYE_TIME) * OMEGA;
    let alignment = 0;

    DEFS.forEach((def, i) => {
      const q = this.q.identity();
      const keys = RING_MOCAP[def.id];
      const cdIdle = this.idleMode === "p2b" && i >= 2;
      if (cdIdle) {
        // P2b: rings C / D's measured constant-rate flip (IDLE_CD), on the same tumble clock as A / B (so a hold slows it too).
        const c = IDLE_CD[i - 2];
        q.copy(IDLE_CD_Q0[i - 2]).multiply(this.qa.setFromAxisAngle(X, c.rate * DEG * this.tau));
      } else if (keys && keys.length > 1) {
        // The tumble motion-captured from the Default Loop (4 s, seamless): dense keys, slerped.
        const period = (keys.length - 1) * RING_MOCAP_STEP;
        const tl = ((this.tau % period) + period) % period;
        const kf = tl / RING_MOCAP_STEP;
        const k0 = Math.min(Math.floor(kf), keys.length - 2);
        q.fromArray(keys[k0]).slerp(this.qb.fromArray(keys[k0 + 1]), kf - k0);
        if (i === 0) {
          // Ring A's in-plane phase (its quarter joints): a turn about its own axis, measured from the reference's joints.
          const ap = this.tune.aLoopPhaseDeg + this.tune.aLoopPhaseRate * tl;
          if (ap) q.multiply(this.qa.setFromAxisAngle(Z, ap * DEG));
        }
      } else {
        // Fallback: the hand-tuned chain, applied first to last (q = R_n ... R_2 R_1).
        for (const [axis, rate] of def.tumble) q.premultiply(this.qa.setFromAxisAngle(axis, rate * phase));
      }
      // (P2b: no loop tip for C / D; the tips were corrections of the mocap's C / D poses at t 0.5, QC rounds 5-8.)
      const tipDeg = cdIdle ? 0 : this.tune.loopTipDeg[i];
      if (tipDeg) {
        // Distance to loopTipAt on the 4 s loop (wrapping), as a share of the bump's half-width.
        const t4 = ((this.tau % 4) + 4) % 4;
        let dx = Math.abs(t4 - this.tune.loopTipAt[i]);
        dx = Math.min(dx, 4 - dx) / Math.max(this.tune.loopTipWidth, 1e-3);
        if (dx < 1) q.premultiply(this.qa.setFromAxisAngle(X, tipDeg * DEG * (0.5 + 0.5 * Math.cos(Math.PI * dx))));
      }
      // Rotating hold (`?spin=f2` / s3): rings C / D flip forward on top of their slowed tumble (the r10 mocap only nods at rest).
      // P2b: no extra flip; C / D keep their own rotation, slowed by the clock like A / B.
      if (spinHold && i >= 2 && !SPIN_P2B) this.flipCD(i, q, dt, d);
      if (d.open > 0) {
        this.qa.setFromAxisAngle(X, def.open[0] * d.open).multiply(this.qb.setFromAxisAngle(Y, def.open[1] * d.open));
        q.multiply(this.qa);
      }
      // The sides are chosen only between alignments / holds, then kept until they end.
      const alignW = def.id === "A" ? Math.max(d.align, d.alignA) : Math.max(d.align, d.alignInner);
      const axisNow = this.v.copy(Z).applyQuaternion(q);
      if (alignW < 0.01 && d.faceInner < 0.01 && d.portal < 0.01) this.faceSign[i] = axisNow.z >= 0 ? 1 : -1;
      const holdAxis = def.id === "A" ? N_A : N_B;
      if (d.expandPose < 0.01) this.holdSign[i] = axisNow.dot(holdAxis) >= 0 ? 1 : -1;
      const popAxis = POP_AXIS[i];
      if (popAxis && d.popPose < 0.01) this.popSign[i] = axisNow.dot(popAxis) >= 0 ? 1 : -1;
      if (alignW > 0) {
        // C / D take their residual tilt late in the release (bandInner): F453 face-on, F460 C a band across the
        // orb. Only the alignInner share of the alignment is affected, so a hold's frontal pass never jumps.
        const inner = def.id === "C" || def.id === "D";
        const relW = d.alignInner / Math.max(alignW, 1e-4);
        const share = inner ? 1 + (d.bandInner - 1) * relW : 1;
        if (def.id === "D" && relW > 0 && this.tune.dRelSnapDeg > 0) {
          // D tipped like a whirlpool in the reassembly (QC round 6: its 12-22 deg residual left a flat bullseye at F453 /
          // F460, the reference's inner ring is a tilted ellipse): snap -> home with bandInner, blended in by relW.
          this.qDSnap.setFromAxisAngle(this.v3.set(1, 0.35, 0).normalize(), this.tune.dRelSnapDeg * DEG);
          this.qDHome.setFromAxisAngle(X, this.tune.dRelHomeDeg * DEG);
          this.qDRel.copy(this.qDSnap).slerp(this.qDHome, smoothstep(0.57, 1.0, d.bandInner));
          this.qDRel.copy(this.qr.copy(Q_RES[i]).slerp(this.qDRel, Math.min(1, relW)));
          q.slerp(this.faceOn(q, this.qt, i, 1, this.qDRel), alignW);
        } else {
          q.slerp(this.faceOn(q, this.qt, i, share), alignW);
        }
      }
      if (d.flatten > 0) q.slerp(Q_FLAT, d.flatten);
      if (r11) {
        // The deterministic hold (HoldR11.ts): canonical target * latched symmetry, blended in by the hold weight.
        const w = i === 0 ? H.wA : H.wI;
        const T = this.r11T;
        if (i === 0) targetA(this.r11View, H, T);
        else if (i === 1) targetB(this.r11View, H, T);
        else targetCD(this.r11View, i === 2 ? H.psiC : H.psiD, T);
        if (w <= 0) {
          // Latched while the hold is out: A against its release pose (face-on, quarters at 12 / 3 / 6 / 9) so the
          // hand-back to the tumble is the shortest turn; B against its pop bar; C / D against face-on.
          const canon = this.qLim;
          if (i === 0) canon.copy(this.r11View);
          else if (i === 1) targetBPop(this.r11View, canon);
          else canon.copy(this.r11View);
          this.latchSymmetry(i, q, canon);
        } else {
          q.slerp(T.multiply(this.r11G[i]), Math.min(1, w));
        }
      }
      // Ring B's cut-across side is latched whenever the hold pose is (nearly) out.
      if (r10 && def.id === "B" && d.expandPose < 0.01) this.spinCutAcross(q, i, true, 0);
      if (r10 && d.expandPose > 0) {
        // Hold (F357-F442, slow motion): every ring keeps tumbling slowly underneath; its axis is only
        // drawn towards the hold pose. A turns face-on (its quarters drift out and keep revolving), B
        // lies nearly flat (its halves split into two stacked bands), and the inner rings C / D lean
        // into B's plane but keep moving, then turn face-on late in the hold (F436-F444).
        if (def.id === "A") {
          // The hold's own tilt (aHoldTiltDeg) gives way to face-on as the release's gap takes over (F453 face-on).
          const wE = d.expandPose;
          const wG = Math.min(1, d.gapA * 3);
          const tgtA = this.v4.copy(Z).lerp(N_A, wE / Math.max(wE, wG, 1e-4)).normalize();
          this.toward(q, tgtA, this.holdSign[i], Math.max(wE, wG) * 0.95);
          // A deterministic in-plane phase (T16): the arrangement at F402 / F420 no longer depends on the press moment.
          // The tumble's own phase is unwrapped frame to frame and the correction saturates softly at +-60 deg, so a
          // long hold never wraps it (no jump), it just follows the slow tumble at a fixed offset from then on.
          if (tnh.aPhaseOn) {
            const ref = this.v3.set(1, 0, 0).applyQuaternion(q);
            const phi = Math.atan2(ref.dot(HY), ref.dot(HX));
            if (wE < 0.01) {
              const base = tnh.aPhaseDeg * DEG;
              const quarter = Math.PI / 2;
              this.aPhiStar = base + quarter * Math.round((phi - base) / quarter);
              this.aHoldT0 = time;
              this.aPhiAcc = phi;
            } else {
              const dphi = phi - this.aPhiPrev;
              this.aPhiAcc += Math.atan2(Math.sin(dphi), Math.cos(dphi));
            }
            this.aPhiPrev = phi;
            const raw = this.aPhiStar + tnh.aPhaseDrift * DEG * (time - this.aHoldT0) - this.aPhiAcc;
            const lim = 60 * DEG;
            const corr = lim * Math.tanh(raw / lim);
            const n = this.v2.copy(Z).applyQuaternion(q);
            q.premultiply(this.qa.setFromAxisAngle(n, corr * Math.min(1, wE)));
          }
        }
        else if (def.id === "B") {
          // (0.9 let B's ratio wander 0.3-0.55 with its tumble; F420 holds ~0.42.)
          this.toward(q, N_B, this.holdSign[i], d.expandPose * 0.97);
          // Its halves become two stacked bands, near and far (F404-F428): B turns about its own axis so
          // the cut runs across the view (a left / right cut read as a broken, stepped ring).
          this.spinCutAcross(q, i, d.expandPose < 0.01, d.expandPose * 0.9);
        }
        else {
          // Lie into B's bowl (0.6 left C standing upright inside B); 15 % of the tumble still shows (they keep
          // moving: the client's rule).
          this.toward(q, N_B, this.holdSign[i], d.expandPose * 0.85);
          // F402: for a moment they frame the orb face-on, a portal, then lie back into the bowl (Choreography).
          if (d.portal > 0) this.toward(q, Z_PORTAL, this.faceSign[i], 0.85 * d.portal);
          if (d.faceInner > 0) {
            // Release: face-on, blending into the residual tilt as the inner rings align (C becomes the
            // near-edge-on band across the orb, F453) instead of flattening into a tunnel; no jump.
            const tgt = this.v3.copy(Z).applyQuaternion(Q_RES[i]).lerp(Z, 1 - d.alignInner * d.bandInner).normalize();
            this.toward(q, tgt, this.faceSign[i], d.faceInner * 0.85);
          }
        }
      }
      // The pop: for a moment the slabs snap into an X (then ease into the hold pose).
      if (r10 && popAxis && d.popPose > 0) this.toward(q, popAxis, this.popSign[i], POP_WEIGHT[i] * d.popPose);
      // Safety net: no ring turns faster than MAX_TURN. Frozen / paused frames (dt 0 or long) snap.
      if (this.prevValid && dt > 1e-4 && dt < 0.25) {
        const ang = this.prevQ[i].angleTo(q);
        const maxStep = MAX_TURN * dt;
        if (ang > maxStep) q.copy(this.qLim.copy(this.prevQ[i]).slerp(q, maxStep / ang));
      }
      this.prevQ[i].copy(q);
      this.groups[i].quaternion.copy(q);
      // Hold: the B / C / D bowl rises a little (world up; the root is not rotated).
      this.groups[i].position.y = def.id === "A" ? 0 : this.tune.bowlLift * d.expandPose;
      const nz = this.v.copy(Z).applyQuaternion(q).z;
      alignment += (nz * nz * nz * nz) / DEFS.length;
    });
    this.prevValid = true;

    // Hold slots: which quarter takes which place is decided from where each sits on screen once ring A has
    // turned face-on, just before the quarters start to move, and kept for the whole hold.
    if (r10 && d.spreadA < 0.005 && d.tiltA < 0.005) this.latchSlots();

    if (spinHold && SPIN_P2B) this.poseRigid(d, dt);
    for (let k = 0; k < this.pieces.length; k++) {
      const p = this.pieces[k];
      const group = this.groups[p.ring];
      if (r11) {
        this.poseR11(p, d, time);
        continue;
      }
      if (spinHold) {
        if (!SPIN_P2B) this.poseSpin(p, d, k, dt);
        continue;
      }
      if (DEFS[p.ring].id === "A") {
        // Quarters (F404-F428): each drifts out by its own amount, slides a little along the ring (uneven
        // gaps), steps in front of or behind the ring plane, and tilts about its arc to show its deep face,
        // so they read as chunky slabs. Everything follows the slow tumble of the ring underneath.
        const s = p.slot >= 0 ? p.slot : 0;
        const k = d.tiltA;
        // Drift by the quarter's CURRENT screen angle, every frame (QC round 4): F420's quarters sit ~300 / 287 /
        // 250 / 230 px from the orb at the top / right / bottom / left, i.e. ~0 m out at the top and right and
        // ~-0.35 m (tucked in) at the bottom and left. Offsets latched per slot at the hold's start turned with the
        // slow tumble, so a long hold carried a far-out quarter down past the frame's bottom edge.
        const wr = this.v3.copy(p.radial).applyQuaternion(group.quaternion);
        const th = Math.atan2(wr.y, wr.x);
        const tn = this.tune;
        const outHold = tn.aOutBase + tn.aOutAmp * Math.cos(th - tn.aOutPhaseDeg * DEG) + tn.aOutH * Math.cos(th) ** 2 + 0.06 * (p.rand - 0.5);
        // Lower-half quarters tilt at most 25 deg (deep tilts swung their ends down into the frame bottom); continuous
        // across the horizon.
        const lower = 1 - smoothstep(-0.3, 0.3, wr.y / Math.max(Math.hypot(wr.x, wr.y), 1e-6));
        const slotTilt = tn.aSlotTilt[s] * DEG;
        const tiltCap = lerp(Math.abs(slotTilt), Math.min(Math.abs(slotTilt), tn.aLowerTiltCap * DEG), lower);
        // The pop throws the quarters at the ends of the edge-on band out sideways (F357-F363), unevenly: the left one
        // further out and lower, the right one tucked up behind the band's end (F358; symmetric boxes, QC round 6).
        const popX = d.popPose > 0 ? this.v.copy(p.radial).applyQuaternion(group.quaternion).x : 0;
        const chunkK = d.popPose > 0 ? d.popPose * smoothstep(0.55, 0.8, Math.abs(popX)) : 0;
        const chunk = chunkK * (popX < 0 ? 0.52 : 0.32);
        const out = d.splay * lerp(0.75, 1.0, p.rand) + d.spreadA * outHold * (1 - 0.45 * d.relaxA) + d.gapA * 0.24 + chunk;
        const slide = this.qt.setFromAxisAngle(Z, tn.aSlotSlide[s] * DEG * k);
        // The held set pulls in towards the orb (holdCompact): F420's swirl spans y 45-680, ours ran past both frame edges.
        p.pivot.position.copy(p.rest).multiplyScalar(lerp(1, tn.holdCompact, d.spreadA)).addScaledVector(p.radial, out).applyQuaternion(slide);
        p.pivot.position.z += tn.aSlotAxial[s] * k;
        // In the hold the quarter set rides a little above the orb (world up, whatever the ring pose), the quarters in the
        // lower half more (round 6: the lower arc reached the frame's bottom edge; F420's lowest ice sits at y ~680).
        if (d.spreadA > 0) {
          this.qInv.copy(group.quaternion).invert();
          const liftY = (this.tune.aLift + this.tune.aLowerLift * lower) * d.spreadA * (1 - 0.4 * d.relaxA);
          p.pivot.position.add(this.v.set(0, liftY, 0).applyQuaternion(this.qInv));
        }
        if (chunkK > 0) {
          this.qInv.copy(group.quaternion).invert();
          p.pivot.position.add(this.v.set(0, chunkK * (popX < 0 ? -0.22 : 0.22), 0).applyQuaternion(this.qInv));
        }
        const r2 = hash1(p.rand * 17.3 + 0.5) * 2 - 1;
        // The tilt waits until the quarter has cleared ring B (no arc cuts through it). Slots that barely move
        // out (left / bottom) tilt with the spread itself, or they stayed thin face-on hoops (QC round 3).
        const tilt = Math.sign(slotTilt) * tiltCap * k * smoothstep(0.15, 0.35, Math.max(out, 0.3 * d.spreadA)) + d.splay * 0.55 * (p.rand * 2 - 1);
        const roll = d.spreadA * tn.aRoll * r2;
        this.qa.setFromAxisAngle(p.tangent, tilt).multiply(this.qb.setFromAxisAngle(p.radial, roll));
        this.qb.setFromAxisAngle(p.wobbleAxis, d.splay * 0.45 * Math.sin(time * 1.7 + p.rand * 6.28));
        // In-plane spin by the quarter's CURRENT screen angle (the quarters revolve with A's slow tumble): the ones at the
        // sides lean (wider, broken circle), the ones passing the top or bottom stay level (a spun top arc lifted an end
        // past the frame's top edge at some press moments, probe_holdbounds).
        this.qs.setFromAxisAngle(Z, (tn.aSlotSpin[s] + tn.aSpinAmp * Math.cos(th)) * DEG * k);
        p.pivot.quaternion.copy(slide).multiply(this.qs).multiply(this.qa).multiply(this.qb);
      } else if (p.half !== 0) {
        // Halves split along world Y, whatever the ring orientation (GLB: +0.47 / -0.57 m). The half that is
        // higher when the split starts goes up (never up through the other half).
        if (d.splitB < 0.005) p.splitSign = this.v.copy(p.rest).applyQuaternion(group.quaternion).y >= 0 ? 1 : -1;
        const held = (1 - (1 - this.tune.bSplitHeld) * d.expandPose) * (1 + this.tune.bPortalSplit * d.portal);
        const dy = d.splitB * held * (p.splitSign > 0 ? 0.47 : -0.57);
        this.qInv.copy(group.quaternion).invert();
        this.v.set(0, dy, 0).applyQuaternion(this.qInv);
        p.pivot.position.copy(p.rest).add(this.v);
        this.qb.setFromAxisAngle(p.wobbleAxis, d.splay * 0.3 * Math.sin(time * 1.3 + p.rand * 6.28));
        p.pivot.quaternion.copy(this.qb);
      }
    }

    // P4 R4-G7 (lane p4h4, `?seamrel=0` / `?p4h4=0` off; the default steady hold only, where every piece of ring A / B moves
    // by its ring's push along its own radial): a joint counts as joined while its gap (ring A's quarter ends part by sqrt 2 x
    // push, B's halves by 2 x push; both pieces of a joint together) is below the middle of HOLD_SPIN.seamGap: the joint seam
    // stays on as at rest (it went at 1.5 cm of a piece's own motion, a 2.1 cm gap, two frames before the close), the P4 ice's
    // cut-cap path (`?p4ice=1`, uPieceCuts.w < 0.999) waits for a ~1.6 cm gap, and the end caps stay out of the thickness pass
    // (uJoined: only where the ring back-depth pass runs, `?ice=r10`). At rest and in the idle loop nothing changes (gap 0).
    const seamRel = P4_SEAMREL && spinHold && SPIN_P2B;
    const [sg0, sg1] = HOLD_SPIN.seamGap;
    // A piece at its rest place keeps its end caps out of the thickness pass (no seam at the joints, IceMaterial).
    for (const p of this.pieces) {
      const back = p.mesh.userData.backMaterial as THREE.ShaderMaterial | undefined;
      if (!back?.uniforms.uJoined) continue;
      const q = p.pivot.quaternion;
      const atRest = p.pivot.position.distanceToSquared(p.rest) < 1e-6 && Math.abs(q.w) > 0.99999;
      if (seamRel && p.ring <= 1) {
        const gap = (p.ring === 0 ? Math.SQRT2 : 2) * p.pivot.position.distanceTo(p.rest);
        back.uniforms.uJoined.value = atRest || gap < 0.5 * (sg0 + sg1) ? 1 : 0;
      } else back.uniforms.uJoined.value = atRest ? 1 : 0;
    }
    // Round 11: the joint seams fade out as soon as a piece leaves its rest place (IceMaterial uPieceCuts.w).
    for (const p of this.pieces) {
      const cuts = (p.mesh.userData.iceMaterial as THREE.ShaderMaterial).uniforms.uPieceCuts;
      if (!cuts) continue;
      const moved = p.pivot.position.distanceTo(p.rest) + 2 * (1 - Math.min(1, Math.abs(p.pivot.quaternion.w)));
      if (seamRel && p.ring <= 1) {
        // (P4 R4-G7: from the joint gap; the seam (on while w > 0.5) and uJoined above switch in the same frame.)
        cuts.value.w = moved < 1e-9 ? 1 : 1 - smoothstep(sg0, sg1, (p.ring === 0 ? Math.SQRT2 : 2) * moved);
      } else cuts.value.w = 1 - smoothstep(1e-4, 0.03, moved);
    }
    const fracture = Math.max(d.splay, d.spreadA);
    for (let i = 0; i < this.materials.length; i++) {
      const m = this.materials[i];
      m.uniforms.uEnergy.value = d.energy;
      const ring = this.pieces[i]?.ring ?? 0;
      m.uniforms.uFracture.value = ring <= 1 ? fracture : 0;
    }
    return alignment;
  }

  /** While rendering from the mirrored camera, refract the panorama instead of the screen. */
  setReflectionPass(on: boolean) {
    for (const m of this.materials) m.uniforms.uReflectionPass.value = on ? 1 : 0;
  }

  /**
   * Near half of the ice-behind-ice split (RenderPipeline): a strict depth test rejects the far half already
   * in the depth buffer (same program, so bit-identical depths) without a discard, which keeps early-z.
   */
  setNearPass(on: boolean) {
    for (const m of this.materials) m.depthFunc = on ? THREE.LessDepth : THREE.LessEqualDepth;
  }

  /** Swaps every ring to the back-face depth material (thickness pass) and back. */
  setBackPass(on: boolean) {
    for (const p of this.pieces) {
      p.mesh.material = (on ? p.mesh.userData.backMaterial : p.mesh.userData.iceMaterial) as THREE.ShaderMaterial;
    }
  }
}
