# judge_p4env3: write verdict.json (perf block read from perf/perf_summary.txt)
import json, os, sys
J = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4env3'
perf_txt = open(J + '/perf/perf_summary.txt').read() if os.path.exists(J + '/perf/perf_summary.txt') else 'not run'
perf_line = sys.argv[1] if len(sys.argv) > 1 else ''
v = {
 "judge": "judge_p4env3 (P4 round 3, lane env = p4env3, lab :5174 vs MAIN lab :5173 = int1)",
 "date": "2026-11-21 06:57-07:45 WIB",
 "pass": False,
 "why_not_pass": "Two of the lane's own tasks stay open (J1 pop wedge, J4 pale box: minor each, unchanged pixel for pixel) and J2 is unchanged (handed to the water lane). Every shipped fix (J3, J5, J6, J7) is verified, the switches restore MAIN exactly, and no regression was found.",
 "scores": [
  {"lens": "environment", "main": 7.8, "lane": 8.0},
  {"lens": "glitch_cursor_orbit", "main": 7.3, "lane": 8.7},
  {"lens": "glitch_hold_sweep", "main": 8.0, "lane": 8.3},
  {"lens": "awwwards_jury", "main": 7.6, "lane": 7.9}
 ],
 "score_basis": "MAIN = the panel's r11_1 captures (AA8). Lane = this judge's own qc_r11 set of :5174 (caps/qc), plus deterministic A/B frames at the same sim time vs :5173 (ab/m, ab/l). The lane is int1 (round-1 env + ice + orb + hold lanes) + env round 3, so part of the lift over r11_1 is int1's.",
 "verified": {
  "ident": "ident/ident_summary.txt (int1 identP.mjs, 20 moving frames, final + every render target + every linked program): ?p4env=0 :5173 vs :5174 IDENTICAL at T1 (14 targets / 16 programs), T2 (15/16), T0 phone (9/12). ?p4env3=0 vs :5173 IDENTICAL at T1, T2, T0, envlake=plate (10/12). Controls: lane default vs :5173 DIFFERS at T1 (final, mirror, walk, main, refraction, bloom0-4; rx-plate-baked, rx-cloud, rx-plate-baked-mirror); :5173 default vs ?p4env=0 DIFFERS. T0 lane default: final + 9 targets SAME, programs rx-plate-baked / rx-cloud differ. 0 console messages in 16 runs.",
  "ab_switch": "ab/l0 (:5174 ?p4env3=0) vs ab/m (:5173), 38 deterministic shots (10 pointer spots, 6 hold, 6 pop, 6 release, late90 x5, late150 x5): 38/38 PNGs byte-identical.",
  "rest_frame": "Same sim time (ana/rs_*): lane vs MAIN ptr_rest (t=8.5) 15/15 region boxes 0,0,0; late90_rest 15/15 0,0,0. Own qc q00 vs ref: within 2 of r11_2 except mid left (-5) and water near (+6), which is capture time.",
  "patch": "int1 app clone + p4env3_vs_int1.patch (295 lines, sha256 c58e6df7...) applies rc 0 and equals the lane app (diff -r empty). Lane vs int1 = p4env.ts, assets.ts, HeroEngine.ts (2 lines), Atmos.ts, PlateEnvironment.ts + public/hero/baked/Object_2_010_p4q.webp (39,074 B, sha256 74b33ea1..., served 200). int1 app == MAIN app.",
  "lab": ":5174 started 06:08:15, after the last source change (06:08:05): it serves the final code.",
  "typecheck": "npx tsc -p tsconfig.hero.json --noEmit --incremental false rc 0; npx tsc -p tsconfig.json --noEmit --incremental false rc 0 (tsc_*.log).",
  "perf": perf_line
 },
 "fixed_confirmed": [
  "J3 (far peak's warm rim in hold / pop): MAIN's 3-5 px beige band on the far peak's and far range's tops is gone in all 6 hold, 6 pop and 6 release shots and in the orbit spots (ab/m vs ab/l, same sim time; clusters x944-1120 y416-512 lane darker by 15-28 mean, max 65-86). There is no bare-sky sliver: img/j3_holdL_peak_x6_pct.png, img/j3_ptrTL_peak_x5_pct.png, img/hold_right_edge.png, img/pop_far.png, img/rel_far.png. At rest the light veil comes off the far range's top (ptr_rest x1216-1440 y352-400: 874 px, max 21, mean -5.6). That moves it toward F000 (img/rest_far_x3_pct.png, img/late90_farpeak_x3.png).",
  "J5 (summit zig-zag at long idle): mostly removed. late90_rest x262-288 y236-250: MAIN mean 147.5 / sd 12.5 -> lane 142.8 / 10.7. At 6x only a faint 1 px trace remains, invisible at 1x (img/zig_late90_x6.png). Isolated with ab/lnc (?p4crack=0): it only changes the massif's upper part (late90 176-268 px, max 75-83; orbits / holds 54-346 px, max 9-16; late150, pops and releases ~0). No halo or sliver at the summit edge (img/j5_holdB_x4.png, img/j5_ptrTR_x3.png).",
  "J6 (card-light floor on luma): the deeper drifting cloud shadows are back on the massif (late90 face box x200-420 y220-400: MAIN 162.8 / p10 138.5 -> lane 161.4 / 135.8; ptr_top_left etc. mean -3..-5 over 8-19k px, img/massif_late90_rest.png, img/massif_ptr_top_x2.png). There are no new black slits or specks: the frame's luma<50 count is equal or lower in all 38 shots.",
  "J7 (lossy WebP): the asset is 39,074 B as stated (lossless 117,944 B). In the builder's ab1/webp vs ab1/r1 (38 shots) the frames differ by at most 2 levels (builder: 1)."
 ],
 "regressions": "None at the severity of a regression. One nit-level side effect of J6: a few isolated pixels become more saturated (N1).",
 "findings": [
  {"id": "J1", "severity": "minor", "title": "Open, unchanged: the flat untextured slate wedge in the bottom-left corner of every pop frame",
   "evidence": "ab/m vs ab/l sw_pop_L x0-40 y700-766: luma 154.4 in both (bit-identical there); qc p04 x0-40 y700-766 lane 145.4 vs r11_2 145.2; F358 shows water and ice in that corner (img/j1_pop_corner_x2.png). No Blender run in the lane.",
   "repro": ":5174 ?debug=1, __hero.debug.pose('expand', 0.9) with the pointer at (-0.98, 0) (= sw_pop_L), look at x0-40 y700-766",
   "suggested_fix": "Plan G3 step 1: a Cycles plate at the pop camera (~[0.17, 2.27, 6.40]) from a copy of plate_scene_v7, projected into rock_big_4.005 texels x432-577 y213-366 (only those the rest camera does not see), colour-calibrated on texels both plates see. Or a composition-lane camera call."},
  {"id": "J4", "severity": "minor", "title": "Open, unchanged: the hard-edged pale box on the far-left shelf at rest and in every orbit",
   "evidence": "q00 x330-400 y467-480: r11_1 180.7, r11_2 180.7, lane 180.5, F000 161.5. The vertical cut at x~320 is visible in all three engine sets (img/j4_box_x3.png). The builder attributes it with uvprobe: the lake reflects V2_Massif just right of where the floe Retopo_Plane.006 ends, and the same cut is in plate_rest.",
   "repro": ":5174 rest frame, crop x250-480 y430-520 against ref_F000",
   "suggested_fix": "Blender: extend / check the floe Retopo_Plane.006 against F000 in a copy of plate_scene_v7, re-render plate_rest, re-bake (plan G3/G4 bake run)."},
  {"id": "J2", "severity": "minor", "title": "Unchanged and handed to the water lane: the grey smudge at the hold's bottom-right edge",
   "evidence": "p06 x1390-1440 y731-753: r11_1 151.7, r11_2 158.0, lane 160.9; sw_hold_B 158.9 / 142.8 / 146.3 (capture time; img/j2_smudge_x3.png). The patch is still there with stair-stepped edges. The env lane's files cannot reach it (uvprobe: direct and mirrored rays hit BG.001 sky texels, so it is LAKE_R12's own shading). The water lane's notes do not mention it yet.",
   "repro": "hold at the pointer (0, -0.98) = sw_hold_B, crop x1260-1440 y660-766",
   "suggested_fix": "The lead passes it explicitly to the water lane (Water.ts / LakeMirror.ts R12 path), since the round-1 fixer saw it vanish with ?envlake=plate / mirror."},
  {"id": "P1", "severity": "minor", "title": "Perf gate still not formally met: no 6-pair REST A/B at load < 10 exists; the best evidence is +1..+4 %",
   "evidence": "perf/perf_summary.txt (int1 perfab, real RAF loop, SLOT_BG=0, A = :5173, B = :5174, REST). Pairs at load < 10: ratio med 0.954 / 1.038 / 1.040, mean 0.947 / 1.059 / 1.011, so paired med 1.038 / mean 1.011. Pairs 3-5 at load 13-19 are invalid (another lane's perf + capture started beside them). The builder's only clean pair was 1.049 / 1.025. Frame medians were 30-38 ms even in the clean pairs (clean is ~17-22). A frame-level in-browser A/B (tools/gpuab.mjs, 320 frames per side, perf/gpuab_summary.txt) gave 1.006 / 1.007, but the load went 39 -> 443 during it, so it is weak. MOVE and HOLD were not re-run. Expected from the code: J5 adds one depth fetch + 2 mat-vec per card fragment (every overlapping sky card).",
   "repro": "SLOT_BG=0 MODE=rest node tools/perfab_env3.mjs out.json 6 'http://localhost:5173/?tier=T1' 'http://localhost:5174/?tier=T1' 6 in a quiet window (no other perf holder, 1-min load < 10)",
   "suggested_fix": "Re-run REST / MOVE / HOLD in a quiet window before merging. If REST > +5 %, A/B ?p4crack=0. A cheap early-out would also help: skip J5's depth fetch for card fragments above the far-range crest (ruv.y > crest + margin), where no surface can be within 20 m."},
  {"id": "N1", "severity": "nit", "title": "J6 side effect: a handful of isolated pixels get darker and more saturated blue, including round 1's fixed lake speck",
   "evidence": "Over 38 same-time shots, 47 changed px become 'crushed' (R<60 and B-R>70); MAIN has 0 (ana/specks.txt). The worst is ptr_bottom x309-311 y489 (lake, the floe-tip speck that round 1 fixed): AA8 18,66,122 -> MAIN 89,106,131 -> lane 41,88,136, luma 104 -> 81 against a 7x7 mean of 139. Also ptr_top_right x267-270 y355-357, B-R 45 -> 63. The massif box B-R p99 rises 0-4 (ptr_top 53 -> 56, ptr_bottom_left 51 -> 55) and B-R>60 px 287 -> 497 in ptr_top. None of it is visible at 1x (img/speck_ptr_bottom_ctx_x3.png); it shows at 6-8x (img/speck_ptr_bottom_x8.png, img/speck_ptrTR_x6.png).",
   "repro": "ab/m vs ab/l ptr_bottom (t=18.5, pointer (0, -0.98)), pixel x310 y489",
   "suggested_fix": "Optional: keep round 1's per-channel 0.6 floor as a second guard for texels below uCardWhite.z, i.e. max(lumaFloored, c * 0.6) on the darkest channel only, or accept it as is."},
  {"id": "N2", "severity": "nit", "title": "J5's fade costs a full-size RGBA half-float depth target and a one-off start-up bake that nobody has measured",
   "evidence": "bakeCloudDepth bakes the plate camera's depth with bakeProjector (1536 x ~840 RGBA16F, ~10 MB GPU on T1 / T2) once at start and after a context restore, for one .r lookup per card fragment. The boot-time delta (heroReady) was not measured by the builder or by this judge.",
   "repro": "code: PlateEnvironment.ts bakeCloudDepth / p4Crack",
   "suggested_fix": "A half-resolution R16F target would do for a 20 m soft fade. Measure heroReady A/B once before merging."},
  {"id": "N3", "severity": "nit", "title": "T0 shader text changes (J3 rim floor + J6 luma floor compile on phones too)",
   "evidence": "ident T0 lane default vs :5173: final + 9 targets SAME at t~6, programs rx-plate-baked / rx-cloud differ. J5 (the depth bake) correctly stays off on T0. The extra cost is one smoothstep and an RGBA instead of an RG fetch. During idle passes of warm cards, T0 frames will change like T1's.",
   "repro": "ident --mobile on :5174 vs :5173",
   "suggested_fix": "None needed if the lead accepts the visual fix on phones (round 1 did the same). Otherwise gate rim / luma on tier."}
 ],
 "evidence_paths": {
  "folder": J,
  "mirror": "/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/notes/round11/lane_backup/p4r3/judge_p4env3",
  "ab_analysis": ["ana/ml.txt (MAIN vs lane)", "ana/ml0.txt (MAIN vs ?p4env3=0)", "ana/lnc_l.txt (J5 isolated)", "ana/specks.txt", "ana/sat_shift.txt"],
  "images": ["img/j3_holdL_peak_x6_pct.png", "img/j3_ptrTL_peak_x5_pct.png", "img/hold_right_edge.png", "img/pop_far.png", "img/rel_far.png", "img/rest_far_x3_pct.png", "img/late90_farpeak_x3.png", "img/zig_late90_x6.png", "img/j5_holdB_x4.png", "img/j5_ptrTR_x3.png", "img/massif_late90_rest.png", "img/massif_ptr_top_x2.png", "img/j1_pop_corner_x2.png", "img/j4_box_x3.png", "img/j2_smudge_x3.png", "img/speck_ptr_bottom_x8.png", "img/speck_ptr_bottom_ctx_x3.png", "img/speck_ptrTR_x6.png"],
  "captures": "caps/qc (qc_r11 T1 of :5174: q00-q03, p04-p08, ui, ptr/, sweep/, region_stats_q00.txt)"
 }
}
json.dump(v, open(J + '/verdict.json', 'w'), indent=1)
print('ok')
