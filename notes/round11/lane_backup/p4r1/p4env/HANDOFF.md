# p4env HANDOFF (P4 round 1, ENV lane: G1, G4, G3) - 21 Nov 2026 01:25 WIB

Lab: http://localhost:5174 (left running for the judge). Lane = `cp -c -R aa7`. WORK = $SP/work_p4/p4env
($SP = /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad).
Patch vs aa7: WORK/p4env_vs_aa7.patch (applies cleanly to aa7; mirrored to MAIN/notes/round11/lane_backup/p4r1/p4env/).
No Blender was needed: every fix is a narrow code / texel change, attributed first with existing switches.

## Status per task
| task | status | what |
|---|---|---|
| G1 ghost iceberg / far-peak sliver / left band (critical) | FIXED | far-only crest + per-column depth (below) |
| G4 hairlines on the far range (left orbits) | FIXED | 5,729 texels of Object_2.010 back to step-2 values |
| G4 black slits in the dark ridge (right orbits) | FIXED (root cause was NOT the bake) | card-light floor in cardLit |
| G4 pale box on the far-left shelf (rest) | NOT a bake issue: handed to the water lane (G6) | evidence below |
| G3 floe face / water smudge / far-peak rim (dolly) | OPEN (diagnosed, texel locations below) | no change shipped |

