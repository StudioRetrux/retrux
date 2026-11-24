# AA7 RECHECK after the fix round (20 Nov 2026, Asia/Jakarta; started 22:14, time box 50 min)
Final build = lab :5197 (lane retrux-lanes/aa7 = BASE + fixer/aa7.patch = lead's AA7 + G-3 fix B). Read-only: :5197 / :5196 / :5182 never restarted.
WORK = $SP/work7/recheck (tools/, caps/, ana/, img/, ident/, logs/). Mirror = MAIN/notes/round11/lane_backup/aa7/recheck/.
Every browser through slot.mjs; playwright-core 1.49.1 (retrux-lanes/pw) for Chrome; 1.65.1 (RetruxR11Work/pw165) for WebKit / Firefox.
Tools: copies of $SP/work7/motion/tools (tools/mo: cap, crawl, glide, g1tab7, strip) and $SP/work7/fixer/tools (tools/fx: identS, ident,
identcmp, g10x, ar/glide/jcap, ar/strip, ar/palecmp, ar/dfstep); new: tools/capcmp.mjs (frame-by-frame RGBA + pose compare).

## Process note
- 22:17 I launched 3 slot waiters in the same second. slot.mjs raced (mkdir before owner.json): "cap slow" took over medium's fresh
  lock as "stale pid 0", so 4 browsers ran for ~35 s. I stopped both captures at 22:18:08 (back to 3 holders), deleted their partial
  caps and re-queued them 2 s apart. No result uses the stopped runs.

## 1. Scale-1 identity of the final build (G-3 fix B applied) - PASS
- The six G1 paths captured on the final :5197 (cap.mjs, the motion judge's exact args: rows 380-766, slow 160 / medium 240 /
  fast, diag, reverse, leave 120 frames) are PIXEL-IDENTICAL to the motion judge's pre-fix AA7 caps ($SP/work7/motion/caps/<p>_A7):
  880 frames, 0 px differ at threshold 0, camera poses identical (tools/capcmp.mjs, ana/capcmp.txt). So every default-path
  verdict the three judges gave at scale 1 carries over unchanged to the final build.
- identS.mjs (20 moving frames; final image + mirror / walk / cache / cacheN / reflection targets + every linked program), fresh runs
  on :5197 compared with the fixer's saved pre-fix AA7 hashes (:5199 aa7pre clone, $SP/work7/fixer/ident/p5199_*.json)
  (ana/ident_g3.txt): default, ?ffblock=0, ?lkglide=0, all five off, ?mirrorcost=0, T0 phone: IDENTICAL; ?ffblock=0 at 0.7 and
  at 0.9: IDENTICAL; ?mrows=0 at 0.7 = pre-fix AA7 at 0.7: IDENTICAL; ?mrows=0 at scale 1 = default: IDENTICAL; default at 0.7:
  mirror / walk / final differ, programs identical (expected; mirror 504x383 vs 504x268, reflection 504x268 both). The final
  default hashes now equal the fixer's 21:5x run of the final (deterministic). 0 console lines in all 20 ident sessions.

## 2. G8 switches (fresh reference runs on :5196 and :5182) - PASS (ana/g8.txt)
  ?mirrorcost=0 vs default: final + all 6 targets SAME; programs differ only in rx-lake-sky / rx-lake-sky-late / rx-plate-baked-mirror (AA5c)
  ?lkglide=0&mirrorcost=0 vs AA6 ?lkglide=0 (:5196): IDENTICAL (15 programs)
  all six off vs BASE T1: IDENTICAL (14 programs);  T2 all six off vs BASE T2: IDENTICAL;  ?envlake=plate vs BASE plate: IDENTICAL;
  T0 vs BASE T0: IDENTICAL;  ?mrows=0 vs default at scale 1: IDENTICAL.

## 3. Final G1 table (NEW masks, L9 for FS) and G1c - unchanged from the motion judge (the caps are identical)
ana/g1tab.txt (g1tab7.py on my crawl_<path>.json; seqs BASE / FIX / AA7 = final / GT; stride 2):
  MC32 vs BASE    FS     WR     DR     FF     FR     RS    total
  slow          -74    -74    -87    -83    -74    -90    -82
  medium        -82    -68    -86    -84    -73    -91    -82
  fast          -22*   -52    -82    -84    -78    -85    -74     (*FS L9 bar 20; GT -25)
  diag          -37*   -58    -86    -86    -81    -82    -78     (*bar 29; GT -34)
  reverse       -19*   -65    -74    -83    -78    -82    -74     (*bar 14; GT -19)
  leave         -37*   -66    -91    -83    -79    -91    -79     (*bar 28; GT -33)
  FS MCE <= fixed AA3 on all six (2.781/3.000, 2.117/2.281, 3.767/3.936, 3.004/3.216, 3.854/4.044, 2.743/2.907).
  L4: one miss, the same as M-1: slow WR J48 -32 % vs GT -39 % (floor -34 %). Texture lake 1.0074-1.0108, solid 0.9998-1.0001.
G1c medium (glide.mjs REL-to-GT area5 ALL): final 0.2009 = pre-fix AA7 0.2009, F1 0.2225 (AA6 0.2000 per the AA6 pre-judge: +0.45 %).
  ESF 2.06 / -0.11 (GT 1.94 / -0.11). PASS.

## 4. AR-1 (a), render scale 0.7 (the art judge's own gov repro) - FIXED at the judge's frames
Repro: jcap gov (rows 380-766; governor 1 -> 0.9 @25 -> 0.8 @50 -> 0.7 @75 -> 1 @100) with fin (:5197), mr0 (:5197 ?mrows=0 =
pre-fix AA7 sizing, IDENTICAL to pre-fix AA7 at 0.7 per section 1), f0 (?ffblock=0), base (:5182 + mask). 0 console lines in all four.
- Looked at img/gov_s07_k87-95_x80-200_FIN_MR0_F0_BASE_z4.png, gov_s07_k88-96_x60-220_FIN_MR0_F0_BASE_z5.png and the 1x
  gov_s07_k89-93_x0-420_FIN_MR0_BASE_z1.png: mr0 has the small lighter rectangle at the floe's thin left end at k90-92 (hard edge
  at k90); fin does not (even water, no edge); f0 and BASE keep the full pale block.
