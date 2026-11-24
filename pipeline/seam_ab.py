import sys
from PIL import Image
d = sys.argv[1]
a = Image.open(d + "/seam_normal.png").convert("RGB").crop((60, 10, 300, 170))
b = Image.open(d + "/seam_debug.png").convert("RGB").crop((60, 10, 300, 170))
s = Image.new("RGB", (480 * 2, 320))
s.paste(a.resize((480, 320), Image.NEAREST), (0, 0)); s.paste(b.resize((480, 320), Image.NEAREST), (480, 0))
s.save(d + "/seam_ab.jpg", quality=92)
