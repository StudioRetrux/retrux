import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]
for mode in ('rest', 'hold'):
    m = json.load(open(f'{D}/lane_{mode}_meta.json')); W, H = m['W'], m['H']
    rd = lambda tag, i: np.frombuffer(open(f'{D}/{tag}_{mode}_{i:02d}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
    a = rd('lane', 8); b = rd('off', 8)
    d = np.abs(a - b).max(-1)
    # crop y 80..680 -> water band full-frame y 470..680 = crop rows 390..600
    for name, (y0, y1) in (('sky/top (fy 80-250)', (0, 170)), ('hero mid (fy 250-470)', (170, 390)), ('water (fy 470-680)', (390, 600))):
        dd = d[y0:y1]
        print(f"{mode} {name:22s} changed>4 {(dd>4).mean()*100:6.2f}%  >10 {(dd>10).mean()*100:6.2f}%  mean {dd.mean():.2f}")
    g = luma(a)[..., None].repeat(3, -1) * 0.35; g[..., 0] += np.clip(d * 6, 0, 255)
    save(f'{D}/diff_lane_off_{mode}.png', g[::2, ::2])
