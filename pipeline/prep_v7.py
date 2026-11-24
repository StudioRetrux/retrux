# v6 (2026-11-13): the same scene as prep_v3 except for the split. prep_v3 deleted the VERTICES on either side of
# SPLIT_Y (dropping the strip of faces across the cut from both halves) and then turned the massif rigidly: along the cut
# the plates showed a gap onto terrain 130 m away (dark) and the massif's cut foot as a flat ledge (yellowish), which the
# engine drew as a pale, stair-stepped "Z" at the massif's base (rest frame ~255-355, 380-405; worse in cursor orbits).
# Now the faces are split by centroid (both halves keep the shared boundary loop) and the massif's turn fades in with
# depth from that loop (0 on it, full BLEND_Y metres beyond), so the foot bends continuously into the ridge's foot.
# Environment v2 for the plate (never touches the source .blend). From the decimated plate scene:
#  - splits the far-left range (Object_2.008) into the dark near ridge (world y < SPLIT_Y) and the massif, and
#    turns only the massif about the rest camera so it lands where the reference has it: its right summit tip
#    (335, 220) -> (290, 210) and left shoulder (160, 300) -> (105, 295) at 1440x766, i.e. ~45 px left, ~10 px up
#    (the left tip hides in the reference's summit wisp);
#  - adds volumetric mist over the far shore / mountain feet (height falloff x billowy noise);
#  - adds a soft wisp on the left summit tip;
# then saves a copy.
#   blender -b <plate_scene.blend> --python prep_v2.py -- <out.blend> [yaw pitch mistD wispD]
import bpy, bmesh, math, sys
from mathutils import Matrix, Vector, kdtree

args = sys.argv[sys.argv.index("--") + 1:]
OUT = args[0]
YAW = float(args[1]) if len(args) > 1 else 1.53
PITCH = float(args[2]) if len(args) > 2 else 0.34
MIST_D = float(args[3]) if len(args) > 3 else 0.038
WISP_D = float(args[4]) if len(args) > 4 else 0.4
SPLIT_Y = 88.0

CAM = Vector((0.23183887899931777, -11.787528905312952, 2.903973052988094))
CAM_YAW = math.radians(0.672220988573093)

# ---- 1. split the range: ridge (near, kept) and massif (moved)
src = bpy.data.objects["Object_2.008"]
massif = src.copy()
massif.data = src.data.copy()
massif.name = "V2_Massif"
for c in src.users_collection:
    c.objects.link(massif)
src.name = "V2_Ridge"


BLEND_Y = 12.0


