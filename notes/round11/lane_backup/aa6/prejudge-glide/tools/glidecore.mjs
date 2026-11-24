// AA5a G1c GLIDE metric core (shared by the synthetic validation and the real-capture tool).
// Edges are found in the lake COVERAGE mask (geometry, the same for every variant: from BASE's fixed mask session) and measured
// in each variant's IMAGE: per line (a row for a near-vertical edge, a column for a near-horizontal one), per frame, the sub-pixel
// position where the luma profile crosses the midpoint between its solid-side and lake-side levels (linear interpolation).
// Tracks link the same edge over frames on the same line; jerk = second time difference of the position (minus the box motion's
// change), RMS over every (track, frame) that is valid in ALL variants.

/** Crossings of the 0.5 coverage level along every row (dir 0) or column (dir 1) inside box [x0,y0,x1,y1) (crop coords). */
export function findCrossings(cov, hero, W, H, box, dir) {
  const [bx0, by0, bx1, by1] = box;
  const out = [];
  const R = 3; // clean run checked out to 3 px beyond the boundary pair on each side
  const at = (line, s) => (dir === 0 ? cov[line * W + s] : cov[s * W + line]);
  const hr = (line, s) => (dir === 0 ? hero[line * W + s] : hero[s * W + line]);
  const L0 = dir === 0 ? Math.max(1, by0) : Math.max(1, bx0), L1 = dir === 0 ? Math.min(H - 1, by1) : Math.min(W - 1, bx1);
  const S0 = dir === 0 ? bx0 : by0, S1 = dir === 0 ? bx1 : by1, SN = dir === 0 ? W : H;
  const cross = (line, s0, s1) => {
    const r = [];
    for (let s = Math.max(R + 1, s0); s < Math.min(SN - R - 2, s1); s++) {
      const a = at(line, s), b = at(line, s + 1);
      if ((a >= 128) === (b >= 128)) continue;
      const lakeHi = b >= 128; // lake on the +s side
      let ok = true;
      for (let q = s - R; q <= s + 1 + R && ok; q++) if (hr(line, q)) ok = false;
      if (!ok) continue;
      // one clean monotonic transition: solid side <= 15 at 2..3 px, lake side >= 240 at 2..3 px, monotonic (+-8)
      const sgn = lakeHi ? 1 : -1;
      const sol = (k) => at(line, lakeHi ? s - k : s + 1 + k);
      const lak = (k) => at(line, lakeHi ? s + 1 + k : s - k);
      if (sol(2) > 15 || sol(3) > 15 || lak(2) < 240 || lak(3) < 240) continue;
      for (let q = s - R; q < s + 1 + R && ok; q++) if (sgn * (at(line, q + 1) - at(line, q)) < -8) ok = false;
      if (!ok) continue;
      // sub-pixel mask position (pixel centres at s + 0.5)
      const xm = s + 0.5 + (128 - a) / (b - a);
      r.push({ s, xm, pol: lakeHi ? 1 : -1 });
    }
    return r;
  };
  const rowsC = new Map();
  for (let line = L0 - 1; line <= L1; line++) if (line >= 1 && line < (dir === 0 ? H - 1 : W - 1)) rowsC.set(line, cross(line, S0 - 3, S1 + 3));
  for (let line = L0; line < L1; line++) {
    for (const c of rowsC.get(line)) {
      if (c.s < S0 || c.s >= S1) continue;
      // orientation: the same polarity's crossing on the neighbouring lines within 2 px -> slope (px per line)
      const nb = [];
      for (const dl of [-1, 1]) {
        const l2 = rowsC.get(line + dl);
        if (!l2) continue;
        let best = null;
        for (const d of l2) if (d.pol === c.pol && Math.abs(d.xm - c.xm) <= 2 && (!best || Math.abs(d.xm - c.xm) < Math.abs(best.xm - c.xm))) best = d;
        if (best) nb.push(best.xm - c.xm);
      }
      if (!nb.length) continue;
      const slope = nb.length === 2 ? Math.abs(nb[1] - nb[0]) / 2 : Math.abs(nb[0]);
      // rows take edges within 45 deg of vertical (slope <= 1), columns the rest (slope < 1 of the other way)
      if (dir === 0 ? slope > 1 : slope >= 1) continue;
      out.push({ dir, line, s: c.s, xm: c.xm, pol: c.pol });
    }
  }
  return out;
}

/** Sub-pixel image crossing for a mask crossing c in luma image I (crop W x H); null when no clean crossing / low contrast. */
export function imageCrossing(I, W, H, c, minContrast = 24) {
  const { dir, line, s, pol } = c;
  const v = (q) => (dir === 0 ? I[line * W + q] : I[q * W + line]);
  const lakeHi = pol === 1;
  const S = lakeHi ? 0.5 * (v(s - 2) + v(s - 3)) : 0.5 * (v(s + 3) + v(s + 4));
  const L = lakeHi ? 0.5 * (v(s + 3) + v(s + 4)) : 0.5 * (v(s - 2) + v(s - 3));
  return { S, L };
}
/** Position where the profile crosses mid (nearest to the mask crossing xm), within +-2 px. */
export function crossAt(I, W, c, mid) {
  const { dir, line, s, xm } = c;
  const v = (q) => (dir === 0 ? I[line * W + q] : I[q * W + line]);
  let best = null;
  for (let j = s - 2; j <= s + 2; j++) {
    const a = v(j) - mid, b = v(j + 1) - mid;
    if (a === 0 && b === 0) continue;
    if (a * b > 0) continue;
    const p = j + 0.5 + a / (a - b);
    if (best === null || Math.abs(p - xm) < Math.abs(best - xm)) best = p;
  }
  return best;
}

