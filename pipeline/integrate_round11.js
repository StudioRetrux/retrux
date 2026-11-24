export const meta = {
  name: 'retrux-r11-integrate',
  description: 'Integrate the round-11 lanes (env, ice, hold) into MAIN, verify independently, fix integration issues once, re-verify',
  whenToUse: 'Retrux round 11 phase P2; args {SP, MAIN, laneNotes, round}',
  phases: [
    { title: 'Integrate', detail: 'merge the three lane diffs into MAIN without staging or committing; R10 baseline lab on :5179' },
    { title: 'Verify', detail: 'independent adversarial verification of the integrated build' },
    { title: 'Fix', detail: 'one integration fix round, then a re-verify' },
  ],
}

const SP = args.SP
const MAIN = args.MAIN
const ROUND = args.round || 1
const SPEC = MAIN + '/notes/round11/SPEC.md'
const AUTO = MAIN + '/notes/round11/AUTOPILOT.md'
const SLOT = 'node ' + SP + '/slot/slot.mjs run'
const WORK = SP + '/work/int'

const STOP_NOTE = `An abrupt stop (the account usage limit) can happen at any moment and kills the agent without warning. Append your state to ${WORK}/LOG.md after every sub-step (what changed, numbers, what is next), so the next agent can continue exactly where you stopped. Before you start, read that LOG.md: if a previous attempt at your step was cut off, continue from its state instead of starting over.`
const PERF_NOTE = `Frame-time measurements: run perf_probe through the slot with SLOT_BG=0 in front of the slot command (normal QoS for that one run; timing runs only), at least 6 interleaved A/B pairs (integrated :5173 vs the round-10 baseline :5179, same tier, scale and window), only while the 1-min load is below 6; report medians and the worst frame.`

const RESULT = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    summary: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    conflicts: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, resolution: { type: 'string' } }, required: ['file', 'resolution'] } },
    switches: { type: 'array', items: { type: 'string' } },
    gates: { type: 'array', items: { type: 'object', properties: { gate: { type: 'string' }, status: { type: 'string', enum: ['pass', 'fail', 'unknown'] }, numbers: { type: 'string' } }, required: ['gate', 'status', 'numbers'] } },
    evidence: { type: 'array', items: { type: 'string' } },
    open_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['status', 'summary', 'files_changed', 'gates', 'open_issues'],
}

const VERDICT = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    score: { type: 'number' },
    gates: { type: 'array', items: { type: 'object', properties: { gate: { type: 'string' }, verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, evidence: { type: 'string' } }, required: ['gate', 'verdict', 'evidence'] } },
    findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] }, title: { type: 'string' }, evidence: { type: 'string' }, fix_hint: { type: 'string' } }, required: ['severity', 'title', 'evidence', 'fix_hint'] } },
    summary: { type: 'string' },
  },
  required: ['pass', 'score', 'gates', 'findings', 'summary'],
}

const CONTEXT = `You work on the Retrux hero R&D: a real-time three.js (WebGL2) hero, an ice sculpture of four thick ice rings around a glowing plasma orb with cobalt crystal shards, over an arctic lake with snowy mountains, that must match a Blender Cycles reference video frame for frame in look and motion. The user wants 10/10, Awwwards-worthy, matched with the reference, "no mistake". The user is away and the team works autonomously (read ${AUTO}: never ask questions, decide and log).

Read ${SPEC} sections 0-3 and 5 first. Hard rules: every headless Chrome / Playwright / Blender / build goes through the slot (${SLOT} '<who>:<what>' -- <cmd> [args...]; release it between batches); never save over a .blend in the repo; heavy outputs only in ${WORK}; no git commits, no staging (MAIN's index must stay exactly as it is), no deploys or uploads; keep MAIN's hero lab http://localhost:5173 (esbuild watch, it rebuilds when files change) and the Next dev server http://localhost:3000 running, never stop them; typecheck with cd MAIN/retrux-web && node node_modules/typescript/bin/tsc --noEmit -p tsconfig.hero.json (and -p .).

Paths: MAIN = ${MAIN} (the user's repo, branch hero-round11; its uncommitted changes are outside the engine: validators, pipeline scripts, notes). Lanes = ${SP}/lanes/{env,ice,hold} (detached worktrees at 7ddac0d with uncommitted diffs; WORK of a lane = ${SP}/work/<lane> with its LOG.md, judge folders and tools). Reference frames: MAIN/hero-pipeline/reference (ref_F000.png, loop_F045.png, ref_F358/F402/F420/F453/F460.png) and MAIN/refs/hold_frames. Validators: MAIN/hero-pipeline/validate (shoot_qc.mjs, shoot_pointer.mjs, shoot_sweep.mjs, shoot_holdseq.mjs, perf_probe.mjs, region_stats.py; the lab URL comes from the env LAB). Lab debug API: window.__hero.debug.pose(phase,t) / settle(s) / freeze(on) / pointer(nx,ny|null).

The lanes' final states (from the lanes workflow; their HANDOFF.md files are the detail):
${args.laneNotes}

Working style: look at every image you reason about with the Read tool; never claim a visual result you did not look at; measure before and after; write in plain, complete English sentences. ${STOP_NOTE}`

