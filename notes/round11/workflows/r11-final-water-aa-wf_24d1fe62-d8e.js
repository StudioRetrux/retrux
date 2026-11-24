export const meta = {
  name: 'r11-final-water-aa',
  description: 'Two parallel lanes on MAIN (= water merged): W3 fixes the water majors/minors, AA2 makes the waterline smooth in motion on the new lake; judge/fix loops; integrate into a final lane (not MAIN)',
  phases: [{ title: 'Build' }, { title: 'Judge' }, { title: 'Integrate' }],
}
const SP = args.SP
const MAIN = args.MAIN
const INJ = args.inject || {}
const BASE = SP + '/lanes2/wm'
const SLOT = 'node ' + SP + '/slot/slot.mjs run'

const BUILD = {
  type: 'object',
  properties: {
    lane: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    summary: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    switches: { type: 'array', items: { type: 'string' } },
    gates: { type: 'array', items: { type: 'object', properties: { gate: { type: 'string' }, status: { type: 'string', enum: ['pass', 'fail', 'unknown'] }, numbers: { type: 'string' } }, required: ['gate', 'status', 'numbers'] } },
    evidence: { type: 'array', items: { type: 'string' } },
    open_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['lane', 'status', 'summary', 'files_changed', 'gates', 'open_issues'],
}
const VERDICT = {
  type: 'object',
  properties: {
    lane: { type: 'string' },
    pass: { type: 'boolean' },
    lens_score: { type: 'number' },
    gates: { type: 'array', items: { type: 'object', properties: { gate: { type: 'string' }, verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, evidence: { type: 'string' } }, required: ['gate', 'verdict', 'evidence'] } },
    findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] }, title: { type: 'string' }, evidence: { type: 'string' }, fix_hint: { type: 'string' } }, required: ['severity', 'title', 'evidence', 'fix_hint'] } },
    summary: { type: 'string' },
  },
  required: ['lane', 'pass', 'lens_score', 'gates', 'findings', 'summary'],
}
const clean = (v) => !!v && (v.pass || !(v.findings || []).some((f) => f.severity === 'blocker' || f.severity === 'major'))

