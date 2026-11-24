import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
for D in sys.argv[1:]:
    for k in ('p04_tn', 'p05_t3.3', 'p06_t3.3', 'q03_tn', 'q00_tn'):
        if not os.path.exists(f'{D}/lane_{k}.json'): continue
        out = []
        for t in ('off', 'lane'):
            m = json.load(open(f'{D}/{t}_{k}.json')); W, H = m['W'], m['H']
            a = np.frombuffer(open(f'{D}/{t}_{k}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
            o = json.load(open(f'{D}/off_{k}.json'))['orb']
            yy, xx = np.mgrid[0:H, 0:W]; rr = np.hypot(xx - o['x'], yy - o['y'])
            sat = (a.max(-1) - a.min(-1)) / np.maximum(a.max(-1), 1)
            cr = (a[..., 2] - a[..., 0] >= 60) & (sat > 0.3)
            l = luma(a)[(rr < 0.75 * o['r']) & ~cr]
            out.append(f"{t} L10/50/90 {np.percentile(l,10):.0f}/{np.percentile(l,50):.0f}/{np.percentile(l,90):.0f} sd {l.std():4.1f} frac<215 {(l<215).mean()*100:4.1f}%")
        print(f"{os.path.basename(D):8s} {k:9s} r<0.75R no crystals: " + ' | '.join(out))
