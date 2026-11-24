import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M = SP + '/p3/r11_1'; L = SP + '/work_p4/p4orb/qc_final'; R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
refs = {'q00_rest': 'ref_F000', 'q01_loop15': 'loop_F015', 'q02_loop30': 'loop_F030', 'q03_eye': 'loop_F045', 'p04_expand_pop': 'ref_F358', 'p05_expand': 'ref_F402', 'p06_sustain': 'ref_F420', 'p07_release_snap': 'ref_F453', 'p08_release_home': 'ref_F460'}
def orbstats(img, name):
    l = luma(img)
    sub = l[100:650, 400:1040]
    m = sub > 238
    ys, xs = np.nonzero(m)
    if len(xs) < 50: print(name, 'no orb'); return None
    cx, cy = np.median(xs) + 400, np.median(ys) + 100
    # radius estimate: sqrt(area/pi) of bright blob connected-ish
    rad = np.sqrt(m.sum() / np.pi)
    x0, y0 = int(cx - 120), int(cy - 120)
    box = img[y0:y0+241, x0:x0+241]; bl = luma(box)
    clip = (box.min(-1) >= 250).mean() * 100
    yy, xx = np.mgrid[0:241, 0:241]
    rr = np.hypot(xx - 120, yy - 120)
    disc = rr < rad * 0.85
    d = box[disc]; dl = bl[disc]
    ring = (rr > rad * 0.9) & (rr < rad * 1.08)
    out = (rr > rad * 1.1) & (rr < rad * 1.4)
    print(f"{name:34s} c=({cx:.0f},{cy:.0f}) r~{rad:.0f} box241 clip(min>=250) {clip:5.1f}% | disc L10/50/90 {np.percentile(dl,10):.0f}/{np.percentile(dl,50):.0f}/{np.percentile(dl,90):.0f} sd {dl.std():.1f} RGB {d.mean(0).round(0)} | rim L {luma(box[ring]).mean():.0f} RGB {box[ring].mean(0).round(0)} | skirt L {luma(box[out]).mean():.0f} RGB {box[out].mean(0).round(0)} | frame p99 {np.percentile(l,99):.0f}")
    return cx, cy, rad
for pose in sys.argv[1:]:
    for tag, p in (('MAIN', f'{M}/{pose}.png'), ('LANE', f'{L}/{pose}.png'), ('REF ' + refs[pose], f'{R}/{refs[pose]}.png')):
        orbstats(load(p), f'{pose} {tag}')
