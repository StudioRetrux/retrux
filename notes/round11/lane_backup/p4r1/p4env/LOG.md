# p4env LOG (P4 round 1, lane env) - started 20 Nov 2026 23:45 WIB
Tasks: G1 (crest ghost), G4 (orbit seams), G3 (dolly bake artefacts). Lab :5174. Lane = cp -c -R aa7.

## 21 Nov 00:00-00:20 G1 (crest ghost)
- Attribution (g1a/right_grid.png, left_grid.png): default shows the ghost iceberg + far-peak sliver; ?atmosrange=0 removes it
  (but veils the far range); ?atmos=r10 likewise. Source = CLOUD_RANGE crest (Atmos.ts CREST at 250 m).
- Raycast of the engine's own baked meshes through the plate camera (tools/crest_ray.mjs -> crest_ray2.json, clouds/BG excluded):
  cols 179-195 iceberg Plane.015 66-67 m; 231-233 snow mound gfsw.001 55 m; 239-247, 251-255 shore plain Plane.014 90-99 m
  (all NEARER than RANGE_DEPTH 118); the "far white peak" 163-178 is Object_2.009 at 164 m (far, but 86 m nearer than 250 m:
  its ~6 px sliver); rest of Object_2.009 199-220 m, Object_2.010 227-283 m; cols 115-128 no geometry at the crest (plate mist).
- Fix: CREST_P4 (near columns -> far ranges' own skyline behind them + median table offset 0.00103, clamped 0.0015 under the
  near crest) + CREST_P4_DEPTH (per-column depth; 250 for 115-128) in an RG half texture; shader: 2 fixed-point steps from
  250 m (column -> depth -> ray there). CLOUD_FRAG_P4 = CLOUD_FRAG.replace(...) so ?p4crest=0 / ?p4env=0 link MAIN's source.
- g1b grids: ghost + sliver gone at right/top_right/bottom_right; left band gone at left/top_left/bottom_left; far range still
  unveiled (vs atmosrange=0 which veils it).
- ident still-rest: ?p4env=0 == :5197 in mirror/walk/cache/cacheN/reflection/final. G1 on: final differs only at 73 px along the
  iceberg's right flank (x1203-1222 y337-377, max 7, +2..5 R): MAIN's old cut left a 1-px bare-sky sliver along the flank even
  at rest; the card now reaches the silhouette. Below the horizon max 1 level (mirror target re-cut from the mirrored camera).

## 21 Nov 00:20-01:25 G4 / G3, finals
- uvprobe.mjs (screen px -> mesh + texel, engine camera, step 1): hairlines = Object_2.010; slits = V2_Ridge; pale box =
  Plane.014 (right of floe Retopo_Plane.006); pop wedge = rock_big_4.005; hold smudge = Retopo_Plane.012 (water line);
  rim = Object_2.009 silhouette.
- NOTE: ffmpeg's WebP decoder differs from libwebp (Chrome) by up to 22 levels: all texel work redone on dwebp decodes.
- Hairlines: switches -> only ?envtex=s2 removes them (back-face patch). Gain approach too weak; revert patched texels in the
  sampled region to s2 (5,729 texels), lossless WebP 117,944 B. FIXED (g4d/hair_ab.png, ev/hair_slit.png).
- Slits: texel gains brightened rest-visible texels (blue patches, 65 levels at rest) -> rejected; dark-outlier floor: no effect;
  grazing LOD guard: bit-identical at rest, no effect -> removed. Attribution: ?atmos=r10 and ?atmoscardlight=0 remove all
  (n<50 287 -> 0 right, 307 -> 0 rest at t~19): cardLit drives dark texels to 0 when dE < 0. Floor c*0.6 in both cardLit
  variants (?p4card=0). FIXED (g4i/slit_card.png, ev/slits_right.png).
- Pale box: Plane.014 texel edit moved the box 0.1 level; persists with envlake=plate / ffblock=0 -> lake rendering, water lane
  (G6). Reverted.
