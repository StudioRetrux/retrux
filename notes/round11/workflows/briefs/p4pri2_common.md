# P4 priority round 2 + int3 verification (addendum to briefs/p4r4_common.md; binding) - 21 Nov 2026 16:08 WIB

Read MAIN/notes/round11/workflows/briefs/p4r4_common.md first: its hard rules, paths, tools, slot and capture harness apply,
with the changes below.

## The new base: lane int3
- LANES/int3 (lab :5172) = int2 (= MAIN, lab :5179) + the round-4 lanes that passed, merged 3-way by the lead (21 Nov 15:24-16:07):
  - h4 (hold framing margin, release rejoin, capture harness; `?p4h4=0`): HoldR11.ts, Rings.ts, Choreography.ts, hero-lab/index.html, hero-lab/main.ts
  - w4 (hold bottom strip with the mipmapped wave normal texture public/hero/lake_chop.png, far water; `?p4w4=0`): Water.ts, HeroEngine.ts
  - e4 (navy notch, crawling specks / ticks, pop wedge; `?p4e4=0`): assets.ts, new p4e4.ts, PlateEnvironment.ts, 32 baked `*_p5*.webp`
  - a4 REST parts only (waterline mist, floe haze, left-foot mist, far range; `?p4a4=0`): p4atmos.ts, PlateEnvironment.ts. Its hold
    fog bank and berg changes are OPT-IN in int3 (`?a4bank=1`, `?a4berg=1`; the release fix needs `?a4bank=1`) because its rejudge
    found A4-RJ1 (the release veil washes the iceberg ~1.5 s after every release). Default hold bank / release = int2's = MAIN's.
  - orbd (the orb as a glass ball without the thick outline ring; `?p4orbd=0`): Orb.ts only.
  - skipped: o4 (new ice-band stain R1); rip round 1 (failed, see below).
- LANES/int3_base (lab :5173) is a frozen byte copy of int3 at 16:07 (same served main.js). Priority-round-2 lanes clone
  int3_base and prove their switch / AA gates / perf against :5173. Never edit int3_base, never stop :5173.
- LANES/int3 (:5172) belongs to the int3 verifier (and a fixer, if the lead starts one). Ripple lanes never touch it.
- The client sees MAIN today (:3000 dev, staging, = :5179). Look comparisons for the client: target / reference | lane | MAIN (:5179).

## The client's standing words (21 Nov)
- "please make no mistakes" and "jangan buang buang token yaa, lo harus efisien dan produce really good and make no mistake!!!":
  self-gate before you report ok (re-run every hard gate on your FINAL build; look at every image you cite); short dated LOG
  entries; no busywork; delete analysed capture sets.
- Ice look: "bagian ring es, please balikin ke yang versi before ajaa" - no lane changes the ice rings' look by default.
- "always tell me the progress yaa": the lead reports; keep your LOG's last lines meaningful (stage, last number, next step).
