import * as THREE from "three";
import { HERO_CENTER, REF_ASPECT, REST_CAMERA } from "./config";
import { CAM_TARGETS } from "./curves";
import type { Drivers } from "./Choreography";
import { HOLD_SPIN, HOLD_TUNE, P4_HOLDCAM, type HoldMode } from "./hero/HoldR11";
import { lerp, Spring } from "./math";
import type { PlateCoverage } from "./world/PlateEnvironment";

/**
 * Spherical camera rig around the orb (radius, azimuth from +Z towards +X,
 * elevation), then an absolute pitch so the orb lands where it does in the
 * reference. Targets (rest, tilt, collapse, expand) are blended by the
 * choreography drivers; a final critically damped spring removes any kink.
 */

const DEG = Math.PI / 180;
/**
 * The pointer's vertical response (Choreography orbitEl, +-1.2 deg) is a pan, a pitch about the camera itself,
 * which has no parallax (EL_TRAVEL of it as real rise / drop: none since QC round 6). As a full orbit the eye moved
 * +-0.43 m and every silhouette baked into the plate doubled: ghost ridges on the icebergs, stacked floes, torn
 * foreground rocks (QC round 5, cursor orbit). The azimuth orbit stays a real orbit (its extremes have their own
 * plates). The brief: "panning at the edges".
 */
// (0.2 until QC round 6: even +-8.6 cm of eye travel gave the 5-8 m rocks 20-30 px of parallax at the frame bottom, with
// no projector above or below rest: shredded rock bases and a doubled floe waterline with the pointer low or high.)
const EL_TRAVEL = 0;
/** Pitch (deg) per degree of orbitEl: about +-0.9 deg of pan, so the hero moves about as far on screen as before. */
const EL_PAN = 0.75;
/** Extra pitch (deg, up) at full hold; the hold plate's 0.20 top overscan leaves ~4.8 deg above the frame. */
const HOLD_PITCH_TRIM = 0.75;
/**
 * Steady hold framing: the camera's own rotations in a settled hold that the frame margin must absorb (deg). Vertical: the pointer
 * pan (Choreography orbitEl <= 1.2 deg x EL_PAN x the hold's 0.2 orbit share) plus the handheld drift's pitch (0.06 + 0.04);
 * horizontal: the drift's yaw (0.09 + 0.05). The azimuth orbit turns the camera about the orb, which stays centred.
 */
const HOLD_SLACK_V = 1.2 * EL_PAN * 0.2 + 0.1;
const HOLD_SLACK_H = 0.14;

