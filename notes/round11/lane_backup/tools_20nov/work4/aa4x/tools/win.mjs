// prints a 5x5 window of an hdrcap frame: class (L lake, S solid, . other), distance, lake distance, luma (compressed)
import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
const [dir, kArg, X, Y] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(path.join(dir, "hdr.json"), "utf8"));
const fr = meta.frames.find((f) => f.k === +kArg); const W = meta.W, H = meta.H;
const raw = zlib.inflateSync(fs.readFileSync(path.join(dir, `e${String(fr.k).padStart(4, "0")}.bin`)));
const buf = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const px = (x, y) => { const i = ((H - 1 - y) * W + x) * 4; return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]; };
const pi = fr.projInv, mw = fr.mw, cam = [mw[12], mw[13], mw[14]];
const ray = (x, y) => { const nx = ((x + 0.5) / W) * 2 - 1, ny = 1 - ((y + 0.5) / H) * 2; const v = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) v[r] = pi[r] * nx + pi[4 + r] * ny + pi[8 + r] + pi[12 + r];
  const vx = v[0] / v[3], vy = v[1] / v[3], vz = v[2] / v[3];
  const wx = mw[0] * vx + mw[4] * vy + mw[8] * vz, wy = mw[1] * vx + mw[5] * vy + mw[9] * vz, wz = mw[2] * vx + mw[6] * vy + mw[10] * vz;
  const l = Math.hypot(wx, wy, wz); return [wx / l, wy / l, wz / l]; };
for (let dy = -2; dy <= 2; dy++) { let s = ""; for (let dx = -2; dx <= 2; dx++) { const [r, g, b, a] = px(+X + dx, +Y + dy); const rr = ray(+X + dx, +Y + dy);
  const u = Math.pow(2, Math.floor(Math.log2(a)) - 10); const h = cam[1] + rr[1] * (a + 0.5 * u); const n = -rr[1] * u; const t = cam[1] / -rr[1];
  const cls = Math.abs(h) <= n ? "L" : h > n ? "S" : "."; s += `${cls} d${a.toFixed(2)} t${t.toFixed(1)} y${(0.2126 * r + 0.7152 * g + 0.0722 * b).toFixed(2)} | `; } console.log(s); }
