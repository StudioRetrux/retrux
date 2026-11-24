# p4ice3 LOG (P4 round 3, lane ice, builder)

## 21 Nov 05:03 WIB - setup
- Brief read (p4r3_common.md). Lane cut: `cp -c -R LANES/int1 LANES/p4ice3`. Lab :5175 (`PORT=5175 nohup node hero-lab/serve.mjs --no-watch`).
- Inputs read: rejudge_p4ice verdict (R1, F3, F5, F4s, N1, N2, F6), p4ice HANDOFF (round 1 + fix round), plan Q3/Q6/Q10/G5/Q4, panel composition issue 1.

## 05:20-06:05 - F5 root cause (geometry vs shading)
- hero.glb rings (tools/glbsec.py, glbcap.py): SubD **L2** sections, 16 points (w units: (1,0) (0.932,0.826) (0.727,1.51) (0.398,1.935) (0,2.077)),
  smooth normals over the L1 corner, hard edge only near the apex; caps = flat 16-gon with an interior grid, r_max 2.401 vs 2.386 mid-span.
- Artist file (Blender 5.2 on a COPY, slot 'blender:p4ice3:rings2', tools/bl_rings.py): SUBSURF levels 1 / render 1, limit surface,
  creases on (8 creased cap edges), Smooth by Angle GN. Render-evaluated section of Circle.028: 8 points (1.0031,0) (1.0312,+-0.1552)
  (1.1060,+-0.2134) (1.1808,+-0.1552) (1.2088,0) = exactly the shader's R11_OCT octagon; caps = flat octagons (fan centre vertex).
  => the GLB is NOT the render mesh: its L2 surface bulges up to 0.13 w outside the octagon between the corners (rounded silhouettes,
  16-gon 'domed' caps), while the trace already shades the L1 octagon.
- Shading (tools/capf.mjs: one frozen pose, live configs; img/f5a_p04.png, f5a_p06.png): face map (uR11Dbg 2) shows the octagon faces
  as clean stripes, but in the beauty pass the corners vanish: entry corner rounding uR11F.z 0.15 w (+1.5 px) is ~10-20 px in the dolly;
  with it off (r0) the slab edges / TIR lines turn crisp; without the bumps the face edge line shows too.

## 05:10-05:32 - round-3 code (IceMaterial.ts only so far), switch `?p4ice3=0`
- Switch plumbing: `ICE_P4R3` define + `stripDef()` on both stages (vertex + fragment), back-depth material takes the front's
  vertex source; new uniforms uP4K (joints) / uP4L (geometry, edges) only when on. Sub-switches ?icejoint=r1 ?icegeo=0 ?iceedge=0.
