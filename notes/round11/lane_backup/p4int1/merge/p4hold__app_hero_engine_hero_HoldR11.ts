import * as THREE from "three";
import { HERO_CENTER } from "../config";
import { CAM_TARGETS } from "../curves";
import { smoothstep } from "../math";

/**
 * Round 11 press-and-hold arrangement ("r11", the default; `?hold=r10` restores the round-10 hold exactly).
 *
 * The hold is a deterministic pose of every ring as a function of hold time only, measured from the Cycles reference
 * (State 2 to 5.mp4 F331-F462, notes/rebuild_analysis/A2_hold_reference.md):
 *   - ring A: a rigid turn of 120 deg about the view-frame axis (-1, 1, -1)/sqrt(3) from the pop (A flat and edge-on, its
 *     quarters front / left / right / back) to the release (A face-on, quarters at 3 / 12 / 6 / 9 o'clock), the side
 *     quarters thrown out at the pop, the front / back pair sliding clockwise ahead of the turn and every quarter pushed
 *     out (A2 R1-R5, section 6.1);
 *   - ring B: one near edge-on lid across the orb that tips from "seen from below" (its near wall over the orb's top,
 *     F396-F412) to "seen from above" (over its lower half, F432-F448), rolling from the pop's -46 deg bar to level (R6);
 *   - rings C / D: locked together, face-on <-> nearly flat (seen from above) on a 1.33 s beat (R7); with B seen from
 *     below their near walls make the F420 lens: B's wall above the slit, C / D's below.
 * The press moment only decides which congruent piece takes which slot (Rings latches a symmetry of each ring), and
 * the tumble clock stops while the hold owns the rings, so a hold is an excursion from the charge's "eye" pose and back.
 * Every value here is a plain number blended by the Choreography like any driver: no jumps on any interaction.
 */

/**
 * "r11" (default, round 11 step 3, the user's priority of 2026-11-15): the rotating hold. Every ring keeps its idle tumble
 * running in its own direction, slowed down (HOLD_SPIN), while ring A's quarters and ring B's halves open on top as offsets
 * in the ring's own frame; rings C / D get an extra forward flip so they visibly rotate. "r11a" (`?hold=r11a`): the step-2
 * deterministic arrangement below (A2 key frames). "r10" (`?hold=r10`): the round-10 hold, bit-identical.
 */
export type HoldMode = "r11" | "r11a" | "r10";

/** `?hold=r10` restores the round-10 hold (bit-identical), `?hold=r11a` the step-2 arrangement; anything else is r11. */
export function holdModeFromUrl(): HoldMode {
  if (typeof location === "undefined") return "r11";
  const h = new URLSearchParams(location.search).get("hold");
  return h === "r10" ? "r10" : h === "r11a" ? "r11a" : "r11";
}

/**
 * `?spin=s3`: the rotating hold exactly as handed off in round 11 step 3 (before fix round 2): A's quarters 0.3 + 0.3 m out
 * along their radials only, B's halves 0.3 m apart, the full hold dolly on every screen, C / D's floor capped at 60 deg/s.
 */
export const SPIN_S3 = typeof location !== "undefined" && new URLSearchParams(location.search).get("spin") === "s3";

/**
 * `?spin=f2`: the rotating hold exactly as integrated in round 11 (the hold lane's fix round 2): ring A's quarters flex along
 * A's own axis (flexA), every piece has its own frame-guard share, rings C / D flip forward about a latched diameter (flipCD),
 * the tumble clock slows to 0.25 and the shards keep ~94 % of their speed while the belt contracts with the dolly. It also
 * brings back the round-10 idle of rings C / D (`?idle=r10`), so `?spin=f2` alone is the integrated round-11 build.
 */
export const SPIN_F2 = typeof location !== "undefined" && new URLSearchParams(location.search).get("spin") === "f2";

/**
 * Round 11 P2b (rings lane, the user's QC of 15 Nov 19:20; default): the split rings stay ONE ring. A's quarters and B's halves
 * keep exactly their ring's rotation and only part in the ring's own plane (radial offsets, one frame-guard share per ring), no
 * flex; C / D get no extra flip, they run on the same slowed clock as A / B in their own (new idle) direction; the clock slows
 * to the reference's 0.2 from the camera's lunge on (F356-F372); the shards slow to the reference's 0.5 with it, and their belt
 * no longer contracts into the opened arcs but widens with ring A's opening.
 * Off under `?spin=s3` and `?spin=f2` (and in the r10 / r11a holds).
 */
export const SPIN_P2B = !SPIN_S3 && !SPIN_F2;

/**
 * `?spin=p2b`: the P2b rotating hold exactly as the rings lane handed it off (16 Nov 03:25): one frame-guard share per ring, so
 * ring A opens less (down to ~1/3) whenever its tumble turns it tall on screen and its opening breathes with the tumble phase,
 * and the hold dolly runs to the full CAM_TARGETS.expand on landscape screens.
 */
export const SPIN_P2B_GUARD = SPIN_P2B && typeof location !== "undefined" && new URLSearchParams(location.search).get("spin") === "p2b";

/**
 * Steady hold (default; lead hotfix of 16 Nov, the user: the two outer rings must STAY open through the whole press-and-hold,
 * not open and close): no frame guard. Ring A's quarters and ring B's halves ease open with the press (spinOpenAt) and close
 * only on the release, so the opening is one constant through the sustain at every press moment and hold length. The rings stay
 * inside the frame by framing instead: the hold dolly stops, once per screen shape, where the opened ring A's bounding sphere
 * fits the frame at any tumble phase (CameraRig.frameShare); the camera is as steady as before. Off under `?spin=p2b` (the
 * guard) and outside P2b.
 */
export const HOLD_STEADY = SPIN_P2B && !SPIN_P2B_GUARD;

/**
 * `?spin=hf`: the steady hold exactly as the lead's hotfix of 16 Nov (05:28) shipped it: both crystal belts widened uniformly by
 * 15 % with ring A's opening (HOLD_SPIN.shardOut).
 */
export const SPIN_HF = HOLD_STEADY && typeof location !== "undefined" && new URLSearchParams(location.search).get("spin") === "hf";

/**
 * Rings lane fix round 1 (default; judge 1 of 16 Nov: the hold's crystal belt sat wider than the reference's and its near
 * crystals crossed the frame too fast): the belts widen only where ring A's opened quarters need the room, in depth, and stay as
 * close round the arcs as the reference's across the view (HOLD_SPIN.shardOutA / shardOutB). Off under `?spin=hf`, `?spin=p2b`
 * and every older build.
 */
export const P2B_F1 = HOLD_STEADY && !SPIN_HF;

/** `?spin=f1`: the steady hold exactly as the rings lane's fix round 1 handed it off (16 Nov 06:31). */
export const SPIN_F1 = P2B_F1 && typeof location !== "undefined" && new URLSearchParams(location.search).get("spin") === "f1";

