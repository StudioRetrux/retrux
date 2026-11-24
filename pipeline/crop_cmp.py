"""Side-by-side crops of the same region from several frames (labels drawn on top).
usage: crop_cmp.py <out.png> <x> <y> <w> <h> <scale> <img1> [<img2> ...]"""
import sys
import numpy as np
from PIL import Image, ImageDraw

out = sys.argv[1]
x, y, w, h = (int(v) for v in sys.argv[2:6])
k = float(sys.argv[6])
paths = sys.argv[7:]
tiles = []
for p in paths:
    im = Image.open(p).convert("RGB").crop((x, y, x + w, y + h))
    im = im.resize((int(w * k), int(h * k)), Image.NEAREST if k >= 2 else Image.LANCZOS)
    dr = ImageDraw.Draw(im)
    label = p.replace("\\", "/").split("/")[-2] + "/" + p.replace("\\", "/").split("/")[-1]
    dr.rectangle((0, 0, 8 * len(label) + 6, 14), fill=(0, 0, 0))
    dr.text((3, 1), label, fill=(255, 255, 0))
    tiles.append(np.asarray(im))
row = np.concatenate(tiles, axis=1)
Image.fromarray(row).save(out)
print(out, row.shape)