const integratePrompt = `${CONTEXT}

YOU ARE THE INTEGRATOR. Merge all three lanes into MAIN so the integrated build has every lane's approved result at once, then prove it.
1. Preconditions: the lanes workflow is finished; stop any leftover lane lab on :5174-:5176 (they belong to finished agents). Refresh MAIN/notes/round11/lane_backup/: per lane git -C LANE diff --binary 7ddac0d > <lane>.patch, its untracked deliverables as <lane>_untracked.tgz (no EXR / blend / big captures), its LOG.md and HANDOFF.md.
2. Round-10 baseline for way-back checks: if ${SP}/lanes/base does not exist, git -C MAIN worktree add --detach ${SP}/lanes/base 7ddac0d and symlink its retrux-web/node_modules to MAIN's. Start its lab on :5179 in the background (cd ${SP}/lanes/base/retrux-web && PORT=5179 nohup node hero-lab/serve.mjs > ${WORK}/base_lab.log 2>&1 &) and leave it running for the verifier; note the PID in INTEGRATION.md.
3. Apply the lanes in this order: env, ice, hold. For each: git -C LANE diff --binary 7ddac0d > ${WORK}/<lane>.patch, then git -C MAIN apply --check and git -C MAIN apply (working tree only: never --index, --cached or --3way, which stage). A file that an earlier lane or MAIN already changed will not apply cleanly: merge it with git merge-file (base = git -C MAIN show 7ddac0d:<path>, ours = MAIN's current file, theirs = the lane's file) and resolve every conflict by reading both sides so BOTH behaviours survive (expected: hero/Rings.ts changed by hold and ice; pipeline/*.mjs validators where MAIN holds the macOS ports, keep the ports). Then copy the lane's untracked deliverables into MAIN at the same paths (engine code such as hero/HoldR11.ts, pipeline scripts, public/hero assets such as baked/ and env_baked.glb / .json), never WORK outputs; save LANE/HANDOFF.md as MAIN/notes/round11/handoff_<lane>.md.
4. Defaults: a lane whose final re-judge left a blocker open, or scored its lens below the round-10 baseline, keeps its code but its round-10 behaviour becomes the default (flip that switch's default) and you record why. Otherwise each lane's new behaviour is the default.
5. Typecheck (hero and project configs): 0 errors.
6. Validators: add an optional extra query string to hero-pipeline/validate/shoot_qc.mjs, shoot_pointer.mjs, shoot_sweep.mjs and shoot_holdseq.mjs: append \${process.env.QS ? "&" + process.env.QS : ""} to the page URL (no change when QS is unset).
7. Verify on :5173 through the slot (outputs in ${WORK}/r${ROUND}/): shoot_qc (all poses + ui), shoot_pointer (10 spots), shoot_sweep, the live hold sequence F332-F472 (shoot_holdseq or the hold lane's tools in ${SP}/work/hold/tools), and each lane's key measurements on the integrated build: env region boxes at rest vs ?env=projected; the hold lane's H-G1 evaluator at F358 / F402 / F420 / F440 / F453; the ice lane's ICE_TARGETS boxes at q00 / q03 / p06 vs the twin. Compare with each lane's own final numbers: the integrated build must reproduce every lane's approved result; differences are allowed only where lanes legitimately interact (e.g. the new ice refracting the baked environment) and must be explained. Look at every capture yourself.
8. Way back: with QS set to every round-10 switch at once (use the exact names from the HANDOFFs, e.g. env=projected&hold=r10&aphase=r10&ice=r10) the integrated :5173 must match the baseline :5179 with time, clocks and grain pinned: max <= 1 LSB and mean <= 0.5/255 outside the shard zone at q00, q03, p06 and 4 pointer spots. Each switch alone restores its own lane's part.
9. ${PERF_NOTE} The integrated build must stay within the SPEC budgets at T1 and T0.
10. Write MAIN/notes/round11/INTEGRATION.md: what was merged (files per lane), conflicts and their resolutions, a table of switches and defaults, verification numbers with evidence paths, open issues.
Return the structured result.`