/**
 * Rings lane fix round 2 (default; judge 2 of 16 Nov: the hold was framed at 0.84x the reference's scale, and its nearest crystals
 * crossed the frame ~1.4x faster than the reference's with the swarm's outer edge 15 % wider):
 *   - ring A keeps its one constant 0.6 m opening (the user, 16 Nov 04:15: the outer rings STAY open; lead note 07:15: the zoom may
 *     only be fixed by the fixed per-screen framing, never by changing the opening). The hold camera's fixed framing moves closer
 *     to the reference's 133 px/m (State 2 to 5 F396-F428, the orb 218 px wide): the opened ring A's bounding sphere may now reach
 *     the frame edge at its widest tumble phase (HOLD_SPIN.frameMargin < 0, beyond the pointer pan / drift slack), as the
 *     reference's own arcs touch the top edge at F436-F444 (y 0-5); the camera still stops once per screen shape, steady through
 *     the sustain;
 *   - the crystals keep their rest belt through the hold (the reference's crystals stay where they are at rest and hug the opened
 *     arcs, F340-F444): no hold spread and no outward "shatter" throw of the crystals (round-10 hold effects the reference does not
 *     have), only the slow motion and the widening that keeps them clear of ring A's opened quarters at any ring orientation, most
 *     of it behind the belt origin (HOLD_SPIN.shardOutA / shardOutB / shardFrontA / shardFrontB, shardHoldFx);
 *   - the hover push-in hands over to the hold dolly instead of springing back when the press becomes a hold, so the camera creeps
 *     in monotonically from the press as the reference's does (F330-F348; Choreography.tiltHand).
 * Off under `?spin=f1` (fix round 1), `?spin=hf` (the lead's hotfix) and every older build.
 */
export const P2B_F2 = P2B_F1 && !SPIN_F1;

/**
 * P4 round 2, lane p4hold (21 Nov; default). `?p4hold=0` turns the whole lane off (= AA8 exactly). Only on the default steady hold
 * (P2B_F2), so every older-build switch stays exact.
 *   - Q12 hold framing (`?holdcam=r11` off): the camera takes the full hold pitch under the steady-hold dolly share and drops by the
 *     same angle on its orbit, so the background sits where the reference's does while the orb keeps its place (CameraRig).
 *   - Q13 pop timing (`?holdpop=r11` off): ring A's and B's opening burst with the camera's lunge (HOLD_SPIN pop0 / pop1 / grow0).
 *   - N-1 / R8-2 (HeroEngine, `?ctxrun=0` / `?panokeep=1` off): a context restore restarts the loop and re-reads the panorama.
 */
const P4Q = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
export const P4HOLD = P4Q?.get("p4hold") !== "0";
export const P4_HOLDCAM = P4HOLD && P2B_F2 && P4Q?.get("holdcam") !== "r11";
export const P4_HOLDPOP = P4HOLD && P2B_F2 && P4Q?.get("holdpop") !== "r11";

/**
 * Idle tumble of rings C / D. "p2b" (default): measured from Default Loop.mp4 as constant-rate flips (IDLE_CD in Rings.ts).
 * "r10" (`?idle=r10`, and with every switch that restores an older build: `?hold=r10`, `?hold=r11a`, `?spin=s3`, `?spin=f2`):
 * the motion-captured tracks of ringMocap.ts with their loop tips, as in rounds 10 and 11.
 */
export type IdleMode = "p2b" | "r10";
export function idleModeFromUrl(): IdleMode {
  if (typeof location === "undefined") return "p2b";
  const q = new URLSearchParams(location.search);
  const h = q.get("hold");
  if (q.get("idle") === "r10" || h === "r10" || h === "r11a" || SPIN_S3 || SPIN_F2) return "r10";
  return "p2b";
}

/**
 * The rotating hold (r11), runtime-tunable (`__hero.debug.holdSpin`). Times are hold time tp (s after the click window) or
 * release time tr (s after the pointer-up).
 */
