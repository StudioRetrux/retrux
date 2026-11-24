# REF | builds same-crop stack. args TOOLS J x0 y0 x1 y1 z out dirs...
import sys; sys.path.insert(0, sys.argv[1]); import numpy as np
from fr import fr, ref
from imgio import save
J = sys.argv[2]; x0, y0, x1, y1, z = map(int, sys.argv[3:8]); out = sys.argv[8]; dirs = sys.argv[9:]
ims = [ref()] + [fr(J + "/" + d) for d in dirs]
tiles = []
for a in ims:
    t = a[y0:y1, x0:x1].astype(np.float32).repeat(z, 0).repeat(z, 1)
    tiles += [t, np.full((4, t.shape[1], 3), 255, np.float32)]
save(out, np.concatenate(tiles[:-1], 0))
print(out, [a.shape for a in ims])
