
## FIX ROUND (fixer, 21 Nov 01:49 - ~02:50 WIB): judge_p4ice findings F1-F5
Judge verdict: `$SP/work_p4/judge_p4ice/verdict_p4ice.json` (pass false; ice_material 6.5 -> 7.4). Fixer work in `WORK/fix/`
(tools/patch6.py, patch7.py, patch8.py; batches b1-b5; img/), LOG section "FIXER round". Only file changed: still
`retrux-web/app/hero/engine/hero/IceMaterial.ts` (everything new inside the ICE_P4 blocks; `?p4ice=0` / T0 unchanged).
Hold-pose comparisons now use one FRESH page per config in shoot_qc's pose order (capv's in-session hold poses are not
comparable: the ring orientation at p04-p06 depends on what the previous config left; a fresh 'd' reproduces qc_final's
p05 / p06 boxes to 0.1 L). Rest-pose box stats also move between in-session configs where shards fall in the box.

| finding | status | what changed | evidence |
|---|---|---|---|
| F1 (G5: TIR-zone outlines on the p05 hold arcs) | FIXED (hold only) | the critical-angle ramp `dc` on every wall x `mix(1, uP4H.z, uHold)`, uP4H.z = 2.5 (the judge's second option: hold-scaled, so the idle crawl is untouched). The T2 two-tap supersample was not built (T1 is the judged tier and it would cost a second transmitted term). | b2 fresh pages: p05 right arc Laplacian 8.7 -> 6.2 (x2) / 5.6 (x3), sd 28.7 -> 27.9 / 27.0 (F402 2.9 / 23.3; MAIN 11.5 / 32.9); top arc 7.8 -> 5.6 / 4.6. `fix/img/b2_p05.png` (r1 | x2 | x3 | F402). **qc_fix (x2.5): right arc lap 8.1 -> 6.7, sd 27.5 -> 29.0 (MAIN 11.5 / 32.9, F402 2.9 / 23.3); top arc lap 7.7 -> 4.9, sd 24.5 -> 22.3.** `fix/img/fx_p05_rightarc.png` (MAIN | r1 | fix | F402): the agate outlines are gone; `fx_p05_toparc.png`: the dotted ring by the cut end is gone. Side effect in the hold: p06 band 209.1 -> 203.2 (F420 206.9), sd 22.3 -> 25.6, sat 0.168 -> 0.187 (0.162). |
| F2 (joints as flat 6-15 px collars) | FIXED | new uP4J (x 1 = V mode, y depth, w far-wall line gain; uP4D.y = the line's half width in px). The shade is a V across the band of rays whose first segment crosses the cut plane (1 - abs(2t - 1), t = abs(se) / (abs(se) + abs(sx)): 0 at both ends, no hard edge at any width), plus a bright line where the plane meets the far wall. Derivatives taken before the loop's `continue` (uniform control flow). `?icecap=0` restores the round-1 / MAIN formula. | prof.py q01 x805 y240-275: r1 plateau 164-167 over 6 px -> `... 213 196 186 173 189 198` at uP4J.y 0.9 (F015 `213 208 190 171 181 195`; default 0.8 sits between v7 and v9); q02 row 375: r1 15 px plateau 138-153 with hard steps -> a soft V to 163 (0.7) / 152 (0.9) with a bright line at its other end (F030: a ~10 px band at 164-168 and a 200-213 line). **qc_fix q01: `200 212 207 194 186 188 197 202` (F015 `207 213 208 190 171 181 195 201`); q02: a 1-2 px bright line (207) and a soft V to 158 (F030 band 164-168 + line 200-213).** `fix/img/fx_q02joint.png` (r1 | fix | F030), `fix/img/b5_joints.png`, `fix/img/b3_dbg.png` (where each term lands). The q02 order is mirrored vs F030 (our line on the band's left, F030's on its right). |
| F3 (q03 outer band lighter than MAIN, white ovals) | NOT FIXED (open, options) | tried the judge's first option: the frosted look-through's share x0.2-0.5 where little light has left through the walls (wOut). The white ovals stayed (`fix/img/b2_q03outer.png`), so they are not the frosted look-through; the box moves I saw were shards that differ between in-session configs. Knob removed. | qc_fix boxes x800-830 y260-350 191.1 (r1 191.4, MAIN 182.9, F045 174.3); x790-840 y230-330 180.1; x820-860 y300-380 173.1. Options below. |
| F4 (no refracted orb strip; invisible cracks paid every frame) | PARTLY: cracks FIXED (deleted), strip open | the crack-sheet loop is deleted (uP4F.z spare): no ALU for an effect no judged pose shows (this also clears the judge's nit F7, fwidth after `continue`). Strip: a direct-path clamp x3 gives 543 clipped px as a bright patch at the band's top edge under the orb (not F420's strip) and overshoots at rest (q00 over-orb p95 246, q03 ring D sd 25); orb-through x2.5 in the hold gives 436 clipped px and a lighter lower strip (221.7 vs F420 206.5). Not adopted. | `fix/img/b2_p06.png` (r1 | clamp x3 | ramp x3). qc_fix: 0 clipped px outside the orb (F420 121); lower strip 214.2 -> 208.6 (F420 206.5) via the hold ramp, sd 24.9 (16.7). |
| F5 (smooth band faces, plastic caps) | NOT FIXED (open, options) | tried Noise B's own fade start (0.25 c/px instead of 0.15): crawl within noise (d 1.504 / 1.120 / 1.586 vs 1.356 / 1.216 / 1.379) but no visible grain (`fix/img/b2_q00band.png`); a frosted roughness floor 0.85 on the cut caps: still flat matte discs (`fix/img/b2_p06caps.png`). Both knobs removed. | qc_fix p04 log x680-880 y330-390 222.4 -> 219.0, lap 4.0 -> 3.0 (F358 200.4 / 4.1). Options below. |

### Switches after the fix round
`?p4ice=0` (MAIN exactly, re-proved below), `?iceaa=r11` (G5 incl. the hold ramp -> x1), `?icefrost=r11`, `?icecap=0` (Q6 incl. the
V joints -> MAIN's collar formula, 12 mm, depth 0.35), `?orbice=r11`, `?icehold=r11` (no crack sheets any more). New live knobs:
`uP4H.z` (hold ramp, 2.5), `uP4J` (1, 0.8, 0, 0.45) with `uP4D.y` 1.25 px.

### Open after the fix round, with options (need a design decision)
- **F3 q03 outer band / white ovals.** Diagnose first: `uR11Dbg` 1 (orbHit / out / nTir) on q03 shows whether the ovals are
  exits (non-TIR windows) in the internal-reflection zone. If they are: (a) widen the critical-angle ramp in oblique views
  only (`smoothstep` on `abs(dot(V, ea))`, like uR11K.w), (b) take Bump.001's tilt out of the trace normal there (Ntr), or
  (c) lower the transmitted gain only where the view runs along the ring (q00's band faces are within 1 L of F000 now and
  must stay). The builder found the trace roughness hi 0.6 / 0.85 washes out the TIR zones or raises crawl.
- **F4 strip.** F420's strip is the orb seen through the band's upper part with the band overlapping the orb's lower half;
  at p06 our band's top edge sits at the orb's bottom. Either the hold lane's framing (band / orb overlap) or a hold-only
  direct-path clamp (uP4C.x scaled by uHold) once the overlap exists. Needs the hold lane's pose first.
- **F5 texture.** Grain conflicts with G5's band limit: a visible scrape grain needs the fine bump (uR11A.z) or its finest
  octaves stronger, which the crawl gate must accept; the caps need a real chip / frost texture term on the cap plane
  (a cellular chip field with its own band limit), not a roughness floor.

### Evidence of the fix round (final build 21 Nov 02:19:50; source unchanged after it)
- **Patch** `WORK/p4ice_vs_aa7.patch`: 579 lines, sha256 8bd774c62c8191e10df86d710d9c15d5ea59c3f73be10c4dc2d297dc27b1c868; one file
  (`retrux-web/app/hero/engine/hero/IceMaterial.ts`), no new / removed files; applied to aa7's file it reproduces the lane file
  byte for byte (`fix/mkpatch_fix.sh`). The round-1 lane file is kept as `WORK/fix/IceMaterial.r1.ts`.
- **Identity** (`fix/ident_fix.txt`, identS 20 moving frames, final image + every render target + every linked program):
  T1 `?p4ice=0`, T2 `?p4ice=0`, `?envlake=plate&p4ice=0`, T0 (lane default) vs :5197 IDENTICAL (6 / 2 targets, 16 / 12
  programs, 0 console messages); lane default T1 / T2 differ only in `rx-ice`, the reflection target and the final image.
- **Typecheck** (02:16, after the last GLSL / TS edit; the 02:19 default change is a literal): `tsc -p tsconfig.hero.json`
  0 errors, `tsc -p tsconfig.json --incremental false` 0 errors.
- **Capture set** `WORK/qc_fix` (qc_r11.zsh, T1 scale 1: shoot_qc + ptr + sweep + region stats; 0 console errors / warnings).
  Numbers: `fix/ana_fix.txt` (the judge's own boxes and profiles), `fix/fix_icem.txt` (the panel boxes),
  `fix/sparkles_fix.txt` (judge's spark.py; isolated bright ice px p04 22 vs r1 37, p05 16+10 vs 65, p06 13 vs 26).
- **Perf** (rc2.mjs, interleaved AB / BA, SLOT_BG=0): MOVE 6 pairs at load 3.6-6.9: 0.993 1.026 0.986 1.048 1.018 1.040,
  median 1.022 (+2.2 %, +0.475 ms), the same as round 1 (`perf/ab_fix.json`). REST: 4 pairs at load 4.7-5.8 but with the quiet
  wait timed out and another lane's perf run on the GPU: 1.118 1.025 0.995 1.059, median 1.042 (+0.75 ms at ~18 ms)
  (`perf/ab_fix_rest.json`) - under 5 %, not a clean number; the fix removes more ALU (the crack loop on every fragment) than it
  adds (4 vec3 derivatives + a V per cut on joined pieces), so rest should sit at or below round 1's 1.008 / 1.027.
- Whole-frame diffs between capture sets (and between configs in one session) move everywhere (the environment animates
  between shots: q00 mean |dL| 2.4-7), so the per-program identity above is the proof that only `rx-ice` changed.
- Lab :5175 is running the final build (`node hero-lab/serve.mjs --no-watch`, log `WORK/lab.log`). No assets shipped.
