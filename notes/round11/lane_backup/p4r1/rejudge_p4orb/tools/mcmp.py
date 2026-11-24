import sys, os, json
import numpy as np
D1, D2 = sys.argv[1], sys.argv[2]
for f in sorted(os.listdir(D2)):
    if not f.endswith('.rgba'): continue
    k = f[len('main_'):-5]
    a = np.frombuffer(open(f'{D2}/{f}', 'rb').read(), np.uint8); b = np.frombuffer(open(f'{D1}/off_{k}.rgba', 'rb').read(), np.uint8)
    d = np.abs(a.astype(np.int16) - b.astype(np.int16))
    print(f'{k:10s} main(:5197) vs off(:5176 p4orb=0): max {d.max()}  px changed {(d.reshape(-1,4)[:, :3].max(1) > 0).mean()*100:.3f}%  {"IDENTICAL" if d.max()==0 else "DIFFER"}')