- Probe k91 y503 x113-129 step 4: fin 124 118 105 108 102 | mr0 129 126 118 119 113 | f0 129 126 118 119 115 | BASE 103 100 92 96 97
  (= the fixer's numbers). mr0 brighter than fin by > 20 lv on 954-1113 px per frame at k88-93 (box x0-680 y470-560).
- Governor steps, mean |F(k)-F(k-1)| rows 450-766 at k25 / 50 / 75 / 100: fin 6.76 / 6.44 / 3.98 / 4.83, mr0 7.04 / 6.55 / 4.39 /
  5.28, BASE 7.21 / 6.76 / 4.48 / 5.33: no spike. Scale-1 windows k0-24 and k101-119: fin = mr0, 0 px (ana/gov_*.txt).

## 5. What fix B changed elsewhere - the remnant at reduced scale is now the scale-1 one (new observation, minor)
- Same gov capture, 0.8 and early 0.7 (k61-88): the FINAL shows a small pale spot at the same floe's thin left tip (about 16-30 px
  wide, 6-10 px tall) that pre-fix sizing does not show at those frames. Band x40-300 y492-512 (ana/gov_palenew_floeband.txt,
  tools/fx/ar/palenew.mjs): final brighter than BOTH pre-fix and BASE by > 15 lv on 34-171 px per frame at k61-88, 0 at k89-95;
  pre-fix brighter than both only at k91 / k92 (109 / 216 px; <= 51 px at k79-85). Probe k70 y500 x144-164: final 173-199,
  pre-fix 165-175, BASE (0.8) 167-172. Looked at img/gov_s08_k66-74_x100-260_FIN_MR0_F0_BASE_z5.png,
  gov_s08_k64-72_x120-280_y490-520_FIN_MR0_BASE_z6.png, gov_s07_k76-86_x60-260_FIN_MR0_BASE_z4.png (x4-x6: a lighter spot with a
  vertical edge at the tip in fin only) and the 1x gov_s08_k62-74_x0-420_FIN_MR0_BASE_z1.png (faint; you see it if you look for it).
- Cause: the same camera path rendered at scale 1 (tools/fx/ar/glide/jcapS1.mjs --noscale = jcap with the governor steps skipped;
  poses identical, k0-24 identical to the gov run) shows the SAME spot (img/gov_tip_k66-86_x90-250_FIN_FINscale1_MR0_BASEscale1_z4.png,
  gov_tip_k70-86_x40-360_FIN_FINscale1_MR0_z2.png). Probe k70 y500 x136-176: final 159-199, scale-1 final 163-199, pre-fix
  164-175; BASE at scale 1 has its block there (169-200). Band x40-300 y492-512, px > 15 lv off the scale-1 render
  (ana/gov_band_vs_scale1.txt): 0.9 final 987 / pre-fix 1,315; 0.8 2,150 / 8,015; 0.7 4,011 / 14,310 px-frames.
  So fix B does what it says (reduced scales sample the rows as scale 1 does), and the spot it shows at k61-88 is the scale-1
  thin-tip remnant, i.e. AR-1 (b)'s mechanism. The coarser pre-fix rows hid it at those frames and exposed it at k90-92 instead.
- Consequences: AR-1 (a) is closed as reported, but the reduced scales are not free of the remnant; they now show what scale 1
  shows. And AR-1 (b) is broader than the hold dolly: on this ordinary pointer sweep at scale 1 the near far floe's tip shows the
  remnant in every frame sampled from k70 to k86 (step 4). Same class and size as the judge's AR-1 (a) / (b), not larger.
