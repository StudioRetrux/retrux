# AA5c lane log: COST of the AA3 waterline fix (B: mirror every moving frame, C: lake-edge TAA), 20 Nov 2026 (WIB)
LANE = ~/Library/Caches/retrux-lanes/aa5c/retrux-web (APFS clone of aa3_fixed1), lab :5195. REF = aa3_fixed1 (frozen; an APFS
clone of it in $W/ref is served on :5195 only for G8 comparisons). BASE lab :5182 (read only). WORK $W = $SP/work5/aa5c.
Backup: MAIN/notes/round11/lane_backup/aa5c/ (LOG + patch + key images). All headless Chrome through slot.mjs.

## 0. Start (16:25)
- Read AA3 LOG (A/B/C, fix round 1), aa3.patch, perf judge + recheck: in-session pin (1440x766 medium, 8 cycles, load 9.7):
  full 1.076, B only 1.059, C only 1.024; fast full 1.104; 1920 full 1.086; real loop rtpin 1.069 (1440) / 1.047 (1920).
- Lane == aa3_fixed1 (app, hero-lab: diff -rq identical). Lab :5195 started (build ok).
- Tools copied from work3/aa3/tools + judge perf/motion tools into $W/tools (ports / paths to be adapted per tool).
- New tools/mb.mjs: pin.mjs's in-session rotation + named runtime configs + CPU time of the frame / mirror pass + isolated
  synced timings (mirror pass with / without mips, mips alone, walk).

## 1. Where B's cost goes (16:30-17:15; tools/mb.mjs, in-session, every frame synced; machine contended: frames 38-62 ms)
- Sync caveat: gl.finish() and a 1-px readPixels of the canvas do NOT wait for off-screen passes on ANGLE Metal (segment
  timings summed to ~1.5 ms of a 45 ms frame); only the frame-end readPixels (after the post pass) is a full sync. So pass
  costs were attributed with EXTRA passes per frame (X4 = 4 more mirror passes per frame, variants), paired ABBA blocks.
- One mirror pass in a frame = 3.07 ms here (X4 vs none), i.e. ~1.5 ms at the judges' 24 ms frames. B = 2/3 of a pass per
  frame. Mips 0.39 ms / pass, the baked surfaces 0.93 ms (CPU 0.25 of it), sky ~0.4 ms (before), clouds ~0, the rest
  (pass begin / store, CPU 0.15) ~0.5-0.9 ms. Mirror pass CPU (draw submission) 0.45-0.7 ms per frame with B.

## 2. AA5c-1: same mirror target for less work (17:00-17:15), `?mirrorcost=0` off; lab ?debug&mcsky=0 / mcslim=0
- LakeMirror.setSkyLate: the sky triangle drawn LAST among the opaque draws, at the far plane (z = w) with LEQUAL depth test
  (SKY_VERT_LATE), so only uncovered texels run SKY_FRAG (it ran under every surface); clouds (transparent) still after it.
- PlateEnvironment.mirrorSlim: during the mirror pass the 33 baked meshes swap to a twin ShaderMaterial (same vertex shader,
  copied defines, the same uniforms object, same side) whose fragment shader is the uber-shader's mirror branch alone
  (PLATE_MIRROR_FRAG); swapped back after the pass. Twins created lazily in traversal order (opaque sort by material id kept).
- Identity (tools/ident2.mjs, per frame, 48 moving frames, medium and fast): mirror 48/48, walk 48/48, final 48/48 hashes
  EQUAL on vs ?mirrorcost=0; programs differ only by the new rx-lake-sky-late / rx-plate-baked-mirror (and rx-lake-sky unused).
- Cost (mb7, 4 extra passes / frame, 8 cycles, load 3.1): per pass 3.07 ms -> sky late -0.35, slim -0.8, both -1.0 ms
  (X4mc paired 0.929 of X4). mb8 (load 2.9): pass with both = 2.20 ms; geometry 0.93, mips 0.39, clouds ~0, sky ~0 left.