export const HOLD_SPIN = {
  /**
   * Tumble clock rate while held, as a share of the idle rate. The reference turns ring A ~120 deg in ~3.1 s of sustain
   * (~39 deg/s, A2 R1) where it tumbles at ~170-201 deg/s at rest: 0.19. P2b: 0.2, the measured share (the user: "jangan ngide",
   * 1:1 with the reference). `?spin=f2` / `?spin=s3`: 0.25 ("keeps the turn clearly visible", the hold lane's choice).
   */
  slow: SPIN_P2B ? 0.2 : 0.25,
  /**
   * The clock eases from 1 to `slow` over tp slow0..slow1 (the reference keeps idle speed through the charge, F332-F356). P2b:
   * 0.85..1.4 = F356..F372.5 (tp = (F - 330.5) / 30): the reference's A still tilts ~170 deg/s at F344-F352 (idle-like), its
   * crystals keep their speed to ~F355 and are slowed by ~F375, A2's sustain starts at F372; the slow motion begins with the
   * camera's lunge. `?spin=f2` / s3: 0.3..1.15 (already at 0.46 of idle by F356).
   */
  slow0: SPIN_P2B ? 0.85 : 0.3,
  slow1: SPIN_P2B ? 1.4 : 1.15,
  /** ... and back to 1 over tr rel0..rel1 after the release. */
  rel0: 0.08,
  rel1: 0.8,
  /** Opening (0..1): a quick part with the camera lunge (tp pop0..pop1), then a slow growth (grow0..grow1). */
  popShare: 0.6,
  // (P4 Q13: the quick part ran 0.7-1.08 and was only 54 % done when the lunge ends (tp 0.9: 0.323). The reference's ring-B split
  // jumps 0.219 -> 0.79 between tp 0.883 and 0.917 (EXPAND_POP), right after the lunge (EXPAND_CAM_R11 0.35 -> 0.61 at tp
  // 0.817-0.85): 0.80-0.94 completes the burst with the lunge (tp 0.9: 0.481, 0.94: 0.6) and the slow growth takes over there
  // (no plateau). No overshoot: EXPAND_POP's settle is monotone. `?holdpop=r11`: 0.7 / 1.08 / 1.0.)
  pop0: P4_HOLDPOP ? 0.8 : 0.7,
  pop1: P4_HOLDPOP ? 0.94 : 1.08,
  grow0: P4_HOLDPOP ? 0.94 : 1.0,
  grow1: 3.2,
  /** ... closed again over tr close0..close1 (the reference's A closes by F456, tr 0.43). */
  close0: 0.0,
  close1: 0.45,
  /**
   * Ring A's quarters: radial push (m) at full opening, plus extra for quarters whose push points along the frame's long
   * side on screen. Fix round 2 (judge: "a nested swirl round a bare orb"): A's inner edge (1.98 m) sits only 2 cm outside
   * B's outer edge (1.96 m), so A must go clearly further out than B for the reference's hierarchy (A2 section 7: A a frame
   * outside everything, B one central lens). 0.6 m puts the arcs' midpoints ~2.8 m out (the reference's F420 midpoints are
   * 295-357 px = 2.2-2.7 m at 133 px/m) and keeps F420's width at ~720-820 px (ref 782); 0.8 made it up to 916. No side bonus:
   * it was the one radial push that moved with the screen direction (the judge's "breathing" nit); 0.6 + 0 measured as well as
   * 0.5 + 0.1 (A clear / overlap / gaps). Step 3 had 0.3 + 0.3 (`?spin=s3`).
   */
  // (Rings fix round 2 keeps 0.6: the user's constant opening, lead note 16 Nov 07:15. The closer hold framing comes from
  // frameMargin below.)
  pushA: SPIN_S3 ? 0.3 : 0.6,
  pushASide: SPIN_S3 ? 0.3 : 0,
  /**
   * Ring A's quarters, "flex" (m, fix round 2): an offset along A's own axis, -flexA (u . v)(n . v) for a quarter with radial
   * u, ring axis n and view direction v (all in the ring frame). It is 0 when A is face-on or edge-on, and at a tilt it moves
   * the quarters that point towards / away from the camera outwards on screen (the ones a tilted ring otherwise lays over
   * B and the orb). It is continuous in the ring's orientation, so the quarters' paths stay smooth; with flexA <= R / 2
   * (R ~ 2.4 m, the pushed quarter radius) the quarter's screen distance never turns back during a flip; ring A's idle tumble
   * never comes closer than 38 deg to face-on seen from the hold camera, where the bound is ~R / 0.86 = 2.8 m. 0 = step 3.
   * It is the one offset that moves on its own as A tumbles, so it trades A's clearance from the orb against calm slow motion
   * (judge's j2a holds, settled hold, A / B screen speed p99 / max px per 60 Hz frame: step 3 4.9 / 5.1, flex 0 5.4 / 5.7, 0.8
   * 6.5 / 7.2, 1.2 7.1 / 7.9, 2.0 8.2 / 9.4; with 2.0 an edge-on quarter swept the orb's whole height in 0.6 s). 1.0 keeps the
   * offsets' own motion at about a third of the rings' rotation speed. 0 = step 3.
   */
  flexA: SPIN_F2 ? 1.0 : 0,
  /**
   * P2b: one frame-guard share for all pieces of a ring (the smallest any piece needs), so a guarded ring opens less as a whole
   * and keeps its exploded shape (a rigid unit) instead of one piece sliding in on its own. 0 = per piece (`?spin=f2` / s3).
   * Only with the guard on (`steady` 0: `?spin=p2b`); the default steady hold has no guard.
   */
  guardRing: SPIN_P2B ? 1 : 0,
  /**
   * Steady hold (HOLD_STEADY, the default; 0 = the frame guard, `?spin=p2b` and the older builds): no guard, the opening is the
   * choreography's own (constant through the sustain); the hold camera's dolly share is chosen once per screen shape so the
   * opened ring A's bounding sphere stays frameMargin inside the frame (CameraRig.frameShare).
   */
  steady: HOLD_STEADY ? 1 : 0,
  /**
   * Steady hold: how far inside the frame the opened ring A's bounding sphere stays (NDC units of the frame height: 0.04 = 15 px
   * at 766), beyond the camera's own pointer pan and handheld drift. The sphere already holds every vertex plus the ice shader's
   * largest displacement (Rings.openRadiusA), so no extra allowance for the chisel is needed (the guard's 0.08 had one).
   */
  // (Rings fix round 2, P2B_F2: -0.03, i.e. the sphere plus the pan / drift slack may reach 11 px past the edge at 766, so with the
  // pointer centred the sphere's widest phase reaches ~3 px past the bottom edge and the exact silhouette (a few px inside the
  // sphere) touches it, as the reference's arcs touch the top edge at F436-F444 (y 0-5). At 1440x766 the hold camera then stops at
  // share 0.853 of the dolly, 121 px/m at the orb (the hotfix's 0.04: 0.734, 113 px/m; the reference 133).)
  frameMargin: P2B_F2 ? -0.03 : 0.04,
  /**
   * P2b: the shards' orbit (and their own spin / rock / bob clock) at full hold as a share of idle, measured in State 2 to 5.mp4:
   * the blue crystals move 0.024-0.037 rad / frame round the orb in the sustain F380-F449 against 0.050-0.064 at rest
   * (py/shard_track.py), about 0.5. Eased with the ring clock (shardRateFromSpin), so entry and exit are seamless.
   */
  shardSlow: 0.5,
  /**
   * P2b: the shard belts no longer contract with the dolly (Shards uContract): in the reference's sustain the crystals stay
   * ~2.6-3.0 m out (340-400 px at 133 px/m, as at rest), just outside ring A's opened arcs; contracted by 18 % they flew through
   * the arcs. 1 = the integrated contraction (`?spin=f2` / s3).
   */
  shardContract: SPIN_P2B ? 0 : 1,
  /**
   * P2b: the belts widen uniformly by this share at full ring-A opening (x spreadA), so no crystal passes through an opened
   * quarter: belt A's crystals behind the orb sit only ~3.06 m from the ring centre at rest (the belt origin is 0.2 m nearer the
   * camera), A's pushed quarters reach ~3.03 m, and a crystal's capsule adds ~0.3 m. Measured with the capsule test of
   * work2/rings/tools/probe60.mjs over 8 press moments x 10 s + a 20 s hold: 0.1 still left one belt-A crystal grazing an opened
   * quarter by 5 cm; 0.13 cleared all by >= 1 cm; 0.15 keeps a margin for the GPU's float32 crystal hash. In the reference's
   * sustain the crystals ring just outside A (A2: ~450 px out at F420).
   */
  shardOut: 0.15,
  /**
   * Rings fix round 1 (P2B_F1, the default; [across the view (x, y), in depth (z)] at full ring-A opening, x spreadA, per belt;
   * replaces the uniform shardOut there). Judge 1: in the reference's sustain (F380-F440) the crystals hug ring A's arcs (area-
   * weighted px from the orb p50 / p75 / p90 386 / 459 / 477), the uniformly widened belts sat further out (at the hotfix's hold
   * camera 400-436 / 512-562 / 596-643) and belt B's near crystals crossed the frame fastest. Measured with the CPU model of the
   * crystals (work2/rings/fix1b/py, every crystal capsule at every belt phase): only belt A's crystals BEHIND the orb come near
   * the opened ring A (the belts' centre sits 0.2 m in front of the orb and the hold spread is only x1.025 in depth), and belt B
   * clears ring A's opened bounding sphere unwidened (+0.15 m); belt B must only stay farther out than belt A where the two belts
   * cross, along the view axis. So belt A widens 8 % across and 20 % in depth, belt B -10 % across (with the hold spread's +8.4 %
   * it stays at 0.98 of its rest radius) and 30 % in depth: across the view both belts end at the same 3.77 m, just outside the
   * opened arcs (the artist's two belts have one radius in the .blend; the engine's 15 % wider belt B only kept their crossing
   * apart, which the depth widening now does); every crystal stays outside ring A's opened bounding sphere at ANY ring
   * orientation (>= +0.08 m; the uniform 15 % gave +0.02 m) and the two belts' crystals never touch (the uniform 15 % let them
   * overlap ~6 % of the time). Measured at the hotfix's hold camera with the crystals pinned (fix1b/caps/s4, s5): area-weighted
   * px from the orb 375 / 464 / 543 (reference 386 / 459 / 477, uniform 15 % 411 / 529 / 589).
   */
  // (Rings fix round 2, P2B_F2: the hold spread and the shatter throw are gone (shardHoldFx 0), so the widening alone keeps every
  // crystal outside ring A's opened bounding sphere (3.035 m) at ANY ring orientation: belt A 16 % across (its radial crystals,
  // half-length 0.42 m, reach ~0.4 m inside the belt radius; fix 1's 8 % x the hold spread's 7.2 % was the same 0.158), 30 %
  // behind / 10 % in front of its origin; belt B 0 across, 40 % behind / 25 % in front (outside belt A where the belts cross along
  // the view axis). CPU model fix2/py/cscan7.py / cfine.py: sphere clearance A +0.106 / B +0.184 m, belt crossing +0.091 m.)
  shardOutA: (P2B_F2 ? [0.16, 0.3] : [0.08, 0.2]) as [number, number],
  shardOutB: (P2B_F2 ? [0, 0.4] : [-0.1, 0.3]) as [number, number],
  /**
   * Rings fix round 2 (P2B_F2): the depth widening in FRONT of each belt's origin (+z, towards the camera; shardOutA / B [1] is then
   * the share behind it, blended over 0.5 m behind the origin). Judge 2: the symmetric depth widening also pulled each belt's front
   * crystals towards the camera, while the crystals behind the orb need the most room from ring A's opened quarters (the belts'
   * origin sits 0.2 m in front of the orb). Belt A's front crystals keep only the 10 % their radial crystals need to clear the
   * opened ring A; belt B's keep 25 % so the two counter-rotating belts' front crossing stays clean (the belts cross along the
   * view axis; CPU model fix2/py/cfine.py).
   */
  shardFrontA: 0.1,
  shardFrontB: 0.25,
  /**
   * Rings fix round 2 (P2B_F2): share of the round-10 hold effects on the crystals that is kept: the hold spread (x1.07-1.08 across
   * the view) and the outward "shatter" throw (half the crystals 0.7-1.7 m out and 14-25 deg on along the orbit, with an extra
   * tumble). 0: none (the reference's crystals stay round the sculpture through the pop and the sustain, F340-F444, no outward
   * throw); 1 = every older build.
   */
  shardHoldFx: P2B_F2 ? 0 : 1,
  /**
   * Ring B's halves: push apart along their radials (m) at full opening (the GLB split is +0.47 / -0.57 m). Fix round 2: 0.1,
   * so B opens but stays one central lens inside A (its outer edge 2.06 m vs A's pushed inner edge ~2.6 m); step 3's 0.3 put
   * B's halves into A's band (the judge's "A and B wound round each other at nearly one radius").
   */
  pushB: SPIN_S3 ? 0.3 : 0.1,
  /**
   * Frame guard: every pushed piece stays this far inside the frame (NDC units of the frame height; 0.04 = 15 px at 766). The
   * hull points miss the ice shader's chisel displacement and the arcs' between-sample extremes by ~10-20 px, so with the
   * larger pushes 0.08 (31 px) keeps the exact silhouette >= 14 px inside (0.04: 2-4 px).
   */
  guardMargin: SPIN_S3 ? 0.04 : 0.08,
  /** Rate (1/s) at which the guard lets a held-in piece out again (fix round 2; never while the opening closes). */
  guardRelax: 4,
  /**
   * Narrow screens (fix round 2): the hold dolly stops where ring A (radius fitR m, its outer edge plus the vertex
   * displacement) still fits the frame's width with the guard margin; 1 on every landscape screen (exactly the step-3
   * dolly there). 0 = always the full dolly (step 3).
   */
  fitR: SPIN_S3 ? 0 : 2.5,
  /**
   * Rings C / D: an extra flip about a latched diameter (the one the ring is turning about when the hold starts, so it keeps
   * its sense), deg/s at full weight, eased in over tp cd0..cd1. They do not rotate at rest (C flips and nods, D only nods),
   * so their slowed tumble alone read as a repeating nod.
   */
  cdRate: [0, 0, 48, 54],
  cd0: 0.3,
  cd1: 1.2,
  /** Rate response (1/s) of the flip while held. */
  cdResp: 3,
  /**
   * The ring's total turn about the flip axis stays >= cdFloor x its rate (the compensation is capped at cdFloorCap deg/s).
   * Fix round 2: 150 (step 3: 60). At the tau 2.0 press C's own nod turned against the new flip at up to ~140 deg/s, so with 60
   * C still turned back 14 deg in the ramp (min -77 deg/s); with 150 C's total turn stays >= +5 deg/s from the latch on, and
   * the largest frame-to-frame change of C's angular velocity is unchanged (32 deg/s, the idle mocap's own).
   */
  cdFloor: 0.5,
  cdFloorCap: SPIN_S3 ? 60 : 150,
  /**
   * The floor's weight is min(1, cdFloorRamp x the flip's ramp weight), so it is in force early in the ramp, when the clock is
   * still near idle speed and C's own nod can turn against the new flip (judge nit: C turned back 13 deg at the tau 2.0
   * press). 1 = the ramp weight itself (step 3).
   */
  cdFloorRamp: SPIN_S3 ? 1 : 3,
  /**
   * After the release the flip decelerates and lands forward on the next multiple of 180 deg (a solid ring's symmetry), at
   * least cdLandNear deg ahead, within cdLandMin..cdLandMax s.
   */
  cdLandNear: 40,
  cdLandMin: 0.6,
  cdLandMax: 3.2,
  /** A flip still within this many degrees of its last multiple (a hold released early) settles back instead. */
  cdBack: 15,
};

