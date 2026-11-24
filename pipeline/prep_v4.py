# Environment v5 for the plates (never touches the source .blend): from plate_scene_v3.blend (v3 = the lower / dimmer /
# bluer base mist), the far-left part of the near ridge (V2_Ridge) turns into a dark slate-navy rock, so the plate itself
# carries the reference's shadowed ridge (F000 x 0-115 of 1440: top ~31,51,82, overall ~52,78,111). Until now the plate
# lit it like the other snowy mountains and a shader overlay painted it navy, which misregistered whenever the camera
# moved: white tear slivers, a doubled crest, a light fringe (QC round 7, both glitch hunters).
# The ridge mesh also holds the snowy foothills in front of the massif (F000: a light misty snowfield), so the rock only
# takes over left of a screen-angle line from the rest camera: (x - camX) / (y - camY) below MASK_LO..MASK_HI.
#   blender -b plate_scene_v3.blend --python prep_v4.py -- <out.blend> [mask_lo mask_hi]
import bpy, sys

args = sys.argv[sys.argv.index("--") + 1:]
OUT = args[0]
MASK_LO = float(args[1]) if len(args) > 1 else -0.34   # fully rock left of this tan(angle)
MASK_HI = float(args[2]) if len(args) > 2 else -0.27   # untouched right of this
DARK = (0.012, 0.024, 0.052)
LIGHT = (0.046, 0.075, 0.130)
CAMX, CAMY = 0.2318, -11.7875

ridge = bpy.data.objects["V2_Ridge"]
done = set()
for slot in ridge.material_slots:
    src = slot.material
    if src is None or src.name in done:
        continue
    mat = src.copy()
    mat.name = "V5_" + src.name
    slot.link = 'DATA' if slot.link == 'DATA' else slot.link
    slot.material = mat
    done.add(mat.name)
    nt = mat.node_tree
    out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output), None) or \
        next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    surf = out.inputs["Surface"]
    orig = surf.links[0].from_socket if surf.links else None
    # Dark rock.
    rock = nt.nodes.new("ShaderNodeBsdfPrincipled")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 0.35
    noise.inputs["Detail"].default_value = 8.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (*DARK, 1.0)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (*LIGHT, 1.0)
    nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], rock.inputs["Base Color"])
    rock.inputs["Roughness"].default_value = 0.9
    # Screen-angle mask from the rest camera: t = (x - camX) / (y - camY).
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs["Vector"])
    sx = nt.nodes.new("ShaderNodeMath"); sx.operation = 'SUBTRACT'; sx.inputs[1].default_value = CAMX
    sy = nt.nodes.new("ShaderNodeMath"); sy.operation = 'SUBTRACT'; sy.inputs[1].default_value = CAMY
    nt.links.new(sep.outputs["X"], sx.inputs[0])
    nt.links.new(sep.outputs["Y"], sy.inputs[0])
    dv = nt.nodes.new("ShaderNodeMath"); dv.operation = 'DIVIDE'
    nt.links.new(sx.outputs[0], dv.inputs[0])
    nt.links.new(sy.outputs[0], dv.inputs[1])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = MASK_LO
    mr.inputs["From Max"].default_value = MASK_HI
    mr.inputs["To Min"].default_value = 1.0
    mr.inputs["To Max"].default_value = 0.0
    mr.clamp = True
    nt.links.new(dv.outputs[0], mr.inputs["Value"])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(mr.outputs["Result"], mix.inputs["Fac"])
    if orig is not None:
        nt.links.new(orig, mix.inputs[1])
    nt.links.new(rock.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], surf)
    print("V5 ridge material", mat.name, "orig", orig.node.name if orig else None)
print("V5 mask", MASK_LO, MASK_HI, "slots", len(ridge.material_slots))
bpy.ops.wm.save_as_mainfile(filepath=OUT, copy=True, compress=False)
print("V5_DONE", OUT)

