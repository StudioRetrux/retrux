import sys
import numpy as np
from PIL import Image, ImageDraw
d = sys.argv[1]
names = ["rest", "left", "right", "bottom", "bottom_left", "bottom_right", "top_left", "top_right"]
rows = []
for n in names:
    im = Image.open("%s/ptr_%s.png" % (d, n)).convert("RGB")
    s = im.crop((0, 560, 1440, 766)).resize((960, 137), Image.LANCZOS)
    dr = ImageDraw.Draw(s)
    dr.rectangle((0, 0, 90, 12), fill=(0, 0, 0))
    dr.text((3, 0), n, fill=(255, 255, 0))
    rows.append(np.asarray(s))
Image.fromarray(np.concatenate(rows[:4], 0)).save(d + "/strips_a.png")
Image.fromarray(np.concatenate(rows[4:], 0)).save(d + "/strips_b.png")
print("ok")
