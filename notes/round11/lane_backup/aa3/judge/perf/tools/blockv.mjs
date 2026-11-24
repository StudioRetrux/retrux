import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png, vstack, cropRGBA } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const [g10, x0, y0, x1, y1, zoom, out, ...vars] = process.argv.slice(2);
const read = (dir, name) => {
  const raw = zlib.inflateSync(fs.readFileSync(path.join(dir, `chrome_${name}.rgba.z`)));
  const W = 1440, H = 766, row = W * 4, o = new Uint8Array(raw.length);
  for (let y = 0; y < H; y++) o.set(raw.subarray((H - 1 - y) * row, (H - y) * row), y * row);
  return o;
};
const b = [+x0, +y0, +x1, +y1];
const imgs = vars.map((v) => { const [d, n] = v.split(":"); return cropRGBA(read(path.join(g10, d), n), 1440, b); });
const s = vstack(imgs, b[2] - b[0], b[3] - b[1], 3);
png(s.img, s.W, s.H, out, { zoom: +zoom });