const COMMON = `PROJECT: Retrux hero R&D, a real-time three.js r184 (WebGL2, TypeScript) hero: four thick ice rings around a glowing orb with small cobalt crystal shards, over an arctic lake (baked environment, ice floes, rocks, snowy mountains, cloud cards, mist), matched to a Blender Cycles reference (optically 1:1; the user's words win over the reference; NO improvisation: every visual choice traces to the reference frames or the user's words). Tiers: T1 = MSAA 4 (desktop), T2, T0 = FXAA (phones / iGPU).

STATE (19 Nov 02:20): MAIN = ${MAIN} now holds the WATER lane's new lake (LAKE_R12: a planar mirror of the baked scene + per-pixel walk + the Cycles water bump; default at T1 / T2; T0 and ?envlake=plate keep the older plate lake). It fixes the user's two loudest complaints (the water fragmenting when the camera moves, shadowing on the front floes), but its last judge (judge3, 7.8, FAIL) left 2 majors and 4 minors: ${SP}/wfcheck/p2b_judge3_water.json (and the fixer's own report ${SP}/wfcheck/p2b_fix2b_water.json; lane history ${SP}/work2/water/LOG.md, ${SP}/lanes2/water/HANDOFF.md, tools ${SP}/work2/water/tools, Cycles ground truth ${SP}/work2/water/gt).
Also in MAIN, for the plate lake only: hotfix2 (smooth waterline depth, ?shoreaa=0; ${SP}/work2/hotfix2/LOG.md) and the AA resolve (tone-compressed MSAA resolve below the horizon, ?aaresolve=0; ${SP}/work2/aa/LOG.md, ${SP}/work2/aa/aa.patch). HeroEngine.ts disables the AA resolve whenever the mirror lake is on (const aaResolve = msaaBaked && !mirror && ...), so on the new default lake the waterline has no AA help at all.
THE USER (18 Nov 22:30): "benerin pinggiran air di deket es itu kalo geser kamera kek low quality anti aliasin gitu ... aneh glitch gitu, make it smooth yaa" = the edge where the water meets the ice floes / rocks looks like low-quality anti-aliasing, glitchy, when the camera moves: make it smooth. Earlier (15 Nov): the water must look real and 1:1 with the reference under any camera move, never fragment; the front floes must not show shadowing; AAA realism.

TWO LANES RUN IN PARALLEL on clones of the same state: W3 (water look / perf / waterline flash) and AA2 (anti-aliasing of the waterline in motion on the new lake). Stay inside your own scope so the two merge cleanly: W3 owns world/Water.ts lake model internals, world/LakeMirror.ts, world/LakeSchedule.ts, world/LakeHeight.ts; AA2 owns pipeline/RenderPipeline.ts, pipeline/PostChain.ts, world/EnvEdge.ts, shaders/chunks.ts and may add only small, clearly delimited hooks in Water.ts / LakeMirror.ts / PlateEnvironment.ts / HeroEngine.ts (e.g. one output line, one define, one pass flag). Do not reformat or move code you do not need to change.

PATHS: BASE = ${BASE} (= MAIN's app at launch; the "before"; never edit it). MAIN is read-only for you (the lead merges). Labs: cd <dir>/retrux-web && PORT=<port> nohup node hero-lab/serve.mjs > <WORK>/lab_<port>.log 2>&1 & ; URL http://localhost:<port>/?tier=T1&debug=1 ; ready when document.documentElement.dataset.heroReady === "1"; debug API window.__hero.debug.freeze(true) / settle(seconds) / pointer(nx, ny). Stop the labs you started before you return; never stop other servers (:3000, :5173 and any port not yours). Headless Chrome ONLY through the gate: ${SLOT} '<lane>:<what>' -- <cmd> (if missing: ${MAIN}/notes/round11/lane_backup/slot.mjs with SLOT_DIR=${SP}/slot). Playwright via createRequire("${MAIN}/hero-pipeline/tools/package.json"); Chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" with ["--use-angle=metal","--enable-gpu","--ignore-gpu-blocklist"]; give browser.close() a timeout. Capture template ${SP}/eyes/eyes3.mjs. Typecheck: cd <LANE>/retrux-web && node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.hero.json && node node_modules/typescript/bin/tsc --noEmit --incremental false -p .
Timing: through the slot with SLOT_BG=0 in front of the slot command, at least 6 interleaved A/B pairs (same build with the reference switch, or lane vs BASE), only while the 1-min load is below 8; medians and the worst frame.
No commits, no edits outside your LANE and WORK, no new packages. An abrupt stop (usage limit / network) can kill you at any moment: append your state to WORK/LOG.md after every sub-step, and before you start read WORK/LOG.md and continue from it if an earlier attempt was cut off.
DELIVER: a unified patch vs BASE at WORK/<lane>.patch (paths a/retrux-web/... b/retrux-web/..., applicable with patch -p1 from a repo root in BASE's state; prove it on a fresh APFS clone of BASE: cp -c -R).`

