// wait until no OTHER perf-like slot holder (perf / ab / rc / bench / move / rest), at most 1 other holder, 1-min load < cap
import fs from "node:fs"; import os from "node:os";
const DIR = "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot";
const cap = +(process.argv[2] || 9), maxMs = +(process.argv[3] || 900000); const t0 = Date.now();
const others = () => [0,1,2,3,4].map((i) => { const d = `${DIR}/.slot${i || ""}`; try { return JSON.parse(fs.readFileSync(d + "/owner.json", "utf8")); } catch { return fs.existsSync(d) ? { label: "?" } : null; } }).filter((o) => o && !String(o.label).startsWith("judge_p4ice3:perf"));
for (;;) {
  const o = others(), l = os.loadavg()[0]; const perfy = o.filter((x) => /perf|:ab|rc2|bench|move|rest|rtx/i.test(String(x.label)));
  if (!perfy.length && o.length <= 1 && l < cap) { console.log(`[waitq2] ok after ${Math.round((Date.now()-t0)/1000)} s: load ${l.toFixed(2)} others ${JSON.stringify(o.map(x=>x.label))}`); process.exit(0); }
  if (Date.now() - t0 > maxMs) { console.log(`[waitq2] TIMEOUT load ${l.toFixed(2)} others ${JSON.stringify(o.map(x=>x.label))}`); process.exit(1); }
  await new Promise((r) => setTimeout(r, 2000));
}
