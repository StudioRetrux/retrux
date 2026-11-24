import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB")
b = Image.open(sys.argv[2]).convert("RGB")
s = Image.new("RGB", (1440, 252))
s.paste(a.crop((0, 640, 720, 766)), (0, 0)); s.paste(a.crop((720, 640, 1440, 766)), (720, 0))
s.paste(b.crop((0, 640, 720, 766)), (0, 126)); s.paste(b.crop((720, 640, 1440, 766)), (720, 126))
s.save(sys.argv[3], quality=92)
