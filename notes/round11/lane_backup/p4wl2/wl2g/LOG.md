# wl2g (water round 2, lane: walk anchored in lake space; lab :5164, base :5163 = p4wl, MAIN water :5162) - 22 Nov 2026
## 18:11 start. Read briefs p4r4 / p4pri2, args p4wl (round 1) + p4wl2 (common, lanes.wl2g), rejudge_p4wl LOG, p4wl HANDOFF.
- Lane = APFS clone of p4wl (fresh, no earlier LOG). Lab :5164 started.
## 18:35 build 1: Water.ts only. wl2gOn (`?wl2g=0` = p4wl), band mode only (P4WL_BAND active): the walk pass rasterises the lake
   through a FIXED anchor VP (uLkWalkAP in a walk-only vertex shader), walks from the frame's camera (cameraPosition); the water
   reads through uLkWalkVP = the anchor. Anchor = the camera at anchor time, frustum x guard 1.25, target x 1.25 (texel = quarter
   texel at the anchor pose); re-anchor when the frame's lake (9x9 screen probe on the lake plane / horizon) leaves the target
   or the anchor texel > 1.06 x the frame's quarter texel, or on a resize. Scissor = the frame's lake bbox + 4 texels (same
   texels drawn as the quarter pass). tsc 0 / 0.
## 18:20-18:40 build 1 measured. Re-anchors (stepped probe, tools/probe5.mjs): the pointer orbit moves the camera +-1.8 m (x)
   and 10.0-11.8 m (z): a fixed anchor's texel drifts to 1.3-1.8 x the quarter texel -> oversample s 1.35 (target x g x s) +
   re-anchor when sigma_max(anchor texel in frame quarter texels) > 1.0: fast path 4 re-anchors / 300 frames, diag 3.
   ident build 1: ?wl2g=0 == :5163 and ?p4wl=0 == :5162 IDENTICAL at T1 / T2 / T0 / p04 / p06 / p07 (id/ident_summary.txt).
   Same-pose fast T1 DPR 1 (st/d1_*): blips ~ p4wl (left 590 -> 585, shelf 206 -> 206, far 990 -> 980). The walk's own error
   isolated as E = F - F(?wlwalk=px) (tools/walkerr.py, st/E_d1_shelf.png): the crenellated loops still reshape per frame in the
   lane (mean|dE| shelf 0.833 -> 0.808 only). => anchoring the grid is NOT enough: each anchored texel's walk follows the frame's
   azimuth, and the horizon jumps where a slightly turned ray enters other heightfield cells.
## 18:42 build 2: + the walk pass walks two FIXED azimuths of a 4 mrad lattice bracketing the view's and blends them (walk pass
   only, wl2gWalkFrag; `?wl2gaz=0` = build 1). Water program unchanged vs p4wl.
## 18:47 build 3: + WL2G_READ (water read: the horizon interpolated over the 4 lake-fixed taps, the pixel's share under it once;
   `?wl2gread=0` = per-tap). LOOK st/s1g_zoom.png + st/s3_zoom.png (CSS 290-400 x 455-495, zoom 6, frames 98-100, rows
   p4wl | lane): p4wl's dark shelf-reflection blobs take a new outline every frame; the lane's keep their shape and slide (the
   frame diffs show thin 1-px edge lines only). Build 1 already stable, builds 2 / 3 the same look (2 = continuous texel values).
   Numbers (fast, DPR 1, blips thr 12/6/4): shelf p4wl 206/541/782 -> lane 205/507/727 (GT 192/373/609); left 590/2565/4517 ->
   577/2476/4359 (GT 325/1453/2997); far 990/2973/5147 -> 977/2901/5018. Final candidate = build 3. Evidence chains started 18:48.
## 18:48-19:08 final build (3) evidence
- ident (id/ident_summary.txt, final build, 18:48-18:56): ?wl2g=0 == :5163 IDENTICAL at T1 (14 targets / 16 programs), T2 (15),
  T0 phone (10 / 14), p04 expand 0.9, p06 expand 2.97, p07 release 0.33; ?p4wl=0 == :5162 IDENTICAL at all six; lane ON T0 ==
  :5163 (no walk on T0); control lane ON T1 DIFFERS (walk etc.). Refs for :5162 / :5163 = p4wl fixer's id JSONs (frozen builds;
  m_T1 / m_T2 / m_T0 / on_T1 byte-equal to the re-judge's re-runs). logs 0/0 everywhere.