/**
 * Ring A's in-plane phase (deg about its own axis, on top of the idle mocap, which cannot see a symmetric ring's spin).
 * Measured from the reference's quarter joints (the dark bars in band A): over all 121 frames of Default Loop.mp4 the
 * joints fit one constant offset, -22.5 deg (per 1/3 s window: median -23.0, sd 1.05, no drift), which puts the joints at
 * +-45 / +-135 deg at t 0, the artist's stored seam angles (loop F000 / F030 / F060 / F090 bars at x 575 / 869; the
 * engine's near joints' outer edges then land at 573-576 / 871-874; round 10 had them at 553 / 663 / 796 / 881).
 */
export const A_PHASE_DEG = -22.5;

/** `?aphase=r10` (and `?hold=r10`, the whole round-10 behaviour) keeps the round-10 phase (offset 0, bit-identical). */
export function aPhaseFromUrl(): number {
  if (typeof location === "undefined") return A_PHASE_DEG;
  const q = new URLSearchParams(location.search);
  return q.get("aphase") === "r10" || q.get("hold") === "r10" ? 0 : A_PHASE_DEG;
}

/** Rotating hold: the opening (0..1) at tp s into the hold: a quick part with the lunge, then a slow growth (C1). */
export function spinOpenAt(tp: number) {
  const S = HOLD_SPIN;
  return S.popShare * smoothstep(S.pop0, S.pop1, tp) + (1 - S.popShare) * smoothstep(S.grow0, S.grow1, tp);
}
/** Rotating hold: the tumble clock rate (share of idle) at tp s into the hold. */
export function spinRateAt(tp: number) {
  const S = HOLD_SPIN;
  return 1 - (1 - S.slow) * smoothstep(S.slow0, S.slow1, tp);
}
/**
 * P2b: the shards' speed (share of idle) from the ring clock's rate `spin` (Choreography d.spin: 1 at rest, `slow` in a settled
 * hold, continuous through press, release and re-press): the crystals slow down together with the rings, linearly in the clock's
 * share of its slow-down (the reference's keep their speed to ~F355 and are slowed by ~F375, as the rings' clock with slow0..slow1
 * 0.85..1.4; back by ~F450-F470, as the clock's rel0..rel1). Eased and seamless because the clock is.
 */