const LANES = [
  {
    key: 'w3', port: 5181, bport: 5182,
    task: `LANE W3: fix the new lake's open judge3 findings, narrowly, with judge3's own measurements before and after:
1. MAJOR rest 1:1 on the right half: the far floe / iceberg reflection columns are faint and short, the water under the right front slabs is washed light (vs Cycles GT and vs the plate lake). Follow judge3's fix hint (veil / blur in the cached rest term, linear profile vs gt/r1/rest_calm.exr, the slab channel's reflected face colour from the face's own lookup).
2. MAJOR frame cost while the camera moves +13..16 % (gate: within +10 % of ?envlake=plate on the same build at T1, interleaved pairs, sweep and hold dolly): e.g. bake the fixed fBm bump once into a texture over the water plane (Cycles' bump is in object coordinates) and replace the per-pixel noise with a few fetches; verify the bump statistics vs Cycles (raw |log| at rest 0.263) and the hold crests.
3. MINOR but user-visible, the waterline glitch the user complains about: the 20 Hz flash at the right slab feet during pointer motion (mirror redrawn every 3rd moving frame): take the band's colour from the per-frame walk lookup or scissor-redraw the near-slab band; no flash at any cadence.
4. MINOR hold / release brown-grey streaky blotch at the right edge (LK_WAVEB crest tilt rays): mirror down rays or skip footprints entered from below; compare with a Cycles render at the engine hold camera.
5. MINOR hold crest look: only if you can measure the reference's chop (F404-F436) and match it; take no values that are not in the reference.
Out of scope: the T0 path (note it), anti-aliasing (AA2 owns it).`,
    gates: `GATES W3: G1 rest 1:1 right half (columns length / contrast vs Cycles GT, slab channel colour) at least as close as the plate lake; G2 lake never fragments, front floes no shadowing, from any visitor camera (orbit extremes, hover, hold dolly, release; T1 and T2): keep PASS; G3 no flash / pulse at the slab feet or anywhere on the waterline while the pointer moves (per-frame band luminance series, no periodic component); G4 hold and release: no streaky blotch, crest look per the reference; G5 frame time while moving within +10 % of ?envlake=plate (same build, interleaved pairs), at rest within +5 %; G6 switches: ?envlake=plate and the lane's ?lk* switches restore their states exactly, a new switch restores BASE exactly; G7 typecheck clean, 0 console errors / warnings, DPR 1 and 2, resize.`,
  },
  {
    key: 'aa2', port: 5183, bport: 5184,
    task: `LANE AA2: make the waterline (water against floes, rocks, slabs) smooth in motion on the NEW lake at T1 / T2 without changing the look at rest or the hero.
Step 1: extend the existing AA resolve (chunks.ts GLSL_AA_RESOLVE, RenderPipeline, EnvEdge's armed triangle) to the mirror lake: today it is disabled when the mirror is on because the mirror pass draws the same env materials; compress only in the main pass (a per-pass uniform / define) or expand when the mirror target is read, write the new lake's output compressed inside the region, keep the cloud-card carve-out. Measure crawl on the waterline bands with the AA author's and hotfix2's tools (${SP}/work2/aa, ${SP}/work2/hotfix2) vs BASE.
Step 2: if the crawl is still clearly visible (thin cracks, floe outlines, the floe sides' reflections, glitter specks; the AA author's analysis says 4 samples are not enough), add temporal anti-aliasing for the STATIC ENVIRONMENT region: reproject the previous frame's env-only image by depth with the previous view-projection (static geometry, the camera moves), blend with the current expanded env colour inside the below-horizon region, variance clipping in YCoCg against ghosting, Catmull-Rom history sampling against blur, rejection on disocclusion / off-screen / large camera jumps / resize, a rest image that converges exactly to the non-TAA image; optional sub-pixel jitter of the environment only (never the hero). It must run before any hero object is drawn so the hero never enters the history; the lake is animated (bump, walk, mirror including the rings' reflection: the rings spin constantly), so handle it explicitly (tighter clamp / lower history weight on water, keep the rings' reflection out of the history) and prove no lag or smear. The debug API (freeze / settle / pointer) must give converged frames. T0 and ?envlake=plate keep today's path exactly (hotfix2 + AA resolve there). Switches: ?aaresolve=0 (resolve off on every lake), ?taa=0 (TAA off) restore BASE exactly.`,
    gates: `GATES AA2: G1 crawl in motion on the waterline bands (front slab, the white rock, the dark rock, far floes, right slab feet), slow / fast pointer sweeps and the hold dolly: frame-to-frame jumps > 32 levels at least 50 % lower and flicker energy at least 30 % lower than BASE; time slices show the edges gliding; G2 no ghosting / smear / trails (fast sweeps, reversal, hold start / mid / release, pointer leaving the window), no smear of the rings' reflection in the water, no stale history after a jump or resize; G3 sharpness: after motion stops the image converges within 0.5 s to BASE's rest image (99.5 % of env pixels within 2 levels), in slow motion the detail keeps at least 90 % of BASE's gradient energy; G4 hero untouched (rings, orb, shards identical to BASE in identical poses); G5 clouds, mist, sky unchanged, no seam at the region boundary; G6 frame time at T1 within +5 % of BASE (interleaved pairs); G7 switches exact (every linked program identical after preprocessing with the switches), T0 and ?envlake=plate unchanged; G8 typecheck clean, 0 console errors / warnings, DPR 1 and 2, resize.`,
  },
]

