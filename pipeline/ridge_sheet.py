import sys, os
from PIL import Image
d = sys.argv[1]
ims = []
for n in ["left", "right", "top_right"]:
    p = os.path.join(d, "ptr_%s.png" % n)
    if os.path.exists(p):
        ims.append(Image.open(p).convert("RGB").crop((0, 230, 480, 470)))
s = Image.new("RGB", (480 * len(ims), 240))
for i, im in enumerate(ims):
    s.paste(im, (i * 480, 0))
s = s.resize((s.width * 2 // 2 * 1, 240))
s.save(os.path.join(d, "ridge_sheet.jpg"), quality=92)
print(len(ims))