- G3 smudge: Retopo_Plane.012 edit moved p06 box 0.4 level, rest bottom up to 7 -> reverted. Wedge / rim: not attempted. OPEN.
- Finals: tsc clean x2. ident ?p4env=0 == :5197 at T1/T2/T0/plate (targets + programs). Rest still frame vs :5197: 15/15
  region boxes identical; 202 px ridge specks lifted + 73 px iceberg flank. Perf 6 pairs: +1.3 % (+0.9 % at load < 10).
  qc_final captured. Patch p4env_vs_aa7.patch (dry-run applies). HANDOFF.md written. Lab :5174 left running.
## 21 Nov 01:48 FIXER round (judge findings J1-J5), time box 60 min
- 01:48 repro: judge's abshots.mjs on :5174 -> jfix/before: sw_pop_L, sw_pop_BL, sw_hold_B, sw_hold_T, sw_hold_L, late90_rest
  bit-identical to the judge's ab/l shots (the lane had not changed). Boxes: pop_L x0-40 y700-765 155.7, hold_B smudge 148.6.
- 01:57-02:03 attribution (jfix/tools/shots.mjs = abshots + FILTER; jfix/attr/<variant>, same sequence per variant):
  J2 smudge (hold_B / hold_T x1390-1440 y731-753): base 163.6 / 155.4 (p5 139 / 120); envlake=plate 174.9 / 175.0 (p5 170 /
  171, gone); envlake=mirror 180.8 / 178.7 (gone); ffblock=0, shoreaa=0, envtex=s2, envside=front, atmoscardlight=0,
  lkmscale=1,1, lkcache=0, lkhalf=0: unchanged (+-1). => the default R12 lake only (Water.ts LAKE_R12): water lane.
  J4 pale box (ptr_rest x330-400 y467-480; F000 162.6): base 180.7; plate 176.0; lkmscale=1,1 176.2; plate&shoreaa=0 176.0;
  shoreaa=0 180.7; ffblock=0 180.8; s2 179.7; front 180.4; card0 181.8; lkcache=0 180.7; lkhalf=0 180.0; mirror 181.3.
  Column profile y467-480: the hard cut at x~320 (152 -> 172..184) is there with BOTH lakes => env side, not the lake;
  the lake adds ~4.5 levels on top (R12 half-res mirror: lkmscale=1,1 takes them off).
  J5 zig-zag (late90_rest x266-283 y239-247): present with envside=front (not a mesh crack), atmoscardlight=0 (lower
  contrast on a lighter face, still there), envtex=s2 (not the back-face patch), envlake=plate.
- 02:01-02:07 J1 attempt: rock_big_4.005 texels within 5 (+4 feather) of the wedge's sampled texels take the rock's own
  plate detail (luma ratio to a 10-texel blur from 180 left / 60 down, clamp 0.55-1.8; lossless 142,324 B vs 23,090 B).
  Result (jfix/after vs before, same sim times): pop frames max 25-32 at ~120 px but the wedge still reads flat at 1x/4x
  (ev/j1_pop.png); AND the rest frame changed: ptr_rest 302 px > 2 (max 27) on the floe's right flank x212-246 y577-618
  (ev/j1_rest_side.png): those texels are seen at rest. REJECTED and reverted (lane files == the judged patch again, cmp).
