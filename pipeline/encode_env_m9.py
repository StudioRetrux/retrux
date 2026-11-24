# Baked environment v9: encode the compositor's linear EXR textures in the plates' encoding (audit A1 R7) and write the
# manifest. Runs with Blender's bundled python (numpy + OpenImageIO): python3.13 -I encode_env_m9.py <out> <ffmpeg> [q=92]
#   linear * 2^-2.158 -> clip 0..1 -> sRGB (Blender's Standard view) -> 16-bit PNG -> ffmpeg -sws_dither ed (8-bit, error
#   diffusion, as finalize_v7.ps1 did for the plates) -> libwebp q92, compression level 6.
# The engine decodes sRGB and multiplies by 2^2.158 = 4.4633 (PlateEnvironment uPlateGain).
# Writes <out>/png16/<file>.png, <out>/webp/<file>.webp and <out>/env_baked.json (texture paths "baked/<file>.webp").
import sys, os, json, subprocess
import numpy as np
import OpenImageIO as oiio

OUT = os.path.abspath(sys.argv[1])
FF = sys.argv[2]
FLAGS = dict(a.split("=", 1) for a in sys.argv[3:] if "=" in a)
Q = int(FLAGS.get("q", 92))
EXPO = float(FLAGS.get("expo", -2.158))
SUFFIX = FLAGS.get("suffix", "")
os.makedirs(os.path.join(OUT, "png16"), exist_ok=True)
os.makedirs(os.path.join(OUT, "webp"), exist_ok=True)
objs = json.load(open(os.path.join(OUT, "objects.json")))
man = {"version": "v9", "exposureStops": EXPO, "encoding": "srgb(linear * 2^exposureStops), 8-bit ED dither, WebP q%d" % Q,
       "objects": {}}
total = 0
for name in objs:
    src = os.path.join(OUT, "tex", name + SUFFIX + ".exr")
    if not os.path.exists(src):
        print("missing", src)
        continue
    a = oiio.ImageBuf(src).get_pixels(oiio.FLOAT)[:, :, :3]
    lin = np.clip(a * (2.0 ** EXPO), 0.0, 1.0)
    s = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1.0 / 2.4) - 0.055)
    q16 = np.ascontiguousarray(np.round(s * 65535.0).astype(np.uint16))
    fn = name.replace(" ", "_").replace(".", "_")
    png = os.path.join(OUT, "png16", fn + ".png")
    spec = oiio.ImageSpec(q16.shape[1], q16.shape[0], 3, oiio.UINT16)
    b = oiio.ImageBuf(spec)
    b.set_pixels(oiio.ROI(), q16)
    b.write(png)
    webp = os.path.join(OUT, "webp", fn + ".webp")
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", png, "-sws_dither", "ed", "-vf", "format=rgb24",
                    "-c:v", "libwebp", "-quality", str(Q), "-compression_level", "6", webp], check=True)
    sz = os.path.getsize(webp)
    total += sz
    node = "".join(ch for ch in name.replace(" ", "_") if ch not in ".:/[]")      # three's GLTFLoader node name
    rec = {"node": node, "texture": "baked/" + fn + ".webp", "size": [q16.shape[1], q16.shape[0]], "bytes": sz}
    cp = os.path.join(OUT, "comp", name + ".json")
    if os.path.exists(cp):
        c = json.load(open(cp))
        rec.update({k: c[k] for k in ("shares", "fill", "gap_of_seen") if k in c})
    man["objects"][name] = rec
    print("%-20s %5dx%-5d %8.1f KB" % (name, q16.shape[1], q16.shape[0], sz / 1024.0))
man["textureBytes"] = total
json.dump(man, open(os.path.join(OUT, "env_baked.json"), "w"), indent=1)
print("TOTAL textures %.1f KB (%.2f MB), %d objects" % (total / 1024.0, total / 1048576.0, len(man["objects"])))
