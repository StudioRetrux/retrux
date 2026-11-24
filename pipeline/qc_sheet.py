import sys, os
from PIL import Image
d = sys.argv[1]
names = ["q00_rest", "q01_loop15", "q02_loop30", "q03_eye", "p04_expand_pop", "p05_expand", "p06_sustain", "p07_release_snap", "p08_release_home"]
ims = [Image.open(os.path.join(d, "cmp_%s.jpg" % n)).convert("RGB") for n in names if os.path.exists(os.path.join(d, "cmp_%s.jpg" % n))]
w, h = ims[0].size
tw, th = w // 3, h // 3
sheet = Image.new("RGB", (tw * 3, th * 3))
for i, im in enumerate(ims[:9]):
    sheet.paste(im.resize((tw, th), Image.LANCZOS), ((i % 3) * tw, (i // 3) * th))
sheet.save(os.path.join(d, "sheet.jpg"), quality=90)
print(sheet.size)