- same pose fast T1 DPR 2 (st/d2_blips.txt, buffer 1800; GT = :5163 ?wlwalk=px&lkmeach=1 2880 wide box-resampled): left
  MAIN 1305 | p4wl 1075 | lane 1055 | px 1270 | GT 818; shelf 345 | 329 | 328 | 340 | 323; far 1782 | 1581 | 1569 | 1891 | 1645.
  DPR 1 (st/d1_blips.txt): left 774 | 590 | 577 | 711 | GT 325; shelf 216 | 206 | 205 | 222 | 192; far 1101 | 990 | 977 | 1173 | 920.
  => shelf box within +15 % of the GT (DPR 1 +7 %, DPR 2 +2 %); LEFT box NOT (+78 % / +29 %): its excess is the lake's own ripple
  sparkle (MAIN 774, the per-pixel walk 711 too), not the walk read; far box <= :5163.
- client files (refs_user/wl2_wl2g_*): 1x / 2x MAIN | lane (fast, DPR 1, frames 98-101), contour_x6 MAIN | p4wl | lane
  (contrast x4, zoom 6, + frame diffs), mp4 T1 DPR 2 MAIN left | lane right (stepped fast path, 30 fps = half speed).
- re-anchors on the final build (probe5, after a 5 s settle): fast path 4 / 300 frames, 0 errors.
- 60 fps sparkle at rest (s60/s60.txt): far lane 1.8 / lips 1.3 (re-judge's MAIN 2.1 / 1.1, p4wl 1.7 / 1.1); left box
  leftwater MAIN 2.0-2.1 | p4wl 2.0 | lane 2.0, shelfwater 0.2 | 0.2 | 0.4 (GT 0.0-0.1). Same-session re-runs of MAIN / p4wl far
  and ?wl2gread=0 started (s60b).
- FAIR (fair/fair_G.txt, lane vs own 16-sample GT): slow 32 ev / 222 px (MAIN 41 / 293), medium 61 / 742 (MAIN 73 / 910).
- perf A/B queued 19:07 (machine load 84 from other lanes: waiting).
## 19:09 probe (final build, 0 errors each): T2 hold 4 re-anchors (dolly start h 0.997 / 0.999, release h 0.01 / 0), T1 holdpan 4
   (same places), T1 fast 4 / 300. DPR 2 look (st/d2_zoom.png -> refs_user/wl2_wl2g_contour_T1dpr2_x5_MAIN_P4WL_LANE.jpg): MAIN /
   p4wl diffs show filled teeth switching, the lane's only thin edge lines. HANDOFF drafted. Waiting: FAIR (4 paths), perf.
## 19:10 s60 same session (s60/s60b.txt): far farwater / lips MAIN 2.0 / 1.2 | p4wl 1.7 / 1.2 | lane build 3 1.8 / 1.3 |
   lane ?wl2gread=0 1.6 / 1.1 (GT 0.0); left box shelfwater build 3 0.4 vs ?wl2gread=0 0.2 (= p4wl, MAIN). => WL2G_READ adds a
   little rest sparkle and its contour looked the same as build 2 (st/s3_zoom.png): build 4 = WL2G_READ OPT-IN (?wl2gread=1).
   Killed the build-3 FAIR (slow 32/222, medium 61/742 kept in junk/g3) and perf; restarted the lab 19:11; all lane evidence redone.
## 19:12-19:32 build 4 (final) evidence: ident all IDENTICAL again (id/ident_summary.txt, logs 0/0); tsc 0 / 0; same pose blips
   d1 left 577 / shelf 205 / far 977, d2 1053 / 328 / 1569 (GT d1 325 / 192 / 920, d2 818 / 323 / 1645); contour sheets
   (client/contour_x6.png, st/d2_zoom.png) looked: lane outlines stable, MAIN / p4wl reshape. Client files regenerated from build 4.
   FAIR lane vs own GT (MAIN vs own): slow 31/217 (41/293), medium 57/701 (73/910), fast 43/555 (63/748), diag 31/452 (39/527).
   Slots: all 3 held by wl2b / wl2f perf + FAIR; reverse / leave pending, perf queued after FAIR (tools/tail_chain.sh).
## 19:39-19:48 FAIR done: reverse 77/1217 (MAIN 103/1427), leave 44/476 (52/645): all six paths below MAIN. Perf STRICT A/B:
   3 pairs, all invalid (other lanes' jobs in the slots), stopped 19:48 at the time box with the queued s60 re-run. WORK cleaned
   (FAIR / superseded captures deleted: 2.0 GB). FINAL: ok = false: BAR (2) left box +78 % / +29 % over the GT (lake ripple
   sparkle, not the walk), BAR (3) perf not proven. Contour (BAR 1), FAIR (5), ident (6), tsc / ice / T0 (7), s60 (4) pass.
   Lab :5164 left running (build 4).