export function shardRateFromSpin(spin: number) {
  const S = HOLD_SPIN;
  const w = Math.min(1, Math.max(0, (1 - spin) / Math.max(1e-6, 1 - S.slow)));
  return 1 - (1 - S.shardSlow) * w;
}

export const HOLD_KEYS = [
  // weights: ring A, rings B / C / D; tumble-clock freeze
  "wA", "wI", "freeze",
  // ring A: rigid turn (deg), screen roll (deg)
  "phi", "rollA",
  // ring A per slot (top, left, bottom, right): radial push (m), slide along the ring (deg, + = ccw about the ring axis),
  // tilt about the arc tangent (deg, + = outer rim towards the camera side), roll about the slot's radial (deg, + = the
  // clockwise end towards the camera side), spin about the ring axis through the piece (deg; -slide = a pure translation)
  "pushT", "pushL", "pushB", "pushR",
  "sigT", "sigL", "sigB", "sigR",
  "tiltT", "tiltL", "tiltB", "tiltR",
  "rollT", "rollL", "rollB", "rollR",
  "spinT", "spinL", "spinB", "spinR",
  // hinge about the quarter's counter-clockwise cap (deg, + = the free end towards the camera side): a door-like swing about
  // the axis through that cap along the slot's radial, so one end stays put while the other comes forward (foreshortened)
  "hngT", "hngL", "hngB", "hngR",
  // ring B: tilt from edge-on (deg, + = seen from above), screen roll (deg), spin in its own plane (deg: 90 = the halves
  // part along the bar, 0 = across the view), half split share (of the GLB +0.47 / -0.57 m)
  "betaB", "rhoB", "gammaB", "splitB",
  // rings C / D: tip back from face-on (deg, + = top away from the camera)
  "psiC", "psiD",
] as const;
export type HoldKey = (typeof HOLD_KEYS)[number];
export type HoldParams = Record<HoldKey, number>;

export const createHoldParams = (): HoldParams => Object.fromEntries(HOLD_KEYS.map((k) => [k, 0])) as HoldParams;
export const copyHoldParams = (src: HoldParams, out: HoldParams) => {
  for (const k of HOLD_KEYS) out[k] = src[k];
  return out;
};

