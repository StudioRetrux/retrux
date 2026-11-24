// as linesim.mjs, but the GLSL version's fit: analytic dF/ds (pdf), d s / d theta = nt.x (shape change ignored), 6 LM steps,
// init theta from the 3x3 gradient, c from the centre's coverage; plus noisy observations (texture) and a curved edge.
const P4 = [[0.375, 0.125], [0.875, 0.375], [0.125, 0.625], [0.625, 0.875]];
const P16 = []; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) for (const s of P4) P16.push([(i + s[0]) / 2, (j + s[1]) / 2]);
function F(s, n) { const a = Math.max(Math.abs(n[0]), Math.abs(n[1])), b = Math.min(Math.abs(n[0]), Math.abs(n[1])); const m = 0.5 * (a + b), k = 0.5 * (a - b), u = Math.abs(s); let c; if (u >= m) c = 1; else if (u <= k) c = 0.5 + u / a; else c = 1 - ((m - u) * (m - u)) / (2 * a * b); return s >= 0 ? c : 1 - c; }
function pdf(s, n) { const a = Math.max(Math.abs(n[0]), Math.abs(n[1])), b = Math.min(Math.abs(n[0]), Math.abs(n[1])); const m = 0.5 * (a + b), k = 0.5 * (a - b), u = Math.abs(s); if (u >= m) return 0; if (u <= k) return 1 / a; return (m - u) / (a * b); }
const covS = (pat, px, py, fn) => pat.reduce((acc, s) => acc + (fn(px + s[0], py + s[1]) > 0 ? 1 : 0), 0) / pat.length;
let rng = 777; const rnd = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
for (const [label, curv, noise, iters] of [["straight", 0, 0, 6], ["straight", 0, 0, 3], ["straight+noise.05", 0, 0.05, 6], ["curved R=20px", 1 / 20, 0, 6], ["curved R=8px", 1 / 8, 0, 6]]) {
  let eRaw = 0, e16 = 0, eFit = 0, n = 0, bail = 0; const steps = { raw: 0, gt: 0, fit: 0 };
  for (let trial = 0; trial < 300; trial++) {
    const th = rnd() * Math.PI * 2, n0 = [Math.cos(th), Math.sin(th)], t0 = [-n0[1], n0[0]];
    let prev = null;
    for (let t = 0; t < 60; t++) {
      const c = -0.6 + t * 0.02;
      // signed field: n.x + c - curv/2 (t.x)^2 (a circle-ish edge bending away)
      const fn = (x, y) => n0[0] * x + n0[1] * y + c - 0.5 * curv * (t0[0] * x + t0[1] * y) ** 2;
      const obs = [];
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) obs.push({ x: i, y: j, f: Math.max(0, Math.min(1, covS(P4, i - 0.5, j - 0.5, fn) + (rnd() - 0.5) * 2 * noise)) });
      // exact coverage of the centre by fine sampling
      let ex = 0; const NN = 32; for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) ex += fn(-0.5 + (i + 0.5) / NN, -0.5 + (j + 0.5) / NN) > 0 ? 1 : 0; ex /= NN * NN;
      const raw = covS(P4, -0.5, -0.5, fn), gt = covS(P16, -0.5, -0.5, fn);
      let gx = 0, gy = 0; for (const o of obs) if (Math.abs(o.x) <= 1 && Math.abs(o.y) <= 1) { gx += o.x * o.f; gy += o.y * o.f; }
      let T = Math.atan2(gy, gx); const fc = obs[12].f; let C = (fc - 0.5) * (Math.abs(Math.cos(T)) + Math.abs(Math.sin(T)));
      for (let it = 0; it < iters; it++) {
        const nn = [Math.cos(T), Math.sin(T)], nt = [-Math.sin(T), Math.cos(T)];
        let j00 = 1e-3, j01 = 0, j11 = 1e-3, r0 = 0, r1 = 0;
        for (const o of obs) { const s = nn[0] * o.x + nn[1] * o.y + C; const p = pdf(s, nn); const dth = p * (nt[0] * o.x + nt[1] * o.y); const r = F(s, nn) - o.f; j00 += dth * dth; j01 += dth * p; j11 += p * p; r0 += dth * r; r1 += p * r; }
        const det = j00 * j11 - j01 * j01;
        T -= Math.max(-0.3, Math.min(0.3, (j11 * r0 - j01 * r1) / det)); C -= Math.max(-0.5, Math.min(0.5, (j00 * r1 - j01 * r0) / det));
      }
      const nn = [Math.cos(T), Math.sin(T)];
      let res = 0; for (const o of obs) res += (F(nn[0] * o.x + nn[1] * o.y + C, nn) - o.f) ** 2; res = Math.sqrt(res / obs.length);
      let fit = F(C, nn); if (res > 0.12) { fit = raw; bail++; }
      if (ex > 0.001 && ex < 0.999) { eRaw += Math.abs(raw - ex); e16 += Math.abs(gt - ex); eFit += Math.abs(fit - ex); n++; }
      if (prev) { steps.raw += Math.abs(raw - prev.raw) > 0.1 ? 1 : 0; steps.gt += Math.abs(gt - prev.gt) > 0.1 ? 1 : 0; steps.fit += Math.abs(fit - prev.fit) > 0.1 ? 1 : 0; }
      prev = { raw, gt, fit };
    }
  }
  console.log(`${label.padEnd(20)} it${iters}: |err| raw4 ${(eRaw / n).toFixed(4)} gt16 ${(e16 / n).toFixed(4)} fit ${(eFit / n).toFixed(4)}  steps>0.1 raw ${steps.raw} gt ${steps.gt} fit ${steps.fit}  bail ${bail}`);
}
