// sum popscan events (all sizes) inside a box: node boxpop.mjs POP.json x0,y0,x1,y1 [minpx]
import fs from "node:fs";
const [f, b, mp] = process.argv.slice(2); const [x0, y0, x1, y1] = b.split(",").map(Number);
const J = JSON.parse(fs.readFileSync(f, "utf8"));
for (const [name, v] of Object.entries(J)) {
  const ev = v.list.filter((e) => e.x0 >= x0 && e.x1 <= x1 && e.y0 >= y0 && e.y1 <= y1);
  const n = ev.reduce((s, e) => s + e.n, 0), em = ev.reduce((s, e) => Math.max(s, e.emax), 0);
  const hi = ev.filter((e) => e.emax >= 100);
  console.log(`${name}: events>=6px in box ${ev.length}, px ${n}, emax ${Math.round(em)}, events with emax>=100: ${hi.length} (${hi.reduce((s, e) => s + e.n, 0)} px)`);
}