- AR-1 (b) itself: final = pre-fix at scale 1 (section 1), so the fixer's holdre evidence stands; I looked at
  fixer/img/holdre_k203-209_x100-200_PRE_FIN_F0_BASE_z5.png: PRE = FIN, both keep the small rectangle with a hard right edge.
- Elsewhere in the 0.9 / 0.8 windows, fin vs mr0 differs by > 20 lv on ~190-250 px per frame each way (ana/gov_windows_fin_vs_mr0.txt,
  gov_dcell_s09s08.txt); the fixer looked at the largest site (k37-40 x880-1000) at x4 and 1x. Not re-looked here.

## 6. G10 console lines on the final build
- Chrome: 0 errors / warnings in every session (20 identS runs, 6 cap.mjs paths, jcap gov x4, gov scale-1 x2).
- WebKit (Safari 27.2 engine, g10x.mjs, 60 stepped frames): boots T1, TAA on, mirrorEvery 1, glError 0, 0 console lines at scale 1
  and 0.7 (BASE 0). Looked at g10/webkit_s0.7/webkit_lane_screenshot.png: a normal frame, HUD "scale 0.70".
- Firefox 159: boots T1, TAA on, glError 0. Lane 10 lines, BASE 8, at 1 and at 0.7: the 2 extra are "Output of vertex shader ...
  not read by fragment shader" program-info warnings (perf judge's P-3; ?debug only). Unchanged by fix B.

## 7. Fix B at DPR 2 (not run by the G-3 investigator or the fixer)
jcap gov --dsf 2 (T1 caps the buffer at 1800x957, pixel ratio 1.25; rows 475-957), fin / mr0 / base, 0 console lines (ana/gov_dpr2.txt):
- |dF| at the steps k25 / 50 / 75 / 100: fin 6.99 / 6.84 / 3.72 / 4.68 <= mr0 7.17 / 7.07 / 4.31 / 4.98 <= BASE 7.31 / 7.22 / 4.49 / 5.06.
  Scale-1 windows k0-24 and k101-119: fin = mr0, 0 px.
- The same trade as at 1x: tip spot brighter than both pre-fix and BASE by > 15 lv in fin at k68-87 (6-69 px per frame, band
  x50-375 y615-640), in mr0 at k61-64 and k89-92 (54 / 21 / 105 / 17 / 36 px). Looked at img/gov_dpr2_k72-92_x70-330_FIN_MR0_BASE_z3.png:
  faint tip spots in both builds at different frames, BASE's full block at k88-92; nothing new at DPR 2.

## 8. Reverse look, x2 (and x3-x4 details): final vs BASE vs GT (16-sample)
img/rev_FS_k38-62_FIN_BASE_GT_z2.png, rev_RSa_x940-1190_*.png, rev_RSb_x1190-1440_*.png, rev_FSfoot_x300-430_k40-64_*_z4.png,
rev_RSfoot_x960-1160_k40-64_*_z3.png. The final's FS waterline and the slab's right corner run smooth like the GT, with no stepping;
BASE shows a sharper light notch under the FS corner (the GT and the final have only a soft light column there) and a bright
horizontal dash at the RS foot (x ~975-990, y ~653, every sampled frame k40-64) that neither the final nor the GT has. RS foot and the right rock look like the GT. (These caps are pixel-identical to the motion judge's AA7 caps.)

## 9. Verdict (22:35)
- Fixed and verified: AR-1 (a) at the judge's frames (gov k89-93, scale 0.7). Fix B is exact at scale 1 (six G1 paths pixel-identical,
  ident identical with all switches), G8 exact, G10 console clean (Firefox's 2 extra lines are P-3, debug only).
- Still open: M-1 (minor, L4 cell slow WR J48 -32 % vs floor -34 %, lead decision under L10; unchanged), AR-1 (b) (minor, the
  scale-1 thin-tip remnant; unchanged by identity, and it also shows on an ordinary sweep at scale 1).
- New (minor): fix B carries the scale-1 thin-tip remnant into the reduced scales. In the judge's own gov repro the reduced-scale
  remnant moved from k90-92 (pre-fix) to k61-88 (final); each instance is the scale-1 one, faint at 1x.
- Nits still open from the judges and untouched by the fix round: M-2, M-3, AR-2, AR-3, AR-4, P-1 ... P-5 (see their LOGs).
- Not run: real-loop cost of fix B at 0.7 / 0.8 (mirror target +43 % / +25 % px vs pre-fix there; still 30 % / 20 % fewer than at
  scale 1), tsc (the fixer's run: clean), hold / resize event cases at reduced scale.
- Disk: deleted my six G1 path caps (pixel-identical to $SP/work7/motion/caps/<p>_A7, which are kept) and gov_dpr2; kept
  caps/gov and caps/gov1 (0.8 GB) as the evidence for the new item. Labs untouched: :5197 / :5196 / :5182 still up.