## Switches (each restores MAIN's part exactly; `?p4env=0` everything)
- `?p4env=0`  whole lane off. Ident proof below.
- `?p4crest=0` G1 off (MAIN's crest table, 250 m evaluation).
- `?p4tex=0`  G4 hairline texels off (MAIN's Object_2_010_f1.webp).
- `?p4card=0` G4 slit fix off (MAIN's cardLit).
All existing switches keep their meaning (`?atmosrange=0`, `?atmos=r10`, `?envtex=s2`, `?envfix=0`, `?envwisp=0`, ...): the
P4 parts ride on the part they change (the crest only exists with atmosrange; the texture override applies only to the default pick).

## Files
- `app/hero/engine/p4env.ts` (new): the lane's flags (P4ENV, read once at module load).
- `app/hero/engine/world/Atmos.ts`: CREST_P4 + CREST_P4_DEPTH tables, `rangeCrestTableP4()` (RG pairs). MAIN's CREST untouched.
- `app/hero/engine/world/PlateEnvironment.ts`: RG half-float crest texture + `CLOUD_FRAG_P4`, and `CARD_LIGHT_FRAG_SRC`. Both are
  built from MAIN's GLSL by string replacement only when the lane is on, so the off path links MAIN's source byte for byte.
- `app/hero/engine/assets.ts`: `P4_TEX` (node -> repaired texture) applied only to the default texture pick.
- Asset: `public/hero/baked/Object_2_010_p4.webp` 117,944 B, lossless (MAIN's Object_2_010_f1.webp 28,652 B; +89,292 B; baked
  textures 1,002,126 -> 1,091,418 B). Lossless on purpose: a lossy re-encode of a decoded WebP moves every texel (q92 mean 0.34,
  max 10; q100 mean 0.18, max 7), so only lossless keeps the untouched texels and the rest of the frame bit-identical.
  sha256 3ce65b26fef1bf6e6a2f50cda18ff5d0ac73f739552591aca98938d2ab67b37e.

## G1 (why it works)
Attribution (WORK/g1a): `?atmosrange=0` removes the ghost (but veils the far range), so the CLOUD_RANGE crest is the source.
Raycast of the engine's own baked meshes through the plate camera (WORK/tools/crest_ray.mjs -> crest_ray2.json, clouds + BG
excluded): crest columns 179-195 are the iceberg (Plane.015, 66-67 m), 231-233 the snow mound (gfsw.001, 55 m), 239-247 and
251-255 the shore plain (Plane.014, 90-99 m), all NEARER than RANGE_DEPTH (they hide the card by depth already); the "far white
peak" (163-178) is Object_2.009 at 164 m (far, but 86 m nearer than the 250 m guess: its ~6 px sliver); the rest of
Object_2.009 199-220 m, Object_2.010 227-283 m; columns 115-128 have no geometry at the crest (kept as before, 250 m).
- CREST_P4 = CREST in far columns (rest frame unchanged); near columns get the far ranges' own skyline behind them (geometric
  + the table's median offset 0.00103 over the far columns, clamped 0.0015 under the near crest).
- Shader: each column at its own depth, 2 fixed-point steps from 250 m (column -> depth -> the ray there -> its column), anchored
  at the plate camera's z. At the rest camera every depth lands on the same plate texel.
- Cost: 2 extra 1-px texture fetches + 2 mat-vec per cloud-card fragment.

## G4 hairlines (why it works)
Attribution (WORK/g4b/hair_attr.png: main | envlod=bias | envedge=0 | envside=front | envtex=s2): only `?envtex=s2` removes
them, i.e. the fix round's back-face patch (tools4/patch_backfaces.py) gave texels hidden at rest the rest ray's colour, bright
from the side. The texels the left-orbit region samples (uvprobe step 1, dilated 3) AND patched (f1 != s2) revert to s2: 5,729
texels. The spot is hidden behind the mound at rest.

## G4 slits (why it works; the plan's bake hypothesis was wrong)
`?atmos=r10` removes every slit; `?atmoscardlight=0` too (ridge box pixels under luma 50: right orbit 287 -> 0, AND rest at the
same session time 307 -> 0; WORK/g4h). The slits are time-dependent, not orbit-dependent (the panel caught them in the orbit
captures; they are also the "dark specks" the environment judge saw on the ridge at q00). cardLit (CARD_WHITE) adds kappa dE
in LUMA units on the texel's own hue: the same absolute change for a dark crevice texel as for snow, so wherever the drifting
cards take light away (dE < 0, any time but F000's) the crevices are driven to 0. Fix: the cards' light takes at most 40 % of a
texel's value (`max(..., c * 0.6)` in both cardLit variants). F000 is unchanged (dE = 0 there by construction).
Rejected on the way (logged): texel gains on V2_Ridge (the same texels are visible at rest: blue patches up to 65 levels at
rest), a dark-outlier texel floor (no effect), and a grazing-angle LOD guard (bit-identical at rest but no effect on the slits).

## G4 pale box -> water lane (G6)
The box pixels are Plane.014 at/below the water line: editing Plane.014's texels there moved the box mean by 0.1 level
(168.5 -> 168.4); the box persists with `?envlake=plate` (176.8) and `?ffblock=0` (180.6) vs MAIN 180.4 and F000 161.5
(box x330-400 y467-480; WORK/g4e/pale_sw.png). It is the lake's rendering there; the plan's G6 (far-floe pale-block family,
AA8 'tip') owns it. Nothing shipped for it.

## G3 (open; diagnosis for the next owner)
UV probes (WORK/uv3.json, step 1):
- bottom-left wedge at pop (x0-45 y695-766): rock_big_4.005 (600^2 texture), texels x432-577 y213-366: flat light-bake fill that no
  plate saw. F358 shows water there. Needs the rock's own texture detail (a pop-camera plate in the bake, or a texel fill).
- bottom-right smudge in the hold (x1390-1440 y731-753): the near floe Retopo_Plane.012 sits at the water line there; a texel
  edit toward the water colour moved the p06 box by 0.4 level but moved rest pixels at the bottom by up to 7: reverted. Likely
  the lake's (mirror / transmission) colour over the floe: check with the water lane.
- far-peak rim in hold_BL (x1000-1070 y450-458): Object_2.009's silhouette texels x440-471 y393-486 (704x692), partly sky.
  Not attempted (a ring covered it in this round's tumble phase; the rim texels are also the far peak's silhouette at rest).

## Evidence (WORK unless noted; key images mirrored)
- Final capture set (qc_r11.zsh, T1): WORK/qc_final (q00..p08, ptr/, sweep/, region_stats_q00.txt).
- MAIN panel set vs lane final set: ev/ghost_right_tr_br.png (rows right / top_right / bottom_right; left MAIN, right lane),
  ev/band_left_tl_bl.png (left / top_left / bottom_left), ev/hair_slit.png (ptr_left hairlines, 3x), ev/slits_right.png
  (right / bottom_right ridge).
- G1 extra: g1b/right_grid.png, left_grid.png, diag_grid.png; g1c/hold_grid.png (hold_L/R/TR: no ghost either way, far range
  unveiled); g1c/late_grid.png (t ~90 / ~150 conveyor phases).
- Rest frame, deterministic (ident --still, same t, final lane vs :5197; id/final_still.png vs id/main_still2.png): all 15
  region_stats boxes IDENTICAL (id/rs_main.txt == id/rs_final.txt); 276 px change > 2 levels: 202 on the ridge (the black specks
  lifted: ridge box x0-330 y250-470 pixels under luma 50 7 -> 0, mean 140.18 -> 140.19; id/rest_final_ridge.png), 73 along the
  iceberg's right flank x1203-1222 y337-377 (G1: MAIN's old cut left a 1-px bare-sky sliver there even at rest; max 7,
  id/rest_g1_zoom.png), 1 other (3 levels).
- Ident (20 moving frames, final image + mirror / walk / cache / cacheN / reflection + every linked program): `?p4env=0` on :5174
  == :5197 at T1 (6/6 targets, 16/16 programs), T2 (6/6, 16/16), T0 mobile (2/2, 12/12), `?envlake=plate` (2/2, 12/12)
  (id/m_*.json vs id/l_*.json).
- Perf (tools/perfab.mjs: real RAF loop, vsync off, pointer sweep; 6 interleaved pairs, T1, SLOT_BG=0; perf_ab.json): median
  frame :5197 22.3 ms vs lane 22.6 ms (+1.3 %); the 3 pairs taken at 1-min load < 10: 21.8 vs 22.0 ms (+0.9 %). One run on each
  side hit a load spike (~45 ms; machine load rose to 16-20 from other jobs) and drops out of the median. Under the 5 % gate.
- tsc: `npx tsc -p tsconfig.hero.json --noEmit` and `npx tsc -p tsconfig.json --noEmit --incremental false` clean.

## Not changed (rules)
Rest framing, idle loop, click inertness, the hold's rotation, release, debug API, UI, waterline AA (`?aaresolve` etc.), T0: the
lane touches only the cloud cards' crest test, the baked env's card light floor and one texture.

## Fixer round (21 Nov 01:48-02:48 WIB): the judge's findings J1-J5 (judge_p4env.json)
Outcome: NO new code or asset shipped. The lane's files are byte-identical to the judged patch (regenerated patch ==
judged patch; dry-run applies to aa7), and its rendering is unchanged (lane ON ident == the judge's on_T1; rest still ==
the judge's box/lane.png, max 0). One fix was built (J1), measured, and rejected. The other four are now attributed with
switch A/Bs, each with an owner and options. Evidence folder: WORK/jfix (ev/ crops, attr/ and rim/ switch shots, before/
and after/ = the judge's abshots.mjs on :5174). Mirrored to MAIN/notes/round11/lane_backup/p4r1/p4env/jfix/.

| id | status | what the evidence says | owner / options |
|---|---|---|---|
| J1 pop wedge (rock_big_4.005) | OPEN: texel fix tried and REJECTED | The texels within 5 (+4 feather) of the wedge's sampled set took the rock's own plate detail (rockfill.py, lossless 142,324 B). In the pop frames, max 25-32 at ~120 px, but the wedge still reads as a flat slate at 1x and 4x (ev/j1_pop.png): the pop view blurs and fogs it. Those texels are also SEEN AT REST (ptr_rest: 302 px > 2, max 27, on the floe's right flank x212-246 y577-618, ev/j1_rest_side.png). So the panel's "no plate saw them" does not hold for this region. Reverted. | (a) The plan's G3 step 1: a pop-camera Cycles plate in the re-bake. It gives the flank the rock's real detail from that angle and costs no extra texture bytes. (b) A camera decision: F358 shows water in that corner, so the r11 dolly at camExpand ~0.5 frames the near floe and the reference does not. That is a composition-lane call. (c) Accept: it is the real rock's shadowed flank. |
| J2 hold smudge x1390-1440 y731-753 | ATTRIBUTED: water lane | hold_B / hold_T box: default 163.6 / 155.4 (p5 139 / 120). ?envlake=plate 174.9 / 175.0 and ?envlake=mirror 180.8 / 178.7: the smudge is gone in both. No effect from ffblock=0, shoreaa=0, envtex=s2, envside=front, atmoscardlight=0, lkmscale=1,1, lkcache=0 or lkhalf=0. It exists only in the default R12 lake (Water.ts LAKE_R12). It is not a texel issue (envtex=s2 and the builder's Retopo_Plane.012 edit leave it). ev/j2_attr.png. | Water lane (p4water / G6): trace what R12 draws at the near floe Retopo_Plane.012's waterline in the hold. The ENV-lane mirror model does not have it. |
| J3 far-peak warm top rim | ATTRIBUTED (my G1 area); no change shipped | Rim metric (rim.py) at the judge's t=32.7 / 36.1 hold_L / T / BL: lane 127 / 146 / 35; ?atmosclouds=0 0 / 0 / 0; ?atmosrange=0 1221 / 1412 / 431; ?p4crest=0 (MAIN) 403 / 401 / 89. At t=10.2 / 11.9 (same hold camera) it is 0: it depends on time, not the dolly (ev/j3_attr.png, ev/j3_seq.png). Cause: the drifting cloud card (warm grey at t~32) veils the far peak's top edge inside CLOUD_FRAG's designed fade band, occ = 1 - smoothstep(crest - 0.0075, crest - 0.0025, ruv.y), which fades the card out 3-10 plate px BELOW the skyline. Over the far white peak (crest columns 163-178) the plate skyline is 0.001-0.008 above the proxy mesh's top (crest_ray2.json), so the band reaches the mesh's top edge. G1 already cut it by about 3x. The bake texels are not the cause, so the plan's 2a erosion would not fix it. | (a) Narrow the fade band where G1 gives each column's own depth, e.g. smoothstep(crest - 0.003, crest - 0.0005). This moves the rest frame at the far skyline whenever a card passes, so it needs an A/B at several card times plus the G1 ghost spots (the band exists against a blue bare-sky sliver). (b) Floor the band at the mesh's top: a 3rd table channel with crest_ray2 far.v, so that the card fades only over the painted strip. Same checks. (c) Leave as designed. |
| J4 pale box on the far-left shelf | ATTRIBUTED: in the rest plate itself | Rest box x330-400 y467-480 (F000 162.6): lane 180.7; ?env=projected (no bake: the rest plate projected, with its own water) 176.0; ?envlake=plate 176.0; ?lkmscale=1,1 176.2; shoreaa=0 180.7; envlake=plate&shoreaa=0 176.0; envtex=s2 179.7; envside=front 180.4. The hard cut at x~322 (153 -> 172) is there in EVERY variant, including ?env=projected (ev/j4_proj.png). So the box and the cut are in plate_rest (blender/plates_v7), not in the bake comp, the shore AA or the lake. The R12 lake adds +4.7 (half-res mirror: lkmscale=1,1 removes it). | Env lane, Blender: compare plate_scene_v7 at the shelf's waterline with F000 (a floe / shelf object or material ends at x~320 in the v7 render), then re-render plate_rest and re-bake. Water lane: the +4.7 R12 half-res share (G6). Not fixable in code here. |
| J5 summit zig-zag at long idle | ATTRIBUTED: env backlog | late90_rest x266-283 y239-247: present with envside=front (not a back face), atmoscardlight=0 (lower contrast, still there), envtex=s2 (not the back-face patch), envlake=plate, and ?env=projected (ev/j5_attr.png, ev/j5_proj.png). It does not darken with the cards' shadow around it, which fits a hairline crack in the massif proxy that shows the sky behind. | Env backlog: a uvprobe ray test at x262-288 y236-250 (does the ray miss V2_Massif and hit BG.001?), then the plan's G4 step 3 weld / T-junction repair (env_repair.py) in the next bake, or a texel or depth fix if it is a UV seam. |

Gates for this round (the code did not change):
- tsc: `npx tsc -p tsconfig.hero.json --noEmit` and `npx tsc -p tsconfig.json --noEmit --incremental false` both clean
  (exit 0, jfix/tsc.log).
- Ident (the judge's ident.mjs, 20 moving frames; the lane side was re-run and the MAIN side is the judge's m_*.json, since :5197
  is frozen): `?p4env=0` == :5197 at T1 (6 targets and every program; only qs and port differ), T2, T0 mobile and
  `?envlake=plate` (jfix/id/l_*.json). Lane ON: jfix/id/on_T1.json == the judge's on_T1.json (0 keys differ).
- Rest still (ident --still): jfix/id/still_on.png is bit-identical to the judge's box/lane.png (max 0).
- Fresh capture set (qc_r11.zsh T1, 02:18-02:27): WORK/qc_fix. region_stats_q00 is within 1 level of qc_final on every box
  (capture-time noise). I looked at q00 / p04 / p06: normal (jfix/ev/qc_fix_q00_p04_p06.png).
- Perf (the judge's perfab.mjs, 6 interleaved pairs, T1, SLOT_BG=0, load 3.4-7.6; jfix/perf_ab.json): median of medians, MAIN
  21.8 ms vs lane 22.6 ms (ratio 1.037). Three runs hit other jobs' load spikes: MAIN pair 0 at 42.1 ms, lane pairs 4-5 at
  30-31 ms with n 189-195. The three clean pairs (1-3) give MAIN 21.6 / 21.8 / 21.8 vs lane 21.9 / 21.3 / 21.3 (ratio 0.99).
  The code is byte-identical to what the judge timed (ratio 0.986). Under the 5 % gate either way.
- Patch: WORK/p4env_vs_aa7.patch was regenerated and is byte-identical to the judged one; a dry-run applies it to aa7. The
  asset is unchanged: public/hero/baked/Object_2_010_p4.webp, 117,944 B. No new asset (the rejected J1 texture is kept
  only as evidence in jfix/tex/rejected_rock_big_4_005_p4.webp, not in public/).
- Lab :5174 restarted twice by this fixer: the J1 build, then the reverted build. It is left running on the reverted
  (== judged) code.