function verifyPrompt(n) {
  return `${CONTEXT}

YOU ARE THE INDEPENDENT VERIFIER (round ${n}) of the integrated build in MAIN (lab :5173) against the round-10 baseline lab :5179 (start it as MAIN/notes/round11/INTEGRATION.md says if it is not running) and the reference frames. Read INTEGRATION.md and the lanes' HANDOFFs only to learn what changed and which switches exist; trust none of their numbers. Make fresh captures through the slot into ${WORK}/verify${n}/ and edit nothing else.
Check: (1) every lane's approved result is present at once (env at rest and from the pointer spots; the hold arrangement at the A2 key frames and in a live hold; the ice look at q00 / q03 / p06 against the twin in ${SP}/work/ice/twin); (2) no interaction regressions (new ice over the baked environment and the mirror lake, the new hold with the new ice, shards, orb, bloom, UI); (3) the switches, each alone and all together, restore round 10 exactly (max <= 1 LSB, mean <= 0.5/255 with clocks and grain pinned); (4) a glitch hunt: 10 pointer spots, the sweep, a live press-hold-release-re-press sequence at 60 Hz, resize, and anything the user would call a glitch (doubled mountains, seams, specks, popping, flips, a strip at the bottom of the frame); (5) typecheck and console errors; (6) frame time (${PERF_NOTE}).
Return PASS / FAIL per check with evidence (paths, boxes, numbers), findings by severity (blocker > major > minor > nit) with concrete fix hints, score 0-10 for the integrated build vs the reference (strict, one decimal), and pass = true only when every check passes and no blocker, major or minor finding remains.`
}

function fixPrompt(v) {
  return `${CONTEXT}

YOU ARE THE INTEGRATION FIXER. The verifier failed the integrated build. For every blocker, major and minor finding: reproduce it with the verifier's own evidence first (${WORK}/verify1/), find the root cause (an integration mistake, a lane interaction, or a lane defect), fix it in MAIN with the smallest correct change (keep every switch exact), and re-verify with fresh captures. Append a "Fix round" section to MAIN/notes/round11/INTEGRATION.md.

The verifier's verdict (JSON):
${JSON.stringify(v).slice(0, 14000)}

Return the structured result.`
}

phase('Integrate')
const integ = await agent(integratePrompt, { label: 'integrate', phase: 'Integrate', schema: RESULT })
if (!integ) return { integ: null, note: 'the integrator died (usage limit?): resume this run' }
log('integrate: ' + integ.status + ' | ' + String(integ.summary).slice(0, 200))
if (integ.status === 'blocked') return { integ }

phase('Verify')
const v1 = await agent(verifyPrompt(1), { label: 'verify1', phase: 'Verify', schema: VERDICT })
if (!v1) return { integ, v1: null, note: 'the verifier died (usage limit?): resume this run' }
log('verify1: pass=' + v1.pass + ' score=' + v1.score + ' | ' + String(v1.summary).slice(0, 200))
if (v1.pass) return { integ, verdicts: [v1] }

phase('Fix')
const fx = await agent(fixPrompt(v1), { label: 'fix', phase: 'Fix', schema: RESULT })
if (fx) log('fix: ' + fx.status + ' | ' + String(fx.summary).slice(0, 200))
const v2 = await agent(verifyPrompt(2), { label: 'verify2', phase: 'Fix', schema: VERDICT })
if (v2) log('verify2: pass=' + v2.pass + ' score=' + v2.score)
return { integ, fix: fx, verdicts: [v1, v2].filter(Boolean) }
