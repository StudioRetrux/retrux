// Crops of g10x frames (lane vs base, same engine): waterline boxes zoomed, side by side (lane | base | |diff| x4).
//   node crops.mjs --dir G10DIR --engine webkit
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png, hstack, cropRGBA } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const dir = arg("dir", "."), engine = arg("engine", "webkit"), zoom = +arg("zoom", "3");
const meta = JSON.parse(fs.readFileSync(path.join(dir, `${engine}.json`), "utf8"));
const get = (name) => {
  const m = meta.find((x) => x.name === name);
  const raw = zlib.inflateSync(fs.readFileSync(path.join(dir, `${engine}_${name}.rgba.z`)));
  const W = m.shot.W, H = m.shot.H;
  // readPixels rows are bottom-up
  const o = new Uint8Array(raw.length);
  const row = W * 4;
  for (let y = 0; y < H; y++) o.set(raw.subarray((H - 1 - y) * row, (H - y) * row), y * row);
  return { img: o, W, H };
};
const L = get("lane"), B = get("base");
const boxes = { FS: [180, 600, 430, 720], RS: [940, 590, 1240, 655], FF: [60, 445, 420, 560], WR: [990, 650, 1215, 725] };
png(L.img, L.W, L.H, path.join(dir, `${engine}_lane_full.png`));
png(B.img, B.W, B.H, path.join(dir, `${engine}_base_full.png`));
const stats = {};
for (const [k, b] of Object.entries(boxes)) {
  const cw = b[2] - b[0], ch = b[3] - b[1];
  const a = cropRGBA(L.img, L.W, b), c = cropRGBA(B.img, B.W, b);
  const d = new Uint8Array(a.length);
  let n4 = 0, mx = 0;
  for (let i = 0; i < a.length; i += 4) {
    let m = 0;
    for (let j = 0; j < 3; j++) m = Math.max(m, Math.abs(a[i + j] - c[i + j]));
    if (m > 4) n4++;
    mx = Math.max(mx, m);
    const v = Math.min(255, m * 4);
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  stats[k] = { px: cw * ch, over4: n4, max: mx };
  const s = hstack([a, c, d], cw, ch);
  png(s.img, s.W, s.H, path.join(dir, `${engine}_${k}_lane_base_diff.png`), { zoom });
}
console.log(JSON.stringify({ engine, stats }));
