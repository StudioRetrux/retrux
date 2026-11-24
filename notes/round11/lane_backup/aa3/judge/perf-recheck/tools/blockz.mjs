// tight zoomed crops of the block sequences: rows k0..k1, columns lane_new | lane_sf0_new | base_new (+ lane_old first)
//   node blockz.mjs OLD NEW k0 k1 fx0 fy0 fx1 fy1 zoom OUT   (frame coordinates)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { png, hstack, vstack } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const [oldDir, newDir, k0, k1, fx0, fy0, fx1, fy1, zoom, out] = process.argv.slice(2).map((v, i) => (i < 2 || i === 9 ? v : +v));
const { X0, Y0, W, H } = JSON.parse(fs.readFileSync(path.join(newDir, "meta.json"), "utf8"));
const S = (d, n) => zlib.inflateSync(fs.readFileSync(path.join(d, `${n}.seq.z`)));
const seqs = [S(oldDir, "lane"), S(newDir, "lane"), S(newDir, "lane_sf0"), S(newDir, "base")];
const cx0 = fx0 - X0, cx1 = fx1 - X0, cy0 = fy0 - Y0, cy1 = fy1 - Y0, cw = cx1 - cx0, ch = cy1 - cy0, FS = W * H * 4;
const crop = (s, k) => { const o = new Uint8Array(cw * ch * 4), row = W * 4, b = k * FS; for (let y = 0; y < ch; y++) { const sy = H - 1 - (y + cy0); o.set(s.subarray(b + sy * row + cx0 * 4, b + sy * row + cx1 * 4), y * cw * 4); } return o; };
const rows = []; for (let k = k0; k <= k1; k++) rows.push(hstack(seqs.map((s) => crop(s, k)), cw, ch, 3));
const v = vstack(rows.map((r) => r.img), rows[0].W, ch, 3);
png(v.img, v.W, v.H, out, { zoom });
console.log(out);