const paths = (lane) => `YOUR PATHS: LANE = ${SP}/lanes2/${lane.key} (APFS clone of BASE; edit freely), WORK = ${SP}/work2/${lane.key}, your lab ports: lane ${lane.port}, BASE ${lane.bport}.`
const RETRY_NOTE = `\n\nNOTE: a previous attempt at this step was cut off. Read WORK/LOG.md first and continue from its state; do not start over.`

const buildPrompt = (lane) => `You are a senior real-time graphics engineer and technical artist. ${COMMON}\n\n${paths(lane)}\n\n${lane.task}\n\n${lane.gates}\n\nReturn the structured result (lane "${lane.key}", gates with numbers, evidence paths you looked at yourself, open issues).`
const judgePrompt = (lane, b, fixes, r) => `You are an adversarial, independent judge (round ${r}) of lane ${lane.key}. You did not build it. Default to FAIL on any gate you cannot prove with your own measurements and your own eyes. Read-only for the code; write your outputs to WORK/judge${r}/.\n\n${COMMON}\n\n${paths(lane)}\n\n${lane.task}\n\n${lane.gates}\n\nHOW: start the lane and BASE labs on your ports (stop them at the end); make your OWN captures (do not reuse the builder's images): consecutive moving frames, the hold sequence, 4-5x crops of the waterlines, time slices, diff maps vs BASE; LOOK at them and say what you saw; measure frame time with interleaved pairs; check the switches and the typecheck. Severity: blocker = broken / visible artifact in normal use; major = a gate fails or a visible regression; minor = small, measurable; nit = cosmetic. pass = true only with no blocker, major or minor open.\n\nThe builder's report: ${JSON.stringify(b).slice(0, 6000)}\n${fixes.length ? 'Fix rounds since: ' + JSON.stringify(fixes.map((f) => ({ status: f.status, summary: String(f.summary).slice(0, 1500), gates: f.gates, open_issues: f.open_issues }))).slice(0, 5000) : ''}\n\nReturn the structured verdict (lane "${lane.key}").`
const fixPrompt = (lane, v, r) => `You are the fixer (round ${r}) of lane ${lane.key}. Fix ONLY the judge's blocker / major / minor findings below, narrowly; reproduce each with the judge's own method first (their outputs: WORK/judge${r}/), then fix and re-measure the same way. Do not redesign what passes.\n\n${COMMON}\n\n${paths(lane)}\n\n${lane.task}\n\n${lane.gates}\n\nThe judge's verdict: ${JSON.stringify(v).slice(0, 9000)}\n\nKeep WORK/${lane.key}.patch current. Return the structured result (lane "${lane.key}").`

