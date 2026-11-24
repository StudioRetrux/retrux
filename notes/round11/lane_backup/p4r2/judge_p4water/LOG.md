# JUDGE p4water (lane 'water', lab :5177) - 21 Nov 2026 04:30-05:20 WIB
Read: brief p4r2_common.md, plan G2/G6/Q8/Q9 in full, panel issues (env, hold-sweep, cursor-orbit), builder LOG/patch (457 lines, Water.ts only, sha256 eeb37e42... verified, lane app/ differs from aa8 only in Water.ts).
## ident (own re-run, tools/identS.mjs copy, ana/ident_summary.txt)
T1 ?p4water=0 vs :5199 IDENTICAL (final, 6 targets, 16 programs); T2 IDENTICAL; HOLD pose (debug.pose('expand',2.97) + 20 moving frames) ?p4water=0 IDENTICAL (18 programs);
HOLD lane default vs :5199 DIFFER (walk, cache, cacheN, final; 4 water programs) = sanity; T0 phone lane default IDENTICAL. 0 console lines.
## perf (tools/rc2h.mjs copy, interleaved, SLOT_BG=0)
run1 (6 pairs, contended: bimodal 35/60 ms blocks) move 0.956, rest 1.135 (mixed-regime pairs), hold 1.014 -> invalid for rest.
run2 (6/8/6 pairs, load < 5.3, all same regime) move 1.003 (+0.13 ms), rest 0.930, hold 0.986 (-0.6 ms) -> all < 5 %. Frame times ~2x the builder's (GPU shared by a non-slot process), ratios valid.
## captures: own qc_r11 set (qc/), same-session A/B ab/{def,r11_,off}{1,2} q00+q03, ab/ptr_off (pointer set at ?p4water=0)
- G2: hold/pop bottom strip glass plate, stair steps, dashed line gone in p04-p06 and every sw_hold/sw_pop (img/p0*_bot_M_L_R_x1.png, sw_*_bot_M_L.png). Remaining: flat hard-edged over-saturated dark-blue dashes (p04 x89-135 y705-709 rgb 71,104,149; p05 x574-610 y753-758), lap 10-12.6 vs ref 5.2-6.3 (finer than F402/F420), faint stepped crest edge p06 x0-180 y708-718.
- Q8: REGRESSION q00 glint: centre column x680-760 y640-700 L off 182.1 -> lane 176.4 (2 runs; ref 200.3); glint box 181.1 -> 176.0 (ref 190.5); q03 -3.1. p4GgxAniso alpha 0.16 x 0.078 < MAIN 0.28 iso (plan 0.45 x 0.2). img/q00_glint_x2_Off_Def_Ref.png. Ring boxes: no gain (grade p1 140 vs ref 109).
- Q9: far band glassier (right floes lap 9.1 -> 5.9, sd4 4.06 -> 2.94 = ref), corduroy box lap 12.0 -> 10.5 (ref 2.5), < 30 m keeps stripes. REGRESSION: unmasks the orbit ghost (G6 off): ptr_right box x530-600 y472-505 mean/sd same (191.4/5.45 vs 191.5/5.54) but sd4 3.07 -> 2.39, lap 7.60 -> 4.79: jagged pale blotches with spikes read clearly (img/ptrL_x3_Off_L.png, ptrL_ghost_c3_x2_M_Off_L.png, ptrR_ghost_c3_x2_M_Off_L.png).
- AJ-1 tip spot: unchanged (q00 box x170-240 y497-509 identical stats; img/tip_x4_M_L.png).
- outside the water: no lane diff (q00 def vs off diff map: ring zone, far band, near glint; shards differ by capture timing only).
## 05:07 hold-path temporal flicker (builder's raw caps hold_M0 = AA8/MAIN, hold_Z = lane final; tools/flick.py; ana/hold_flicker.txt)
bottom strip y686-766, sign-reversal flicker (>8 up then >8 down in consecutive frames): press k30-150 4.76 % -> 6.55 % (+38 %),
sustain k150-300 0.69 % -> 1.06 % (+54 %), release k330-420 5.06 -> 4.87 (same); y600-686 sustain equal. Extra flicker sits at x0-120 and
x1020-1440 (1-2 % vs 0.2-1 %). img/hold_k200-202_x1140-1400_M0_Z_x2.png: lane chop carries 1-2 px horizontal texel streaks.
## verdict: pass = false (3 majors: Q8 glint dimmer at q00, Q9 unmasks the orbit ghost, G2 bottom-strip flicker up; minors open)