export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(25.5, REF_ASPECT, 0.05, 2000);
  private orb = new THREE.Vector3().fromArray(HERO_CENTER);
  private r = new Spring(CAM_TARGETS.rest.r, 14, 1);
  private az = new Spring(CAM_TARGETS.rest.az, 14, 1);
  private el = new Spring(CAM_TARGETS.rest.el, 14, 1);
  private pitch = new Spring(CAM_TARGETS.rest.pitch, 14, 1);
  private tmpQ = new THREE.Quaternion();
  private tmpE = new THREE.Euler(0, 0, 0, "YXZ");
  private xAxis = new THREE.Vector3(1, 0, 0);
  private coverage: PlateCoverage | null = null;
  private aspect = REF_ASPECT;
  reducedMotion = false;
  /**
   * r11 (default): the hold dolly follows the measured EXPAND_CAM / RELEASE_CAM (the choreography driver, itself blended at
   * every phase change) instead of the omega-14 springs, which lagged the lunge by ~0.3 s (live F358: 37 % of the dolly where
   * the reference shows ~78 %). The full-hold pose is unchanged (the hold plates stay registered). "r10" (`?hold=r10`): the
   * springs, as before.
   */
  holdMode: HoldMode = "r11";
  /**
   * Rotating hold (r11, fix round 2): the share of the hold dolly the camera takes on this screen. 1 on landscape screens
   * (exactly the step-3 dolly); on narrow portrait screens the dolly stops where ring A (HOLD_SPIN.fitR) still fits the
   * frame's width with the guard margin (390x844: the full dolly cut the outer ring by ~92-100 px on both sides). The
   * camera then stays on the rest -> hold path, so the projected plates stay registered. HeroEngine scales the hero's lift
   * by the same share.
   */
  holdFit = 1;
  /**
   * The share of the hold dolly the camera (and HeroEngine's hero lift) takes: holdFit, and in the steady hold (HOLD_SPIN.steady,
   * the default) at most frameShare(), where the opened ring A fits the frame at any tumble phase. A function of the screen shape
   * only, so it is one constant through every hold (no breathing); the lunge keeps its measured timing and only ends earlier on
   * the same rest -> hold path. The environment's hold look (uHold, the fog bank) still follows holdFit.
   */
  holdShare = 1;
  /** Steady hold: radius (m) of the sphere about the ring centre that holds the opened ring A (Rings.openRadiusA; HeroEngine). */
  holdRadius = 0;
  private tanV = 0;

  constructor() {
    this.setAspect(REF_ASPECT);
    this.apply(CAM_TARGETS.rest.r, CAM_TARGETS.rest.az, CAM_TARGETS.rest.el, CAM_TARGETS.rest.pitch, 0);
  }

  /** Vertical extent of the plate (in tan units of the rest frame), so framing never leaves it. */
  setCoverage(c: PlateCoverage) {
    this.coverage = c;
    this.setAspect(this.aspect);
  }

  /** Keeps the reference horizontal framing; on narrow screens crops the sides instead. */
  setAspect(aspect: number) {
    this.aspect = aspect;
    const tanH0 = Math.tan((REST_CAMERA.hfovDeg * DEG) / 2);
    const tanV0 = tanH0 / REF_ASPECT;
    const maxTanV = this.coverage ? tanV0 * Math.min(this.coverage.top, this.coverage.bottom) * 0.97 : tanV0 * 1.04;
    const tanV = Math.min(tanH0 / aspect, maxTanV);
    this.camera.fov = (2 * Math.atan(tanV)) / DEG;
    this.tanV = tanV;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    // How far the vertical pan may go before the frame's top / bottom edge leaves the plate (with a margin): on a
    // portrait screen the frame already spans ~97 % of the plate's height, so the pan shrinks to almost nothing there.
    const half = Math.atan(tanV);
    this.panUp = this.coverage ? Math.max(0, (Math.atan(tanV0 * this.coverage.top) - half) / DEG) * 0.85 : 0.8;
    this.panDown = this.coverage ? Math.max(0, (Math.atan(tanV0 * this.coverage.bottom) - half) / DEG) * 0.85 : 0.8;
  }
  private panUp = 0.8;
  private panDown = 0.8;

  /**
   * camExpand at which the pointer orbit has shrunk to its hold share (0 = linear over the whole dolly). The press first
   * swings the camera onto the hold axis, then dollies in along it; the release pulls straight back and only swings out
   * to the pointer over the last stretch. Interpolating the orbit linearly with the dolly put the camera 1.3 m off the
   * line between the projectors halfway (release with the pointer at an edge: x -1.07 / +1.49 at 2 m in front of the
   * orbit plates), where nothing had seen the water behind the near rocks and floes: torn, smeared slabs at the bottom
   * of the frame (QC round 6).
   */
  holdOrbitEnd = 0.35;
  /**
   * The pointer orbit's gain around a hold: down to the hold's 20 % as soon as the dolly starts (fast), back to 1 only
   * once the release has brought the camera home (slow, ~1.5 s), so the release flies straight back along the hold axis
   * between the tilt / rest projectors instead of swinging out mid-flight (QC round 6, T03).
   */
  private orbitGain = new Spring(1, 8, 1);

  update(dt: number, time: number, d: Drivers, intro: number) {
    const T = CAM_TARGETS;
    let r = T.rest.r;
    // 20 % of the pointer orbit in the hold: the arcs stay inside the frame at any pointer position, and the camera
    // stays within ~0.2 m of the hold projector (QC round 4).
    const e = this.holdOrbitEnd;
    const s = e > 0 ? Math.min(1, d.camExpand / e) : d.camExpand;
    const g = this.orbitGain;
    g.target = d.camExpand > 1e-3 ? 0.2 : 1;
    g.omega = g.target < g.value ? 8 : 2.5;
    const holdK = Math.min(1 - 0.8 * (e > 0 ? s * s * (3 - 2 * s) : s), e > 0 ? g.update(dt) : 1);
    let az = T.rest.az + d.orbitAz * holdK;
    let el = T.rest.el + d.orbitEl * EL_TRAVEL * holdK;
    // Positive pitch looks up: the pointer high, the view pans up (the frame's content moves down, as the rise did).
    let pitch = T.rest.pitch + Math.min(this.panUp, Math.max(-this.panDown, d.orbitEl * EL_PAN * holdK));

    r = lerp(r, T.tilt.r, d.tilt);
    el = lerp(el, T.tilt.el, d.tilt);
    pitch = lerp(pitch, T.tilt.pitch, d.tilt);

    r = lerp(r, T.collapse.r, d.camCollapse);
    el = lerp(el, T.collapse.el, d.camCollapse);
    pitch = lerp(pitch, T.collapse.pitch, d.camCollapse);

    // r11 (rotating hold) and r11a (step-2 arrangement) share the measured dolly; r10 keeps the springs.
    const r11 = this.holdMode !== "r10";
    if (!r11) {
      r = lerp(r, T.expand.r, d.camExpand);
      el = lerp(el, T.expand.el, d.camExpand);
      // A pure rotation on top of the hold projector's pose (no parallax): the hold framed the background ~20 px too high
      // (QC round 7, T09: right iceberg peak 440 vs F420's 460).
      pitch = lerp(pitch, T.expand.pitch + HOLD_PITCH_TRIM, d.camExpand);
    }

    // Intro: rise from low and close to the rest pose.
    const k = 1 - intro;
    r = lerp(r, T.intro.r, k);
    el = lerp(el, T.intro.el, k);
    pitch = lerp(pitch, T.intro.pitch, k);
    az = lerp(az, T.rest.az, k);

    this.r.target = r;
    this.az.target = az;
    this.el.target = el;
    this.pitch.target = pitch;
    if (r11) {
      // The hold dolly on top of the sprung idle / pointer camera, exactly on the measured curve (any smoothing lags the
      // lunge: omega 60 still left the live pop at 70 % of the dolly where the reference shows ~78 %).
      this.holdFit = this.holdMode === "r11" ? this.fitShare() : 1;
      this.holdShare = this.holdMode === "r11" && HOLD_SPIN.steady ? Math.min(this.holdFit, this.frameShare()) : this.holdFit;
      const k = d.camExpand * this.holdShare;
      const rr = lerp(this.r.update(dt), T.expand.r, k);
      let ee = lerp(this.el.update(dt), T.expand.el, k);
      // P4 Q12 (`?holdcam=r11` / `?p4hold=0` off): the pitch takes the full hold share (a rotation, no parallax), so the background
      // sits where the reference's does (the steady share 0.853 at 1440x766 left it at 4.51 deg of 5.30: ~23 px high), and the
      // camera drops by the same angle on its orbit (el), so pitch + el, the orb's angle in the frame, is unchanged: the orb stays at
      // (720, 392) and the camera sits ~0.19 m lower (y ~2.17; A2 8.1 measured the reference's ~0.95 m below the orb, y ~2.10).
      const kp = P4_HOLDCAM ? d.camExpand * this.holdFit : k;
      const pp = lerp(this.pitch.update(dt), T.expand.pitch + HOLD_PITCH_TRIM, kp);
      if (kp !== k) ee -= (kp - k) * (T.expand.pitch + HOLD_PITCH_TRIM - T.rest.pitch);
      this.apply(rr, this.az.update(dt), ee, pp, time);
      return;
    }
    this.apply(this.r.update(dt), this.az.update(dt), this.el.update(dt), this.pitch.update(dt), time);
  }

  /** Share of the hold dolly at which a ring of radius HOLD_SPIN.fitR spans the frame's width less the guard margin (<= 1). */
  private fitShare() {
    const R = HOLD_SPIN.fitR;
    if (!(R > 0)) return 1;
    const a = this.aspect;
    const tanH = this.tanV * a * (1 - HOLD_SPIN.guardMargin / Math.max(0.1, a));
    const need = R / Math.max(tanH, 1e-3);
    const r0 = CAM_TARGETS.rest.r;
    const r1 = CAM_TARGETS.expand.r;
    if (need <= r1) return 1;
    return Math.max(0, Math.min(1, (r0 - need) / (r0 - r1)));
  }

  private frameKey = "";
  private frameK = 1;
  /**
   * Steady hold: the largest share of the hold dolly (0..1) at which the sphere of radius holdRadius about the lifted ring centre
   * projects HOLD_SPIN.frameMargin inside the frame, plus room for the hold's pointer pan and handheld drift (HOLD_SLACK_*). The
   * sphere's extents are exact (tangent cones, perspective included) for the settled hold pose of that share: the camera on the
   * rest -> hold path (r, el, pitch lerped as in update) looking at the orb, the hero lifted by HOLD_TUNE.holdLift x share.
   * Depends only on the screen shape and constants: computed once per change, by bisection (the extents grow with the share).
   */
  frameShare() {
    const R = this.holdRadius;
    if (!(R > 0)) return 1;
    const m = HOLD_SPIN.frameMargin;
    const T = CAM_TARGETS;
    const key = `${this.aspect}|${this.tanV}|${R}|${m}|${HOLD_TUNE.holdLift}|${T.rest.r}|${T.rest.el}|${T.rest.pitch}|${T.expand.r}|${T.expand.el}|${T.expand.pitch}${P4_HOLDCAM ? `|${this.holdFit}` : ""}`;
    if (key === this.frameKey) return this.frameK;
    let k = 1;
    if (!this.frameFits(1, R, m)) {
      let lo = 0;
      let hi = 1;
      if (!this.frameFits(0, R, m)) hi = 0;
      for (let i = 0; i < 40 && hi > lo; i++) {
        const mid = 0.5 * (lo + hi);
        if (this.frameFits(mid, R, m)) lo = mid;
        else hi = mid;
      }
      k = lo;
    }
    this.frameKey = key;
    this.frameK = k;
    return k;
  }

  /** Steady hold: whether the sphere (radius R about the lifted ring centre) fits the frame at dolly share k (see frameShare). */
  private frameFits(k: number, R: number, m: number) {
    const T = CAM_TARGETS;
    const r = lerp(T.rest.r, T.expand.r, k);
    const el = lerp(T.rest.el, T.expand.el, k) * DEG;
    const dp = lerp(T.rest.pitch, T.expand.pitch + HOLD_PITCH_TRIM, k) * DEG + el;
    const lift = HOLD_TUNE.holdLift * k;
    // (P4 Q12: as in update, the camera sits lower on its orbit by the pitch it takes beyond k at the full hold (camExpand 1); dp,
    // the rotation from the look-at frame, is the same.)
    const elc = P4_HOLDCAM && this.holdFit > k ? el - (this.holdFit - k) * (T.expand.pitch + HOLD_PITCH_TRIM - T.rest.pitch) * DEG : el;
    // The lifted centre in the look-at frame (looking at the orb from below / above by el, world up kept), then the camera's
    // pitch dp about its own x axis.
    const y0 = lift * Math.cos(elc);
    const z0 = -(r - lift * Math.sin(elc));
    const y = y0 * Math.cos(dp) + z0 * Math.sin(dp);
    const z = -y0 * Math.sin(dp) + z0 * Math.cos(dp);
    if (!(z < 0)) return false;
    const rho = Math.hypot(y, z);
    if (R >= Math.min(rho, -z)) return false;
    const thc = Math.atan2(y, -z);
    const a = Math.asin(R / rho);
    const sv = HOLD_SLACK_V * DEG;
    const lim = (1 - m) * this.tanV;
    if (thc + a + sv >= Math.PI / 2 || Math.tan(thc + a + sv) > lim || Math.tan(thc - a - sv) < -lim) return false;
    // Horizontally the centre is on the view axis (x = 0): half-angle asin(R / -z), the same pixel margin.
    const ax = Math.asin(R / -z) + HOLD_SLACK_H * DEG;
    return ax < Math.PI / 2 && Math.tan(ax) <= this.tanV * (this.aspect - m);
  }

  private apply(r: number, azDeg: number, elDeg: number, pitchDeg: number, time: number) {
    const az = azDeg * DEG;
    const el = elDeg * DEG;
    const cam = this.camera;
    cam.position.set(
      this.orb.x + r * Math.cos(el) * Math.sin(az),
      this.orb.y + r * Math.sin(el),
      this.orb.z + r * Math.cos(el) * Math.cos(az),
    );
    cam.up.set(0, 1, 0);
    cam.lookAt(this.orb);
    // lookAt pitch is -el (looking up at the orb when the camera is below it).
    const dp = pitchDeg * DEG + el;
    this.tmpQ.setFromAxisAngle(this.xAxis, dp);
    cam.quaternion.multiply(this.tmpQ);
    if (!this.reducedMotion) {
      // Handheld drift, rotation only (a tenth of a degree).
      this.tmpE.set(
        (Math.sin(time * 0.07 + 1.0) * 0.06 + Math.sin(time * 0.031) * 0.04) * DEG,
        (Math.sin(time * 0.11) * 0.09 + Math.sin(time * 0.043 + 2.0) * 0.05) * DEG,
        0,
      );
      this.tmpQ.setFromEuler(this.tmpE);
      cam.quaternion.multiply(this.tmpQ);
    }
    cam.updateMatrixWorld(true);
  }

  /** Distance from the camera to the orb (focus distance for the DOF blur). */
  get focusDistance() {
    return this.camera.position.distanceTo(this.orb);
  }
}
