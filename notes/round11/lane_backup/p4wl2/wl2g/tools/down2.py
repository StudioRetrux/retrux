# down2.py <srcdir> <dstdir> : 2x2 box average of every PNG (the DPR-2 capture as the lane's own converged 1x image)
import sys, os, glob, numpy as np
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from imgio import load, save
os.makedirs(sys.argv[2], exist_ok=True)
for f in sorted(glob.glob(sys.argv[1] + '/*.png')):
    a = load(f); h, w = a.shape[0] // 2 * 2, a.shape[1] // 2 * 2
    a = a[:h, :w].reshape(h // 2, 2, w // 2, 2, 3).mean(axis=(1, 3))
    save(sys.argv[2] + '/' + os.path.basename(f), a + 0.5)
