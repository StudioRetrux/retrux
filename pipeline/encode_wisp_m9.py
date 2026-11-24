# Baked environment v9 (round 11, step 2): the summit wisp card for the engine, after encode_env_m9.py.
# The v9 bake of BG.001 and V2_Massif is recomposited from plates with the wisp removed (render_plates_m9.py ... nowisp crop,
# patched into copies of the plates), so the wisp is drawn by the engine from this card instead (PlateEnvironment BAKED_WISP).
#   BPY -I encode_wisp_m9.py <bakeDir> <wisp_card.exr> <wisp_card.json> [keep=<dir of the previous webps>] [objs=BG.001,V2_Massif]
# - writes <bakeDir>/wisp_card.exr: the card (render_sky_equirect.py: premultiplied scene-linear RGBA, alpha = 1 - transmittance,
#   rendered from the rest plate camera at the plates' texel density) as half float, ZIP;
# - adds "wisp" to <bakeDir>/env_baked.json: the card file and its world quad (three.js, corners bl, br, tl, tr);
# - with keep=: copies the previous textures of `objs` (the ones that still contain the wisp) to <bakeDir>/webp/<file>_v9g.webp
#   and records them as "textureWithWisp", so `?envwisp=0` restores step 1's look exactly (no card, the old textures).
import sys, os, json, shutil
import numpy as np
import OpenImageIO as oiio

OUT = os.path.abspath(sys.argv[1])
CARD, META = sys.argv[2], sys.argv[3]
FLAGS = dict(a.split("=", 1) for a in sys.argv[4:] if "=" in a)
KEEP = FLAGS.get("keep")
OBJS = [n for n in FLAGS.get("objs", "BG.001,V2_Massif").split(",") if n]

a = oiio.ImageBuf(CARD).get_pixels(oiio.FLOAT)
assert a.shape[2] == 4, "the card must be RGBA"
spec = oiio.ImageSpec(a.shape[1], a.shape[0], 4, oiio.HALF)
spec.channelnames = ("R", "G", "B", "A")
spec.attribute("compression", "zip")
b = oiio.ImageBuf(spec)
b.set_pixels(oiio.ROI(), np.ascontiguousarray(a.astype(np.float32)))
dst = os.path.join(OUT, "wisp_card.exr")
b.write(dst)
meta = json.load(open(META))
border = max(float(np.abs(a[:2]).max()), float(np.abs(a[-2:]).max()), float(np.abs(a[:, :2]).max()), float(np.abs(a[:, -2:]).max()))
man_p = os.path.join(OUT, "env_baked.json")
man = json.load(open(man_p))
man["wisp"] = {
    "card": "wisp_card.exr",
    "size": [a.shape[1], a.shape[0]],
    "quad": meta["quad_three_bl_br_tl_tr"],
    "restBox": meta["rest_frame_box_px_from_top"],
    "alphaMax": round(float(a[..., 3].max()), 4),
    "bytes": os.path.getsize(dst),
    "note": "premultiplied scene-linear RGBA, alpha = 1 - transmittance; composited over the baked texel before the grade",
}
if KEEP:
    for name in OBJS:
        rec = man["objects"][name]
        fn = os.path.basename(rec["texture"])[:-5]
        old = os.path.join(KEEP, fn + ".webp")
        new = os.path.join(OUT, "webp", fn + "_v9g.webp")
        shutil.copyfile(old, new)
        rec["textureWithWisp"] = "baked/" + fn + "_v9g.webp"
        rec["bytesWithWisp"] = os.path.getsize(new)
json.dump(man, open(man_p, "w"), indent=1)
print(json.dumps({"card": dst, "bytes": os.path.getsize(dst), "size": man["wisp"]["size"], "alphaMax": man["wisp"]["alphaMax"],
                  "border_max": border, "keep": OBJS if KEEP else []}))