/** Monotone cubic (Fritsch-Carlson) through (t, v) keys: C1, no overshoot; clamps outside the keys. */
export class Curve {
  private t: number[];
  private v: number[];
  private m: number[];
  constructor(keys: readonly (readonly [number, number])[]) {
    this.t = keys.map((k) => k[0]);
    this.v = keys.map((k) => k[1]);
    const n = keys.length;
    const d: number[] = [];
    for (let i = 0; i < n - 1; i++) d.push((this.v[i + 1] - this.v[i]) / (this.t[i + 1] - this.t[i]));
    const m = new Array(n).fill(0);
    if (n > 1) {
      m[0] = d[0];
      m[n - 1] = d[n - 2];
      for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
      for (let i = 0; i < n - 1; i++) {
        if (d[i] === 0) {
          m[i] = 0;
          m[i + 1] = 0;
          continue;
        }
        const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
        if (s > 9) {
          const k = 3 / Math.sqrt(s);
          m[i] = k * a * d[i];
          m[i + 1] = k * b * d[i];
        }
      }
      // Flat ends: a key table starts and ends at rest.
      m[0] = 0;
      m[n - 1] = 0;
    }
    this.m = m;
  }
  at(x: number) {
    const t = this.t, v = this.v, m = this.m, n = t.length;
    if (n === 1 || x <= t[0]) return v[0];
    if (x >= t[n - 1]) return v[n - 1];
    let i = 0;
    while (x > t[i + 1]) i++;
    const h = t[i + 1] - t[i], s = (x - t[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * v[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * v[i + 1] + (s3 - s2) * h * m[i + 1];
  }
}

/**
 * Key tables, hold time tp in s after the click window (F = 331 + 30 tp: the pop F358 = 0.90, F384 = 1.77,
 * F402 = 2.37, F420 = 2.97, F440 = 3.63; the reference releases at F443 = 3.73). Runtime-tunable (`__hero.holdKeys`).
 */
export const HOLD_CURVES: Record<string, [number, number][]> = {
  // Ring A's rigid turn from the pop pose (0) to face-on (120), fitted to A-R's chord: F384 -13, F396 -30, F404 -43,
  // F420 -62, F440 -79 deg (A2 section 6.1); a long hold creeps on towards face-on.
  phi: [[0.8, 0], [1.25, 2], [1.77, 20], [2.17, 40], [2.43, 48], [2.97, 71], [3.63, 97], [4.6, 102], [6.5, 104]],
  // The X knot rolls into the pop's level bar rising to the right (F352 +30, F356 +10, F358 +7 deg), then level.
  rollA: [[0.5, 30], [0.7, 28], [0.83, 10], [0.9, 7], [1.4, 3], [2.0, 0]],
  // Fit points (tp): F358 0.9, F372 1.37, F384 1.77, F396 2.17, F404 2.43, F420 2.97, F428 3.23, F440 3.63, long hold 4.6.
  // Side quarters (top / bottom slots, the end-on blocks at the pop): thrown out at the pop (F356-F358, ~40 px a frame),
  // back in while sweeping, out again (A2 R4, section 6.1).
  pushT: [[0.8, 0], [0.833, 0.05], [0.867, 0.55], [0.9, 0.56], [1.37, 0.85], [1.77, 0.497], [2.17, 0.35], [2.43, 0.151], [2.97, 0.21], [3.23, 0.303], [3.63, 0.445], [4.6, 0.36]],
  pushB: [[0.8, 0], [0.833, 0.05], [0.867, 0.6], [0.9, 0.758], [1.37, 0.85], [1.77, 0.45], [2.17, 0.315], [2.43, 0.54], [2.97, 0.42], [3.23, 0.416], [3.63, 0.41], [4.6, 0.34]],
  // Front / back pair (right / left slots): swing out to 3 / 9 o'clock, translating clockwise ahead of the rigid turn
  // without turning (slide + opposite spin): F420's pairing (top + left, bottom + right), both side arcs leaning "\\".
  // (A-R, the front bar, comes 0.3 m towards the camera at the pop: F358 bar 452 px long, ref 470 (was 441), orb 9 % visible,
  // ref ~8 % (was 10.6); F372 bar 512 px, ref 525.)
  pushR: [[0.8, 0], [0.9, 0.3], [1.37, 0.3], [1.77, 0.3], [2.17, 0.38], [2.43, 0.1], [2.97, 0.569], [3.23, 0.625], [3.63, 0.71], [4.6, 0.62]],
  pushL: [[0.8, 0], [0.9, 0], [1.37, 0.1], [1.77, 0.3], [2.17, 0.431], [2.43, 0.8], [2.97, 0.48], [3.23, 0.492], [3.63, 0.51], [4.6, 0.46]],
  sigT: [[0.8, 0], [0.9, 0], [1.37, -1], [1.77, -6], [2.17, -11.8], [2.43, -6.1], [2.97, -9.7], [3.23, -6.4], [3.63, -1.3], [4.6, -2.25]],
  sigB: [[0.8, 0], [0.9, 2.5], [1.37, 0], [1.77, 0], [2.17, 5.1], [2.43, 4.5], [2.97, -1.5], [3.23, -1.5], [3.63, -1.5], [4.6, -1.125]],
  sigR: [[0.8, 0], [0.9, -4], [1.37, -15], [1.77, -28], [2.17, -28], [2.43, -21], [2.97, -14.5], [3.23, -11.9], [3.63, -8], [4.6, -6]],
  sigL: [[0.8, 0], [0.9, 0], [1.37, -15], [1.77, -28], [2.17, -33.2], [2.43, -38], [2.97, -16.8], [3.23, -14.348], [3.63, -9.5], [4.6, -7.125]],
  spinT: [[0.8, 0], [0.9, 0], [1.37, -1], [1.77, -6.2], [2.17, -6], [2.43, -13.8], [2.97, -6.7], [3.23, -8.7], [3.63, -11.7], [4.6, -5.625]],
  spinB: [[0.8, 0], [0.9, 4.1], [1.37, -1], [1.77, -3], [2.17, -6], [2.43, -4.5], [2.97, -9], [3.23, -7.227], [3.63, -4.5], [4.6, -3.375]],
  spinR: [[0.8, 0], [0.9, 8.5], [1.37, 15], [1.77, 28], [2.17, 28], [2.43, 16.8], [2.97, 10.8], [3.23, 9.7], [3.63, 8], [4.6, 6]],
  spinL: [[0.8, 0], [0.9, 0], [1.37, 15], [1.77, 28], [2.17, 22.9], [2.43, 8.5], [2.97, 15.3], [3.23, 12.848], [3.63, 8], [4.6, 6]],
  // Chunky slabs: each quarter shows rim + face (60-110 px) and one cut end towards the camera (A2 R5, F420).
  tiltT: [[0.8, 0], [0.9, 16], [1.37, 0], [1.77, 5.3], [2.17, 0], [2.43, -4.7], [2.97, 12], [3.23, 4.8], [3.63, -6.3], [4.6, -2]],
  tiltL: [[0.8, 0], [0.9, 0], [1.37, -5], [1.77, -15], [2.17, -25], [2.43, -29], [2.97, -34], [3.23, -37.939], [3.63, -44], [4.6, -44]],
  tiltB: [[0.8, 0], [0.9, -2.6], [1.37, 0], [1.77, -1], [2.17, -2], [2.43, 2], [2.97, -2], [3.23, -6.727], [3.63, -14], [4.6, -14]],
  tiltR: [[0.8, 0], [0.9, 0], [1.37, -2], [1.77, -4], [2.17, -6], [2.43, -20], [2.97, -11], [3.23, -17.7], [3.63, -28], [4.6, -28]],
  rollT: [[0.8, 0], [0.9, -4], [1.37, 0], [1.77, -2.8], [2.17, 1], [2.43, -6.3], [2.97, -7], [3.23, 4.5], [3.63, 22.1], [4.6, 12.75]],
  rollL: [[0.8, 0], [0.9, 0], [1.37, 0], [1.77, 0], [2.17, 0], [2.43, -2], [2.97, 0], [3.23, 0], [3.63, 0], [4.6, 0]],
  rollB: [[0.8, 0], [0.9, -2.9], [1.37, 2], [1.77, 4], [2.17, 6], [2.43, 14], [2.97, 8], [3.23, 6.424], [3.63, 4], [4.6, 3]],
  rollR: [[0.8, 0], [0.9, 0], [1.37, 0], [1.77, 0], [2.17, 0], [2.43, -5.6], [2.97, 0], [3.23, -3.152], [3.63, -8], [4.6, -6]],
  // Hinges about each quarter's counter-clockwise cap (round 11 step 2): A-T's free (right) end comes forward, so the arc is
  // foreshortened with its right cut face to the camera (F402-F420: caps at screen angles ~88 / 147 deg).
  hngT: [[0.8, 0], [0.9, 0], [1.37, 0], [1.77, 0], [2.17, 4.1], [2.43, 10.1], [2.97, 12.1], [3.23, 9.9], [3.63, 6.6], [4.6, 5]],
  hngR: [[0.8, 0], [0.9, 0], [1.37, 0], [1.77, 0], [2.17, 0], [2.43, 0], [2.97, 0], [3.23, 0], [3.63, 0], [4.6, 0]],
  // Ring B: near edge-on, seen from below (lid over the orb's top, F404 ~70 px above its centre) -> above (F444 ~50 px
  // below), rolling from the pop's bar to level. At the pop (F358) B is the reference's one straight, solid diagonal: beta -5
  // (110 px thick, ref ~105; -10 opened it into a bent 142 px "banana"), centre line (539,172)->(900,603) at 50 deg, ref
  // (545,195)->(890,595) at 49.
  betaB: [[0.8, -5], [0.9, -5], [1.37, -10.5], [1.77, -13], [2.17, -18], [2.43, -20.5], [2.7, -15], [2.97, -8.7], [3.23, -2], [3.5, 5], [3.77, 10], [4.6, 10]],
  rhoB: [[0.55, -70], [0.7, -70], [0.83, -52], [0.9, -49], [1.1, -45], [1.37, -40], [1.77, -25], [2.17, -12], [2.43, -8], [2.97, -2], [3.5, 0]],

  // Ring B's split share along its cut line: the full GLB split at the pop (the bar grows ~0.5 m, F358), 0.8 in the sustain
  // (the lid sits ~60 px left of the orb with the far half's end as the seam block on its right, F416-F448).
  // (x the split driver, EXPAND_POP, which is half a frame behind the GLB track at F358: 0.5 vs 0.79 open.)
  bsplit: [[0.9, 1.8], [1, 1.15], [1.5, 1.1], [2.43, 0.8], [4.6, 0.8]],
  // Ring A's quarters closing in the release (m): x1.09 at F452, x1.05 at F453, closed by F456.
  gapRel: [[0.25, 0.24], [0.3, 0.21], [0.333, 0.23], [0.38, 0.08], [0.43, 0]],
};

/**
 * r11 camera progress (the hold dolly, camExpand), measured frame by frame from the reference: the vertical shift of the
 * background (strip x 0-300) between consecutive frames of State 2 to 5.mp4, accumulated and normalized (about 154 px of
 * background shift per unit of camExpand in the engine). Keys at the reference's frames, tp = (F - 330.5) / 30, F331-F374,
 * then the round-10 tail (settled by F390, the 3 % ease-back F430-F442). Sampled with the monotone cubic, so the dolly speed
 * changes smoothly: the reference's lunge is 5.7 7.9 13.3 39.5 19.1 8.6 5.7 4.2 3.2 2.7 px a frame at F353-F362. (Round 10's
 * EXPAND_CAM keys hold the same values every 0.1-0.2 s, but sampled piecewise-linearly they moved the camera in a staircase:
 * 6.3 | 24.4 25.3 24.9 | 4.9 x6 | 0.9 px a frame, judge 1 of round 11.)
 */
export const EXPAND_CAM_R11: [number, number][] = [
  [0, 0], [0.0167, 0.0005], [0.05, 0.0012], [0.0833, 0.0021], [0.1167, 0.0032], [0.15, 0.0047], [0.1833, 0.0068],
  [0.2167, 0.0095], [0.25, 0.0129], [0.2833, 0.0171], [0.3167, 0.0218], [0.35, 0.0272], [0.3833, 0.0333], [0.4167, 0.0402],
  [0.45, 0.0479], [0.4833, 0.0566], [0.5167, 0.0668], [0.55, 0.0786], [0.5833, 0.0918], [0.6167, 0.1077], [0.65, 0.127],
  [0.6833, 0.1499], [0.7167, 0.1783], [0.75, 0.2152], [0.7833, 0.2663], [0.8167, 0.3522], [0.85, 0.6081], [0.8833, 0.7318],
  [0.9167, 0.7877], [0.95, 0.8244], [0.9833, 0.8516], [1.0167, 0.8724], [1.05, 0.8898], [1.0833, 0.9036], [1.1167, 0.9158],
  [1.15, 0.9258], [1.1833, 0.9346], [1.2167, 0.9416], [1.25, 0.9479], [1.2833, 0.9534], [1.3167, 0.9582], [1.35, 0.963],
  [1.3833, 0.9658], [1.4167, 0.9688], [1.45, 0.9707], [1.983, 0.999], [3.317, 1], [3.517, 0.98], [3.717, 0.967],
];
/**
 * r11 release dolly: share of the way back to rest, tr = (F - 443) / 30, F443-F469, measured the same way (the reference's
 * S-curve: 2.7 4.0 5.8 8.8 13.4 19.4 20.0 15.5 11.3 8.6 6.8 5.5 4.5 ... px a frame). Round 10's RELEASE_CAM, sampled
 * piecewise-linearly, slowed in steps (142 / 100 / 50 / 27 / 20 mm a frame) at the end.
 */
export const RELEASE_CAM_R11: [number, number][] = [
  [0, 0], [0.0333, 0.0186], [0.0667, 0.0458], [0.1, 0.086], [0.1333, 0.1465], [0.1667, 0.2391], [0.2, 0.3731],
  [0.2333, 0.5112], [0.2667, 0.6179], [0.3, 0.6954], [0.3333, 0.7544], [0.3667, 0.8009], [0.4, 0.8389], [0.4333, 0.8699],
  [0.4667, 0.8957], [0.5, 0.9167], [0.5333, 0.9344], [0.5667, 0.949], [0.6, 0.9617], [0.6333, 0.9718], [0.6667, 0.9798],
  [0.7, 0.9864], [0.7333, 0.9913], [0.7667, 0.9952], [0.8, 0.9981], [0.8333, 0.9997], [0.8667, 1],
];
const expandCam = new Curve(EXPAND_CAM_R11);
const releaseCam = new Curve(RELEASE_CAM_R11);
/** r11 camera progress at tp seconds into the hold (0 at rest, 1 = CAM_TARGETS.expand). */
export const expandCamR11 = (tp: number) => expandCam.at(tp);
/** r11 share of the way back to rest, tr seconds after the release. */
export const releaseCamR11 = (tr: number) => releaseCam.at(tr);

/** Scalar knobs (runtime-tunable, `__hero.holdTune`). */
export const HOLD_TUNE = {
  /** Hold weights ramp (tp, s): the charge turns the rings from the eye into the pop pose. */
  wIn0: 0.28,
  wIn1: 0.8,
  /** C / D beat: face-on at psi0 + k P, flattest (psiAmp deg, seen from above) half a period later (A2 R7, section 6.3). */
  psiT0: 1.04,
  psiPeriod: 1.33,
  psiAmp: 70,
  /** D's extra tip (deg) so C and D do not merge into one hoop. */
  psiDExtra: 8,
  /** World-up lift of the hero at full dolly (m), replaces Rings.tune.holdLift in r11: orb at (720, 392) in the sustain. */
  holdLift: 0.39,
  /** Hinge axes (hng*): screen-plane angle from vertical (deg, clockwise) of the line through each quarter's ccw cap. */
  hingeAxisDeg: [0, 0, 0, 0],
};

const curves: Record<string, Curve> = {};
let curvesSrc: Record<string, [number, number][]> | null = null;
function curve(name: string) {
  if (curvesSrc !== HOLD_CURVES) {
    curvesSrc = HOLD_CURVES;
    for (const k of Object.keys(curves)) delete curves[k];
  }
  return (curves[name] ??= new Curve(HOLD_CURVES[name]));
}
/** Call after editing HOLD_CURVES at runtime. */
export function holdCurvesChanged() {
  curvesSrc = null;
}

/** C / D tip-back on the beat: face-on until the first flat phase, then (1 - cos) / 2 oscillation. */
function psiAt(tp: number) {
  const T = HOLD_TUNE;
  if (tp <= T.psiT0) return 0;
  return (T.psiAmp * (1 - Math.cos((2 * Math.PI * (tp - T.psiT0)) / T.psiPeriod))) / 2;
}

/**
 * Past the reference's timeline (it releases at F443, tp 3.73) the curves settle; a long hold keeps every ring alive with a
 * slow, bounded, smooth breathing (deterministic, never frozen): ring A's set rocks and its quarters breathe in and out,
 * ring B's lid sweeps over the orb and back, C / D keep their beat. Zero up to tp 3.6, full from 4.6.
 */
function breathe(tp: number, out: HoldParams) {
  const k = smoothstep(3.6, 4.6, tp);
  if (k <= 0) return;
  const t = tp - 3.6, TAU = 2 * Math.PI;
  out.phi += k * 5 * Math.sin((TAU * t) / 8);
  out.pushT += k * 0.04 * Math.sin((TAU * t) / 6.2);
  out.pushB += k * 0.04 * Math.sin((TAU * t) / 6.2 + 2.1);
  out.pushL += k * 0.05 * Math.sin((TAU * t) / 7.1 + 1.0);
  out.pushR += k * 0.05 * Math.sin((TAU * t) / 7.1 + 3.3);
  out.sigT += k * 4 * Math.sin((TAU * t) / 5.3 + 0.7);
  out.sigB += k * 4 * Math.sin((TAU * t) / 5.3 + 2.8);
  out.rollT += k * 5 * Math.sin((TAU * t) / 6.7);
  out.rollR += k * 5 * Math.sin((TAU * t) / 6.7 + 1.9);
  // B's lid: from F444's "seen from above" (+10) over the orb to "seen from below" and back, a 9 s sweep.
  out.betaB = out.betaB + k * (10 * Math.cos((TAU * t) / 9) - 10);
  out.rhoB += k * 5 * Math.sin((TAU * t) / 7 + 1.3);
}

/** The hold pose at tp seconds into the hold timeline. */
export function holdParams(tp: number, out: HoldParams) {
  const T = HOLD_TUNE;
  const w = smoothstep(T.wIn0, T.wIn1, tp);
  out.wA = w;
  out.wI = w;
  out.freeze = smoothstep(0.2, 0.4, tp);
  for (const k of CURVED) out[k] = HOLD_CURVES[k] ? curve(k).at(tp) : 0;
  out.splitB = curve("bsplit").at(tp);
  const psi = psiAt(tp);
  out.psiC = psi;
  out.psiD = psi + T.psiDExtra * smoothstep(0.6, 1.0, tp);
  breathe(tp, out);
  return out;
}

/** The release pose, tr seconds after the pointer-up, from the hold pose `from` at that moment. */
export function releaseParams(from: HoldParams, tr: number, out: HoldParams) {
  copyHoldParams(from, out);
  // Ring A finishes its clockwise turn and lands face-on, quarters at 12 / 3 / 6 / 9 with gaps on the diagonals (F452),
  // then closes (F456) and stays the face-on eye until the tumble takes over (F460-F465).
  const e = smoothstep(0, 0.3, tr);
  out.phi = from.phi + (120 - from.phi) * e;
  out.rollA = from.rollA * (1 - e);
  const gap = curve("gapRel").at(tr);
  for (const s of ["T", "L", "B", "R"] as const) {
    out[`push${s}`] = from[`push${s}`] + (gap - from[`push${s}`]) * e;
    out[`sig${s}`] = from[`sig${s}`] * (1 - e);
    out[`tilt${s}`] = from[`tilt${s}`] * (1 - e);
    out[`roll${s}`] = from[`roll${s}`] * (1 - e);
    out[`spin${s}`] = from[`spin${s}`] * (1 - e);
    out[`hng${s}`] = from[`hng${s}`] * (1 - e);
  }
  // (0.55-0.85 until round 11 step 2: the hand-back reached the 15 deg / frame turn limit at some press moments.)
  out.wA = from.wA * (1 - smoothstep(0.55, 1.0, tr));
  // B / C / D hand over early to the release's inner alignment (the whirl at F452-F453, the eye at F460).
  out.wI = from.wI * (1 - smoothstep(0.02, 0.34, tr));
  out.freeze = from.freeze * (1 - smoothstep(0.55, 1.0, tr));
  return out;
}

/** Keys evaluated from HOLD_CURVES (a missing table is 0). */
const CURVED = HOLD_KEYS.filter((k) => !["wA", "wI", "freeze", "splitB", "psiC", "psiD"].includes(k));

export function zeroHoldParams(out: HoldParams) {
  for (const k of HOLD_KEYS) out[k] = 0;
  return out;
}

/** The release pose a debug `pose("release", t)` starts from: a hold released at the reference's F443. */
export const RELEASE_FROM_TP = 3.73;

const DEG = Math.PI / 180;
const Xv = new THREE.Vector3(1, 0, 0);
const Zv = new THREE.Vector3(0, 0, 1);

/**
 * The hold view frame: a rotation whose z points from the lifted orb to the hold camera (CAM_TARGETS.expand), x to the
 * screen's right, y up. Every hold target is built in it, so "face-on" means face-on to the hold camera.
 */
export function holdViewFrame(out: THREE.Quaternion) {
  const e = CAM_TARGETS.expand;
  const az = (CAM_TARGETS.rest.az * DEG), el = e.el * DEG;
  const toCam = new THREE.Vector3(e.r * Math.cos(el) * Math.sin(az), e.r * Math.sin(el) - HOLD_TUNE.holdLift, e.r * Math.cos(el) * Math.cos(az)).normalize();
  const x = new THREE.Vector3(0, 1, 0).cross(toCam).normalize();
  const y = new THREE.Vector3().crossVectors(toCam, x);
  return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, toCam));
}
void HERO_CENTER;

/** Ring A's rigid-turn axis in the view frame: (-1, 1, -1)/sqrt(3) maps front -> right, left -> top, back -> left. */
export const A_TURN_AXIS = new THREE.Vector3(-1, 1, -1).normalize();

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
/** Ring A's canonical target: view frame * roll * turn(phi - 120). Local slots: right +x, top +y, left -x, bottom -y. */
export function targetA(view: THREE.Quaternion, P: HoldParams, out: THREE.Quaternion) {
  return out.copy(view).multiply(qa.setFromAxisAngle(Zv, P.rollA * DEG)).multiply(qb.setFromAxisAngle(A_TURN_AXIS, (P.phi - 120) * DEG));
}
/** Ring B: view frame * roll * (edge-on, tilted betaB towards the camera). The cut runs along local x (left-right). */
export function targetB(view: THREE.Quaternion, P: HoldParams, out: THREE.Quaternion) {
  return out
    .copy(view)
    .multiply(qa.setFromAxisAngle(Zv, P.rhoB * DEG))
    .multiply(qb.setFromAxisAngle(Xv, (-90 + P.betaB) * DEG))
    .multiply(qa.setFromAxisAngle(Zv, P.gammaB * DEG));
}
/** Ring B at the pop (the -46 deg bar), the pose its symmetry is latched against. */
export function targetBPop(view: THREE.Quaternion, out: THREE.Quaternion) {
  return out.copy(view).multiply(qa.setFromAxisAngle(Zv, -46 * DEG)).multiply(qb.setFromAxisAngle(Xv, -98 * DEG));
}
/** Rings C / D: view frame * tip back by psi (top away from the camera). */
export function targetCD(view: THREE.Quaternion, psiDeg: number, out: THREE.Quaternion) {
  return out.copy(view).multiply(qa.setFromAxisAngle(Xv, -psiDeg * DEG));
}
