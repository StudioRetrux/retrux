// per frame: the largest |lane - base| in the hero mask and above the horizon (sky), with locations; counts > 32
import { loadSeq, bandFromMask } from "../../../aa3/tools/lib.mjs";
const [bd, ld, od] = process.argv.slice(2);
const B = loadSeq(bd), L = loadSeq(ld), O = od ? loadSeq(od) : null;
const W = B.W, H = B.H;
for (let k = 0; k < Math.min(B.n, L.n); k++) {
  const m = B.mask(k);
  const { hero } = bandFromMask(m, W, H, 3);
  let top = H;
  for (let y = 0; y < H && top === H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] & 1) { top = y; break; }
  const fb = B.frame(k), fl = L.frame(k), fo = O ? O.frame(k) : null;
  let hb = { d: 0 }, sb = { d: 0 }, n32 = 0, sky4 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, p = i * 4;
    const d = Math.max(Math.abs(fl[p] - fb[p]), Math.abs(fl[p + 1] - fb[p + 1]), Math.abs(fl[p + 2] - fb[p + 2]));
    if (hero[i]) { if (d > 32) n32++; if (d > hb.d) hb = { d, x, y: y + B.y0, raw: (m[i] & 4) ? 1 : 0, l: [fl[p], fl[p + 1], fl[p + 2]], b: [fb[p], fb[p + 1], fb[p + 2]], o: fo ? [fo[p], fo[p + 1], fo[p + 2]] : null }; }
    else if (y < top - 4) { if (d > 4) sky4++; if (d > sb.d) sb = { d, x, y: y + B.y0, l: [fl[p], fl[p + 1], fl[p + 2]], b: [fb[p], fb[p + 1], fb[p + 2]] }; }
  }
  console.log(`k${k} top ${top + B.y0} hero max ${JSON.stringify(hb)} n>32 ${n32} | sky>4 ${sky4} max ${JSON.stringify(sb)}`);
}