const results = await pipeline(LANES, async (lane) => {
  const K = lane.key
  let b = INJ['build:' + K] || await agent(buildPrompt(lane), { label: 'build:' + K, phase: 'Build', schema: BUILD })
  if (!b) b = await agent(buildPrompt(lane) + RETRY_NOTE, { label: 'build:' + K + '-b', phase: 'Build', schema: BUILD })
  if (!b) { log(K + ': build died twice'); return { lane: K, aborted: true } }
  log(K + ' build: ' + b.status + ' | ' + String(b.summary).slice(0, 200))
  const verdicts = []
  const fixes = []
  for (let r = 1; r <= 3; r++) {
    const v = INJ['judge' + r + ':' + K] || await agent(judgePrompt(lane, b, fixes, r), { label: 'judge' + r + ':' + K, phase: 'Judge', schema: VERDICT })
    if (!v) { log(K + ': judge' + r + ' died'); break }
    verdicts.push(v)
    log(K + ' judge' + r + ': pass=' + v.pass + ' score=' + v.lens_score + ' | ' + (v.findings || []).filter((f) => f.severity !== 'nit').map((f) => f.severity + ': ' + f.title).join(' ; ').slice(0, 400))
    if (clean(v) || r === 3) break
    let fx = INJ['fix' + r + ':' + K] || await agent(fixPrompt(lane, v, r), { label: 'fix' + r + ':' + K, phase: 'Judge', schema: BUILD })
    if (!fx) fx = await agent(fixPrompt(lane, v, r) + RETRY_NOTE, { label: 'fix' + r + 'b:' + K, phase: 'Judge', schema: BUILD })
    if (!fx) { log(K + ': fixer ' + r + ' died twice'); break }
    fixes.push(fx)
    log(K + ' fix' + r + ': ' + fx.status + ' | ' + String(fx.summary).slice(0, 200))
  }
  return { lane: K, build: b, verdicts, fixes, clean: clean(verdicts[verdicts.length - 1]) }
})

const ok = results.filter((x) => x && !x.aborted && x.clean)
const held = results.filter((x) => x && !x.aborted && !x.clean).map((x) => x.lane)
if (held.length) log('held back from the integration (last verdict has a blocker or major): ' + held.join(', '))
if (!ok.length) return { results, integrated: null }

phase('Integrate')
const intPrompt = `You are the integrator. ${COMMON}\n\nMerge the passing lanes (${ok.map((x) => x.lane).join(', ')}) into a NEW lane FINAL = ${SP}/lanes2/final (create it with cp -c -R ${BASE} ${SP}/lanes2/final; WORK = ${SP}/work2/final; ports 5185 final, 5186 BASE). For each lane, apply its patch (${SP}/work2/<lane>/<lane>.patch) or 3-way merge its changed files: git merge-file -p FINAL_FILE BASE_FILE LANE_FILE, resolving every conflict by reading both sides so both behaviours survive. Then: typecheck; on FINAL check each merged lane's key gates again with that lane's own tools (water: rest 1:1 right half, no fragmenting, no slab-feet flash, frame time vs ?envlake=plate; AA: waterline crawl numbers vs BASE, no ghosting, hero untouched, frame time vs BASE), every switch exact (?envlake=plate, ?aaresolve=0, ?taa=0 if present, ?shoreaa=0, ?atmos=r10, the rings switches ?idle=r10 / ?spin=f2 / ?hold=r10, the lane switches); 0 console errors; LOOK at a rest frame, a pointer sweep crop of the waterlines and the hold. Also check whether MAIN still equals BASE for every file FINAL changes (cmp) and report any file that moved. Write ${SP}/work2/final/final.patch (vs BASE, patch -p1 from a repo root in BASE's state, proven on a fresh clone of BASE) and ${SP}/work2/final/FILES.txt (the changed / new files). Do NOT touch MAIN. Stop your labs.\n\nThe lanes' results: ${JSON.stringify(ok.map((x) => ({ lane: x.lane, build: { summary: String(x.build.summary).slice(0, 1500), switches: x.build.switches, files: x.build.files_changed }, last_verdict: (x.verdicts || []).slice(-1).map((v) => ({ score: v.lens_score, findings: (v.findings || []).map((f) => f.severity + ': ' + f.title) })), fixes: (x.fixes || []).map((f) => ({ status: f.status, switches: f.switches, files: f.files_changed })) }))).slice(0, 14000)}\n\nReturn the structured result (lane "final").`
const integrated = INJ['integrate'] || await agent(intPrompt, { label: 'integrate', phase: 'Integrate', schema: BUILD })
if (integrated) log('integrate: ' + integrated.status + ' | ' + String(integrated.summary).slice(0, 220))
return { results, integrated, held }
