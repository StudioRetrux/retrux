// AA4X offline: how well can a straight silhouette's coverage be recovered from 4x MSAA coverages of a 5x5 window (line fit),
// compared with the raw 4-sample coverage and the 16-sample GT? Synthetic straight edges, random angle / offset; the edge
// moves 0.02 px per frame along its normal for a temporal step count.   node linesim.mjs
const P4 = [[0.375, 0.125], [0.875, 0.375], [0.125, 0.625], [0.625, 0.875]];
const P16 = [];
for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) for (const s of P4) P16.push([(i + s[0]) / 2, (j + s[1]) / 2]);
// exact area of the unit pixel (centre at origin) on the side n.x > -s
function F(s, n) {
  const a = Math.max(Math.abs(n[0]), Math.abs(n[1])), b = Math.min(Math.abs(n[0]), Math.abs(n[1]));
  const m = 0.5 * (a + b), k = 0.5 * (a - b), u = Math.abs(s);
  let c;
  if (u >= m) c = 1;
  else if (u <= k) c = 0.5 + u / a;
  else c = 1 - ((m - u) * (m - u)) / (2 * a * b);
  return s >= 0 ? c : 1 - c;
}
// coverage of pixel (px, py) [corner coords] by the half-plane n.x + c > 0 with a sample pattern
const cov = (pat, px, py, n, c) => pat.reduce((acc, s) => acc + (n[0] * (px + s[0]) + n[1] * (py + s[1]) + c > 0 ? 1 : 0), 0) / pat.length;
// line fit over the 5x5 observations: minimise sum (F(n.(x_q) + c) - f_q)^2 over (theta, c) by Gauss-Newton (numeric)
function fit(obs, th0, c0) {
  let th = th0, c = c0;
  for (let it = 0; it < 8; it++) {
    let JTJ = [0, 0, 0], JTr = [0, 0];
    for (const o of obs) {
      const n = [Math.cos(th), Math.sin(th)];
      const s = n[0] * o.x + n[1] * o.y + c;
      const r = F(s, n) - o.f;
      const e = 1e-4;
      const nt = [Math.cos(th + e), Math.sin(th + e)];
      const dth = (F(nt[0] * o.x + nt[1] * o.y + c, nt) - F(s, n)) / e;
      const dc = (F(s + e, n) - F(s, n)) / e;
      JTJ[0] += dth * dth; JTJ[1] += dth * dc; JTJ[2] += dc * dc;
      JTr[0] += dth * r; JTr[1] += dc * r;
    }
    const lam = 1e-3;
    const a = JTJ[0] + lam, b = JTJ[1], d = JTJ[2] + lam;
    const det = a * d - b * b;
    if (Math.abs(det) < 1e-12) break;
    const st = (d * JTr[0] - b * JTr[1]) / det, sc = (a * JTr[1] - b * JTr[0]) / det;
    th -= Math.max(-0.3, Math.min(0.3, st));
    c -= Math.max(-0.5, Math.min(0.5, sc));
  }
  return [th, c];
}
let eRaw = 0, e16 = 0, eFit = 0, n = 0;
const steps = { raw: 0, gt: 0, fit: 0, exact: 0 };
let rng = 12345;
const rnd = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let trial = 0; trial < 300; trial++) {
  const th = rnd() * Math.PI * 2;
  const n0 = [Math.cos(th), Math.sin(th)];
  let prev = null;
  for (let t = 0; t < 60; t++) {
    // line through the centre pixel region: n.(x) + c = 0 with x relative to the centre pixel's centre
    const c = (rnd() < 0 ? 0 : -0.6 + t * 0.02) + 0.0;
    // observations of the 5x5 (pixel centres at integer offsets; pixel corner = centre - 0.5)
    const obs = [];
    for (let j = -2; j <= 2; j++)
      for (let i = -2; i <= 2; i++) {
        const cc = n0[0] * i + n0[1] * j + c; // signed distance of that pixel centre (n unit)
        const f = cov(P4, i - 0.5, j - 0.5, n0, c);
        obs.push({ x: i, y: j, f, sd: cc });
      }
    const exact = F(c, n0);
    const raw = cov(P4, -0.5, -0.5, n0, c);
    const gt = cov(P16, -0.5, -0.5, n0, c);
    // init: gradient of the observed coverage (Sobel-ish over the 3x3) and the raw coverage
    let gx = 0, gy = 0;
    for (const o of obs) if (Math.abs(o.x) <= 1 && Math.abs(o.y) <= 1) { gx += o.x * o.f; gy += o.y * o.f; }
    const th0 = Math.atan2(gy, gx);
    const [thf, cf] = fit(obs.filter((o) => Math.abs(o.x) <= 2 && Math.abs(o.y) <= 2), th0, 0);
    const fitc = F(cf, [Math.cos(thf), Math.sin(thf)]);
    if (exact > 0.001 && exact < 0.999) {
      eRaw += Math.abs(raw - exact); e16 += Math.abs(gt - exact); eFit += Math.abs(fitc - exact); n++;
    }
    if (prev) {
      steps.raw += Math.abs(raw - prev.raw) > 0.1 ? 1 : 0;
      steps.gt += Math.abs(gt - prev.gt) > 0.1 ? 1 : 0;
      steps.fit += Math.abs(fitc - prev.fit) > 0.1 ? 1 : 0;
      steps.exact += Math.abs(exact - prev.exact) > 0.1 ? 1 : 0;
    }
    prev = { raw, gt, fit: fitc, exact };
  }
}
console.log(`mean |cov - exact| on partial px: raw4 ${(eRaw / n).toFixed(4)}  gt16 ${(e16 / n).toFixed(4)}  linefit5x5 ${(eFit / n).toFixed(4)}  (n ${n})`);
console.log(`steps > 0.1 per 0.02 px move: raw ${steps.raw} gt ${steps.gt} fit ${steps.fit} exact ${steps.exact}`);
