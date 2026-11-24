# P4 round 1 - lane orb (p4orb) - HANDOFF (21 Nov 2026, builder; FIX ROUND 01:17-02:1x by the fixer, see the first section)

## FIX ROUND (judge p4orb: FAIL, F1 / F3 major regressions, F2 major open, F4 minor open) - what changed and the numbers
Judge evidence: MAIN/notes/round11/lane_backup/p4r1/judge_p4orb. Fixer work: WORK/fix (tools, batches ab1..ab8, f3/), LOG "FIX ROUND".
Method: every number below is a paired, deterministic A/B in this lab (the judge's flick.mjs method: engine loop off, same call
sequence per config from a fresh page; WORK/fix/tools/detab.mjs, `--tau0 3.3` pins the ring clock at the hold start, which
reproduces the judge's MAIN p05 to the digit: orb box241 17.6 % clipped). Reference figures are the judge's (jclip / jorb).

| finding | status | before (lane) | after (final) | MAIN | reference |
|---|---|---|---|---|---|
| F1 hold core (p05, box241 min-ch >= 248 / >= 250) | **fixed** | 2.9 / 0.0 % | 19.3 / 14.4 % | 17.6 / 13.0 % | F402 16.2 / 14.3 % |
| F1 disc L10/50/90, sd (p05, r < 0.85 R) | fixed | 201/248/250, 22.1 | 215/253/254, 19.3 | 190/253/254, 28.8 | F402 198/252/255, 24.2 |
| F1 inner disc lane - MAIN (p05) | fixed | -3.0/-4.6/-4.4 (cream) | +0.7/-0.2/-0.2 | 0 | |
| F1 rim annulus 0.85-1.02 R (projected), B-R (p05 / p06) | fixed | +26 / +22 grey | +27 / +24 cool | +62 / +57 cobalt | F402 +25..+28 |
| F1 release / eye clip (paired; p07, p08, q03; >= 248 / >= 250) | ok | | 0.5/0.0, 6.7/4.7, 10.3/5.6 % | 0.7/0.4, 7.1/5.9, 11.3/8.2 % | F460 5.1/4.5 % |
| F3 ice around the hold orb, judge's own flick + jring, annuli 1.0-3.5 R | **fixed** | -1.2 -1.1 -3.7 -4.3 -3.0 -2.2 -0.4 L | +1.05 +1.41 +1.27 +0.59 +0.91 -0.06 +0.11 L | 0 | the reference brightens in the hold |
| F3 changed non-orb px (>4 L) that got brighter | fixed | 34 % | 99.2 % | | |
| F2 refracted world / wisps inside the open orb | **open** (design decision) | flat 248 plateau | clipped core, faint shapes only | | F402 dark branching structure |
| F4 crystal top facets (p95 of B-R >= 85 px, +10 L wanted) | **open** | 160-161 | 158-162 (unchanged) | 159-164 | 170-178 |

What the fix did (Orb.ts, PostChain.ts only; Shards.ts untouched):
- **Hold exposure back to MAIN's**: `Orb.holdCut` 1.1 -> 0.3 (= MAIN's x(1 - 0.3 h); still a live knob), the ORB_P4 hold shoulder /
  top (`uP4Orb.y` 4, `uP4OrbB.x` 16) and the hold sheet pre-filter (`uP4OrbB.y` 0.5) removed: MAIN's shader lines are back.
- **R / B dispersion taps removed** (judge F2: invisible at copy mip 2, 2 copy taps per outer-zone pixel).
- **Cool grazing-exit annulus in the hold** (new, judge F1's ask): `col *= mix(1, uP4Rim, uRim * smoothstep(uP4Orb.w, 0.97, bImp))`,
  uP4Rim (0.8, 0.93, 1.15) from 0.75 R. A mild (0.9, 0.98, 1.08) from 0.8 moved B-R by 1: the hold skirt's mint-neutral light lay
  over the limb.
- **Hold skirt** `PostChain.holdGlowK` 4 -> 2: with the orb at MAIN's exposure the skirt carries most of the box clip (K0 5.9 / 1.8 %,
  K2 16.0 / 5.8 %, K4 22.4 / 15.2 % at hold lens 1.0 / 0.12) and K4 veiled the limb.
