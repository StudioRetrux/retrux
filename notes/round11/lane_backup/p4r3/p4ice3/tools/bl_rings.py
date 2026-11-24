# Blender (background): the ring objects' cage, modifiers, creases / bevel weights / sharp edges, and the RENDER-evaluated
# section at mid-span and at a cut end. Read-only (nothing saved).
import bpy, bmesh, math
from mathutils import Vector
names = ['Circle.027', 'Circle.025', 'Circle.028']
for nm in names:
    ob = bpy.data.objects.get(nm)
    if not ob: print('missing', nm); continue
    me = ob.data
    print(f'== {nm}: cage {len(me.vertices)} v {len(me.edges)} e {len(me.polygons)} f; rot {tuple(round(math.degrees(a),2) for a in ob.rotation_euler)} scale {tuple(ob.scale)}')
    for m in ob.modifiers:
        d = {k: getattr(m, k) for k in ('levels', 'render_levels', 'quality', 'use_limit_surface', 'use_creases', 'subdivision_type', 'boundary_smooth', 'use_custom_normals', 'angle', 'width', 'segments', 'limit_method') if hasattr(m, k)}
        print('   modifier', m.type, m.name, d, 'show_render', m.show_render, 'show_viewport', m.show_viewport)
        if m.type == 'NODES' and m.node_group:
            print('      nodes:', m.node_group.name, [n.bl_idname for n in m.node_group.nodes][:20])
            for k, v in []:
                print('      input', k, v if not hasattr(v, '__len__') or isinstance(v, str) else list(v))
    attrs = {a.name: (a.domain, a.data_type) for a in me.attributes}
    print('   attributes', attrs)
    cr = me.attributes.get('crease_edge'); bw = me.attributes.get('bevel_weight_edge'); sh = me.attributes.get('sharp_edge')
    if cr:
        vals = [cr.data[i].value for i in range(len(me.edges))]
        print('   crease_edge: nonzero', sum(1 for v in vals if v > 0), 'max', max(vals))
    if sh:
        vals = [sh.data[i].value for i in range(len(me.edges))]
        print('   sharp_edge: count', sum(vals))
    if bw:
        vals = [bw.data[i].value for i in range(len(me.edges))]
        print('   bevel_weight_edge nonzero', sum(1 for v in vals if v > 0))
    # cage section near theta of the first vertex (ring plane = local XY? find axis by PCA-lite: use bounding box)
    vs = [v.co.copy() for v in me.vertices]
    # print a few cage verts sorted by angle
    print('   cage verts (first 8):', [tuple(round(c, 4) for c in v) for v in vs[:8]])
    # evaluated (render) mesh
    dg = bpy.context.evaluated_depsgraph_get()
    for m in ob.modifiers:
        if m.type == 'SUBSURF':
            m.levels = m.render_levels
    dg.update()
    ev = ob.evaluated_get(dg)
    em = ev.to_mesh()
    print(f'   evaluated (viewport levels set to render): {len(em.vertices)} v {len(em.polygons)} f')
    # sharp edges in the evaluated mesh / face angle stats along a section: pick vertices whose angle in the ring plane is near the first vertex's
    co = [v.co.copy() for v in em.vertices]
    # ring plane: the mesh is a circle in local XY or XZ; detect the axis as the smallest-extent axis
    ext = [max(c[i] for c in co) - min(c[i] for c in co) for i in range(3)]
    ax = ext.index(min(ext)); a1, a2 = [i for i in range(3) if i != ax]
    print('   local extents', [round(e, 4) for e in ext], 'axis', 'XYZ'[ax])
    ths = [math.degrees(math.atan2(c[a2], c[a1])) for c in co]
    rs = [math.hypot(c[a1], c[a2]) for c in co]
    def station(t0, tol=0.3):
        sel = [i for i, t in enumerate(ths) if abs(((t - t0 + 180) % 360) - 180) < tol]
        rc = sum(rs[i] for i in sel) / max(1, len(sel))
        sel.sort(key=lambda i: math.atan2(co[i][ax], rs[i] - rc))
        return sel
    tmin, tmax = min(ths), max(ths)
    for lab, t0 in (('mid', ths[len(ths)//2]), ('lo', tmin), ('hi', tmax)):
        sel = station(t0)
        print(f'   section {lab} theta {t0:.2f}: ', ' '.join(f'({rs[i]:.4f},{co[i][ax]:+.4f})' for i in sel))
    # face normals around the mid station: angle between neighbouring faces across the section
    ev.to_mesh_clear()
