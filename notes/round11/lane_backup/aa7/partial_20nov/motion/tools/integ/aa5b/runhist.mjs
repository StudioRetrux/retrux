// run-length histogram of the binary lake mask's boundaries (lake = bit0) per box, frame k: share of boundary px on runs >= L
import { loadSeq, bandFromMask } from "./lib.mjs";
const [maskDir, kS] = process.argv.slice(2);
const M = loadSeq(maskDir); const W = M.W, H = M.H, Y0 = M.y0;
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
for (const k of kS.split(",").map(Number)) {
  const m = M.mask(k); const { hero } = bandFromMask(m, W, H, 3);
  const lk = (x, y) => (m[y * W + x] & 1) === 1;
  const res = {};
  for (const [n, [x0, y0, x1, y1]] of Object.entries(BOXES)) {
    const hist = [0, 0, 0, 0, 0]; // L 1-2, 3-5, 6-11, 12-23, 24+
    for (let y = Math.max(1, y0 - Y0); y < Math.min(H - 2, y1 - Y0); y++) {
      // horizontal boundaries between rows y and y+1: runs along x
      let run = 0;
      for (let x = x0; x <= x1; x++) {
        const b = x < x1 && lk(x, y) !== lk(x, y + 1) && !hero[y * W + x] && (x === x0 || run === 0 || lk(x, y) === lk(x - 1, y));
        if (b) run++;
        else if (run) { const i = run <= 2 ? 0 : run <= 5 ? 1 : run <= 11 ? 2 : run <= 23 ? 3 : 4; hist[i] += run; run = 0; if (x < x1 && lk(x, y) !== lk(x, y + 1)) run = 1; }
      }
    }
    const tot = hist.reduce((a, b) => a + b, 0);
    res[n] = hist.map((v) => ((100 * v) / Math.max(1, tot)).toFixed(0) + "%").join(" ") + ` (n ${tot})`;
  }
  console.log("k", k, "horizontal-boundary px by run length [1-2, 3-5, 6-11, 12-23, 24+]:");
  for (const [n, s] of Object.entries(res)) console.log("  ", n, s);
}
