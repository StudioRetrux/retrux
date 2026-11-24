import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB").crop((160, 300, 340, 400))
a = a.resize((a.width * 4, a.height * 4), Image.NEAREST)
a.save(sys.argv[2], quality=92)
