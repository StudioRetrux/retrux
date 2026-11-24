// recheck: frame-by-frame comparison of two cap.mjs / jcap.mjs sequences (decompressed RGBA), plus the camera poses in meta.info
//   node capcmp.mjs A B [T=0]   -> frames, frames that differ, px > T, max channel diff, pose mismatches
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const [a, b, Ts] = process.argv.slice(2); const T = +(Ts || 0);
const ma = JSON.parse(fs.readFileSync(path.join(a, "meta.json"))), mb = JSON.parse(fs.readFileSync(path.join(b, "meta.json")));
const n = Math.min(ma.info.length, mb.info.length);
let fd = 0, px = 0, mx = 0, pose = 0, first = -1;
for (let k = 0; k < n; k++) {
  const f = (d) => zlib.inflateSync(fs.readFileSync(path.join(d, `f${String(k).padStart(4, "0")}.bin`)));
  const A = f(a), B = f(b);
  if (A.length !== B.length) { fd++; continue; }
  let d = 0;
  for (let i = 0; i < A.length; i += 4) { let m = 0; for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(A[i + c] - B[i + c])); if (m > T) d++; if (m > mx) mx = m; }
  if (d) { fd++; px += d; if (first < 0) first = k; }
  const pa = JSON.stringify([ma.info[k].pos, ma.info[k].quat]), pb = JSON.stringify([mb.info[k].pos, mb.info[k].quat]);
  if (pa !== pb) pose++;
}
console.log(`${path.basename(a)} vs ${path.basename(b)}: frames ${n} (${ma.info.length}/${mb.info.length}), frames differing ${fd}, px > ${T}: ${px}, max ${mx}, first ${first}, pose mismatches ${pose}, W ${ma.W}/${mb.W} rows ${ma.y0}-${ma.y1}/${mb.y0}-${mb.y1}`);
