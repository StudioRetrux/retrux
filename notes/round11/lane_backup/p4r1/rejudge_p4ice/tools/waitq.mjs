// (AA8 polish copy of the perf judge waitquiet.mjs: ignores its own "aa8-polish rc2" holder)
// wait until no OTHER slot holder exists and the 1-min load is below a cap (max wait ms); prints what it saw
import fs from "node:fs";
import os from "node:os";
const DIR = "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot";
const cap = +(process.argv[2] || 8), maxMs = +(process.argv[3] || 300000), me = +(process.argv[4] || process.ppid);
const t0 = Date.now();
const others = () => [0, 1, 2, 3, 4].map((i) => { const d = `${DIR}/.slot${i || ""}`; try { return JSON.parse(fs.readFileSync(d + "/owner.json", "utf8")); } catch { return fs.existsSync(d) ? { label: "?" } : null; } }).filter((o) => o && !String(o.label).startsWith("rejudge_p4ice:perf"));
for (;;) {
  const o = others(), l = os.loadavg()[0];
  if (!o.length && l < cap) { console.log(`[waitquiet] quiet after ${Math.round((Date.now() - t0) / 1000)} s: load ${l.toFixed(2)}`); process.exit(0); }
  if (Date.now() - t0 > maxMs) { console.log(`[waitquiet] TIMEOUT after ${maxMs / 1000} s: load ${l.toFixed(2)}, others ${JSON.stringify(o)}`); process.exit(0); }
  await new Promise((r) => setTimeout(r, 3000));
}
