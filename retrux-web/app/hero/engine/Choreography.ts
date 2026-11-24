import * as THREE from "three";
import { HERO_CENTER } from "./config";
import {
  COLLAPSE_CAM,
  COLLAPSE_RETURN,
  COLLAPSE_SPLIT,
  EXPAND_CAM,
  EXPAND_POP,
  RELEASE_CAM,
  RELEASE_RETURN,
} from "./curves";
import { clamp, damp, lerp, sampleCurve, sampleKeys, smoothstep, Spring } from "./math";
import type { HeroState } from "./types";
import {
  copyHoldParams,
  createHoldParams,
  expandCamR11,
  HOLD_KEYS,
  HOLD_SPIN,
  holdParams,
  releaseParams,
  RELEASE_FROM_TP,
  releaseCamR11,
  spinOpenAt,
  spinRateAt,
  P2B_F2,
  P4_DEBUGHOLD_UI,
  SPIN_S3,
  zeroHoldParams,
  type HoldMode,
  type HoldParams,
} from "./hero/HoldR11";

/**
 * Interaction state machine, reconstructed from the reference video:
 *   idle      pointer orbit, gentle "stillness" alignment on dwell, hover push-in (tilt) that grows as
 *             the pointer nears the orb
 *   press     a press shorter than HOLD_ARM is a click, and a click does nothing; past HOLD_ARM it
 *             becomes a hold
 *   expand    the hold timeline (video F331-F442): charge, pop at 0.88 s, slow-motion sustain while held
 *   release   0.8 s return
 * Outputs plain numbers ("drivers") consumed by the camera and the rings. Every phase change blends
 * from the drivers' current values, so no interaction can make the rings or the camera jump.
 * (The "collapse" phase is the old click reaction; it is kept only for debug poses.)
 */

export type Phase = "idle" | "press" | "collapse" | "expand" | "release";

export type Drivers = {
  /** Orbit offsets around the orb, degrees. */
  orbitAz: number;
  orbitEl: number;
  /** 0..1 hover push-in. */
  tilt: number;
  /** 0..1 progress towards the collapse / expand camera targets. */
  camCollapse: number;
  camExpand: number;
  /** 0..1 every ring face-on and concentric. */
  align: number;
  /** Collapse sub-phases (0..1). */
  open: number;
  flatten: number;
  splay: number;
  /** 0..1 ring-B halves apart. */
  splitB: number;
  /** Hold: ring-A quarters out (0..1) and their late relax (0..1). */
  spreadA: number;
  relaxA: number;
  /** Hold: ring-A quarters' individual tilts, offsets and uneven gaps (F404-F428), 0..1. */
  tiltA: number;
  /** Hold pop (F357-F363): an X of edge-on slabs, the end quarters thrown sideways, 0..1. */
  popPose: number;
  /** Release (F443-F462): ring A and the inner rings align at different times; A keeps a gap. */
  alignA: number;
  alignInner: number;
  gapA: number;
  /** Hold: rings move to their sustain orientations / C and D face-on. */
  expandPose: number;
  faceInner: number;
  /** Hold (F399-F417): C and D turn face-on around the orb for a moment, a portal (F402), then back into the bowl. */
  portal: number;
  /** Share of the inner rings' residual tilt when they align (1; the release brings it in late: F453 face-on, F460 band). */
  bandInner: number;
  /**
   * 0..1 the hold fog bank: follows the dolly in and lingers ~2 s after a release (F453 / F460 keep it). Deterministic (a
   * release timestamp, not a per-frame decay), so a debug release pose shows the fog it really has at that moment.
   */
  fogHold: number;
  /** Tumble time scale. */
  spin: number;
  /** 0..1 visual excitement for shaders / audio. */
  energy: number;
  /** Round 11 hold pose (HoldR11.ts, `?hold=r11a`); all zero in idle and in the other modes. */
  hold: HoldParams;
  /** Rotating hold (r11): 0..1 weight of rings C / D's extra flip (Rings integrates and lands it); 0 at rest and in r10 / r11a. */
  cdSpin: number;
};

/** A press shorter than this is a click (no reaction); the hold timeline starts here. */
const HOLD_ARM = 0.25;
const COLLAPSE_LEN = 2.5;
const RELEASE_LEN = 0.8;
/**
 * r11: ring A's hand-back to the tumble (alignA's fall, the r11 hold weight and the tumble-clock freeze) runs 0.55-1.0 s
 * instead of 0.55-0.85 s, and the release lasts until those fades have ended. (At 0.8 s the idle phase cut the last ~10 %
 * of the hand-back into one frame: a 15 deg step, the turn limit; and the 0.3 s hand-back reached 15 deg / frame at some
 * press moments.)
 */
