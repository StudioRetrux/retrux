# Cross-section of the hero.glb ring meshes: positions + normals in the ring frame (r, a), per mesh.
import json, struct, sys
import numpy as np
p = sys.argv[1]
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
want = sys.argv[2:] or ['Circle.027', 'Circle.026', 'Circle.025', 'Circle.028']
for n in j['nodes']:
    if n.get('name') not in want: continue
    m = j['meshes'][n['mesh']]
    pr = m['primitives'][0]
    P = acc(pr['attributes']['POSITION']).astype(float)
    N = acc(pr['attributes']['NORMAL']).astype(float)
    I = acc(pr['indices']).ravel()
    R = quat2mat(n.get('rotation', [0, 0, 0, 1]))
    s = n.get('scale', [1, 1, 1])[0]
    Pw = (P @ R.T) * s
    Nw = N @ R.T
    # ring axis: smallest principal axis
    c = Pw.mean(0)
    u, sv, vt = np.linalg.svd(Pw - c, full_matrices=False)
    ax = vt[2]
    rel = Pw - c
    aW = rel @ ax
    rv = rel - np.outer(aW, ax)
    r = np.linalg.norm(rv, axis=1)
    er = rv / r[:, None]
    # angle in the plane
    e1 = vt[0]; e2 = np.cross(ax, e1)
    th = np.degrees(np.arctan2(rv @ e2, rv @ e1))
    nr = (Nw * er).sum(1); na = Nw @ ax
    tang = np.cross(ax[None, :], er)
    nt = (Nw * tang).sum(1)
    print(f"== {n['name']} verts {len(P)} tris {len(I)//3} scale {s:.4f} r {r.min():.4f}-{r.max():.4f} a {aW.min():.4f}-{aW.max():.4f} th {th.min():.1f}..{th.max():.1f}")
    # unique theta rings
    ths = np.round(th, 2)
    uth = np.unique(ths)
    print('  distinct theta stations:', len(uth), ' first few:', uth[:12])
    # pick the station nearest the median theta
    mid = uth[len(uth) // 2]
    sel = np.where(np.abs(ths - mid) < 0.01)[0]
    order = sel[np.argsort(np.arctan2(aW[sel], r[sel] - r.mean()))]
    print(f'  section at theta {mid}: {len(sel)} verts (r, a, n_r, n_a, n_t)')
    for k in order:
        print(f'    r {r[k]:.4f} a {aW[k]:+.4f}  n ({nr[k]:+.3f}, {na[k]:+.3f}, {nt[k]:+.3f})')
    # end cap stations
    for tt in (uth[0], uth[-1]):
        sel = np.where(np.abs(ths - tt) < 0.01)[0]
        order = sel[np.argsort(np.arctan2(aW[sel], r[sel] - r.mean()))]
        print(f'  END station theta {tt}: {len(sel)} verts')
        for k in order:
            print(f'    r {r[k]:.4f} a {aW[k]:+.4f}  n ({nr[k]:+.3f}, {na[k]:+.3f}, {nt[k]:+.3f})')