- Identity of AA5c-1 on every path (ident2, lane default vs ?mirrorcost=0, per frame mirror / walk / final hashes): slow 72/72,
  medium 48/48, fast 48/48, reverse 120/120, leave 180/180 (pointer leaves, rest after), hold 400/400 (press k30, dolly,
  sustain, release k330, after), 1920x1080 medium 36/36, DPR 2 medium 24/24: ALL EQUAL. 0 console errors / warnings.
  => the image is byte-identical to the AA3 lane's: G2-G6 and the rest look carry over unchanged from AA3's judged results.
- (17:20-17:45) C (TAA pass) attribution with in-page shader variants rendered into a scratch target (4 per frame): too noisy
  under the other lanes' concurrent captures (paired blocks 0.7-1.5; T4copy = T4 in one run): no reliable split. Copy-only
  pass ~0.33 ms, full TAA ~0.8-1.0 ms per pass (contended) in mb10. No C change made (nothing exact and measurable found).
- Mip cap (17:50): TEXTURE_MAX_LEVEL 5 at 1440 (mirror 720x383): final / walk 48/48 + rest 24/24 EQUAL (lkmmax=5); 4 differs
  (0/48). Added as AA5c-2 (LakeMirror.mipCap, mipCapLevel = 5 + one per doubling of the target width over 720), lab ?mcmip=0.
  In-session cost (mb9, 4 extra passes): mip6 -0.10, mip5 -0.20, no mips -0.48 ms per pass (noise +-0.2).
- Mip cap REJECTED (17:58): with the cap (5 at 720 texels) the hold differs from k88 on (final 125/400 equal; mirror and walk
  equal): the dolly's larger lake footprints read level 6+. Saving too small to chase a safe level (~0.1-0.2 ms / pass).
  Code removed; lane = AA5c-1 only (sky late + slim mirror materials).

## 3. Gates for AA5c-1 (17:30-18:00)
- G8 (tools/b_g8.sh; REF = APFS clone of aa3_fixed1 served on :5195, then the lane): REF vs lane ?mirrorcost=0: medium 48/48,
  hold 400/400, T2 medium 36/36 frames with mirror / walk / final hashes EQUAL, linked programs IDENTICAL (17, none differ);
  REF vs lane default: final / mirror / walk EQUAL on the same runs (programs: + rx-lake-sky-late, rx-plate-baked-mirror, and
  rx-lake-sky not linked); T0 phone (ident.mjs --mobile) and ?envlake=plate: final SAME, programs SAME (12). 0 console
  errors / warnings in all sessions.