- F5 geometry: vertex remap of every section point outside the L1 octagon (R11_OCT) radially onto it (caps' interiors stay).
- F5 shading: entry corner rounding capped at uP4L.z = 4 px at rest (>= 0.15 w there: unchanged) easing to uP4L.y = 1.5 px with uHold.
- R1 joints: debug view uR11Dbg 8 (|V.n_cut|, vK, tirK): |V.n_cut| is 0.67-0.76 (display) at q00 L/R, q01, q02, q03 alike ->
  a face-on gate cannot separate rest from loop. Global trapezoid instead. Batches (tools/capf.mjs, same frozen pose per config,
  tools/r1m.py; REF q00 L129 R99, q03 bot 139 top 117, q01 V to 171, q02 band 164-168):
  | cfg | q00 L / R | q03 bot / top | q01 x805 | q02 r375 |
  | round 1 (r1all) | 188 / 144 | 170 / 130 | 211 208 193 185 | V to 158 |
  | jC (face ramp .4-.75, core .4, floor .9, J.y 1) | 157 / 134 | 167 / 122 | 212 205 188 176 182 | 138-150 |
  | jF (global, core .3, floor 1, B.z .7) | 143 / 121 | 148 / 94 | 4-5 px plateau 153-156 | 13 px at 131-140 |
  | **jH (global, core .6, floor 1, J.y 1, B.z .7) = default** | **151 / 121** | **147 / 96** | 212 203 160 154 156 178 202 | 8 px at 126-139 |
  jH meets q00 / q03-bottom targets; q01 stays a 3-4 px V with its bright line (deeper than F015: 154 vs 171); q02 and the q03
  top strap are darker than the reference (q02 -33 % vs -10 %, q03 top 96 vs 117).
- Rest check (img none; tools/restd.py r1 vs r3 same session): q00 face box 208.2 -> 208.3, lower arcs 187.7 -> 187.7; the change
  is the joints (bandR sd 18.2 -> 21.3). tsc hero + project 0 errors (05:32).

## 05:33-05:52 - F3, F4s, N1, F6, more F5 (batches f3, f3b, b4, b5; tools/capf.mjs, f3box.py)
- F3 diagnosis (img/f3_dbg.png, f3_tilt.png): the white ovals sit in Lt (debug 5) and in islands of a different exit wall (debug 2);
  exit-wall facet tilt off (uR11H.z 0) removes them, all tilt off too, Bump.001 off does not -> non-TIR exit windows punched by
  the exit wall's smooth tilt field. Fix: the tilt eases out deep inside TIR (uP4M.x 0 from 0.12 below cosC, full within 0.02).
  q03 boxes (same session): r1 191.7 / 180.2 / 173.2 -> r3 189.1 / 175.3 / 170.7 (F045 174.3 / 165.2 / 157.0); ovals gone
  (img/b4_q03.png); a tighter gate (0.01 / 0.06, 'tg') measured the same.
- F4s: direct-path clamp x2 at full hold (uP4M.w): the band over the orb's lower half lightens at its top; no F420 strip yet
  (x3 'h3' looked the same). N1: hold chroma 0.92 -> 0.86. F6: rim line band widened by 0.75 fwidth(dot(Ng, V)).
- F5 hold: internal corners 0.15 w -> 0.04 w with uHold ('xw', crisper TIR lines, img/b5_p05.png) ADOPTED; MAIN's roughness ramp
  in the hold ('rg') darkened the frost blotches (N1) -> not adopted (knob uP4N kept = uP4B).

## 05:48-05:58 - crawl (tools/seq.mjs 10 consecutive 60 fps frames, RAF stopped; flick.py temporal 2nd difference on ice px; ana/flicker_r3.txt)
| seq | MAIN :5173 d2 mean / p99 | lane (all on) | lane ?icejoint=r1 | lane ?icegeo=0 |
| hold (p05) | 5.24 / 24.8 | 5.12 / 23.1 | - | - |
| sus (p06) | 5.09 / 22.1 | 5.25 / 23.2 | - | - |
| eye (q03 idle) | 20.58 / 47.3 | 20.83 / 52.0 | 20.02 / 47.8 | 23.03 / 55.7 (other px mask) |
| rest (q00 idle) | 20.86 / 47.7 | 21.58 / 53.7 | 20.63 / 48.9 | 24.24 / 57.0 |
-> the hold is calmer; the idle tail (p99 +10-13 %) comes from the deeper R1 seams (a higher-contrast feature moving with the
tumble), not from the geometry remap, the F3 gate or the hold edges (with icejoint=r1 the lane is at MAIN's numbers).
Final defaults frozen 05:48 (source unchanged after).

## 05:54-06:16 - final pipeline, round 1 of it
- qc_r11.zsh set #1 (WORK/qc_pre, build 05:48): R1 q00 151 / 121, q03 bot 147 top 102, q01 V `212 202 160 154 156 179 202`;
  F3 q03 outer boxes 191.1 / 180.0 / 173.1 (MAIN) -> 188.6 / 175.2 / 170.7 (F045 174.3 / 165.2 / 157.0), ovals gone;
  p06 clipped px outside the orb 0 -> 164 (F420 121), sat 0.180 -> 0.169 (F420 0.162); F6 p04 isolated bright px 18 -> 6.
  BUT spark.py: p05 7 -> 20, p06 12 -> 46 isolated bright px (a dotted line along ring A's arc at x884-905 y231-250).
- Attribution (tools/spk2.py, same frozen pose per config, cap_spk / cap_spk2): the internal corners 0.04 w in the hold (uP4L.w)
  make them: p06 bright 27 (0.04) / 17 (0.08) / 12 (0.10) / 7 (0); the entry cap (uP4L.y) and the F4s clamp do not (m1 = r3).
  -> uP4L.w default 0 (knob kept). Source changed 06:15 (a TS default only; the ICE_P4R3-off path is untouched).
- ident (tools/identS.mjs, 20 moving frames, final image + all targets + every linked program; ana in ident/): T1 / T2
  `?p4ice3=0` vs :5173 IDENTICAL (6 targets / 16 programs); T0 phone lane default vs :5173 IDENTICAL (2 / 12);
  `?envlake=plate&p4ice3=0` vs :5173 `?envlake=plate` IDENTICAL (2 / 12); T1 `?p4ice=0` vs :5173 `?p4ice=0` IDENTICAL (6 / 16).
  Negative control: lane default T1 differs in reflection + final, programs rx-ice and rx-ice-back (text only: the back material
  carries the front's vertex source; its ICE_P4R3 code sits inside `#ifdef ICE_R11`, which the back pass does not define).
- perf run 1 (rc2.mjs, 06:04-06:10): VOID - 1-min load 16-29 in every block (other lanes' perf / capture jobs), 0 pairs < 10.
- qc set #2 relaunched 06:16 on the final build (WORK/qc_final).

## 06:16-06:40 - final set, ident, perf
- qc set #2 = WORK/qc_final (final build 06:16; 0 console errors / warnings): R1 q00 150 / 121, q03 bot 148 top 101, q01 V
  `212 203 160 154 156 178 202`, q02 8 px at 123-138; F3 q03 outer 188.6 / 175.2 / 170.7; p06 clipped 365 (F420 121), sat
  0.169 (0.162); isolated bright ice px (spark.py) p04 18 -> 11, p05 7 -> 14, p06 12 -> 6, q00 6 -> 4, q03 19 -> 21.
  Analyses: ana/r1_final.txt, f3_final.txt, icem_final.txt, sparkles_final.txt; montages img/final/*.png.
- ident re-proved on the final build (ana/ident_final.txt): T1 / T2 `?p4ice3=0` and T0 default IDENTICAL to :5173.
- perf run 2 (06:33, ab_r3b.json): quiet-wait passed at 9.72 (waitq fixed to ignore its own 'p4ice3:perf' holder);
  MOVE 8 pairs 1.018 0.989 0.999 1.001 0.992 0.989 1.015 1.000 median 1.000 (loads 9.2-10.9, 4 pairs < 10: 0.996);
  REST 1.23 1.12 0.936 1.094 contaminated (block medians 31-71 ms on both pages). Run 3 launched 06:36 (waitq cap 8).
- perf run 3 (06:38, ab_r3c.json): load 6.7-7.5 in all 8 MOVE pairs but throttled frames (63-65 ms on both pages):
  0.946 1.090 1.098 1.216 0.968 1.142 0.975 1.014, median 1.052 (spread +-15 %: cannot resolve 5 %); REST 0.977 0.958 1.487
  0.986, median 0.982. Run 4 (06:45, ab_r3d.json): VOID (another lane's perf on the GPU, load 16-19).
- 06:50 HANDOFF.md written (LANES/p4ice3/HANDOFF.md); lab :5175 left running on the final build (06:16). WORK trimmed to ~300 MB
  (blend copy, tuning sets cap_dbg / cap_j2 / cap_j3 / cap_d8 / qc_pre and the raw .rgba dumps deleted; PNGs kept).
