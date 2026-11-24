// tight crops of two g10x frames (lane | base), zoomed: node crop2.mjs DIR ENGINE x0 y0 x1 y1 zoom OUT
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png, hstack, cropRGBA } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const [dir, engine, x0, y0, x1, y1, zoom, out] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(path.join(dir, `${engine}.json`), "utf8"));
const get = (name) => {
  const m = meta.find((x) => x.name === name);
  const raw = zlib.inflateSync(fs.readFileSync(path.join(dir, `${engine}_${name}.rgba.z`)));
  const W = m.shot.W, H = m.shot.H, row = W * 4, o = new Uint8Array(raw.length);
  for (let y = 0; y < H; y++) o.set(raw.subarray((H - 1 - y) * row, (H - y) * row), y * row);
  return { img: o, W, H };
};
const b = [+x0, +y0, +x1, +y1];
const L = get("lane"), B = get("base");
const s = hstack([cropRGBA(L.img, L.W, b), cropRGBA(B.img, B.W, b)], b[2] - b[0], b[3] - b[1], 4);
png(s.img, s.W, s.H, out, { zoom: +zoom });
