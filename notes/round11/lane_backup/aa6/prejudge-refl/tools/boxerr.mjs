// sum v3err events inside a box: node boxerr.mjs V3ERR.json x0,y0,x1,y1
import fs from "node:fs";
const [f, b] = process.argv.slice(2); const [x0, y0, x1, y1] = b.split(",").map(Number);
const J = JSON.parse(fs.readFileSync(f, "utf8"));
for (const c of ["dark", "bright"]) {
  const ev = J[c].list.filter((e) => e.x0 >= x0 && e.x1 <= x1 && e.y0 >= y0 && e.y1 <= y1);
  const n = ev.reduce((s, e) => s + e.n, 0), dm = ev.reduce((s, e) => Math.max(s, e.dmax), 0);
  const fr = ev.reduce((s, e) => s + e.nf, 0);
  console.log(`  ${c}: events ${ev.length}, px-frames ${n}, frames ${fr}, dmax ${Math.round(dm)}, nmax ${ev.reduce((s, e) => Math.max(s, e.nmax), 0)}` + (ev.length ? `, spans ${ev.slice(0, 6).map((e) => `k${e.k0}-${e.k1}`).join(" ")}` : ""));
}
