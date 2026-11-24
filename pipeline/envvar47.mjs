// Round-10 cursor-orbit MAJOR: a dotted line of bright specks across the far-left ridge (debug envvar46: the specks are
// massif fragments, > 100 m, seen through cracks in the V2_Ridge proxy). The decoded proxy has 2623 open edges, 564 of
// whose endpoints sit within 2 cm of another open endpoint (unmerged seams). Runtime test: weld by position (grid, tol)
// and drop the degenerate triangles. Variants run in order and persist (each one adds to the last).
const WELD = (names, tol) => `
  const weld = (geo, tol) => {
    const pos = geo.attributes.position, n = pos.count, idx = geo.index ? geo.index.array : null;
    const map = new Int32Array(n), grid = new Map(), out = [], inv = 1 / tol;
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const cx = Math.floor(x * inv), cy = Math.floor(y * inv), cz = Math.floor(z * inv);
      let found = -1;
      for (let dx = -1; dx <= 1 && found < 0; dx++) for (let dy = -1; dy <= 1 && found < 0; dy++) for (let dz = -1; dz <= 1 && found < 0; dz++) {
        const l = grid.get((cx + dx) + "," + (cy + dy) + "," + (cz + dz));
        if (l) for (const j of l) { const o = j * 3; if (Math.abs(out[o] - x) < tol && Math.abs(out[o + 1] - y) < tol && Math.abs(out[o + 2] - z) < tol) { found = j; break; } }
      }
      if (found < 0) { found = out.length / 3; out.push(x, y, z); const k = cx + "," + cy + "," + cz; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(found); }
      map[i] = found;
    }
    const tri = [];
    const m = idx ? idx.length : n;
    for (let t = 0; t < m; t += 3) {
      const a = map[idx ? idx[t] : t], b = map[idx ? idx[t + 1] : t + 1], c = map[idx ? idx[t + 2] : t + 2];
      if (a !== b && b !== c && a !== c) tri.push(a, b, c);
    }
    const g = new geo.constructor();
    g.setAttribute("position", new pos.constructor(new Float32Array(out), 3));
    g.setIndex(tri);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return [g, n, out.length / 3, m / 3, tri.length / 3];
  };
  const names = ${JSON.stringify(names)};
  h.env.envProxy.traverse((o) => {
    if (!o.isMesh || !names.includes(o.name)) return;
    const s = o.getWorldScale(new o.position.constructor());
    const [g, n0, n1, t0, t1] = weld(o.geometry, ${tol} / s.x);
    o.geometry = g;
    console.log("weld " + o.name + " pts " + n0 + " -> " + n1 + " tris " + t0 + " -> " + t1);
  });
`;
export default {
  w2: { js: WELD(["V2_Ridge"], 0.02) },
  w2all: { js: WELD(["V2_Massif", "Object_2.009", "Object_2.010"], 0.02) },
  w5: { js: WELD(["V2_Ridge", "V2_Massif"], 0.05) },
};
