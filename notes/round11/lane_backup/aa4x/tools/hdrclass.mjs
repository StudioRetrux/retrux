// AA4X: classifies the waterline pixels of an hdrcap frame: CONTACT (the solid enters the lake: no depth jump in the 3x3) vs
// SILHOUETTE (the lake visible behind the solid: depth jump), per box; writes a colour map (contact magenta, silhouette
// yellow, other edge cyan) over the image.   node hdrclass.mjs DIR k OUT.png
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png } from "./lib.mjs";

const [dir, kArg, out] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(path.join(dir, "hdr.json"), "utf8"));
const fr = meta.frames.find((f) => f.k === +kArg);
const W = meta.W, H = meta.H;
const raw = zlib.inflateSync(fs.readFileSync(path.join(dir, `e${String(fr.k).padStart(4, "0")}.bin`)));
const buf = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
// top-down accessors
const at = (x, y, c) => buf[((H - 1 - y) * W + x) * 4 + c];
const pi = fr.projInv, mw = fr.mw, cam = fr.pos;
const ray = (x, y) => {
  const nx = ((x + 0.5) / W) * 2 - 1, ny = 1 - ((y + 0.5) / H) * 2;
  // view-space point on the far plane (projInv * (nx, ny, 1, 1))
  const v = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) v[r] = pi[r] * nx + pi[4 + r] * ny + pi[8 + r] * 1 + pi[12 + r];
  const vx = v[0] / v[3], vy = v[1] / v[3], vz = v[2] / v[3];
  const wx = mw[0] * vx + mw[4] * vy + mw[8] * vz, wy = mw[1] * vx + mw[5] * vy + mw[9] * vz, wz = mw[2] * vx + mw[6] * vy + mw[10] * vz;
  const l = Math.hypot(wx, wy, wz);
  return [wx / l, wy / l, wz / l];
};
const kind = new Int8Array(W * H), hh = new Float32Array(W * H), tl = new Float32Array(W * H);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = y * W + x, a = at(x, y, 3);
    if (a <= 1) continue;
    const r = ray(x, y);
    if (r[1] > -1e-5) {
      kind[i] = 2;
      tl[i] = 1e9;
      continue;
    }
    const u = Math.pow(2, Math.floor(Math.log2(a)) - 10);
    const pz = cam[2] + r[2] * (a + 0.5 * u);
    const lv = pz < -14.8718 ? 0.0017 : 0;
    const h = cam[1] + r[1] * (a + 0.5 * u) - lv;
    const n = -r[1] * u;
    hh[i] = h;
    tl[i] = (cam[1] - lv) / -r[1];
    kind[i] = Math.abs(h) <= n ? 1 : h > n ? 2 : 3;
  }
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const cnt = Object.fromEntries(Object.keys(BOXES).map((k) => [k, { contact: 0, sil: 0 }]));
const img = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    // display-ish preview: expand + simple tone curve
    for (let c = 0; c < 3; c++) {
      let v = at(x, y, c);
      img[i * 4 + c] = Math.max(0, Math.min(255, Math.round(255 * Math.pow(Math.max(0, v) / (1 + Math.max(0, v)), 1 / 2.2) * 1.4)));
    }
    img[i * 4 + 3] = 255;
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    let l = false, s = false, jump = false, dS = 1e9, tL = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const j = i + dy * W + dx;
        if (kind[j] === 1) {
          l = true;
          tL = Math.max(tL, at(x + dx, y + dy, 3));
        }
        if (kind[j] === 2) {
          s = true;
          dS = Math.min(dS, at(x + dx, y + dy, 3));
        }
      }
    if (!(l && s)) continue;
    jump = tL > dS * 1.03 + 0.1;
    let col = jump ? [255, 220, 0] : [255, 0, 255];
    for (const [b, [x0, y0, x1, y1]] of Object.entries(BOXES)) if (x >= x0 && x < x1 && y >= y0 && y < y1) { cnt[b][jump ? "sil" : "contact"]++; break; }
    img.set(col, i * 4);
  }
console.log(JSON.stringify(cnt));
png(img, W, H, out, { crop: [0, 380, W, H] });
