# AA7 FINAL JUDGE, lens ARTIFACTS / REFLECTION (judge-artrefl), 20 Nov 2026 (Asia/Jakarta), box 19:54-21:04
Read-only. AA7 = :5197 (lead's), AA6 final = :5196 (frozen, knee 0.5), BASE = :5182. All three up (lsof 19:54).
WORK = $SP/work7/artrefl (tools/, caps/, ana/, img/, logs/). Backup = MAIN/notes/round11/lane_backup/aa7/judge-artrefl/.
Tools = copies of $SP/work6/refl/tools (+ glide/ = $SP/work6/glide/tools); every createRequire patched to
~/Library/Caches/retrux-lanes/pw/package.json. Every browser through slot.mjs. Finding ids AR-n (A-n is taken by AA3's judge).
Variants: A7 = AA7 default (:5197), A6 = AA6 final default (:5196), FIX1 = fixed AA3 caps ($SP/work6/refl/caps/*_FIX1,
medium = $SP/work6/integ/caps/medium_A6g0f0), BASE = $SP/work3/aa3/caps/*_base, GT = 16-sample.
Knee: HeroEngine sets aaKnee.value = 1.0 once at construction when the glide exists (aaCompress c/(K+luma c)); region =
below the horizon line and outside the cloud-card box (chunks.ts GLSL_AA_RESOLVE).

## 1. Captures (19:56-): chain A = AA7 slow/medium/reverse then fast/diag(120)/leave/rest(40); chain B = same on AA6.
  cap.mjs --rows 380,766 (240 frames unless noted), 46 s per 240-frame path; console errors / warnings per cap in logs/b*.log.
