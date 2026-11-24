// Recheck P-2: compare the judged-build block sequences (OLD dir) with the fixed-build ones (NEW dir), same deterministic
// sweep (blockseq.mjs: crop x 150-320, y 480-530 of 1440x766, stored bottom-up). Prints
//   - identity of OLD vs NEW per variant (frames byte-identical, mean |diff|),
//   - per frame k0..k1 a "pale flat block" score: the max over x of (mean luma of a 24 x 12 window at frame y 506-517
//     minus the mean of the 24 x 12 window left of it), counted only where the window is flat (luma sd < 8),
// and writes consecutive-frame crops: lane_old | lane_new | lane_sf0_new | base_new.
//   node blockrc.mjs OLD NEW k0 k1 OUTPNG
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png, hstack, vstack } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const [oldDir, newDir, k0s, k1s, outPng] = process.argv.slice(2);
const k0 = +k0s, k1 = +k1s;
const meta = JSON.parse(fs.readFileSync(path.join(newDir, "meta.json"), "utf8"));
const { X0, Y0, W, H, frames } = meta;
const names = ["lane", "lane_sf0", "base"];
const load = (d) => Object.fromEntries(names.map((n) => [n, zlib.inflateSync(fs.readFileSync(path.join(d, `${n}.seq.z`)))]));
const O = load(oldDir), N = load(newDir);
const FS = W * H * 4;
const frame = (s, k) => {
  const o = new Uint8Array(FS), row = W * 4, base = k * FS;
  for (let y = 0; y < H; y++) o.set(s.subarray(base + (H - 1 - y) * row, base + (H - y) * row), y * row);
  return o;
};
const L = (im, x, y) => { const i = (y * W + x) * 4; return 0.2126 * im[i] + 0.7152 * im[i + 1] + 0.0722 * im[i + 2]; };
const win = (im, x0, y0, w, h) => { let s = 0, s2 = 0, n = 0; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const l = L(im, x, y); s += l; s2 += l * l; n++; } const m = s / n; return { m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)) }; };
const score = (im) => {
  let best = -1e9, bx = -1;
  const y0 = 506 - Y0;
  for (let x = 24; x + 24 <= W; x++) {
    const a = win(im, x, y0, 24, 12), b = win(im, x - 24, y0, 24, 12);
    if (a.sd < 8 && a.m - b.m > best) { best = a.m - b.m; bx = x + X0; }
  }
  return [+best.toFixed(1), bx];
};
// identity old vs new
for (const n of names) {
  let same = 0, sad = 0;
  for (let k = 0; k < frames; k++) {
    const a = O[n].subarray(k * FS, (k + 1) * FS), b = N[n].subarray(k * FS, (k + 1) * FS);
    let d = 0; for (let i = 0; i < FS; i++) d += Math.abs(a[i] - b[i]);
    if (d === 0) same++;
    sad += d / FS;
  }
  console.log(`${n.padEnd(9)} old vs new: ${same}/${frames} frames byte-identical, mean |diff| ${(sad / frames).toFixed(3)} lv`);
}
const rows = [];
console.log("k   " + ["lane_old", "lane_new", "sf0_old", "sf0_new", "base_old", "base_new"].map((s) => s.padStart(14)).join(""));
const pres = { lane_old: [], lane_new: [], sf0_old: [], sf0_new: [], base_old: [], base_new: [] };
for (let k = k0; k <= k1; k++) {
  const v = [["lane_old", O.lane], ["lane_new", N.lane], ["sf0_old", O.lane_sf0], ["sf0_new", N.lane_sf0], ["base_old", O.base], ["base_new", N.base]].map(([nm, s]) => {
    const [sc, x] = score(frame(s, k));
    if (sc > 10) pres[nm].push(k);
    return `${sc}@${x}`.padStart(14);
  });
  rows.push(`${String(k).padEnd(4)}${v.join("")}`);
}
console.log(rows.join("\n"));
console.log("frames with score > 10:", JSON.stringify(pres));
// consecutive crops (frame x 190-300, y 498-526), z3
const cx0 = 40, cx1 = 150, cy0 = 18, cy1 = 46, cw = cx1 - cx0, ch = cy1 - cy0;
const crop = (s, k) => {
  const o = new Uint8Array(cw * ch * 4), row = W * 4, base = k * FS;
  for (let y = 0; y < ch; y++) { const sy = H - 1 - (y + cy0); o.set(s.subarray(base + sy * row + cx0 * 4, base + sy * row + cx1 * 4), y * cw * 4); }
  return o;
};
const R = [];
for (let k = k0; k <= k1; k++) R.push(hstack([crop(O.lane, k), crop(N.lane, k), crop(N.lane_sf0, k), crop(N.base, k)], cw, ch, 4));
const V = vstack(R.map((r) => r.img), R[0].W, ch, 2);
png(V.img, V.W, V.H, outPng, { zoom: 3 });
console.log(outPng);
