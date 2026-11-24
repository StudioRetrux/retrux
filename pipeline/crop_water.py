import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB").crop((420, 440, 1020, 766))
b = Image.open(sys.argv[2]).convert("RGB").crop((420, 440, 1020, 766))
s = Image.new("RGB", (1200, 326))
s.paste(a, (0, 0)); s.paste(b, (600, 0))
s.save(sys.argv[3], quality=92)
