// Analysis of blockseq: per frame, the block rectangle (frame x 220-243, y 506-517) vs the reflection left of it
// (x 195-218): mean luma difference and the rectangle's own luma std (a flat pale block: high mean, low std); frame strips.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png, hstack, vstack } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const dir = process.argv[2];
const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
const { X0, Y0, W, H, frames } = meta;
const names = ["lane", "lane_sf0", "base"];
const seqs = Object.fromEntries(names.map((n) => [n, zlib.inflateSync(fs.readFileSync(path.join(dir, `${n}.seq.z`)))]));
// frame k as a top-down RGBA crop
const frame = (n, k) => {
  const s = seqs[n], o = new Uint8Array(W * H * 4), row = W * 4, base = k * W * H * 4;
  for (let y = 0; y < H; y++) o.set(s.subarray(base + (H - 1 - y) * row, base + (H - y) * row), y * row);
  return o;
};
const L = (im, x, y) => { const i = (y * W + x) * 4; return 0.2126 * im[i] + 0.7152 * im[i + 1] + 0.0722 * im[i + 2]; };
const rect = (im, x0, y0, x1, y1) => { let s = 0, s2 = 0, n = 0; for (let y = y0 - Y0; y < y1 - Y0; y++) for (let x = x0 - X0; x < x1 - X0; x++) { const l = L(im, x, y); s += l; s2 += l * l; n++; } const m = s / n; return { m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)) }; };
const res = {};
for (const n of names) {
  const d = [], sd = [];
  for (let k = 0; k < frames; k++) {
    const im = frame(n, k);
    const a = rect(im, 220, 506, 244, 517), b = rect(im, 195, 506, 219, 517);
    d.push(+(a.m - b.m).toFixed(1));
    sd.push(+a.sd.toFixed(1));
  }
  // "block present": the rectangle at least 12 levels brighter than the reflection left of it and flat (sd < 6)
  const present = d.map((v, k) => (v > 12 && sd[k] < 6 ? 1 : 0));
  let flips = 0; for (let k = 1; k < frames; k++) if (present[k] !== present[k - 1]) flips++;
  res[n] = { presentFrames: present.reduce((x, y) => x + y, 0), flips, presentList: present.map((v, k) => (v ? k : -1)).filter((k) => k >= 0), dMed: [...d].sort((x, y) => x - y)[frames >> 1], dMax: Math.max(...d) };
}
console.log(JSON.stringify(res, null, 1));
// strips: every 6th frame, lane | lane_sf0 | base
const ks = []; for (let k = 0; k < frames; k += 6) ks.push(k);
const rows = ks.map((k) => hstack(names.map((n) => frame(n, k)), W, H, 4));
const v = vstack(rows.map((r) => r.img), rows[0].W, H, 3);
png(v.img, v.W, v.H, path.join(dir, "block_strip_lane_sf0_base_z2.png"), { zoom: 2 });
// consecutive frames around the first lane appearance
const first = res.lane.presentList[0] ?? 0;
const ks2 = []; for (let k = Math.max(0, first - 4); k < Math.min(frames, first + 8); k++) ks2.push(k);
const rows2 = ks2.map((k) => hstack(names.map((n) => frame(n, k)), W, H, 4));
const v2 = vstack(rows2.map((r) => r.img), rows2[0].W, H, 3);
png(v2.img, v2.W, v2.H, path.join(dir, `block_consecutive_k${ks2[0]}-${ks2[ks2.length - 1]}_z2.png`), { zoom: 2 });
console.log("strip frames", ks.join(","), "| consecutive", ks2[0], "-", ks2[ks2.length - 1]);
