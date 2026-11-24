// Live-run views (deduplicated engine frames): time slices and frame strips of a crop.
//   node livestrip.mjs --dir caps/live/lane --crop R --label hold --slice 0.55 --out F.png [--zoom 2]   (row at 55 % of the crop)
//   node livestrip.mjs --dir caps/live/lane --crop R --from IDX --n 8 --cols 4 --out F.png [--zoom 2]    (frame strip)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { png } from "../../../aa3/tools/lib.mjs";
const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].slice(2)] = argv[i + 1];
const meta = JSON.parse(fs.readFileSync(path.join(opt.dir, "meta.json"), "utf8"));
const C = opt.crop, zoom = +(opt.zoom || 2);
const load = (r) => {
  const c = r.crops[C];
  const b = zlib.inflateSync(fs.readFileSync(path.join(opt.dir, `${C}${String(r.idx).padStart(4, "0")}.bin`)));
  const o = new Uint8Array(b.length), row = c.w * 4;
  for (let y = 0; y < c.h; y++) o.set(b.subarray((c.h - 1 - y) * row, (c.h - y) * row), y * row);
  return { img: o, w: c.w, h: c.h };
};
// dedupe: consecutive identical crops are the same engine frame
const frames = [];
let lastHash = "";
for (const r of meta.frames) {
  const f = load(r);
  // a read after the composite (another rAF callback before the engine's) sees a cleared buffer: skip it
  let blank = true;
  for (let i = 3; i < f.img.length; i += 4 * 97) if (f.img[i] !== 0) { blank = false; break; }
  if (blank) continue;
  const h = crypto.createHash("md5").update(f.img).digest("hex");
  if (h === lastHash) continue;
  lastHash = h;
  frames.push({ r, f });
}
if (opt.slice) {
  const sel = frames.filter((x) => x.r.label === opt.label && x.f.w === frames.find((y) => y.r.label === opt.label).f.w);
  const w = sel[0].f.w, yy = Math.round(+opt.slice * sel[0].f.h);
  const img = new Uint8Array(w * sel.length * 4);
  sel.forEach((x, i) => img.set(x.f.img.subarray(yy * w * 4, (yy + 1) * w * 4), i * w * 4));
  png(img, w, sel.length, opt.out, { zoom });
  console.log(`slice ${opt.label}: ${sel.length} engine frames (of ${meta.frames.filter((r) => r.label === opt.label).length} rAF records), row ${yy}, idx ${sel[0].r.idx}-${sel[sel.length - 1].r.idx}`);
} else {
  const start = frames.findIndex((x) => x.r.idx >= +opt.from);
  const n = +(opt.n || 8), cols = +(opt.cols || 4), gap = 3;
  const sel = frames.slice(start, start + n);
  const w = sel[0].f.w, h = sel[0].f.h;
  const rows = Math.ceil(sel.length / cols);
  const W = cols * w + (cols - 1) * gap, H = rows * h + (rows - 1) * gap;
  const img = new Uint8Array(W * H * 4).fill(255);
  sel.forEach((x, i) => {
    if (x.f.w !== w) return;
    const r = Math.floor(i / cols), c = i % cols;
    for (let y = 0; y < h; y++) img.set(x.f.img.subarray(y * w * 4, (y + 1) * w * 4), ((r * (h + gap) + y) * W + c * (w + gap)) * 4);
  });
  png(img, W, H, opt.out, { zoom });
  console.log("strip", sel.map((x) => `${x.r.idx}:${x.r.label}:s${(+x.r.scale).toFixed(1)}:w${x.r.taa ? x.r.taa.weight : "-"}:h${(+x.r.hold).toFixed(2)}`).join(" "));
}
