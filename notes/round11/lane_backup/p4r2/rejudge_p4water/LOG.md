# RE-JUDGE p4water after the fix round (21 Nov 2026 06:02-06:35 WIB; lab :5177 read-only, reference :5199)
Build check: lab :5177 started 05:35:03 on the final Water.ts (mtime 05:35:02); patch sha256 902ee34f...86908 (WORK and MAIN mirror
equal); patch applied to aa8's Water.ts == lane Water.ts; lane app/ differs from aa8 only in Water.ts.
## Ident (tools/chain.sh, ident/*.json, identcmp.mjs)
T1 ?p4water=0 vs :5199 IDENTICAL (final, 6 targets, 16 programs); :5199 now vs 04:37 IDENTICAL (frozen ref stable);
hold pose (expand 2.97 + 20 moving frames) ?p4water=0 vs :5199 IDENTICAL (18 programs); T2 off IDENTICAL; T0 lane default IDENTICAL;
envlake=plate&p4water=0 IDENTICAL. Lane default T1: final only (+ programs rx-water, rx-water-walk) -> walk/cache/cacheN/mirror =
MAIN at rest (Q9 off). Lane default hold: cache, cacheN, final (hold path exercised). 0 console lines.
## W3 (hold flicker) - fresh deterministic 60 fps hold path (cap --path hold, 480 frames)
caps/hold_R (lane default) is BIT-IDENTICAL to the fixer's hold_F2 (480/480 frames). caps/hold_O (?p4water=0, same session):
flick.py y686-766 flip: press k30-150 MAIN 4.764 % / lane 4.309 %; sustain 0.688 / 0.681; release 5.113 / 4.927; y600-686 press
3.284 / 2.940, sustain 0.753 / 0.752, release 4.395 / 4.101 (ana/flick_mine.txt). -> W3 FIXED.
Per 120 px block (ana/flick_cols.txt): lane <= MAIN almost everywhere; exception sustain y726-766 x1200-1440: 0.50 -> 0.98 %
(k218-223 peak 3.3 -> 5.5 %), img/hold_k219-222_x1200-1440_y716-766_O_R_x3.png.
## W1 (glint)
shoot_qc q00/q03 x2 each (ab/def*, off*): high capture-time variance (q00 centre def 185.8/189.4 vs off 186.1/190.9; glint box
def 178.9/180.0 vs off 183.1/187.9; q03 centre def 197.9/198.9 vs off 197.2/191.9; q03 glint box def 188.8/190.2 vs off 185.7/183.0).
Decisive same-clock A/B = rest frames k0-27 of the deterministic hold path (tools/restbox.py): centre 180.0 -> 184.7 (p10 158.5
-> 167.6), glint box 178.7 -> 182.1, env box 186.4 -> 188.0 (p10 161.6 -> 165.1), grade p1 140.4 -> 142.0 (F000 108.8);
centre B-R 35.4 -> 33.8 (F000 35.1: whiter). -> W1 FIXED (no dimming; +3.4..+4.7 toward F000; hue a little whiter).
img/q00_glint_x2_M_F_ref.png, img/rest_k12_rings_glint_x2_O_R_F000.png.
## W2 (orbit ghost)
my default shoot_pointer (ab/ptr_def): ptr_left box sd4/lap 3.32/6.93 (MAIN 3.28/6.86, off 3.20/6.71, builder 2.35/4.16);
ptr_right 3.05/7.45 (MAIN 3.08/7.65, builder 2.39/4.79); all 10 spots' water y440-766 = ?p4water=0 within 0.7 L.
img/ptrL_x3_M_off_mine.png, ptrL_x3_M_off_B_F.png, ptrR_x3_M_off_B_F.png. -> W2 FIXED (by Q9 off).
## W4 / W5 / G2 state (qc_fix vs MAIN p3/r11_1 vs ref)
dark.py <120: p05 88 px (MAIN 103, builder 431), p06 162 (88 / 515; new 51 px streak x1404-1427 y738-743 rgb 84,100,125 at the
right edge, img/p06_right_x5_M_B_F_F420.png). Strip y686-766 sd/lap: p05 12.46/6.24 (MAIN 11.47/6.76, F402 17.53/5.36),
p06 12.00/6.37 (11.38/6.33, F420 17.53/5.22). Deterministic sustain strip: L 175.6 -> 176.9, sd 14.39 -> 14.90, B-R 34.1 -> 32.8.
LOOKED: p05/p06/sw_hold_* bottom strip is back to MAIN's smooth pale glass-plate band (img/p05_mid_x3_M_B_F.png,
p06_bot_x1_M_B_F_F420.png, hold_k200-202_x700-1180_M0_Z_F2_x2.png, sw_holdL_popB_bot_M_B_F.png); texel stair-steps at
x1100-1440 as MAIN (p05_p06_right_x3_M_F.png); W5 onset step gone; dotted crest-silhouette line moved, not removed (p06 x265-345
y745-755; hold k80 x40-140 y735-748: img/p06_dots_x6_M_F.png, hold_k80-81_x0-200_y730-766_M0_F2_x6.png). Release p07/p08 =
MAIN look (img/p07_p08_bot_x1_M_F_ref.png).
## Waterline AA gates (diag, leave: not re-run by the fixer; tools/pop2.sh; ana/pop_{diag,leave}.txt)
diag: AA8 1719 / 48 events / 620 px vs lane 1716 / 48 / 620; new 2 px, 0 clusters >= 6 px. leave: 1991/62/896 vs 1993/62/887;
new 0 px. Fixer's medium / fast: 0 >= 6 px. Far-waterline top events identical -> crawl unchanged.
## Thin tip: q00 x170-240 y497-509 L 168.5 sd 21.64 (MAIN 168.4/21.60); p08 same look (img/tip_x4_q00_M_F_def1_p08_M_F.png).
## Perf
run 1 (perf/ab.json; 6 pairs per mode, SLOT_BG=0, loads 4.7-8.0, frames 40-90 ms = GPU shared with other lanes): paired med
move 1.015, rest 1.016, hold 1.007 (pairs hold 1.007 0.79 1.032 1.487 1.008 0.972); ratio of medians 1.022 / 0.833 / 1.123.
run 2 hold-only (perf/ab_hold2.json, 10 pairs) INVALID: loads 15-57 during it; paired 1.148, ratio of medians 1.133.
-> gate formally passed by run 1; the hold cost is not cleanly settled (two contended ratio-of-medians ~1.12-1.13 vs paired 1.007;
fixer 0.963 contended; builder's valid 0.986). Quiet-machine hold A/B needed before merge.
## Verdict: PASS (W1, W2, W3, W5 fixed and verified; nothing worse than MAIN found; open: G2 largely undone, W4, W6, W7, hold perf).
## 06:31 disk: deleted caps/diag_X, leave_X (analysed: ana/pop_*.txt) and caps/hold_R (bit-identical to WORK p4water caps/pop/hold_F2, which is kept); kept caps/hold_O (fresh ?p4water=0 hold path).
