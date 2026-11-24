// For each event of seq A in a popscan json, the flagged px of every seq within the same box and frames.
//   node boxflag.mjs JSON A [--top 10]
import fs from "node:fs";
const [file, A] = process.argv.slice(2);
const top = +(process.argv[process.argv.indexOf("--top") + 1] || 10);
const o = JSON.parse(fs.readFileSync(file, "utf8"));
const names = Object.keys(o);
const inBox = (e, f) => f.k0 <= e.k1 && e.k0 <= f.k1 && f.x0 <= e.x1 && e.x0 <= f.x1 && f.y0 <= e.y1 && e.y0 <= f.y1;
for (const e of o[A].list.slice(0, top)) {
  const s = names.map((n) => `${n} ${o[n].list.filter((f) => inBox(e, f)).reduce((t, f) => t + f.n, 0)}`).join(" | ");
  console.log(`${A} k${e.k0}-${e.k1} x${e.x0}-${e.x1} y${e.y0}-${e.y1} n${e.n} emax${Math.round(e.emax)} :: ${s}`);
}
