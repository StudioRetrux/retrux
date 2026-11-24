import { loadSeq } from "./lib.mjs";
const [x, y0, y1, k0, k1, ...dirs] = process.argv.slice(2);
const seqs = dirs.map((d) => loadSeq(d));
const M = loadSeq(dirs[0]);
for (let k = +k0; k <= +k1; k++) {
  const lines = seqs.map((s) => {
    const f = s.frame(k);
    const v = [];
    for (let y = +y0; y <= +y1; y++) { const p = ((y - s.y0) * s.W + +x) * 4; v.push(String(Math.round(0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2])).padStart(4)); }
    return v.join("");
  });
  let mk = "";
  if (M.hasMask) { const m = M.mask(k); for (let y = +y0; y <= +y1; y++) mk += String(m[(y - M.y0) * M.W + +x] & 3).padStart(4); }
  console.log(String(k).padStart(4), lines.join("  |"), mk ? "  m:" + mk : "");
}
