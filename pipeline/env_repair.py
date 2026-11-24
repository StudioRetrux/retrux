# Shared mesh repair for the environment proxies / bake meshes (from export_env_v4.py): weld at a world tolerance, then
# iteratively split every boundary edge at any boundary vertex lying on it and weld the new vertex to it (T-junctions),
# weld again, triangulate n-gons, validate. Object space; the tolerance is scaled by the object's largest scale.
import bmesh, time
from mathutils.geometry import intersect_point_line


def open_edges(bm):
    return [e for e in bm.edges if e.is_boundary]


def repair(obj, tol_world=0.03, iters=12, log=print):
    t0 = time.time()
    sc = max(abs(s) for s in obj.matrix_world.to_scale())
    tol = tol_world / max(sc, 1e-6)
    me = obj.data
    if me.users > 1:
        obj.data = me = me.copy()
    bm = bmesh.new()
    bm.from_mesh(me)
    b0 = len(open_edges(bm))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=tol)
    b1 = len(open_edges(bm))
    G = max(tol * 40.0, 0.5)
    splits_total = 0
    for it in range(iters):
        bm.verts.ensure_lookup_table()
        bm.edges.ensure_lookup_table()
        bed = open_edges(bm)
        if not bed:
            break
        grid = {}
        for e in bed:
            a, b = e.verts[0].co, e.verts[1].co
            lo = [min(a[i], b[i]) - tol for i in range(3)]
            hi = [max(a[i], b[i]) + tol for i in range(3)]
            for cx in range(int(lo[0] // G), int(hi[0] // G) + 1):
                for cy in range(int(lo[1] // G), int(hi[1] // G) + 1):
                    for cz in range(int(lo[2] // G), int(hi[2] // G) + 1):
                        grid.setdefault((cx, cy, cz), []).append(e)
        bverts = {v for e in bed for v in e.verts}
        best = {}
        for v in bverts:
            key = (int(v.co.x // G), int(v.co.y // G), int(v.co.z // G))
            for e in grid.get(key, ()):
                if v in e.verts:
                    continue
                a, b = e.verts[0].co, e.verts[1].co
                pt, fac = intersect_point_line(v.co, a, b)
                if not (0.0 < fac < 1.0) or (pt - v.co).length >= tol:
                    continue
                if (v.co - a).length < tol or (v.co - b).length < tol:
                    continue
                if any(v in f.verts for f in e.link_faces):
                    continue
                if e not in best or fac < best[e][0]:
                    best[e] = (fac, v)
        if not best:
            break
        targetmap = {}
        used = set()
        for e, (fac, v) in best.items():
            if v in used or not e.is_valid:
                continue
            ne, nv = bmesh.utils.edge_split(e, e.verts[0], fac)
            targetmap[nv] = v
            used.add(v)
        if not targetmap:
            break
        bmesh.ops.weld_verts(bm, targetmap=targetmap)
        splits_total += len(targetmap)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=tol * 0.25)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    b2 = len(open_edges(bm))
    bm.to_mesh(me)
    bm.free()
    me.validate(verbose=False, clean_customdata=False)
    me.update()
    log("REPAIR %-14s open %5d -> weld %5d -> %5d  splits %5d  (%.1f s, tol %.4f)" % (obj.name, b0, b1, b2, splits_total, time.time() - t0, tol))
    return b2
