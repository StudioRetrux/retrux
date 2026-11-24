import fs from "node:fs";
for (const f of process.argv.slice(2)) {
  const o = JSON.parse(fs.readFileSync(f, "utf8"));
  console.log(`${f.split("/").pop()}: ${o.vw}x${o.vh} ${o.path} main ${o.main} scale ${o.scale} load ${o.load1minBefore} -> ${o.load1minAfter} logs ${o.logs.length}`);
  for (const [k, v] of Object.entries(o.summ)) console.log(`  ${k.padEnd(5)} med ${v.med} p90 ${v.p90} p99 ${v.p99} max ${v.max} | ratioMed ${v.ratioMedVsRef} pairedBlockMed ${v.pairedBlockRatioMed} [${v.pairedBlockRatios.join(" ")}] | taa ${v.taaRuns} mirror ${v.mirrorDraws}`);
}
