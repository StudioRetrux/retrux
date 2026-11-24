import * as THREE from "three";
import { HERO_CENTER, RING_NAMES } from "../config";
import type { Drivers } from "../Choreography";
import { hash1, lerp, smoothstep } from "../math";
import type { SharedUniforms } from "../uniforms";
import { createBackDepthMaterial, createIceMaterial, iceSilhouette, type IceQuality } from "./IceMaterial";
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
/** Share of ring B's world-Y split kept once the hold pose is in (the pop opens it fully first). */
// F404-F428 hold the GLB split (+0.47 / -0.57 m): two stacked near-edge-on bands with the orb behind them. (0.55 with
// the raised half left to chance read as a coil with the orb exposed, QC round 2; 0.3 as an open bowl, round 4.)
// (1.0 until QC round 8, T09: the halves parted ~1 m, each lip a thin ribbon with the core between them; 0.35 with the hold
// frame's pitch and the orb's luminous rim reads as F402's concentric portal / F420's lips. Frame bounds unchanged:
// probe_holdbounds worst top 24, bottom 704.)
const B_SPLIT_HELD = 0.35;

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
    this.tau += dt * d.spin;
    const phase = (this.tau - EYE_TIME) * OMEGA;
    let alignment = 0;

    DEFS.forEach((def, i) => {
      const q = this.q.identity();
      const keys = RING_MOCAP[def.id];
      if (keys && keys.length > 1) {
        // The tumble motion-captured from the Default Loop (4 s, seamless): dense keys, slerped.
        const period = (keys.length - 1) * RING_MOCAP_STEP;
        const tl = ((this.tau % period) + period) % period;
        const kf = tl / RING_MOCAP_STEP;
        const k0 = Math.min(Math.floor(kf), keys.length - 2);
        q.fromArray(keys[k0]).slerp(this.qb.fromArray(keys[k0 + 1]), kf - k0);
      } else {
        // Fallback: the hand-tuned chain, applied first to last (q = R_n ... R_2 R_1).
        for (const [axis, rate] of def.tumble) q.premultiply(this.qa.setFromAxisAngle(axis, rate * phase));
      }
      const tipDeg = this.tune.loopTipDeg[i];
      if (tipDeg) {
        // Distance to loopTipAt on the 4 s loop (wrapping), as a share of the bump's half-width.
        const t4 = ((this.tau % 4) + 4) % 4;
        let dx = Math.abs(t4 - this.tune.loopTipAt[i]);
        dx = Math.min(dx, 4 - dx) / Math.max(this.tune.loopTipWidth, 1e-3);
        if (dx < 1) q.premultiply(this.qa.setFromAxisAngle(X, tipDeg * DEG * (0.5 + 0.5 * Math.cos(Math.PI * dx))));
      }
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
      // Ring B's cut-across side is latched whenever the hold pose is (nearly) out.
      if (def.id === "B" && d.expandPose < 0.01) this.spinCutAcross(q, i, true, 0);
      if (d.expandPose > 0) {
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
      if (popAxis && d.popPose > 0) this.toward(q, popAxis, this.popSign[i], POP_WEIGHT[i] * d.popPose);
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
    if (d.spreadA < 0.005 && d.tiltA < 0.005) this.latchSlots();

    for (const p of this.pieces) {
      const group = this.groups[p.ring];
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

    // A piece at its rest place keeps its end caps out of the thickness pass (no seam at the joints, IceMaterial).
    for (const p of this.pieces) {
      const back = p.mesh.userData.backMaterial as THREE.ShaderMaterial | undefined;
      if (!back?.uniforms.uJoined) continue;
      const q = p.pivot.quaternion;
      const atRest = p.pivot.position.distanceToSquared(p.rest) < 1e-6 && Math.abs(q.w) > 0.99999;
      back.uniforms.uJoined.value = atRest ? 1 : 0;
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