- **Hold lens shading kept at the builder's 0.8 / 0.25** (now `uP4Orb.y / z`): 1.0 / 0.12 gave no more structure (disc sd 18.7 vs
  19.3) and shaded the orb's copy, so the ice around the half-hidden hold orb read 0.4-1.4 L under MAIN's (F3 setup, batch ab6).
- Uniforms now: `uP4Orb` = (lavender multiply 0.15, hold lens weight 0.8, hold lens floor 0.25, rim tint start 0.75), `uP4Rim` =
  (0.8, 0.93, 1.15); `uP4OrbB` is gone. Rest frames are unchanged (uRim = 0): q00 inner disc - MAIN -1.0/-0.8/-0.9 as before.
- The judge's literal revert (holdCut 0.3 + shoulder 6 + pre-filter 0, keeping K4 and the builder's lens): p05 25.1 / 22.2 %, rim
  B-R +18, so the skirt and the tint were needed on top.

Checks on the final build: ident (ident/summary_fix.txt) `?p4orb=0` vs :5197 IDENTICAL at T1, T2, T1 HOLD (pose expand 2.97), T0 phone,
`?envlake=plate`; the 3 sub-switches IDENTICAL; lane ON at T0 IDENTICAL; lane ON T1 HOLD differs only in main / refraction / bloom0-4 /
final + rx-orb, rx-shards, rx-bloom-down, rx-bloom-up, rx-grade. Perf (perf/ftime_fix.json, sync, 8 pairs, load <= 3.5): rest paired
mean-ratio median 0.999, hold 1.001; real loop (perf/rtx_fix.*, 6 interleaved pairs, SLOT_BG=0): move 0.972, rest 0.950, hold
0.932 (4 pairs below load 10; vsync-quantized, noisy): no regression > 5 %. tsc hero 0 / project 0. Patch regenerated (WORK/p4orb_vs_aa7.patch,
682 lines, sha256 986d3bd6...; the builder's is kept as WORK/fix/p4orb_vs_aa7.builder.patch), applies to a fresh aa7 clone, app/
identical, tsc 0 / 0. Capture set WORK/qc_fix (qc_r11.zsh T1 1, exit 0, no page errors): its p05 caught the orb fully open (bright
radius 92 px vs the MAIN run's 83; other crystal positions, the harness is not phase-deterministic): 25.0 / 19.3 %, a clipped disc with
a cool limb (fix/orb_stretch_p05_p06_fix.png, fix/full_p05_p06_MAIN_FIX_REF.png); use the paired A/B above for F1, not unpaired runs.

Open, with options:
- **F2 (structure inside the open hold orb)**: the clipped core is back but shows only faint shapes; F402's dark branching structure is
  not there. The lens shading cannot draw it from the current copy (above). Options: (a) a slowly churning domain-warped density in the
  hold that darkens 15-25 % of the disc to lavender-grey 190-215 inside the clipped core (judge's (b); procedural, needs a reference
  check against F402 / F453 frame by frame so nothing is invented); (b) a Cycles flipbook of the artist's volumetric orb (judge's (c);
  Blender is the env lane's this round; an asset of a few MB; still real time); (c) accept the clipped core with a cool limb.
- **F4 (crystal highlights)**: measured, not shipped: top facet value `uR11Sh.z` 1.22 -> 1.34: p95 +1.1..+1.9 L, sat -0.002;
  internal reflection `uP4ShB.y` 0.35 -> 0.5: p95 +2.8 (p04) / -2.7 (p05) / -2.9 (p06). The p95 of B-R >= 85 pixels is capped by
  AgX's highlight desaturation (a brighter blue facet drops out of the mask), so +10 L needs a chroma-preserving lift of the top facets
  (a design decision on the crystals' grade). p06 saturation (qc_fix 0.457, F420 0.506) is the builder's chroma 0.68, unchanged here.

---

Tasks from MAIN/notes/round11/p3/r11_1_plan.json: **Q2** (orb as a refracting glass sphere), **Q7** (shards as translucent glass
crystals) and the **orb / post part of Q4** (a visible charge in the hold, glow hues). IceMaterial.ts untouched (ice lane).
Lab: http://localhost:5176 (left running for the judge). WORK = $SP/work_p4/p4orb ; backup MAIN/notes/round11/lane_backup/p4r1/p4orb/.

## Switches (all restore MAIN exactly; proven with ident, see Evidence)
| switch | effect |
|---|---|
| `?p4orb=0` | the whole lane off: MAIN byte for byte (programs, render targets, final image) |
| `?orbglass=r11` | Q2 off (orb lens, rim, hold exposure) |
| `?shard2=r11` | Q7 off (crystals) |
| `?orbcharge=r11` | Q4 orb / post off (the hold's wider orb glow) |
| T0 | never takes the lane (HeroEngine `p4 = P4ORB && tier != T0`): T0 phones unchanged, with or without a switch |

Live knobs (lab console): `__hero.orb.holdCut`, `__hero.orb.material.uniforms.uP4Orb / uP4Rim / uScreenBg / uHoldFill`,
`__hero.post.holdGlowK / orbThr`, `__hero.shards.material.uniforms.uP4Sh / uP4ShB / uR11Sh`. (Fix round: `uP4OrbB` is gone.)

## Files (builder's text; the fix round's changes are marked "FIX". Patch now 682 lines, sha256 986d3bd6..., see above)
- **hero/Orb.ts** (Q2, `#ifdef ORB_P4`, T1 / T2 with the round-11 orb):
  - Screen lens on: `uScreenBg` (0, 2.5, 1.5, 1) -> (0.65, 2.5, 2.0, 1). The T1+ graph already holds the far half of the cage in the
    copy before the orb, so the ball shows the rings behind it inverted (F402 / F453), and grazing exits read the scene instead of
    the panorama's deep blue (that was the dark cobalt limb). Copy mip 2 (sharper drew teeth at the limb, plan risk).
  - Lens shading: `uHoldFill.z` 0 -> 0.5, `uShadeFloor` 0.15 -> 0.35 at rest; in the hold 0.8 / 0.25 (FIX: now `uP4Orb.y / z`,
    mixed by `uRim`), faded out over 0.85-0.97 R (shaded, the glass zone beyond the plasma read as a grey bezel).
  - Rim: shell band start `uR11OrbC.y` 0.95 -> 0.975, lavender multiply 0.35 -> 0.15 (`uP4Orb.x`), the mint limb also in the hold
    (`uR11OrbB.z` 0 -> 1 = the rest's value). FIX: the R / B dispersion taps are removed; a hold-only cool tint of the grazing-exit
    annulus (`uP4Rim` (0.8, 0.93, 1.15) from `uP4Orb.w` 0.75 R) is added.
  - Hold exposure: FIX: REMOVED. `Orb.holdCut` 0.3 = MAIN's gain x(1 - 0.3 h); the hold shoulder 4 / top and the hold sheet
    pre-filter are gone (MAIN's lines). (The builder's x(1 - 1.1 h), shoulder 4, pre-filter 0.5 made the open hold orb an unclipped
    grey-cream plate and dimmed the ice around it: judge F1 / F3.)
- **pipeline/PostChain.ts** (Q4, `#ifdef POST_P4`): the bloom mips' alpha carries the orb band alone (threshold `orbThr` 5),
  up-sampled with wider weights (`UP_WEIGHTS_ORB`), read from the quarter-resolution level in the grade and added x `holdGlow` (=
  `uHold`, 0 at rest) x `holdGlowK` (FIX: 4 -> 2), tinted like the orb band (mint). rgb chain unchanged (ONE / ONE blending == additive with
  alpha 1). Rest frames: nothing added.
- **hero/Shards.ts** (Q7, `#ifdef SHARD_P4`): internal mosaic (3 hashed cut planes per crystal in its own frame -> 8 internal
  facets with their own value, internal normal and two PMREM taps; the plane sides blend over ~1 px via fwidth, anti-aliased),
  internal reflection 0.35 on ~40 % of the facets (pale periwinkle sub-facets), absorption density x0.7, body cap 1 -> 1.15,
  `uR11Sh` 0.75 / 0.4 -> 0.68 / 0.55 (chroma, darkest facets), thin tips / grazing silhouettes pass 20 % of the scene behind
  unabsorbed, far-side haze 0.45 -> 0.5 including the scene behind (paler see-through far crystals). (Stronger settings, v6-v11:
  the far / intro crystals went paper-white in the sweep, the QC round 9 complaint; final = batch v12 s1.)
- **HeroEngine.ts**: the tier gate (`p4`), passes it to Orb / Shards / PostChain, `pp.holdGlow = uHold`.
- **quality.ts**: `laneSource(src, name, on)`: off, a lane's `#ifdef <name>` blocks are resolved (their `#else` kept), so the shader
  source is byte-identical to MAIN (the first ident showed identical pixels but different program text).
- No assets.

## Evidence (WORK paths; key files mirrored to the backup)
- **ident** (tools/identP.mjs = AA8's identS + main, refraction, back, every bloom mip, post LDR; 20 moving frames; ident/summary_final.txt):
  `?p4orb=0` vs :5197 IDENTICAL (final, 14-15 targets, every linked program) at T1, T2, T0 phone (390x844 DPR3) and
  `?envlake=plate`; lane ON at T0 phone IDENTICAL; `?orbglass=r11&shard2=r11&orbcharge=r11` IDENTICAL; lane ON T1 differs only in
  main / refraction / bloom0-4 / final and rx-orb, rx-shards, rx-bloom-down, rx-bloom-up, rx-grade (mirror, walk, cache, hero
  reflection, back untouched).
- **perf** (T1, scale 1, 1440x766, SLOT_BG=0, load < 10): real loop (tools/rtx.mjs, the aa7 judge's cross-lab tool + hold blocks,
  6 interleaved pairs per mode): paired mean-interval ratio medians move 0.984, rest 0.941, hold 1.022 (vsync-quantized, block
  fps 24-53 in both labs: noise > effect). Synchronous frame time (tools/ftime.mjs: both labs in one browser, loops off, 8
  alternations x 60 frames + 1-px readback), v6 build at load 4-8: rest paired ratio median 0.995, hold 1.013; FINAL build
  (perf/ftime2.json): hold 0.996 (all 8 pairs load < 10, range 0.815-1.035), rest 0.999 (load 9.5-10.8, borderline; one
  warm-up outlier 2.24). No regression > 5 %. Extra work: orb +3 copy taps per orb pixel (lens + 2 dispersion taps in the outer zone), shards +2 PMREM
  taps per crystal pixel, post +1 tap per pixel in the grade and the alpha math in the bloom passes (no new pass).
- **captures**: WORK/qc_final (qc_r11.zsh, T1 scale 1), stats ana/final_stats.txt (tools/orbstats.py, shardstats.py: Blender
  python -I); tuning batches img/v1..v12 (qcap.mjs with the ring clock pinned at the hold start, `--tau0`).
- Numbers (BUILDER's build; the hold-orb numbers are SUPERSEDED by the FIX ROUND table at the top) (panel's MAIN set $SP/p3/r11_1 ->
  lane WORK/qc_final, same disc metric, ana/final_stats.txt; reference in brackets):
  - Hold p05 orb box241 clipped 17.6 % -> 0 %, disc L50 / L90 / sd 253 / 254 / 30.8 -> 247 / 249 / 21.2; p06 16.2 % -> 0 %,
    250 / 254 / 27.6 -> 246 / 249 / 21.6 (plan: <= 5 %, L90 <= 250, sd >= 15; F420 box 2.9 %, sd 21); frame p99 253 -> 247-248;
    the cobalt limb is gone (rim zone 0.90-1.0 R ~150 -> 190-200; F402 ~200).
  - Rest / eye: q00 disc L50 / sd 219 / 28 -> 215 / 25 (F000 229 / 22); q03 242 / 16.3 -> 242 / 22.9 (F045 243 / 21.4); q01, q02
    within 3 L of MAIN. Environment region means (region_stats_q00) equal MAIN's within 1 level.
  - Shards (B-R >= 85 px, hero box at rest / whole frame in the hold), MAIN -> lane: q00 L med 133 -> 140, p95 161 -> 166, sat
    0.524 -> 0.457 (F000 149 / 175 / 0.457); q01 125 -> 134, 0.558 -> 0.483 (F015 144 / 0.478); q03 128 -> 134, 0.545 -> 0.478
    (F045 136 / 0.500); p04 132 -> 141, 0.536 -> 0.461 (F358 152 / 0.447); p06 128 -> 140, 0.546 -> 0.456 (F420 137 / 0.506); hue
    223 deg at every pose (reference 221-222). Sweep stills: no paper-white crystals, internal lines anti-aliased
    (final_img/sweep_crystals_*.png); frame-to-frame flicker was not measured separately.
- Final crops (backup root): hold_p05_MAIN_lane_F402.png, hold_p06_MAIN_lane_F420.png, eye_q03_MAIN_lane_F045.png,
  rest_q00_MAIN_lane_F000.png, sweep_crystals_lane_MAIN_intro34.png, crystals_zoom_lane_vs_F015.png.

## Open (honest) (builder's list; FIX ROUND: the hold orb is clipped again and the ice ends brighter than MAIN, see the top)
- The open-orb hold (nothing of the cage behind the ball, e.g. qc p05) is now an even, unclipped glow (sd ~10-18): no plate and
  no cobalt outline, but it reads as a soft pearl rather than F402's glass ball with dark refracted structure. The structure
  appears only when far rings lie behind the ball (pose-dependent, as in the reference). A Cycles flipbook of the volumetric orb
  (the panel's option c) would be the next step; not attempted (Blender belongs to the env lane this round).
- The rim's violet / mint dispersion (uP4Orb.z) is too subtle to see at copy mip 2; the rim is a thin pale line, not violet.
- "Pale blue-white in the ice, periwinkle not teal": the teal over the orb comes from the ice's orb-through term (IceMaterial
  r11ClampOrb / uR11Tint, ice lane's Q4 step 3), not from the orb (its disc mean is blue-white, B > G > R). Not touched here;
  the hold skirt is tinted mint like the orb band (mint at the orb's edge).
- No core pulse: the plan's +-4 % 0.5 Hz pulse has no evidence in the reference stills (rule: nothing invented); the hold's
  charge is the wider glow only. Easy to add in Orb.update if the judge wants it.
- Crystals' p95 rose little (160-166 vs the reference's 170-175); the B-R >= 85 mask drops the palest (most translucent)
  pixels, so medians understate the lift. The reference's far crystals are also soft (DOF / motion blur), ours stay crisp.
- (FIX ROUND: no longer true: the hold orb is at MAIN's exposure, the ice around it +0.6..+1.4 L over MAIN's without the ice lane.)
- Merging with the ice lane: both lanes touch the orb-through look (the ice reads the orb's mean from the copy; Q2 lowers the
  hold orb ~0.9 EV, so the band in front of it dims unless the ice lane's x1.4 hold term lands too).
