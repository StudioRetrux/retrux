// byte identity of two cap.mjs sequences (frames, optionally masks): node same.mjs A B [--mask] [--k0 0 --k1 N]
import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
const [a, b, ...rest] = process.argv.slice(2);
const mask = rest.includes("--mask");
const ma = JSON.parse(fs.readFileSync(path.join(a, "meta.json"))), mb = JSON.parse(fs.readFileSync(path.join(b, "meta.json")));
const n = Math.min(ma.info.length, mb.info.length);
let diffFrames = 0, diffBytes = 0, maxd = 0, poseMax = 0, diffMask = 0;
const per = [];
for (let k = 0; k < n; k++) {
  const fa = zlib.inflateSync(fs.readFileSync(path.join(a, `f${String(k).padStart(4, "0")}.bin`)));
  const fb = zlib.inflateSync(fs.readFileSync(path.join(b, `f${String(k).padStart(4, "0")}.bin`)));
  let d = 0;
  if (fa.length !== fb.length) { console.log("size mismatch", k, fa.length, fb.length); process.exit(1); }
  for (let i = 0; i < fa.length; i++) if (fa[i] !== fb[i]) { d++; const x = Math.abs(fa[i] - fb[i]); if (x > maxd) maxd = x; }
  if (d) { diffFrames++; per.push(k); }
  diffBytes += d;
  const pa = ma.info[k].pos, pb = mb.info[k].pos;
  poseMax = Math.max(poseMax, ...pa.map((v, i) => Math.abs(v - pb[i])));
  if (mask && fs.existsSync(path.join(a, `m${String(k).padStart(4, "0")}.bin`)) && fs.existsSync(path.join(b, `m${String(k).padStart(4, "0")}.bin`))) {
    const xa = zlib.inflateSync(fs.readFileSync(path.join(a, `m${String(k).padStart(4, "0")}.bin`)));
    const xb = zlib.inflateSync(fs.readFileSync(path.join(b, `m${String(k).padStart(4, "0")}.bin`)));
    if (Buffer.compare(xa, xb)) diffMask++;
  }
}
console.log(`${path.basename(a)} vs ${path.basename(b)}: ${n} frames, differing frames ${diffFrames}, bytes ${diffBytes}, max ${maxd}, pose max ${poseMax}${mask ? ", masks differing " + diffMask : ""}${per.length ? " first " + per.slice(0, 8).join(",") : ""}`);