const RELEASE_LEN_R11 = 1.05;
const R11_HANDBACK_END = 1.0;
/**
 * r11: the dolly keeps its momentum for this long after a release (s): the release curve starts at rest, so a release during
 * the lunge would otherwise stop the camera dead in one frame. The offset v0 t (1 - t / T)^2 matches the camera's speed at the
 * release and is gone after T (a release from a settled hold moves < 1 px).
 */
const R11_CAM_KICK_T = 0.2;
/** Seconds over which a phase change blends from the drivers' previous values. */
const PHASE_BLEND = 0.35;
const DWELL_SPEED = 40; // px/s
const RING_A_RADIUS = 2.401;
/** Drivers that the phase blend carries over (the orbit, tilt and spin have their own smoothing). */
const BLENDED = [
  "camCollapse", "camExpand", "align", "open", "flatten", "splay", "splitB", "spreadA", "relaxA", "tiltA",
  "popPose", "alignA", "alignInner", "gapA", "expandPose", "faceInner", "portal", "bandInner",
] as const;

/** Smooth bump: 0 before a, ramps to 1 by b, holds to c, back to 0 by d. */
function bump(t: number, a: number, b: number, c: number, d: number) {
  return smoothstep(a, b, t) * (1 - smoothstep(c, d, t));
}

export class Choreography {
  readonly drivers: Drivers = {
    orbitAz: 0, orbitEl: 0, tilt: 0, camCollapse: 0, camExpand: 0, align: 0, open: 0, flatten: 0, splay: 0,
    splitB: 0, spreadA: 0, relaxA: 0, tiltA: 0, popPose: 0, alignA: 0, alignInner: 0, gapA: 0,
    expandPose: 0, faceInner: 0, portal: 0, bandInner: 1, fogHold: 0, spin: 1, energy: 0, hold: createHoldParams(), cdSpin: 0,
  };
  /**
   * "r11" (default: the rotating hold), "r11a" (`?hold=r11a`: the step-2 arrangement) or "r10" (`?hold=r10`: the round-10 hold,
   * unchanged). Set by HeroEngine before the first update.
   */
  holdMode: HoldMode = "r11";
  /** r11: the hold pose when the pointer went up (the release starts from it) and the phase-change blend source. */
  private holdRel = createHoldParams();
  private holdFrom: HoldParams | null = null;
  private holdNow = createHoldParams();
  /** r11: camExpand's last value and speed (per s), the release's momentum term, and whether a phase change blends it. */
  private camPrev = 0;
  private camVel = 0;
  /**
   * r11 (fix round 2): the opening's velocity, kept like the camera's at a re-press (openKick over openKickT s, C1 at both
   * ends); without it the closing opening stopped dead when a re-press became a hold (A's quarters: up to 4 m/s -> 0 in one
   * frame, 239 m/s^2). openBlend false skips the phase blend for the opening there (it already starts where it is).
   */
  private openPrev = 0;
  private openVel = 0;
  private openKick = 0;
  private openKickT = 0;
  private openBlend = true;
  /**
   * r11 (fix round 2): the time the values a re-pressed hold starts from belong to (the previous frame; the switch happens
   * inside update), so the momentum terms advance by v dt in the switch frame instead of repeating last frame's value (a
   * one-frame stop of the camera and the opening at every re-press; step 3 had it too). lastDt: this update's dt.
   */
  private kickAnchor = 0;
  private lastDt = 0;
  private camKick = 0;
  private camBlend = true;
  /**
   * r11 (rotating hold): a press during the release, still inside the click window. The release keeps running (a click does
   * nothing, so it must not cut the release short); once the press lasts HOLD_ARM it becomes a hold that starts from the
   * current clock rate, opening and camera (spinFrom / openFrom / camFrom), with the camera's momentum (camKick).
   */
  private rePress = false;
  private spinFrom = 1;
  private openFrom = 0;
  private camFrom = 0;
  /**
   * Rings fix round 2 (P2B_F2, rotating hold): the hover push-in when the hold started. It hands over to the hold dolly (the push-in
   * shrinks with the dolly's remaining share) instead of springing back when the press becomes a hold.
   */
  private tiltHand = 0;
  phase: Phase = "idle";
  private phaseT = 0;
  private now = 0;
  private pressAt = 0;
  /** The current press has lasted HOLD_ARM: it is a hold, not a click. */
  private armed = false;
  private releaseFrom = { splitB: 0, cam: 0, spreadA: 0, relaxA: 0, tiltA: 0, expandPose: 0, faceInner: 0, spin: 1 };
  /** The last release (time, dolly progress then): the fog bank lingers from it (drivers.fogHold). */
  private fogFrom = { at: -1e9, from: 0 };
  /** Driver values when the phase last changed; the new phase blends from them over PHASE_BLEND. */
  private blendFrom: Record<(typeof BLENDED)[number], number> | null = null;
  private blendT = 0;

