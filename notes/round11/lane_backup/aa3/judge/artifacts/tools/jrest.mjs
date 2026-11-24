// Rest (time frozen) identity: per frame |X - base| counts (any, > 4, max) for lane / aa0 / off, and for lane-base > 4 px the share
// on edges (base 3x3 luma range > 16) and in the waterline band; writes a map of the lane-base diff (frame kmap).
import { loadSeq, bandFromMask, png } from "../../../aa3/tools/lib.mjs";
const [dir, kmapS, out] = process.argv.slice(2);
const B = loadSeq(dir + "/base"), V = { lane: loadSeq(dir + "/lane"), aa0: loadSeq(dir + "/aa0"), off: loadSeq(dir + "/off") };
const W = B.W, H = B.H, kmap = +kmapS;
for (let k = 0; k < B.n; k++) {
  const { band } = bandFromMask(B.mask(k), W, H, 3);
  const fb = B.frame(k);
  const row = [`k${k} taa ${JSON.stringify(V.lane.meta.info[k].taa)}`];
  for (const [name, S] of Object.entries(V)) {
    const f = S.frame(k);
    let n = 0, n4 = 0, mx = 0, edge = 0, inBand = 0;
    const img = name === "lane" && k === kmap ? new Uint8Array(W * H * 4) : null;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, p = i * 4;
      const d = Math.max(Math.abs(f[p] - fb[p]), Math.abs(f[p + 1] - fb[p + 1]), Math.abs(f[p + 2] - fb[p + 2]));
      if (img) { const l = (0.2126 * fb[p] + 0.7152 * fb[p + 1] + 0.0722 * fb[p + 2]) * 0.35; const h = Math.min(1, d / 16); img[p] = Math.min(255, l + 255 * h); img[p + 1] = Math.min(255, l + 140 * h); img[p + 2] = l * (1 - h); img[p + 3] = 255; }
      if (!d) continue;
      n++; mx = Math.max(mx, d);
      if (d > 4) {
        n4++;
        let lo = 255, hi = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const q = ((y + dy) * W + x + dx) * 4; const l = 0.2126 * fb[q] + 0.7152 * fb[q + 1] + 0.0722 * fb[q + 2]; lo = Math.min(lo, l); hi = Math.max(hi, l); }
        if (hi - lo > 16) edge++;
        if (band[i]) inBand++;
      }
    }
    if (img) png(img, W, H, out);
    row.push(`${name}-base: px ${n} >4 ${n4} (edge ${edge}, band ${inBand}) max ${mx}`);
  }
  console.log(row.join(" | "));
}