- tsc hero + project clean (17:50).
- G7 stepped, synced, in-session (tools/mb.mjs, ABBA blocks of 40 frames, confs noneO = BASE schedule + no TAA + AA3 mirror
  pass, fullO = AA3 lane, fullN = AA5c default; contended machine: another lane's priority job held the other slot, frames
  40-66 ms instead of the judges' 24):
    1440 medium 12 cycles load 3.3: ratio of medians fullO 1.073 fullN 1.042; paired med fullO 1.121 (IQR 1.052-1.136) fullN
      1.069 (IQR 1.043-1.155); fullN / fullO paired 0.990
    1440 fast 10 cycles load 3.8: fullO 1.093 fullN 1.038; paired fullO 1.074 (1.022-1.112) fullN 1.066 (1.025-1.074); N/O 1.015
    1920 medium 10 cycles load 2.9: fullO 1.069 fullN 1.060; paired fullO 1.067 (1.052-1.072) fullN 1.069 (1.044-1.073); N/O 0.992
    1920 fast 8 cycles load 3.0: fullO 1.080 fullN 1.062; paired fullO 1.094 (1.074-1.097) fullN 1.078 (1.027-1.094); N/O 0.997
  => fullN is 1-3.5 % cheaper than fullO by the ratio of medians, but the paired N/O ratios (0.99-1.015) sit inside the noise.
- Patch (tools/mkpatch.sh: lane vs aa3_fixed1): 3 files (HeroEngine.ts, world/LakeMirror.ts, world/PlateEnvironment.ts), 203
  lines; tools/applytest.sh: applies with patch -p1 on a fresh clone of aa3_fixed1 and reproduces the lane's sources exactly.
- Directions tried and dropped (measured): (1) keep the 3-frame cadence: no exact way found in the time box (the jump is the
  lookups' dependence on the target camera at disocclusions / texel grid; a cross-fade of two targets ghosts and doubles the
  water's lookups); (2) cheaper mirror: sky late + slim materials ADOPTED (exact), mip cap REJECTED (hold differs), clouds
  ~0 cost, a smaller target / LODs / culling would change the look (not tried); (3) cheaper C: no exact saving measurable at
  this noise (the copy part of the pass is the sky rows only; scissoring them needs an edge-pass change for ~0.3 %).

## 4. Final checks (18:12-18:26; one priority slot batch, tools/b_final.sh)
- G7 real loop (tools/rtpin2.mjs = the judges' rtpin.mjs with 3 configs: the engine's own rAF, CDP mouse sweeps, ABC/CBA
  blocks of 2.2 s, scale 1, T1; machine contended: 22.7 fps at 1440, 16.7 fps at 1920):
    1440x766 6 cycles load 4.96->5.12: fullN paired 1.048 [1.035 1.043 1.048 1.027 1.051 1.071], ratio of medians 1.038;
      fullO (AA3) paired 1.077 [1.043 1.028 1.077 1.035 1.109 1.079], 1.058
    1920x1080 4 cycles load 4.8->6.1: fullN paired 1.052 [1.052 1.041 1.036 1.147], 1.071; fullO paired 1.106
      [1.11 1.077 1.062 1.106], 1.073
- G10 hitch (judges' hitch.mjs, lane, real loop): both new programs (rx-plate-baked-mirror, rx-lake-sky-late) linked BEFORE
  the first motion (24 programs at boot; after: only rx-water-cache / -cache-n, as in AA3); first-motion cpuMax 5.7 ms, cpu
  first 10 frames 2.5-4.4 ms (intervals 36-106 ms = the contended GPU, not CPU); 0 console messages.
- G6 real loop (judges' rl.mjs + rlana.mjs, medium 180 frames, stepped BASE mask): 1/3-cycle (20 Hz) component ALL band 0.9
  (BASE 2.8, AA3 fixed 1.6), per box 0.7-1.2 (BASE 1.8-4.0); 1/2 0.6-0.8. A 1/8 peak (0.11-0.13 cycles / frame) is 5.4 here
  (AA3 fixed 3.3, BASE 2.6): the camera's own per-frame step has it too (camera step spectrum 1/8 4.4 here vs 2.7 in the AA3
  run): the CDP mouse cadence beating with 19 fps frames (52 ms median, contended); stepped frames are byte-identical to AA3.
- Look (ident2 --dump, medium k29, lane default vs ?mirrorcost=0): 0 of 1,103,040 px differ (max 0);
  img/look_med_k29_lane_mc0_diff32_crop.png (lane / AA3 / diff x32 = black), looked at.

## STATE: DONE. Lane = AA5c-1 (exact): the lake mirror pass draws the sky last at the far plane (early depth reject) and the 33
## baked meshes through a slim twin material (the uber-shader's mirror branch alone). Frames byte-identical to AA3 on every
## path tested; ?mirrorcost=0 == AA3 exactly (frames, targets, programs). Cost: one mirror pass ~1/3 cheaper (amplified
## in-session test); B+C vs the BASE schedule: real loop 1.048 (1440) / 1.052 (1920) paired, stepped synced 1.04-1.06 by
## medians (1.066-1.078 paired), contended. G7 <= +5 % only borderline (1440 real loop yes, 1920 / stepped paired no); the
## remaining cost is the mirror pass's fixed part + mips (~1 ms / pass contended) and C's full-res TAA pass (~2-4 %).