  private orbitAz = new Spring(0, 16, 1);
  private orbitEl = new Spring(0, 16, 1);
  private tilt = new Spring(0, 4.5, 1);
  private fill = new Spring(0, 18, 1);
  private dwell = 0;
  private speed = 0;
  private lastMove = { x: 0, y: 0, t: 0 };
  private hoverDist = 99;

  private orb = new THREE.Vector3().fromArray(HERO_CENTER);
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();
  private disposers: (() => void)[] = [];
  /** Fired when a press becomes a hold (true) and when that hold ends (false). Clicks never fire it. */
  onHoldChange: ((holding: boolean) => void) | null = null;
  reducedMotion = false;
  /** Debug: hold a phase at a fixed timeline position (null = live). */
  private debug: { phase: Phase; t: number } | null = null;
  /** Debug: a pointer pinned at normalized (nx, ny), treated as moving (no dwell recentre). */
  private debugPointer: { nx: number; ny: number } | null = null;

  /** Debug / validation: show `phase` exactly `t` seconds into its timeline (null resumes). */
  debugPose(phase: Phase | null, t = 0) {
    this.debug = phase ? { phase, t } : null;
    this.rePress = false;
    this.spinFrom = 1;
    this.openFrom = 0;
    this.camFrom = 0;
    this.openKick = 0;
    if (!phase) this.toIdle();
    this.blendFrom = null;
    this.holdFrom = null;
  }

  /** Debug / validation: pin the pointer at normalized coordinates (null releases it). */
  debugPointerAt(nx: number | null, ny = 0) {
    this.debugPointer = nx === null ? null : { nx, ny };
    if (nx === null) return;
    const r = this.el.getBoundingClientRect();
    const p = this.state.pointer;
    p.nx = nx;
    p.ny = ny;
    p.x = r.left + ((nx + 1) / 2) * r.width;
    p.y = r.top + ((1 - ny) / 2) * r.height;
    p.active = true;
    p.type = "mouse";
  }

