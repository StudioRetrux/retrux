# judge_p4orb LOG (independent judge of lane p4orb, lab :5176; read-only)

21 Nov 2026 00:57 WIB start; brief p4r1_common.md, plan Q2/Q4/Q7, panel lenses read; lane HANDOFF + patch (715 lines) read.
- 00:59-01:01 ident re-run (own copy of identP.mjs, slot): ?p4orb=0 vs :5197 IDENTICAL at T1, T2, T1 HOLD (new: --pre pose expand 2.97);
  lane ON T1 HOLD differs only main/refraction/bloom0-4/final + rx-orb/rx-shards/rx-bloom-down/rx-bloom-up/rx-grade. ident/summary.txt
- 01:01-01:07 perf (slot, SLOT_BG=0): rtx real loop 6 pairs/mode, load max 7.5: lane/main paired mean-interval medians move 1.019,
  rest 0.942, hold 1.001 (0.973-1.042). ftime sync 8 pairs, load <= 5.2: rest 1.001, hold ~1.00 (mean 0.996). No regression > 5 %.
- 01:01-01:12 images: full-frame diff maps lane vs panel MAIN set (poses, ptr, sweep: shard belt / ripples / sweep timing not
  deterministic across capture runs); orb + shard crops MAIN | lane | REF; deterministic lane vs ?p4orb=0 bursts (flick/).
  FINDING: hold orb lost its hot core: p05 box241 (min ch >= 248) MAIN 17.6 % / F402 16.2 % -> lane 0.0 %; interior a flat ~248 plateau,
  neutral-grey bezel (rim B-R +15 vs ice +29, F402 +25..+28); reads as a matte plate (orb_p05_expand.png, orb_stretch_p05_p06.png,
  sw_lane_orbs.png). Hold ice around the orb -3..-4 L (deterministic A/B). Crystals improved; no flicker increase.
- 01:12-01:13 patch applies to aa7 and reproduces the lane's 5 files byte for byte; tsc hero 0 / project 0 (--noEmit --incremental false).
  T0 lane ON and ?envlake=plate&p4orb=0 IDENTICAL.
- Verdict: FAIL (2 major regressions/open + 1 major open + 1 minor open). Scores in verdict.json.
