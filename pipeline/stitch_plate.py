# Joins the border strips plate_rest_s0..s{n-1}.exr (s0 = bottom, overlapping by a few rows) into
# plate_rest.exr and plate_rest.png (16-bit, Standard view, fixed exposure). Runs without the .blend:
#   blender -b --factory-startup --python stitch_plate.py -- <OUT_DIR> <n>
import bpy, json, os, sys
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
OUT, N = args[0], int(args[1])


def load(name):
    img = bpy.data.images.load(os.path.join(OUT, name))
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)   # row 0 = bottom of the image


infos = [json.load(open(os.path.join(OUT, "plate_rest_s%d.json" % i), encoding="utf-8")) for i in range(N)]
FULL_W, FULL_H = infos[0]["full_width"], infos[0]["full_height"]
expo = infos[0]["png_exposure_stops"]
full = np.zeros((FULL_H, FULL_W, 4), dtype=np.float32)
covered_to = 0                    # rows [0, covered_to) already written
for i, info in enumerate(infos):
    s = load("plate_rest_s%d.exr" % i)
    h = s.shape[0]
    assert s.shape[1] == FULL_W, (i, s.shape, FULL_W)
    y0 = FULL_H - h if i == N - 1 else int(round(info["border_y"][0] * FULL_H))
    y1 = y0 + h
    ov = max(0, covered_to - y0)  # rows shared with the strip below
    if ov > 0:
        w = np.linspace(0.0, 1.0, ov, dtype=np.float32)[:, None, None]
        full[y0:y0 + ov] = full[y0:y0 + ov] * (1.0 - w) + s[:ov] * w
    full[y0 + ov:y1] = s[ov:]
    covered_to = y1
    print("strip", i, "rows", y0, y1, "overlap", ov)
    del s
assert covered_to == FULL_H, covered_to

img = bpy.data.images.new("plate_rest", FULL_W, FULL_H, alpha=True, float_buffer=True)
img.pixels.foreach_set(full.ravel())
scene = bpy.context.scene
st = scene.render.image_settings
st.file_format = 'OPEN_EXR'
st.color_mode = 'RGBA'
st.color_depth = '16'
st.exr_codec = 'ZIP'
img.save_render(os.path.join(OUT, "plate_rest.exr"), scene=scene)
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = expo
scene.view_settings.gamma = 1.0
st.file_format = 'PNG'
st.color_mode = 'RGBA'
st.color_depth = '16'
st.compression = 15
img.save_render(os.path.join(OUT, "plate_rest.png"), scene=scene)
info = dict(infos[0])
info.update({"name": "plate_rest", "width": FULL_W, "height": FULL_H, "border_y": None,
             "stitched_from": ["plate_rest_s%d.exr" % i for i in range(N)]})
with open(os.path.join(OUT, "plate_rest.json"), "w", encoding="utf-8") as f:
    json.dump(info, f, indent=1)
print("STITCH_DONE")
