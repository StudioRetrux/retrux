// as linesim2 but a 3-parameter fit (theta, c, curvature k): s_q = n.x_q + c - k/2 (t.x_q)^2, Gaussian tap weights SIG.
const SIG = +(process.argv[2] || 2.0), IT = +(process.argv[3] || 6);
const P4 = [[0.375, 0.125], [0.875, 0.375], [0.125, 0.625], [0.625, 0.875]];
const P16 = []; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) for (const s of P4) P16.push([(i + s[0]) / 2, (j + s[1]) / 2]);
function F(s, n) { const a = Math.max(Math.abs(n[0]), Math.abs(n[1])), b = Math.min(Math.abs(n[0]), Math.abs(n[1])); const m = 0.5 * (a + b), k = 0.5 * (a - b), u = Math.abs(s); let c; if (u >= m) c = 1; else if (u <= k) c = 0.5 + u / a; else c = 1 - ((m - u) * (m - u)) / (2 * a * b); return s >= 0 ? c : 1 - c; }
function pdf(s, n) { const a = Math.max(Math.abs(n[0]), Math.abs(n[1])), b = Math.min(Math.abs(n[0]), Math.abs(n[1])); const m = 0.5 * (a + b), k = 0.5 * (a - b), u = Math.abs(s); if (u >= m) return 0; if (u <= k) return 1 / a; return (m - u) / (a * b); }
const covS = (pat, px, py, fn) => pat.reduce((acc, s) => acc + (fn(px + s[0], py + s[1]) > 0 ? 1 : 0), 0) / pat.length;
function solve3(A, b) { const [a, bb, c, d, e, f] = A; // symmetric [a b c; b d e; c e f]
  const det = a * (d * f - e * e) - bb * (bb * f - c * e) + c * (bb * e - c * d); if (Math.abs(det) < 1e-12) return [0, 0, 0];
  const i00 = (d * f - e * e) / det, i01 = (c * e - bb * f) / det, i02 = (bb * e - c * d) / det, i11 = (a * f - c * c) / det, i12 = (bb * c - a * e) / det, i22 = (a * d - bb * bb) / det;
  return [i00 * b[0] + i01 * b[1] + i02 * b[2], i01 * b[0] + i11 * b[1] + i12 * b[2], i02 * b[0] + i12 * b[1] + i22 * b[2]]; }
let rng = 777; const rnd = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
for (const [label, curv, noise] of [["straight", 0, 0], ["straight+noise.05", 0, 0.05], ["curved R=20px", 1 / 20, 0], ["curved R=8px", 1 / 8, 0], ["curved R=4px", 1 / 4, 0]]) {
  let eRaw = 0, e16 = 0, eFit = 0, n = 0, bail = 0; const steps = { raw: 0, gt: 0, fit: 0 };
  for (let trial = 0; trial < 300; trial++) {
    const th = rnd() * Math.PI * 2, n0 = [Math.cos(th), Math.sin(th)], t0 = [-n0[1], n0[0]];
    let prev = null;
    for (let t = 0; t < 60; t++) {
      const c = -0.6 + t * 0.02;
      const fn = (x, y) => n0[0] * x + n0[1] * y + c - 0.5 * curv * (t0[0] * x + t0[1] * y) ** 2;
      const obs = [];
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) obs.push({ x: i, y: j, f: Math.max(0, Math.min(1, covS(P4, i - 0.5, j - 0.5, fn) + (rnd() - 0.5) * 2 * noise)) });
      let ex = 0; const NN = 32; for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) ex += fn(-0.5 + (i + 0.5) / NN, -0.5 + (j + 0.5) / NN) > 0 ? 1 : 0; ex /= NN * NN;
      const raw = covS(P4, -0.5, -0.5, fn), gt = covS(P16, -0.5, -0.5, fn);
      let gx = 0, gy = 0; for (const o of obs) if (Math.abs(o.x) <= 1 && Math.abs(o.y) <= 1) { gx += o.x * o.f; gy += o.y * o.f; }
      let T = Math.atan2(gy, gx); const fc = obs[12].f; let C = (fc - 0.5) * (Math.abs(Math.cos(T)) + Math.abs(Math.sin(T))), K = 0;
      for (let it = 0; it < IT; it++) {
        const nn = [Math.cos(T), Math.sin(T)], nt = [-Math.sin(T), Math.cos(T)];
        const A = [1e-3, 0, 0, 1e-3, 0, 1e-2], b = [0, 0, 0];
        for (const o of obs) { const w = Math.exp(-(o.x * o.x + o.y * o.y) / (2 * SIG * SIG)); const tx = nt[0] * o.x + nt[1] * o.y; const s = nn[0] * o.x + nn[1] * o.y + C - 0.5 * K * tx * tx; const p = pdf(s, nn); const J = [p * (tx), p, -0.5 * p * tx * tx]; const r = F(s, nn) - o.f;
          A[0] += w * J[0] * J[0]; A[1] += w * J[0] * J[1]; A[2] += w * J[0] * J[2]; A[3] += w * J[1] * J[1]; A[4] += w * J[1] * J[2]; A[5] += w * J[2] * J[2]; b[0] += w * J[0] * r; b[1] += w * J[1] * r; b[2] += w * J[2] * r; }
        const d = solve3(A, b);
        T -= Math.max(-0.3, Math.min(0.3, d[0])); C -= Math.max(-0.5, Math.min(0.5, d[1])); K = Math.max(-0.5, Math.min(0.5, K - Math.max(-0.2, Math.min(0.2, d[2]))));
      }
      const nn = [Math.cos(T), Math.sin(T)], nt = [-Math.sin(T), Math.cos(T)];
      let res = 0, ws = 0; for (const o of obs) { const w = Math.exp(-(o.x * o.x + o.y * o.y) / (2 * SIG * SIG)); const tx = nt[0] * o.x + nt[1] * o.y; res += w * (F(nn[0] * o.x + nn[1] * o.y + C - 0.5 * K * tx * tx, nn) - o.f) ** 2; ws += w; } res = Math.sqrt(res / ws);
      let fit = F(C, nn); if (res > 0.1) { fit = raw; bail++; }
      if (ex > 0.001 && ex < 0.999) { eRaw += Math.abs(raw - ex); e16 += Math.abs(gt - ex); eFit += Math.abs(fit - ex); n++; }
      if (prev) { steps.raw += Math.abs(raw - prev.raw) > 0.1 ? 1 : 0; steps.gt += Math.abs(gt - prev.gt) > 0.1 ? 1 : 0; steps.fit += Math.abs(fit - prev.fit) > 0.1 ? 1 : 0; }
      prev = { raw, gt, fit };
    }
  }
  console.log(`sig ${SIG} it ${IT} ${label.padEnd(20)}: |err| raw4 ${(eRaw / n).toFixed(4)} gt16 ${(e16 / n).toFixed(4)} fit ${(eFit / n).toFixed(4)}  steps>0.1 raw ${steps.raw} gt ${steps.gt} fit ${steps.fit}  bail ${bail}`);
}