- 02:08-02:10 batch 3 (reverted build): base2 == base bit-identical (ptr_rest, hold_B/T/L, pop_L, late90_rest): the revert
  restores the judged lane exactly. ?env=projected (no bake: the rest plate projected; its own water): J4 box 176.0 and the
  SAME hard cut at x~322 (153 -> 172) => the pale box / cut is in the rest plate itself (blender/plates_v7 plate_rest), not
  in the bake's comp nor the lake; the default R12 lake adds +4.7 on top (lkmscale=1,1 takes it off). J5 zig-zag also present
  with ?env=projected at t~92 (same mesh proxy): consistent with a hairline crack in the massif proxy showing the sky (it
  does not darken with the cards' shadow around it), not with a texel artefact.
- 02:11-02:14 J3 rim A/B at the judge's sim time (jfix/rim/<variant>: shots.mjs FILTER ptr_ + sw_hold_ + sw_pop_L, so the hold
  shots land on t=32.7 / 36.1 exactly as in the judge's set). Warm-rim metric (jfix/tools/rim.py: x990-1110 y430-470, B-R < 22,
  luma 140-205) hold_L / hold_T / hold_BL: lane 127 / 146 / 35; ?atmosclouds=0 0 / 0 / 0; ?atmosrange=0 1221 / 1412 / 431 (the
  card veils the whole range); ?p4crest=0 403 / 401 / 89 (== MAIN). The rim is TIME-dependent: at t=10.2 / 11.9 (same hold
  camera, other card positions) 0 / 0 (ev/j3_seq.png). => the drifting cloud card (warm-grey at t~32) veils the far peak's top
  edge inside CLOUD_FRAG's designed fade band (occ = 1 - smoothstep(crest - 0.0075, crest - 0.0025, ruv.y): the card fades out
  3-10 plate px BELOW the skyline, against a blue bare-sky sliver). G1 already cut it ~3x (403 -> 127). Not a bake texel issue.
  crest_ray2.json: over the far white peak (cols 163-178) the plate skyline is 0.001-0.008 above the proxy mesh's top (the
  strip between is the sky card's paint at 359 m), so the fixed fade band reaches the mesh's top edge.
- 02:17 J3 decision: no change shipped (a fade-band change moves the rest frame at the far skyline whenever a card passes and
  re-opens the atmosphere fix round's blue-sliver trade-off; needs its own A/B at several card times + the G1 spots; the time
  box does not hold it). Options in HANDOFF.
- 02:18-02:21 finals on the reverted lane: tsc clean x2 (exit 0). Patch regenerated (diff -u per file + /dev/null for
  p4env.ts) == the judged p4env_vs_aa7.patch byte for byte; dry-run applies to aa7. Ident (judge's ident.mjs, 20 moving
  frames; lane side re-run, MAIN side = judge's m_*.json, :5197 frozen): ?p4env=0 == :5197 at T1 (6 targets + programs; only
  qs/port differ), T2, T0 mobile, ?envlake=plate. Lane ON on_T1 == the judge's on_T1 (0 keys differ). Rest still
  (ident --still) == judge's box/lane.png bit for bit (max 0).
- 02:24-02:27 J5 probe (uvprobe at rest, x258-289 y232-251, step 1 -> jfix/uv_zig.json; jfix/tools/zig.py): all 640 rays hit
  V2_Massif (no ray reaches the sky). The zig-zag pixels (+22..56 over their 5x5 median at t~92, within +-2 at t~8.5) map to
  ordinary mid-tone texels (luma 61-78 = their 7x7 medians) on triangles 3062-3067, beside a UV island boundary (550-650 texel
  jumps between tris 3061-3073 and 21 / 33401 at x276-279 y240-244). So it is not a texel artefact; a time-dependent term
  lights those pixels. A rasterisation crack (T-junction) letting a drifting card through stays the lead hypothesis (a ray
  test cannot see T-junction cracks). ?atmosclouds=0 swaps the whole atmosphere (the summit goes into haze, box 218), so it
  does not isolate the term (jfix/zig/, ev/j5_clouds.png). Backlog.
- 02:18-02:27 qc_r11.zsh T1 -> qc_fix (region stats within 1 level of qc_final; q00 / p04 / p06 looked at: normal).
- 02:27-02:33 perf (judge's perfab.mjs, 6 pairs, SLOT_BG=0, load 3.4-7.6): median of medians MAIN 21.8 vs lane 22.6 (1.037),
  inflated by load-spike runs (MAIN pair 0 42.1; lane pairs 4-5 30-31 ms, n 189-195); clean pairs 1-3 MAIN 21.6 / 21.8 / 21.8
  vs lane 21.9 / 21.3 / 21.3 (0.99). Same code as the judge timed (0.986). < 5 %.
- 02:35 DONE (fixer): no code / asset change shipped; J1 tried + rejected; J2-J5 attributed with owners and options (HANDOFF).
