import * as THREE from "three";
import { HERO_CENTER, REF_ASPECT, REST_CAMERA } from "./config";
import { CAM_TARGETS } from "./curves";
import type { Drivers } from "./Choreography";
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

    r = lerp(r, T.expand.r, d.camExpand);
    el = lerp(el, T.expand.el, d.camExpand);
    // A pure rotation on top of the hold projector's pose (no parallax): the hold framed the background ~20 px too high
    // (QC round 7, T09: right iceberg peak 440 vs F420's 460).
    pitch = lerp(pitch, T.expand.pitch + HOLD_PITCH_TRIM, d.camExpand);

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
    this.apply(this.r.update(dt), this.az.update(dt), this.el.update(dt), this.pitch.update(dt), time);
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
