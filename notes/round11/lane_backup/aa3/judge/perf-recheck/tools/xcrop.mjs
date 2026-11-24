// zoomed crops of g10x raw frames from several dirs/engines, one row per source: node xcrop.mjs x0 y0 x1 y1 zoom OUT src1 src2 ...
// src = DIR:ENGINE:NAME (NAME lane|base)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png, vstack, cropRGBA } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const [x0, y0, x1, y1, zoom, out, ...srcs] = process.argv.slice(2);
const b = [+x0, +y0, +x1, +y1], cw = b[2] - b[0], ch = b[3] - b[1];
const imgs = srcs.map((s) => {
  const [dir, engine, name] = s.split(":");
  const raw = zlib.inflateSync(fs.readFileSync(path.join(dir, `${engine}_${name}.rgba.z`)));
  const W = 1440, H = 766, row = W * 4, o = new Uint8Array(raw.length);
  for (let y = 0; y < H; y++) o.set(raw.subarray((H - 1 - y) * row, (H - y) * row), y * row);
  return cropRGBA(o, W, b);
});
const v = vstack(imgs, cw, ch, 3);
png(v.img, v.W, v.H, out, { zoom: +zoom });
console.log(out);
