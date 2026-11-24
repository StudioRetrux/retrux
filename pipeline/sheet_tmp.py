import sys
from PIL import Image
d = sys.argv[1]
names = ["on", "occ_off", "occ_off_refl_off"]
ims = [Image.open(f"{d}/streak_{n}.png").convert("RGB") for n in names]
w, h = ims[0].size
sheet = Image.new("RGB", (w, h * 3))
for i, im in enumerate(ims):
    sheet.paste(im, (0, i * h))
sheet.save(f"{d}/streak_sheet.jpg", quality=92)
