# Cut caps of the hero.glb ring pieces in the whole ring's frame: section stations near each cut, cap faces.
import json, struct, sys
import numpy as np
exec(open(sys.argv[1]).read().split("want = ")[0].split("p = sys.argv[1]")[0])
p = sys.argv[2]
b = open(p, 'rb').read()
clen, ctype = struct.unpack('<II', b[12:20])
j = json.loads(b[20:20 + clen])
off = 20 + clen
blen, btype = struct.unpack('<II', b[off:off + 8])
bin_ = b[off + 8:off + 8 + blen]
CT = {5126: ('f4', 4), 5123: ('u2', 2), 5125: ('u4', 4), 5121: ('u1', 1)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def acc(i):
    a = j['accessors'][i]
    bv = j['bufferViews'][a['bufferView']]
    dt, sz = CT[a['componentType']]
    n = NC[a['type']]
    o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride', 0) or sz * n
    raw = np.frombuffer(bin_, dtype=np.uint8, count=stride * (a['count'] - 1) + sz * n, offset=o)
    arr = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], sz * n), strides=(stride, 1)).copy()
    return arr.view('<' + dt).reshape(a['count'], n)
def quat2mat(q):
    x, y, z, w = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
names = sys.argv[3].split(',')
data = {}
for n in j['nodes']:
    if n.get('name') not in names: continue
    pr = j['meshes'][n['mesh']]['primitives'][0]
    P = acc(pr['attributes']['POSITION']).astype(float); N = acc(pr['attributes']['NORMAL']).astype(float)
    I = acc(pr['indices']).ravel()
    R = quat2mat(n.get('rotation', [0, 0, 0, 1])); s = n.get('scale', [1, 1, 1])[0]
    data[n['name']] = ((P @ R.T) * s, N @ R.T, I)
allP = np.vstack([v[0] for v in data.values()])
c = allP.mean(0)
u, sv, vt = np.linalg.svd(allP - c, full_matrices=False)
ax = vt[2]; e1 = vt[0]; e2 = np.cross(ax, e1)
for name, (Pw, Nw, I) in data.items():
    rel = Pw - c; aW = rel @ ax; rv = rel - np.outer(aW, ax); r = np.linalg.norm(rv, axis=1); er = rv / r[:, None]
    th = np.degrees(np.arctan2(rv @ e2, rv @ e1))
    tang = np.cross(ax[None, :], er)
    nr = (Nw * er).sum(1); na = Nw @ ax; nt = (Nw * tang).sum(1)
    # unwrap theta around the piece's mean
    t0 = np.degrees(np.arctan2(np.sin(np.radians(th)).mean(), np.cos(np.radians(th)).mean()))
    dth = (th - t0 + 180) % 360 - 180
    print(f"== {name}: {len(Pw)} v, {len(I)//3} tris, theta {t0+dth.min():.2f}..{t0+dth.max():.2f}, r {r.min():.4f}..{r.max():.4f}, a {aW.min():+.4f}..{aW.max():+.4f}")
    st = np.unique(np.round(dth, 2))
    print('   stations:', len(st), 'steps near the low end:', np.round(np.diff(st[:6]), 2), 'high end:', np.round(np.diff(st[-6:]), 2))
    for end in (st[0], st[-1]):
        sel = np.where(np.abs(np.round(dth, 2) - end) < 0.006)[0]
        capn = sel[np.abs(nt[sel]) > 0.9]
        side = sel[np.abs(nt[sel]) <= 0.9]
        print(f'   end {end:+.2f}: {len(sel)} verts, {len(capn)} with cap normal (|n_t|>0.9), section of the cap verts (r, a):')
        rc = r.mean()
        pts = sorted(set((round(float(r[k]), 4), round(float(aW[k]), 4)) for k in capn), key=lambda q: np.arctan2(q[1], q[0] - rc))
        print('     ', ' '.join(f'({q[0]:.3f},{q[1]:+.3f})' for q in pts))
    # mid station
    mid = st[len(st) // 2]
    sel = np.where(np.abs(np.round(dth, 2) - mid) < 0.006)[0]
    pts = sorted(set((round(float(r[k]), 4), round(float(aW[k]), 4), round(float(nr[k]), 3), round(float(na[k]), 3)) for k in sel), key=lambda q: np.arctan2(q[1], q[0] - r.mean()))
    print(f'   mid {mid:+.2f}: ', ' '.join(f'({q[0]:.3f},{q[1]:+.3f}|{q[2]:+.2f},{q[3]:+.2f})' for q in pts))
