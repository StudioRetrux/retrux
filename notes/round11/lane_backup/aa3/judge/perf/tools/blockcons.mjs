import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png, hstack, vstack } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const [dir, k0, k1, cx0, cx1, cy0, cy1, zoom] = process.argv.slice(2).map((v, i) => (i ? +v : v));
const { W, H } = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
const names = ["lane", "lane_sf0", "base"];
const seqs = Object.fromEntries(names.map((n) => [n, zlib.inflateSync(fs.readFileSync(path.join(dir, `${n}.seq.z`)))]));
const cw = cx1 - cx0, ch = cy1 - cy0;
const frame = (n, k) => {
  const s = seqs[n], o = new Uint8Array(cw * ch * 4), row = W * 4, base = k * W * H * 4;
  for (let y = 0; y < ch; y++) { const sy = H - 1 - (y + cy0); o.set(s.subarray(base + sy * row + cx0 * 4, base + sy * row + cx1 * 4), y * cw * 4); }
  return o;
};
const rows = [];
for (let k = k0; k <= k1; k++) rows.push(hstack(names.map((n) => frame(n, k)), cw, ch, 4));
const v = vstack(rows.map((r) => r.img), rows[0].W, ch, 2);
const out = path.join(dir, `block_cons_k${k0}-${k1}_z${zoom}.png`);
png(v.img, v.W, v.H, out, { zoom });
console.log(out);
