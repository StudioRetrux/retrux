// pixels where X is much worse (luma |X-GT| - |F-GT| > T) in a box: count per frame, and a list of the worst
import { loadSeq } from "./lib.mjs";
const [fd, xd, gd, box, T] = process.argv.slice(2);
const F = loadSeq(fd), X = loadSeq(xd), G = loadSeq(gd);
const [x0, y0, x1, y1] = box.split(",").map(Number);
const L = (f, i) => 0.2126 * f[i] + 0.7152 * f[i + 1] + 0.0722 * f[i + 2];
let worse = 0, better = 0, list = [];
for (let k = 1; k <= 120; k += 1) {
  const f = F.frame(k), x = X.frame(k), g = G.frame(k);
  for (let y = y0; y < y1; y++) for (let xx = x0; xx < x1; xx++) {
    const i = ((y - F.y0) * F.W + xx) * 4;
    const ef = Math.abs(L(f, i) - L(g, i)), ex = Math.abs(L(x, i) - L(g, i));
    if (ex - ef > +T) { worse++; list.push([ex - ef, k, xx, y, Math.round(L(f, i)), Math.round(L(x, i)), Math.round(L(g, i))]); }
    if (ef - ex > +T) better++;
  }
}
list.sort((a, b) => b[0] - a[0]);
console.log(`worse ${worse} better ${better}`);
console.log(list.slice(0, 12).map((r) => `d${r[0].toFixed(0)} k${r[1]} (${r[2]},${r[3]}) F ${r[4]} X ${r[5]} GT ${r[6]}`).join("\n"));
