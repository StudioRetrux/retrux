import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
const [dir, kArg, x0, y0, x1, y1] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(path.join(dir, "hdr.json"), "utf8"));
const fr = meta.frames.find((f) => f.k === +kArg); const W = meta.W, H = meta.H;
const raw = zlib.inflateSync(fs.readFileSync(path.join(dir, `e${String(fr.k).padStart(4, "0")}.bin`)));
const buf = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const at = (x, y, c) => buf[((H - 1 - y) * W + x) * 4 + c];
const pi = fr.projInv, mw = fr.mw; const cam = [mw[12], mw[13], mw[14]];
console.log("pos", fr.pos, "mw t", cam);
const ray = (x, y) => { const nx = ((x + 0.5) / W) * 2 - 1, ny = 1 - ((y + 0.5) / H) * 2; const v = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) v[r] = pi[r] * nx + pi[4 + r] * ny + pi[8 + r] + pi[12 + r];
  const vx = v[0] / v[3], vy = v[1] / v[3], vz = v[2] / v[3];
  const wx = mw[0] * vx + mw[4] * vy + mw[8] * vz, wy = mw[1] * vx + mw[5] * vy + mw[9] * vz, wz = mw[2] * vx + mw[6] * vy + mw[10] * vz;
  const l = Math.hypot(wx, wy, wz); return [wx / l, wy / l, wz / l]; };
const rows = [];
for (let y = +y0; y < +y1; y += 1) { let s = ""; for (let x = +x0; x < +x1; x += 1) { const a = at(x, y, 3); const r = ray(x, y); const h = cam[1] + r[1] * a; const n = -r[1] * a * 2.8e-4 * 3; s += (h / n).toFixed(1).padStart(6); } rows.push(s); }
console.log(rows.join("\n"));
const a = at(+x0, +y0, 3), r = ray(+x0, +y0); console.log("a", a, "t", cam[1] / -r[1], "ry", r[1]);
