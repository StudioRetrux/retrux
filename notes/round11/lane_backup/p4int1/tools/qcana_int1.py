# int1 copy (LANE = int1 r11_2, ORB = the orb lane's qc_fix): re-judge: latest captures (lane qc_fix) vs MAIN (panel r11_1) vs REF. Orb stats (jorb definitions, per-image centre), shard stats
# (jshard definitions), crops MAIN | LANE | REF (+ 200-255 stretch) around each image's own orb centre.
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M = SP + '/p3/r11_1'; L = SP + '/p3/r11_2'; L0 = SP + '/work_p4/p4orb/qc_fix'; R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
O = SP + '/work_p4/int1/img'
refs = {'q00_rest': 'ref_F000', 'q01_loop15': 'loop_F015', 'q02_loop30': 'loop_F030', 'q03_eye': 'loop_F045', 'p04_expand_pop': 'ref_F358', 'p05_expand': 'ref_F402', 'p06_sustain': 'ref_F420', 'p07_release_snap': 'ref_F453', 'p08_release_home': 'ref_F460'}
def centre(img):
    l = luma(img); sub = l[100:650, 400:1040]; m = sub > 238
    ys, xs = np.nonzero(m)
    if len(xs) < 50: return None
    return np.median(xs) + 400, np.median(ys) + 100, np.sqrt(m.sum() / np.pi)
def orbstats(img, name):
    c = centre(img)
    if c is None: print(f'{name:34s} no orb'); return None
    cx, cy, rad = c; l = luma(img)
    x0, y0 = int(cx - 120), int(cy - 120)
    box = img[y0:y0+241, x0:x0+241]; bl = luma(box)
    c248 = (box.min(-1) >= 248).mean() * 100; c250 = (box.min(-1) >= 250).mean() * 100
    yy, xx = np.mgrid[0:241, 0:241]; rr = np.hypot(xx - 120, yy - 120)
    disc = rr < rad * 0.85; d = box[disc]; dl = bl[disc]
    ring = (rr > rad * 0.9) & (rr < rad * 1.08); out = (rr > rad * 1.1) & (rr < rad * 1.4)
    rg = box[ring]
    print(f"{name:30s} c=({cx:.0f},{cy:.0f}) r~{rad:.0f} box>=248 {c248:5.1f}% >=250 {c250:5.1f}% | disc L10/50/90 {np.percentile(dl,10):.0f}/{np.percentile(dl,50):.0f}/{np.percentile(dl,90):.0f} sd {dl.std():4.1f} | rim L {luma(rg).mean():.0f} RGB {rg.mean(0).round(0)} B-R {rg[:,2].mean()-rg[:,0].mean():+.0f} | skirt L {luma(box[out]).mean():.0f} B-R {box[out][:,2].mean()-box[out][:,0].mean():+.0f} | frame p99 {np.percentile(l[:,2:-2],99):.0f} p99.9 {np.percentile(l[:,2:-2],99.9):.0f}")
    return cx, cy, rad
def shst(a):
    a = a[:, 2:-2]; m = (a[..., 2] - a[..., 0]) >= 85; p = a[m]
    if len(p) < 50: return 'n/a'
    l = 0.2126*p[:,0]+0.7152*p[:,1]+0.0722*p[:,2]; mx = p.max(1); mn = p.min(1); s = (mx - mn) / np.maximum(mx, 1)
    r, g, b = p[:,0], p[:,1], p[:,2]; h = np.degrees(np.arctan2(np.sqrt(3)*(g-b), 2*r-g-b)) % 360
    return f"n {m.sum():6d} L med {np.median(l):5.1f} p95 {np.percentile(l,95):5.1f} sat med {np.median(s):.3f} hue {np.median(h):5.1f}"
def stretch(a, lo=200, hi=255): return (a - lo) / (hi - lo) * 255
rows = []
for pose in sys.argv[1:]:
    print('==', pose)
    ims = {}
    for tag, p in (('MAIN', f'{M}/{pose}.png'), ('LANE', f'{L}/{pose}.png'), ('ORB', f'{L0}/{pose}.png'), ('REF ' + refs[pose], f'{R}/{refs[pose]}.png')):
        if not os.path.exists(p): continue
        a = load(p); ims[tag.split()[0]] = (a, orbstats(a, f'{pose[:3]} {tag}'))
        print(f'      shards {shst(a)}')
    hs = 125 if pose[:3] in ('p05', 'p06', 'p04') else 90
    crops, crs = [], []
    for k in ('MAIN', 'ORB', 'LANE', 'REF'):
        a, c = ims[k]
        cx, cy = (720, 380) if c is None else (int(c[0]), int(c[1]))
        cx = min(max(cx, hs), a.shape[1] - hs); cy = min(max(cy, hs), a.shape[0] - hs)
        cc = crop(a, cx - hs, cy - hs, 2 * hs, 2 * hs); crops.append(cc); crs.append(stretch(cc))
    save(f'{O}/orb_{pose}.png', vstack([hstack(crops), hstack(crs)]))
