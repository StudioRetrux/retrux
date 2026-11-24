import sys, os
from PIL import Image
d = sys.argv[1]
names = ["left", "right", "bottom_left", "bottom_right", "top_left", "top_right"]
ims = [Image.open(os.path.join(d, "ptr_%s.png" % n)).convert("RGB") for n in names]
w, h = ims[0].size
tw, th = w // 2, h // 2
sheet = Image.new("RGB", (tw * 2, th * 3))
for i, im in enumerate(ims):
    sheet.paste(im.resize((tw, th), Image.LANCZOS), ((i % 2) * tw, (i // 2) * th))
sheet.save(os.path.join(d, "sheet_on.jpg"), quality=90)
print(w, h)
