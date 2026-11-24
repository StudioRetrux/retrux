import sys, os
from PIL import Image
d = sys.argv[1]
names = ["left", "right", "top_right", "bottom_left"]
ims = [Image.open(os.path.join(d, "ptr_%s.png" % n)).convert("RGB") for n in names if os.path.exists(os.path.join(d, "ptr_%s.png" % n))]
w, h = ims[0].size
tw, th = w // 2, h // 2
s = Image.new("RGB", (tw * 2, th * 2))
for i, im in enumerate(ims):
    s.paste(im.resize((tw, th), Image.LANCZOS), ((i % 2) * tw, (i // 2) * th))
s.save(os.path.join(d, "sheet.jpg"), quality=90)
