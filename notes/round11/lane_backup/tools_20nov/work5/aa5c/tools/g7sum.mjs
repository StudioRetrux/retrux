import fs from "node:fs";
for (const f of process.argv.slice(2)) {
  const o = JSON.parse(fs.readFileSync(f));
  const n = o.summ.noneO, fo = o.summ.fullO, fn = o.summ.fullN;
  const pr = (k) => { const a = o.raw.blocks[k], b = o.raw.blocks.noneO, c = o.raw.blocks.fullO; return { vsNone: a.map((v, i) => v / b[i]), vsFullO: a.map((v, i) => v / c[i]) }; };
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
  const q = (a, f) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor((b.length - 1) * f)]; };
  const pn = pr("fullN"), po = pr("fullO");
  console.log(`${f.split("/").pop()} main ${o.main} load ${o.load1minBefore}->${o.load1minAfter} cycles ${n.paired.length} | noneO ${n.med} ms, fullO ${fo.med}, fullN ${fn.med} | ratioOfMedians fullO ${(fo.med / n.med).toFixed(3)} fullN ${(fn.med / n.med).toFixed(3)} | paired med fullO ${med(po.vsNone).toFixed(3)} [IQR ${q(po.vsNone, 0.25).toFixed(3)}-${q(po.vsNone, 0.75).toFixed(3)}] fullN ${med(pn.vsNone).toFixed(3)} [IQR ${q(pn.vsNone, 0.25).toFixed(3)}-${q(pn.vsNone, 0.75).toFixed(3)}] fullN/fullO ${med(pn.vsFullO).toFixed(3)} | mirrors ${n.mirrors}/${fo.mirrors}/${fn.mirrors} taa ${n.taaRuns}/${fo.taaRuns}/${fn.taaRuns} logs ${o.logs.length}`);
}
