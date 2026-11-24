# Read-only inventory of plate_scene_v7.blend for the UV bake rebuild: per mesh object its mesh stats, UV layers, modifiers,
# materials (node types, image textures, volume / emission / transmission use), visibility flags; the world; the render
# settings (engine, samples, view transform, exposure, film). Never saves.
#   blender -b plate_scene_v7.blend --python inspect_env_v7.py -- <out.json>
import bpy, json, sys
from mathutils import Vector

out = sys.argv[sys.argv.index("--") + 1]
CAM = Vector((0.23183887899931777, -11.787528905312952, 2.903973052988094))
rows = []
for o in bpy.data.objects:
    r = {"name": o.name, "type": o.type, "hide_render": o.hide_render, "parent": o.parent.name if o.parent else None,
         "scale": [round(v, 4) for v in o.scale], "loc": [round(v, 3) for v in o.matrix_world.translation]}
    if o.type == 'MESH':
        me = o.data
        r["mesh"] = me.name
        r["users"] = me.users
        r["verts"] = len(me.vertices)
        r["polys"] = len(me.polygons)
        r["uv_layers"] = [u.name for u in me.uv_layers]
        r["modifiers"] = [(m.name, m.type) for m in o.modifiers]
        cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
        r["bbox_min"] = [round(min(c[i] for c in cs), 2) for i in range(3)]
        r["bbox_max"] = [round(max(c[i] for c in cs), 2) for i in range(3)]
        ctr = sum(cs, Vector()) / 8
        r["dist_rest_cam"] = round((ctr - CAM).length, 1)
        mats = []
        for slot in o.material_slots:
            m = slot.material
            if not m:
                mats.append(None)
                continue
            info = {"name": m.name, "users": m.users}
            if m.use_nodes and m.node_tree:
                types = sorted({n.type for n in m.node_tree.nodes})
                info["nodes"] = types
                imgs = [n.image.name + (" (%dx%d)" % tuple(n.image.size) if n.image else "") for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]
                info["images"] = imgs
                outn = [n for n in m.node_tree.nodes if n.type == 'OUTPUT_MATERIAL']
                if outn:
                    o0 = outn[0]
                    info["surface_linked"] = o0.inputs['Surface'].is_linked
                    info["volume_linked"] = o0.inputs['Volume'].is_linked
            mats.append(info)
        r["materials"] = mats
    rows.append(r)
sc = bpy.context.scene
w = sc.world
world = None
if w and w.use_nodes:
    world = {"name": w.name, "nodes": sorted({n.type for n in w.node_tree.nodes}),
             "images": [n.image.name for n in w.node_tree.nodes if n.type in ('TEX_ENVIRONMENT', 'TEX_IMAGE') and n.image]}
render = {"engine": sc.render.engine, "res": [sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage],
          "view_transform": sc.view_settings.view_transform, "look": sc.view_settings.look, "exposure": sc.view_settings.exposure,
          "gamma": sc.view_settings.gamma, "camera": sc.camera.name if sc.camera else None}
try:
    render["samples"] = sc.cycles.samples
    render["device"] = sc.cycles.device
    render["bake_type"] = sc.cycles.bake_type
except Exception as e:
    render["cycles_err"] = str(e)
with open(out, "w", encoding="utf-8") as f:
    json.dump({"objects": rows, "world": world, "render": render, "cameras": [o.name for o in bpy.data.objects if o.type == 'CAMERA']}, f, indent=1)
print("INSPECT_DONE", len(rows), "objects ->", out)