def keep_faces(obj, pred):
    # By face centroid: both halves keep the boundary loop along the cut (deleting vertices dropped the faces across it
    # from both and opened a gap).
    mw = obj.matrix_world
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    drop = [f for f in bm.faces if not pred(mw @ f.calc_center_median())]
    bmesh.ops.delete(bm, geom=drop, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()
    return len(obj.data.vertices)


nr = keep_faces(src, lambda p: p.y < SPLIT_Y)
nm = keep_faces(massif, lambda p: p.y >= SPLIT_Y)
print("V2 split ridge %d verts, massif %d verts" % (nr, nm))

right = Vector((math.cos(CAM_YAW), math.sin(CAM_YAW), 0.0))     # camera +X in world (yaw about Z)


def turn(k):
    return (Matrix.Translation(CAM) @ Matrix.Rotation(math.radians(PITCH * k), 4, right)
            @ Matrix.Rotation(math.radians(YAW * k), 4, 'Z') @ Matrix.Translation(-CAM))


R = turn(1.0)
# Per-vertex turn faded by the distance to the cut: the seam = the massif's boundary vertices that coincide with the
# ridge's boundary vertices (the shared loop; other open edges of the mesh are not the cut); 0 on it, full BLEND_Y m away.
rmw = src.matrix_world
rbm = bmesh.new()
rbm.from_mesh(src.data)
rb = [rmw @ v.co for v in rbm.verts if any(e.is_boundary for e in v.link_edges)]
rbm.free()
kd = kdtree.KDTree(len(rb))
for i, p in enumerate(rb):
    kd.insert(p, i)
kd.balance()
mw = massif.matrix_world.copy()
mwi = mw.inverted()
bm = bmesh.new()
bm.from_mesh(massif.data)
seam = set()
seam_pts = []
for v in bm.verts:
    if any(e.is_boundary for e in v.link_edges):
        w = mw @ v.co
        _co, _i, dist = kd.find(w)
        if dist is not None and dist < 1e-3:
            seam.add(v.index)
            seam_pts.append(w)
kd2 = kdtree.KDTree(max(len(seam_pts), 1))
for i, p in enumerate(seam_pts):
    kd2.insert(p, i)
kd2.balance()
nfull = npart = 0
ys = [p.y for p in seam_pts]
for v in bm.verts:
    w = mw @ v.co
    if v.index in seam:
        k = 0.0
    elif seam_pts:
        _co, _i, d = kd2.find(w)
        t = min(d / BLEND_Y, 1.0)
        k = t * t * (3.0 - 2.0 * t)
    else:
        k = 1.0
    if k >= 1.0:
        nfull += 1
    elif k > 0.0:
        npart += 1
    v.co = mwi @ (turn(k) @ w)
bm.normal_update()
bm.to_mesh(massif.data)
bm.free()
massif.data.update()
print("V2 massif turned yaw %.3f pitch %.3f, seam %d verts (y %.2f..%.2f), full %d, partial %d" % (
    YAW, PITCH, len(seam), min(ys or [0]), max(ys or [0]), nfull, npart))

# v7: the far-left ridge stood ~20 px too tall at rest (peak y 257 vs F000's 277 at 1440x766; QC round 8: "crest too tall,
# heavy"): its heights scale by RIDGE_S about the lake (z 0), faded with the same screen-angle mask as its rock material
# (t = (x - camX) / (y - camY): full below -0.37, none above -0.30), so the foothills in front of the massif keep theirs.
RIDGE_S = float(args[5]) if len(args) > 5 else 0.9
rbm2 = bmesh.new()
rbm2.from_mesh(src.data)
rmw2 = src.matrix_world
rmwi2 = rmw2.inverted()
nsc = 0
# Not along the cut: the loop shared with the massif keeps its height (scaled, it opened a dark crack across the massif's
# foot), fading in over BLEND_Y m (seam_pts: the massif's copy of that loop, still unturned on the seam).
for v in rbm2.verts:
    w = rmw2 @ v.co
    tt = (w.x - CAM.x) / max(w.y - CAM.y, 1e-3)
    u = min(max((tt - (-0.37)) / ((-0.30) - (-0.37)), 0.0), 1.0)
    ds = 1.0
    if seam_pts:
        _co, _i, dd = kd2.find(w)
        ds = min(dd / BLEND_Y, 1.0)
        ds = ds * ds * (3.0 - 2.0 * ds)
    f = 1.0 - (1.0 - RIDGE_S) * (1.0 - u * u * (3.0 - 2.0 * u)) * ds
    if f < 0.9999 and w.z > 0.0:
        w.z *= f
        v.co = rmwi2 @ w
        nsc += 1
rbm2.normal_update()
rbm2.to_mesh(src.data)
rbm2.free()
src.data.update()
print("V7 ridge heights x%.3f on %d verts (left of the screen-angle mask)" % (RIDGE_S, nsc))
# Left summit tip (original world (-30.59, 105.24, 14.58)) after the move, for the wisp.
tip_left = R @ Vector((-30.587641823423915, 105.24241101271065, 14.57819287939651))
print("V2 left tip at", tuple(round(v, 2) for v in tip_left))


def volume_material(name, density, height_lo, height_hi, noise_scale, color, aniso, near_y=None, remap=(0.32, 0.72, 0.15, 1.5),
                    ellipsoid=False, glow=0.0, side_fade=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Color"].default_value = (*color, 1.0)
    pv.inputs["Anisotropy"].default_value = aniso
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    hr = nt.nodes.new("ShaderNodeMapRange")
    hr.interpolation_type = 'SMOOTHSTEP'
    hr.inputs["From Min"].default_value = height_lo
    hr.inputs["From Max"].default_value = height_hi
    hr.inputs["To Min"].default_value = 1.0
    hr.inputs["To Max"].default_value = 0.0
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.noise_dimensions = '3D'
    nz.inputs["Scale"].default_value = noise_scale
    nz.inputs["Detail"].default_value = 4.0
    nz.inputs["Roughness"].default_value = 0.55
    nt.links.new(geo.outputs["Position"], nz.inputs["Vector"])
    # Billowy top: the height the falloff sees is pushed up / down by the same noise (a flat layer seen edge-on
    # drew a ruler-straight band across the far shore).
    zoff = nt.nodes.new("ShaderNodeMath")
    zoff.operation = 'MULTIPLY_ADD'
    zoff.inputs[1].default_value = -(height_hi - height_lo) * 0.9
    zoff.inputs[2].default_value = (height_hi - height_lo) * 0.45
    nt.links.new(nz.outputs["Fac"], zoff.inputs[0])
    zsum = nt.nodes.new("ShaderNodeMath")
    zsum.operation = 'ADD'
    nt.links.new(sep.outputs["Z"], zsum.inputs[0])
    nt.links.new(zoff.outputs[0], zsum.inputs[1])
    nt.links.new(zsum.outputs[0], hr.inputs["Value"])
    nr_ = nt.nodes.new("ShaderNodeMapRange")
    nr_.interpolation_type = 'SMOOTHSTEP'
    nr_.inputs["From Min"].default_value = remap[0]
    nr_.inputs["From Max"].default_value = remap[1]
    nr_.inputs["To Min"].default_value = remap[2]
    nr_.inputs["To Max"].default_value = remap[3]
    nt.links.new(nz.outputs["Fac"], nr_.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = 'MULTIPLY'
    nt.links.new(hr.outputs["Result"], mul.inputs[0])
    nt.links.new(nr_.outputs["Result"], mul.inputs[1])
    last = mul
    if near_y is not None:
        yr = nt.nodes.new("ShaderNodeMapRange")
        yr.interpolation_type = 'SMOOTHSTEP'
        yr.inputs["From Min"].default_value = near_y[0]
        yr.inputs["From Max"].default_value = near_y[1]
        yr.inputs["To Min"].default_value = 0.0
        yr.inputs["To Max"].default_value = 1.0
        nt.links.new(sep.outputs["Y"], yr.inputs["Value"])
        mul2 = nt.nodes.new("ShaderNodeMath")
        mul2.operation = 'MULTIPLY'
        nt.links.new(mul.outputs[0], mul2.inputs[0])
        nt.links.new(yr.outputs["Result"], mul2.inputs[1])
        last = mul2
    if ellipsoid:
        # Soft ellipsoid inside the box (generated coordinates 0..1): no box faces in the render.
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sub = nt.nodes.new("ShaderNodeVectorMath")
        sub.operation = 'SUBTRACT'
        sub.inputs[1].default_value = (0.5, 0.5, 0.5)
        nt.links.new(tc.outputs["Generated"], sub.inputs[0])
        ln = nt.nodes.new("ShaderNodeVectorMath")
        ln.operation = 'LENGTH'
        nt.links.new(sub.outputs[0], ln.inputs[0])
        er = nt.nodes.new("ShaderNodeMapRange")
        er.interpolation_type = 'SMOOTHSTEP'
        er.inputs["From Min"].default_value = 0.18
        er.inputs["From Max"].default_value = 0.5
        er.inputs["To Min"].default_value = 1.0
        er.inputs["To Max"].default_value = 0.0
        nt.links.new(ln.outputs["Value"], er.inputs["Value"])
        mul3 = nt.nodes.new("ShaderNodeMath")
        mul3.operation = 'MULTIPLY'
        nt.links.new(last.outputs[0], mul3.inputs[0])
        nt.links.new(er.outputs["Result"], mul3.inputs[1])
        last = mul3
    if side_fade:
        # Fade towards the box's right (+x) and far (+y) faces (generated coordinates 0..1): a volume cut off at a
        # box face drew a hard-edged white sheet where the line of sight ran along it.
        tc2 = nt.nodes.new("ShaderNodeTexCoord")
        sx = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc2.outputs["Generated"], sx.inputs[0])
        fx = nt.nodes.new("ShaderNodeMapRange")
        fx.interpolation_type = 'SMOOTHSTEP'
        fx.inputs["From Min"].default_value = 0.72
        fx.inputs["From Max"].default_value = 1.0
        fx.inputs["To Min"].default_value = 1.0
        fx.inputs["To Max"].default_value = 0.0
        nt.links.new(sx.outputs["X"], fx.inputs["Value"])
        fy = nt.nodes.new("ShaderNodeMapRange")
        fy.interpolation_type = 'SMOOTHSTEP'
        fy.inputs["From Min"].default_value = 0.75
        fy.inputs["From Max"].default_value = 1.0
        fy.inputs["To Min"].default_value = 1.0
        fy.inputs["To Max"].default_value = 0.0
        nt.links.new(sx.outputs["Y"], fy.inputs["Value"])
        m4 = nt.nodes.new("ShaderNodeMath")
        m4.operation = 'MULTIPLY'
        nt.links.new(fx.outputs["Result"], m4.inputs[0])
        nt.links.new(fy.outputs["Result"], m4.inputs[1])
        m5 = nt.nodes.new("ShaderNodeMath")
        m5.operation = 'MULTIPLY'
        nt.links.new(last.outputs[0], m5.inputs[0])
        nt.links.new(m4.outputs[0], m5.inputs[1])
        last = m5
    dens = nt.nodes.new("ShaderNodeMath")
    dens.operation = 'MULTIPLY'
    dens.inputs[1].default_value = density
    nt.links.new(last.outputs[0], dens.inputs[0])
    nt.links.new(dens.outputs[0], pv.inputs["Density"])
    if glow > 0.0:
        # Multiple scattering stand-in (the plate renders single scattering only): emission proportional to the
        # density, so a thick veil tends to a bright radiance of ~glow (sky ~2.3, sunlit snow ~3-4 here).
        em = nt.nodes.new("ShaderNodeMath")
        em.operation = 'MULTIPLY'
        em.inputs[1].default_value = glow
        nt.links.new(dens.outputs[0], em.inputs[0])
        nt.links.new(em.outputs[0], pv.inputs["Emission Strength"])
        pv.inputs["Emission Color"].default_value = (0.9, 0.93, 1.0, 1.0)
    nt.links.new(pv.outputs["Volume"], out.inputs["Volume"])
    return mat


def box(name, lo, hi, mat):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2)
    o.scale = (hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2])
    o.data.materials.append(mat)
    o.visible_shadow = False
    return o