/**
 * Tracks over frames. crossingsPerFrame[k] = list of crossings (with .key = dir:line:pol). Links k-1 -> k when the mask
 * position moved <= maxStep px (after the predicted step from the track's last two positions).
 */
export function linkTracks(crossingsPerFrame, maxStep = 2.5) {
  const tracks = [];
  let open = new Map(); // key -> [track...]
  for (let k = 0; k < crossingsPerFrame.length; k++) {
    const cur = crossingsPerFrame[k];
    const next = new Map();
    const used = new Set();
    for (const c of cur) {
      const key = `${c.dir}:${c.line}:${c.pol}`;
      const cands = open.get(key) || [];
      let best = null, bd = Infinity;
      for (const t of cands) {
        if (used.has(t)) continue;
        const n = t.items.length;
        const last = t.items[n - 1].c.xm;
        const pred = n >= 2 ? last + (last - t.items[n - 2].c.xm) : last;
        const d = Math.abs(c.xm - pred);
        if (d <= maxStep && d < bd) {
          bd = d;
          best = t;
        }
      }
      let t = best;
      if (t) used.add(t);
      else {
        t = { key, dir: c.dir, items: [] };
        tracks.push(t);
      }
      t.items.push({ k, c });
      if (!next.has(key)) next.set(key, []);
      next.get(key).push(t);
    }
    open = next;
  }
  return tracks.filter((t) => t.items.length >= 3);
}

/** Moving average of an array (window +-r, NaN-aware). */
export function smooth(a, r) {
  const o = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    let s = 0, n = 0;
    for (let j = Math.max(0, i - r); j <= Math.min(a.length - 1, i + r); j++) if (Number.isFinite(a[j])) {
      s += a[j];
      n++;
    }
    o[i] = n ? s / n : NaN;
  }
  return o;
}

/**
 * Jerk per variant over a set of tracks. getLuma(vi, k) -> Float32 luma image of variant vi at frame k (crop W x H).
 * motion(k, dir) -> box motion along the line direction between k-1 and k (px; smoothed), or 0.
 * Levels (S, L) are smoothed over +-lvlR frames along the track (texture noise), per variant.
 * Returns per variant { n, rms, mabs, p95, f10 } over samples valid in ALL variants.
 */
export function trackJerk(tracks, nVar, getLuma, W, H, motion, { lvlR = 3, minContrast = 24, est = "cross" } = {}) {
  const d2 = Array.from({ length: nVar }, () => []);
  for (const t of tracks) {
    const n = t.items.length;
    // the track must be consecutive in k
    const pos = Array.from({ length: nVar }, () => new Array(n).fill(NaN));
    for (let vi = 0; vi < nVar; vi++) {
      const S = [], L = [];
      for (const it of t.items) {
        const I = getLuma(vi, it.k);
        const lv = imageCrossing(I, W, H, it.c);
        S.push(lv.S);
        L.push(lv.L);
      }
      const Ss = smooth(S, lvlR), Ls = smooth(L, lvlR);
      for (let i = 0; i < n; i++) {
        if (Math.abs(Ls[i] - Ss[i]) < minContrast) continue;
        const I = getLuma(vi, t.items[i].k);
        if (est === "area5") {
          const c = t.items[i].c;
          const v = (q) => (c.dir === 0 ? I[c.line * W + q] : I[q * W + c.line]);
          let sum = 0;
          for (let q = c.s - 2; q <= c.s + 2; q++) sum += Math.min(1.25, Math.max(-0.25, (v(q) - Ss[i]) / (Ls[i] - Ss[i])));
          pos[vi][i] = c.pol === 1 ? c.s + 3 - sum : c.s - 2 + sum;
          continue;
        }
        const p = crossAt(I, W, t.items[i].c, 0.5 * (Ss[i] + Ls[i]));
        if (p !== null) pos[vi][i] = p;
      }
    }
    for (let i = 1; i < n - 1; i++) {
      const k0 = t.items[i - 1].k, k1 = t.items[i].k, k2 = t.items[i + 1].k;
      if (k1 !== k0 + 1 || k2 !== k1 + 1) continue;
      let ok = true;
      for (let vi = 0; vi < nVar && ok; vi++) if (!Number.isFinite(pos[vi][i - 1]) || !Number.isFinite(pos[vi][i]) || !Number.isFinite(pos[vi][i + 1])) ok = false;
      if (!ok) continue;
      const acc = motion ? motion(k2, t.dir) - motion(k1, t.dir) : 0;
      for (let vi = 0; vi < nVar; vi++) d2[vi].push(pos[vi][i + 1] - 2 * pos[vi][i] + pos[vi][i - 1] - acc);
    }
  }
  return d2.map((a) => {
    const n = a.length;
    if (!n) return { n: 0, rms: NaN, mabs: NaN, p95: NaN, f10: NaN };
    let s2 = 0, s1 = 0, c10 = 0;
    for (const x of a) {
      s2 += x * x;
      s1 += Math.abs(x);
      if (Math.abs(x) > 0.1) c10++;
    }
    const sorted = a.map(Math.abs).sort((x, y) => x - y);
    return { n, rms: Math.sqrt(s2 / n), mabs: s1 / n, p95: sorted[Math.floor(0.95 * (n - 1))], f10: c10 / n };
  });
}
