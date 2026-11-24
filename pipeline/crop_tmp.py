import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
c = im.crop((560, 560, 1240, 766))
c = c.resize((c.width * 2, c.height * 2), Image.LANCZOS)
c.save(out, quality=92)
