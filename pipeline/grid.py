"""Grid of images with labels. usage: grid.py <out.png> <cols> <scale> <img1> [<img2> ...]"""
import sys
import numpy as np
from PIL import Image, ImageDraw

out, cols, k = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
ims = []
for p in sys.argv[4:]:
    im = Image.open(p).convert("RGB")
    im = im.resize((int(im.width * k), int(im.height * k)), Image.NEAREST if k >= 1 else Image.LANCZOS)
    dr = ImageDraw.Draw(im)
    label = p.replace("\\", "/").split("/")[-1]
    dr.rectangle((0, 0, 7 * len(label) + 6, 13), fill=(0, 0, 0))
    dr.text((3, 1), label, fill=(255, 255, 0))
    ims.append(np.asarray(im))
h = max(i.shape[0] for i in ims)
w = max(i.shape[1] for i in ims)
rows = []
for r in range(0, len(ims), cols):
    row = [np.pad(i, ((0, h - i.shape[0]), (0, w - i.shape[1]), (0, 0))) for i in ims[r:r + cols]]
    while len(row) < cols:
        row.append(np.zeros((h, w, 3), np.uint8))
    rows.append(np.concatenate(row, axis=1))
Image.fromarray(np.concatenate(rows, axis=0)).save(out)
print(out)
