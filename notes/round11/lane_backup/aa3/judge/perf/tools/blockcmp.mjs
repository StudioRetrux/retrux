// the far-floe block crop across variants: AA3 | lktaa=0 (A+B) | slabflash=0 (A+C) | all off | BASE (Chrome, same deterministic pose)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png, hstack, cropRGBA } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const [g10, x0, y0, x1, y1, zoom, out] = process.argv.slice(2);
const read = (dir, name) => {
  const raw = zlib.inflateSync(fs.readFileSync(path.join(dir, `chrome_${name}.rgba.z`)));
  const W = 1440, H = 766, row = W * 4, o = new Uint8Array(raw.length);
  for (let y = 0; y < H; y++) o.set(raw.subarray((H - 1 - y) * row, (H - y) * row), y * row);
  return o;
};
const b = [+x0, +y0, +x1, +y1];
const vars = [["r2", "lane"], ["taa0", "lane"], ["sf0", "lane"], ["aa0", "lane"], ["r2", "base"]].filter(([d]) => fs.existsSync(path.join(g10, d, "chrome_lane.rgba.z")));
const imgs = vars.map(([d, n]) => cropRGBA(read(path.join(g10, d), n), 1440, b));
const s = hstack(imgs, b[2] - b[0], b[3] - b[1], 4);
png(s.img, s.W, s.H, out, { zoom: +zoom });
// identity checks
const full = (d, n) => read(path.join(g10, d), n);
const eq = (a, c) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) n++; return n; };
if (fs.existsSync(path.join(g10, "aa0", "chrome_lane.rgba.z"))) console.log("aa0 lane vs r2 base differing bytes:", eq(full("aa0", "lane"), full("r2", "base")));
console.log("panels:", vars.map((v) => v.join(":")).join(" | "));
