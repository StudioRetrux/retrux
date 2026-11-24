// compact summary of pin.mjs JSON files: per config med / p90 / p99 / max, ratio of medians, paired block ratios
import fs from "node:fs";
for (const f of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  console.log(`== ${f.split("/").slice(-2).join("/")}  ${j.vw}x${j.vh} ${j.path} main ${j.main} scale ${j.scale} load ${j.load1minBefore} -> ${j.load1minAfter} logs ${j.logs?.length}`);
  for (const [k, v] of Object.entries(j.summ)) console.log(`  ${k.padEnd(5)} n ${v.n} med ${v.med} p90 ${v.p90} p99 ${v.p99} max ${v.max} | med ratio ${v.ratioMedVsRef} paired-block med ${v.pairedBlockRatioMed} [${v.pairedBlockRatios.join(" ")}] taa ${v.taaRuns} mirror ${v.mirrorDraws}`);
}