# ---- 2. base mist over the far shore and the mountain feet (the massif's summit is ~15 m above the lake at
# ~115 m: the mist lies in the lowest ~4-5 m), fading in beyond ~50 m (no mist on the near lake)
# v3 (QC round 6: the band was too bright, ~35-40 px too high, with a level top): lower (3.2 m), a bluer and dimmer
# glow (1.5), thinner (MIST_D default 0.038), so the slopes and the snowfield show through as in F000.
mist = volume_material("V2_BaseMist", MIST_D, 0.2, 3.2, 0.05, (0.74, 0.82, 0.96), 0.25, near_y=(48.0, 85.0), glow=1.5,
                       remap=(0.3, 0.75, 0.05, 1.6), side_fade=True)
# Only the left massif's feet (x < -5, out to y ~150). The camera sits at the layer's height, so its line of sight
# runs 100+ m through the layer towards the far shore: across the centre and right it piled up into an opaque white
# wall hiding the far range behind the iceberg (the reference keeps it readable; the shader's thin far-shore band
# covers that part).
box("V2_BaseMist", (-190.0, 40.0, -3.0), (15.0, 150.0, 8.0), mist)

# ---- 3. summit wisp over the left tip, trailing left and a little down (F000 / Figma)
wisp = volume_material("V2_SummitWisp", WISP_D, tip_left.z - 7.0, tip_left.z + 3.0, 0.45, (0.9, 0.93, 0.98), 0.3,
                       remap=(0.42, 0.72, 0.0, 1.3), ellipsoid=True, glow=2.3)
wc = tip_left + Vector((-1.0, 0.0, -2.2))
box("V2_SummitWisp", (wc.x - 6.5, wc.y - 3.0, wc.z - 3.0), (wc.x + 3.0, wc.y + 3.0, wc.z + 3.2), wisp)

bpy.context.scene.cycles.volume_step_rate = 4.0
bpy.context.scene.cycles.volume_max_steps = 256
bpy.ops.wm.save_as_mainfile(filepath=OUT, copy=True, compress=False)
print("V7_DONE", OUT)