  constructor(
    private el: HTMLElement,
    private state: HeroState,
    private getCamera: () => THREE.Camera,
  ) {
    const on = <K extends keyof WindowEventMap>(t: EventTarget, type: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      t.addEventListener(type, fn as EventListener, opts);
      this.disposers.push(() => t.removeEventListener(type, fn as EventListener, opts));
    };
    on(window, "pointermove", (e) => this.move(e), { passive: true });
    // Press anywhere over the scene; links, buttons and form fields keep their own clicks.
    on(window, "pointerdown", (e) => {
      if (e.button !== 0) return;
      const t = e.target as Element | null;
      if (t?.closest?.("a, button, input, textarea, select, label, [data-no-hold]")) return;
      this.move(e);
      this.press(true);
    });
    on(window, "pointerup", () => this.press(false));
    on(window, "pointercancel", () => this.press(false));
    on(window, "blur", () => this.press(false));
    on(document.documentElement, "pointerleave", () => {
      this.state.pointer.active = false;
    });
    on(el, "keydown", (e) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        this.press(true);
      }
    });
    on(el, "keyup", (e) => {
      if (e.key === " " || e.key === "Enter") this.press(false);
    });
  }

  private move(e: PointerEvent) {
    const r = this.el.getBoundingClientRect();
    const p = this.state.pointer;
    const t = performance.now() / 1000;
    const dt = Math.max(1e-3, t - this.lastMove.t);
    const v = Math.hypot(e.clientX - this.lastMove.x, e.clientY - this.lastMove.y) / dt;
    this.speed = Math.max(this.speed * 0.6, Math.min(v, 5000));
    this.lastMove = { x: e.clientX, y: e.clientY, t };
    p.x = e.clientX;
    p.y = e.clientY;
    p.nx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
    p.ny = -(((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1);
    p.active = true;
    p.type = e.pointerType || "mouse";
  }

  private press(down: boolean) {
    if (this.state.pressed === down) return;
    this.state.pressed = down;
    if (down) {
      if (this.phase === "release" && this.holdMode === "r11") {
        // Rotating hold: the release goes on through the click window (see rePress).
        this.rePress = true;
        this.pressAt = this.now;
        this.armed = false;
        return;
      }
      // A press during the release return starts a new hold from wherever the rings are (blended).
      if (this.phase === "idle" || this.phase === "release") {
        if (this.phase === "release") this.setPhase("press");
        else {
          this.phase = "press";
          this.phaseT = 0;
        }
        this.pressAt = this.now;
        this.armed = false;
      }
    } else if (this.rePress) {
      // A click during the release: nothing happens, the release goes on.
      this.rePress = false;
    } else if (this.phase === "press" && !this.armed) {
      // A click does nothing.
      this.phase = "idle";
      this.phaseT = 0;
    } else if (this.phase === "press" || this.phase === "expand") {
      const d = this.drivers;
      // (r11: the clock rate the hold was easing to, so the release ramps it back up from there and never dips first.)
      const tpNow = Math.max(0, this.now - this.pressAt - HOLD_ARM);
      const spinFrom = this.phase === "expand" ? this.spinFrom + (spinRateAt(tpNow) - 1) * (this.spinFrom - HOLD_SPIN.slow) / (1 - HOLD_SPIN.slow) : 1;
      this.releaseFrom = { splitB: d.splitB, cam: d.camExpand, spreadA: d.spreadA, relaxA: d.relaxA, tiltA: d.tiltA, expandPose: d.expandPose, faceInner: d.faceInner, spin: spinFrom };
      if (this.holdMode !== "r10") {
        if (this.holdMode === "r11a") copyHoldParams(d.hold, this.holdRel);
        this.camKick = this.camVel;
      }
      this.fogFrom = { at: this.now, from: Math.max(d.fogHold, d.camExpand) };
      this.setPhase("release");
      // bandInner only shows through alignInner (0 in a hold), so the release may start it at its own first value:
      // blended down from 1 it tilted C towards the band and back before F453.
      if (this.blendFrom && d.alignInner < 0.01) this.blendFrom.bandInner = 0.57;
      this.setHolding(false);
    }
  }

  private setPhase(phase: Phase) {
    const d = this.drivers;
    this.blendFrom = Object.fromEntries(BLENDED.map((k) => [k, d[k]])) as Record<(typeof BLENDED)[number], number>;
    // The release starts from the hold pose itself (releaseParams at t = 0 is that pose), so only the other phase changes
    // blend the hold vector; blending it at the release too delayed the whole release by ~0.1 s.
    if (this.holdMode === "r11" && phase === "expand") {
      // Rotating hold: the hold starts from the current clock rate, opening and camera (1 / 0 / 0 from rest; mid-release
      // values after a re-press), keeping the camera's momentum.
      this.spinFrom = d.spin;
      this.openFrom = d.spreadA;
      this.camFrom = d.camExpand;
      this.camKick = this.camVel;
      this.tiltHand = this.tilt.value;
      // A closing opening keeps closing for a moment and turns smoothly; the extra closing v tp (1 - tp / T)^2 dips at most
      // 4 v T / 27, held to 90 % of the opening by T (<= 0.35 s).
      this.openKick = SPIN_S3 ? 0 : Math.min(0, this.openVel);
      this.kickAnchor = this.now - this.lastDt;
      this.openKickT = this.openKick < 0 ? Math.min(0.35, (0.9 * 27 * d.spreadA) / (4 * -this.openKick)) : 0;
    }
    if (this.holdMode !== "r10") {
      if (this.holdMode === "r11a") this.holdFrom = phase === "release" ? null : copyHoldParams(d.hold, this.holdFrom ?? createHoldParams());
      // The dolly follows its measured curve exactly whenever the new phase starts where the camera is (the release, a hold
      // from rest); only a jump (a re-press during a release) is blended.
      const tp0 = Math.max(0, this.now - this.pressAt - HOLD_ARM);
      this.camBlend = !(phase === "release" || (phase === "expand" && (this.holdMode === "r11" || Math.abs(d.camExpand - expandCamR11(tp0)) < 0.002)));
      this.openBlend = !(this.holdMode === "r11" && !SPIN_S3 && phase === "expand");
    }
    this.blendT = 0;
    this.phase = phase;
    this.phaseT = 0;
  }

  private setHolding(on: boolean) {
    if (this.armed === on && this.state.holding === on) return;
    this.armed = on;
    this.state.holding = on;
    this.onHoldChange?.(on);
  }

  /** Screen-space distance of the pointer from the orb, in ring-A radii. */
  private measureHover(canvasRect: DOMRect) {
    const cam = this.getCamera();
    const c = this.tmpA.copy(this.orb).project(cam);
    const edge = this.tmpB.set(RING_A_RADIUS, 0, 0).applyQuaternion(cam.quaternion).add(this.orb).project(cam);
    const sx = canvasRect.width / 2;
    const sy = canvasRect.height / 2;
    const cx = canvasRect.left + (c.x + 1) * sx;
    const cy = canvasRect.top + (1 - c.y) * sy;
    const radius = Math.max(8, Math.hypot((edge.x - c.x) * sx, (edge.y - c.y) * sy));
    const p = this.state.pointer;
    return Math.hypot(p.x - cx, p.y - cy) / radius;
  }

  update(dt: number) {
    this.now += dt;
    this.lastDt = dt;
    this.phaseT += dt;
    const s = this.state;
    if (this.debug) {
      const g = this.debug;
      this.phase = g.phase === "press" ? "expand" : g.phase;
      this.phaseT = g.t;
      this.blendFrom = null;
      this.holdFrom = null;
      if (g.phase === "expand" || g.phase === "press") {
        // t = seconds into the hold timeline (after the click window).
        this.pressAt = this.now - g.t - HOLD_ARM;
        // (P4 R4-Q1, lab `?debug&debughold=ui`: through setHolding, so onHoldChange fires as in a real hold and the lab's copy
        // leaves like ink; the same armed / holding values otherwise.)
        if (P4_DEBUGHOLD_UI) this.setHolding(true);
        else {
          this.armed = true;
          s.holding = true;
        }
      } else if (P4_DEBUGHOLD_UI) this.setHolding(false);
      else {
        this.armed = false;
        s.holding = false;
      }
      if (g.phase === "release") {
        this.releaseFrom = { splitB: 1, cam: 0.967, spreadA: 1, relaxA: 1, tiltA: 1, expandPose: 1, faceInner: 1, spin: HOLD_SPIN.slow };
        if (this.holdMode !== "r10") {
          if (this.holdMode === "r11a") holdParams(RELEASE_FROM_TP, this.holdRel);
          this.camKick = 0;
        }
        this.fogFrom = { at: this.now - g.t, from: 0.967 };
      } else {
        this.fogFrom = { at: -1e9, from: 0 };
      }
    }
    const d = this.drivers;
    const p = s.pointer;
    const motion = this.reducedMotion ? 0 : 1;
    if (this.debugPointer) {
      p.nx = this.debugPointer.nx;
      p.ny = this.debugPointer.ny;
      p.active = true;
      this.speed = 1000;
    }

    // Pointer speed decays when no events arrive; dwell = slow pointer.
    this.speed = damp(this.speed, 0, 0.25, dt);
    const moving = p.active && this.speed > DWELL_SPEED;
    this.dwell = moving ? 0 : this.dwell + dt;

    // --- idle layers (always computed, scaled down by the active phase)
    const busy = this.phase === "collapse" || this.phase === "expand" || this.phase === "release" || (this.phase === "press" && this.armed);
    const recentre = this.dwell > 0.5 || !p.active;
    this.orbitAz.omega = this.orbitEl.omega = recentre ? 5 : 16;
    this.orbitAz.target = recentre ? 0 : 5.0 * p.nx * motion;
    // +-1.2 deg either way (the video's vertical orbit is small). Sinking further would show lake and rocks
    // nearer than the plate covers (5 % bottom overscan) at the bottom of the frame.
    this.orbitEl.target = recentre ? 0 : 1.2 * p.ny * motion;
    d.orbitAz = this.orbitAz.update(dt);
    d.orbitEl = this.orbitEl.update(dt);

    // Hover push-in: grows smoothly as the pointer nears the orb (video F131-F198, ~1.12x over the orb)
    // and eases back as it leaves. Mouse only, and not while a hold runs.
    this.hoverDist = p.active ? this.measureHover(this.el.getBoundingClientRect()) : 99;
    const near = busy || p.type !== "mouse" ? 0 : 1 - smoothstep(0.3, 1.6, this.hoverDist);
    this.tilt.target = near * motion;
    this.tilt.omega = this.tilt.target > this.tilt.value ? 3.5 : 4.5;
    d.tilt = clamp(this.tilt.update(dt));
    s.hover = d.tilt;

    // No dwell-triggered alignment: the gyroscope never gets pulled out of its tumble while idle (its
    // own cycle passes through the eye, as in the Default Loop), so the motion stays seamless.
    let align = 0;

    // --- phases
    let camCollapse = 0, camExpand = 0, open = 0, flatten = 0, splay = 0, splitB = 0;
    let spreadA = 0, relaxA = 0, tiltA = 0, expandPose = 0, faceInner = 0, spin = 1, energy = 0.3 * d.tilt;
    let popPose = 0, alignA = 0, alignInner = 0, gapA = 0, portal = 0, bandInner = 1, cdSpin = 0;
    const t = this.phaseT;

    if (this.rePress && this.now - this.pressAt >= HOLD_ARM) {
      // Rotating hold: a press during the release has become a hold.
      this.rePress = false;
      this.setPhase("expand");
      this.setHolding(true);
    }
    if (this.phase === "press" && !this.armed && this.now - this.pressAt >= HOLD_ARM) {
      // Held past the click window: this is a hold.
      this.setPhase("expand");
      this.setHolding(true);
    }
    if (this.phase === "expand" && this.holdMode === "r11") {
      // The rotating hold (the user's rule, 2026-11-15): no alignment, no pop pose, no arrangement. The tumble keeps running
      // in its own direction, slowed (spin), ring A's quarters and ring B's halves open on top (spreadA / splitB, offsets in
      // each ring's own frame), rings C / D flip forward (cdSpin), and the camera dollies in on the measured curve.
      const tp = Math.max(0, this.now - this.pressAt - HOLD_ARM);
      // From rest spinFrom = 1, openFrom = camFrom = 0: exactly the curves; after a re-press they start where things are.
      camExpand = this.camFrom + (1 - this.camFrom) * expandCamR11(tp);
      // (Momentum terms from the values' own time: tk >= one frame in the switch frame; step 3 used tp, `?spin=s3`.)
      const tk = SPIN_S3 ? tp : Math.max(tp, this.now - this.kickAnchor);
      if (tk < R11_CAM_KICK_T) camExpand += this.camKick * tk * (1 - tk / R11_CAM_KICK_T) ** 2;
      let open = this.openFrom + (1 - this.openFrom) * spinOpenAt(tp);
      if (this.openKick < 0 && tk < this.openKickT) open = Math.max(0, open + this.openKick * tk * (1 - tk / this.openKickT) ** 2);
      spreadA = open;
      splitB = open;
      cdSpin = smoothstep(HOLD_SPIN.cd0, HOLD_SPIN.cd1, tp);
      spin = this.spinFrom - (this.spinFrom - HOLD_SPIN.slow) * smoothstep(HOLD_SPIN.slow0, HOLD_SPIN.slow1, tp);
      energy = Math.max(energy, smoothstep(0, 0.9, tp));
    } else if (this.phase === "expand") {
      const tp = this.now - this.pressAt - HOLD_ARM;
      // The rings pass through the frontal alignment as the charge starts (F335-F343).
      align = Math.max(align, this.holdMode === "r11a" ? smoothstep(0.0, 0.22, tp) : bump(tp, 0.0, 0.22, 0.32, 0.72));
      if (this.holdMode === "r11a") holdParams(Math.max(0, tp), this.holdNow);
      camExpand = this.holdMode === "r11a" ? expandCamR11(tp) : sampleKeys(EXPAND_CAM, tp);
      splitB = tp < 0.65 ? 0 : sampleCurve(EXPAND_POP, tp - 0.65, 0.5);
      // The quarters drift out through the sustain (~80 % at F402, full by F420).
      spreadA = smoothstep(1.05, 2.8, tp);
      tiltA = smoothstep(0.9, 1.8, tp);
      popPose = bump(tp, 0.75, 0.88, 1.05, 1.5);
      relaxA = smoothstep(3.0, 3.7, tp);
      expandPose = smoothstep(0.85, 1.5, tp);
      faceInner = smoothstep(2.9, 3.5, tp);
      // QC round 4: at F402 C / D frame the orb face-on like a portal, then lie back into B's bowl by F420.
      portal = bump(tp, 1.95, 2.25, 2.5, 2.85);
      // Slow motion while held (the rings never stop: video F365-F442).
      spin = 1 - 0.8 * smoothstep(0.3, 1.1, tp);
      energy = Math.max(energy, smoothstep(0, 0.9, tp));
    } else if (this.phase === "collapse") {
      splitB = t < 0 ? 0 : t < 1.333 ? sampleCurve(COLLAPSE_SPLIT, t, 1.333) : t < 2 ? 1 : 1 - sampleCurve(COLLAPSE_RETURN, t - 2, 0.333);
      camCollapse = sampleKeys(COLLAPSE_CAM, Math.max(0, t));
      open = bump(t, 0.15, 0.4, 0.45, 0.65);
      flatten = bump(t, 0.35, 0.6, 0.75, 1.0);
      // Ring A's quarters snap home in ~0.15 s (F293-F297), before ring B's ease-in return ends (F300).
      const splayOut = t < 2.08 ? smoothstep(0.8, 1.6, t) : 1 - smoothstep(2.08, 2.24, t);
      splay = clamp(splayOut);
      align = Math.max(align, bump(t, 2.15, 2.25, 2.4, 2.55));
      spin = 1 - 0.35 * bump(t, 0.3, 0.6, 1.8, 2.2);
      energy = Math.max(energy, 0.7 * bump(t, 0, 0.3, 1.9, 2.4));
      if (t >= COLLAPSE_LEN) this.toIdle();
    } else if (this.phase === "release" && this.holdMode === "r11") {
      // Rotating hold, release: the openings close, the clock speeds back up from where it was (never reversed, never reset),
      // the camera returns on the measured curve (with the lunge's momentum if it is cut short); C / D land their flip forward.
      const f = this.releaseFrom;
      camExpand = f.cam * (1 - releaseCamR11(t));
      if (t < R11_CAM_KICK_T) camExpand += this.camKick * t * (1 - t / R11_CAM_KICK_T) ** 2;
      const close = 1 - smoothstep(HOLD_SPIN.close0, HOLD_SPIN.close1, t);
      spreadA = f.spreadA * close;
      splitB = f.splitB * close;
      spin = f.spin + (1 - f.spin) * smoothstep(HOLD_SPIN.rel0, HOLD_SPIN.rel1, t);
      energy = Math.max(energy, 1 - smoothstep(0, 0.7, t));
      if (t >= RELEASE_LEN_R11) this.toIdle();
    } else if (this.phase === "release") {
      const f = this.releaseFrom;
      // (QC round 4: at F453 B was still mid-snap; it is closed by ~0.3 s now.)
      const back = sampleCurve(RELEASE_RETURN, t + 0.08, 0.667);
      splitB = f.splitB * (1 - back);
      if (this.holdMode === "r11a") {
        camExpand = f.cam * (1 - releaseCamR11(t));
        if (t < R11_CAM_KICK_T) camExpand += this.camKick * t * (1 - t / R11_CAM_KICK_T) ** 2;
      } else camExpand = f.cam * (1 - sampleKeys(RELEASE_CAM, t));
      // The inner rings resolve first; ring A's arcs keep a small gap and re-join last (F453: A one broken circle of
      // four even arcs around face-on inner rings and a fully exposed orb; A closes F456-F460).
      spreadA = f.spreadA * (1 - smoothstep(0.05, 0.3, t));
      gapA = f.spreadA * (1 - smoothstep(0.4, 0.57, t));
      relaxA = f.relaxA * (1 - smoothstep(0.05, 0.3, t));
      tiltA = f.tiltA * (1 - smoothstep(0.05, 0.28, t));
      alignInner = bump(t, 0.05, 0.25, 0.5, 0.8);
      alignA = bump(t, 0.15, 0.3, 0.6, this.holdMode === "r11a" ? R11_HANDBACK_END : 0.85);
      // F453: the inner rings are a tilted whirlpool (C ~40 deg of its 70, an ellipse around the fully exposed orb);
      // by F460 C is the band across the orb. (0 at F453 read as a face-on "target", QC round 6.)
      bandInner = 0.57 + 0.43 * smoothstep(0.35, 0.55, t);
      expandPose = f.expandPose * (1 - smoothstep(0.08, 0.5, t));
      faceInner = f.faceInner * (1 - smoothstep(0.08, 0.5, t));
      // Reassembly passes through a near-frontal vortex (alignInner / alignA above, F453-F462).
      spin = 0.2 + 0.8 * smoothstep(0.3, 0.75, t);
      energy = Math.max(energy, 1 - smoothstep(0, 0.7, t));
      if (this.holdMode === "r11a") releaseParams(this.holdRel, t, this.holdNow);
      if (t >= (this.holdMode === "r11a" ? RELEASE_LEN_R11 : RELEASE_LEN)) this.toIdle();
    }

    d.camCollapse = camCollapse;
    d.camExpand = camExpand;
    d.align = align;
    d.open = open;
    d.flatten = flatten;
    d.splay = splay;
    d.splitB = splitB;
    d.spreadA = spreadA;
    d.relaxA = relaxA;
    d.tiltA = tiltA;
    d.popPose = popPose;
    d.alignA = alignA;
    d.alignInner = alignInner;
    d.gapA = gapA;
    d.expandPose = expandPose;
    d.faceInner = faceInner;
    d.portal = portal;
    d.bandInner = bandInner;
    d.cdSpin = cdSpin;
    if (this.holdMode === "r11a") {
      if (this.phase !== "expand" && this.phase !== "release") zeroHoldParams(this.holdNow);
      copyHoldParams(this.holdNow, d.hold);
    }
    // A phase change never jumps: blend from the values the drivers had when it happened.
    if (this.blendFrom) {
      this.blendT += dt;
      const k = smoothstep(0, PHASE_BLEND, this.blendT);
      const from = this.blendFrom;
      for (const key of BLENDED) {
        if (key === "camExpand" && !this.camBlend) continue;
        if ((key === "spreadA" || key === "splitB") && !this.openBlend) continue;
        d[key] = lerp(from[key], d[key], k);
      }
      const hf = this.holdFrom;
      if (hf) for (const key of HOLD_KEYS) d.hold[key] = lerp(hf[key], d.hold[key], k);
      if (k >= 1) {
        this.blendFrom = null;
        this.holdFrom = null;
      }
    }
    if (this.holdMode !== "r10") {
      if (dt > 1e-4) this.camVel = (d.camExpand - this.camPrev) / dt;
      this.camPrev = d.camExpand;
      if (dt > 1e-4) this.openVel = (d.spreadA - this.openPrev) / dt;
      this.openPrev = d.spreadA;
    }
    if (P2B_F2 && this.holdMode === "r11" && this.phase === "expand" && !this.debug) {
      // Rings fix round 2 (judge 2's nit "the creep starts by backing off"; measured with the background shift of State 2 to
      // 5.mp4): the reference's camera creeps in monotonically from the press (F330-F348: 0.1 -> 2.1 px a frame, 14 px), but the
      // hover push-in sprang back when the press became a hold (busy above), so the camera first backed off ~0.13 m and the creep
      // showed 3.8 px by F348. The push-in now hands over to the dolly: it shrinks with the dolly's remaining share, so the camera
      // only comes in, on the measured EXPAND_CAM_R11 shape, and reaches exactly the same full-hold pose (no push-in left at
      // camExpand 1). Its value and rate carry into the release's spring, so nothing jumps (the rate no faster than the spring's
      // own critically damped return, so a release in mid-lunge never drives the push-in through 0 and back).
      const rem = 1 - this.camFrom;
      const k = rem > 1e-3 ? clamp((1 - d.camExpand) / rem) : 0;
      const tv = this.tiltHand * k;
      this.tilt.value = tv;
      this.tilt.target = tv;
      this.tilt.velocity = rem > 1e-3 && k > 0 && k < 1 ? Math.max((-this.tiltHand * this.camVel) / rem, -this.tilt.omega * tv) : 0;
      d.tilt = tv;
      s.hover = tv;
    }
    d.spin = damp(d.spin, spin, 0.2, dt);
    d.energy = energy;
    // The fog bank follows the dolly in and fades over 0.6-2 s after a release (QC round 8, T05: it was gone by F453 / F460
    // in the captures, whose settle() decayed the old per-frame integration before the shot).
    const linger = this.fogFrom.from * (1 - smoothstep(0.6, 2.0, this.now - this.fogFrom.at));
    d.fogHold = Math.max(d.camExpand, linger);

    // Shared state for the cursor / audio / shaders. The cursor disc fills only for a hold.
    this.fill.target = s.holding ? 1 : 0;
    this.fill.omega = s.holding ? 10 : 30;
    s.hold = clamp(this.fill.update(dt));
    s.shatter = Math.max(d.splitB * 0.8, d.spreadA * (1 - 0.4 * d.relaxA), d.splay);
    s.spin = d.spin;
    const holdT = this.phase === "expand" || this.phase === "release" ? this.now - this.pressAt - HOLD_ARM : Infinity;
    s.impulse = Math.exp(-Math.max(0, holdT) * 4);
  }

  private toIdle() {
    this.phase = "idle";
    this.phaseT = 0;
    if (this.rePress) {
      // The release ended inside a press's click window: the press goes on as a normal press from here.
      this.rePress = false;
      this.phase = "press";
    }
  }

  dispose() {
    for (const fn of this.disposers) fn();
    this.disposers = [];
  }
}
