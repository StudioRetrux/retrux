import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGB")
c = im.crop((60, 430, 460, 700))
c = c.resize((c.width * 3, c.height * 3), Image.NEAREST)
c.save(sys.argv[2], quality=92)
e = Image.open(sys.argv[3]).convert("RGB").crop((0, 230, 260, 420))
e = e.resize((e.width * 3, e.height * 3), Image.NEAREST)
e.save(sys.argv[4], quality=92)
