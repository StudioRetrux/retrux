import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB").crop((860, 250, 1440, 470))
b = Image.open(sys.argv[2]).convert("RGB").crop((860, 250, 1440, 470))
s = Image.new("RGB", (580, 440))
s.paste(a, (0, 0)); s.paste(b, (0, 220))
s = s.resize((1160, 880), Image.LANCZOS)
s.save(sys.argv[3], quality=92)
