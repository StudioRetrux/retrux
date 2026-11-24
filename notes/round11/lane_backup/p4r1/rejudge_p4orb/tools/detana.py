# re-judge: paired deterministic captures lane vs off (?p4orb=0 == MAIN) [vs main :5197]. Judge metrics around the projected orb.
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]; O = sys.argv[2]
R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
refs = {'q00': ('ref_F000', (707, 336)), 'q03': ('loop_F045', (716, 350)), 'p04': ('ref_F358', (677, 432)), 'p05': ('ref_F402', (709, 408)), 'p06': ('ref_F420', (695, 414)), 'p07': ('ref_F453', (720, 387)), 'p08': ('ref_F460', (723, 382))}
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    a = np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
    return a, m
def stats(a, cx, cy, R0):
    x0, y0 = int(round(cx - 120)), int(round(cy - 120)); box = a[y0:y0+241, x0:x0+241]
    c248 = (box.min(-1) >= 248).mean() * 100; c250 = (box.min(-1) >= 250).mean() * 100
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]; rr = np.hypot(xx - cx, yy - cy)
    l = luma(a)
    disc = rr < 0.85 * R0; dl = l[disc]
    rim = (rr >= 0.85 * R0) & (rr < 1.02 * R0); rg = a[rim]
    rimb = rim & (l > 200); rgb_ = a[rimb]
    sk = (rr >= 1.1 * R0) & (rr < 1.4 * R0); s = a[sk]
    win = l[int(cy-200):int(cy+200), int(cx-200):int(cx+200)]
    brad = np.sqrt((win > 238).sum() / np.pi)
    return dict(c248=c248, c250=c250, L10=np.percentile(dl,10), L50=np.percentile(dl,50), L90=np.percentile(dl,90), sd=dl.std(),
                rim=rg.mean(0), rimBR=rg[:,2].mean()-rg[:,0].mean(), rimL=luma(rg).mean(), rimbBR=(rgb_[:,2].mean()-rgb_[:,0].mean()) if len(rgb_) else np.nan,
                skL=luma(s).mean(), skBR=s[:,2].mean()-s[:,0].mean(), p99=np.percentile(l[:,2:-2],99), p999=np.percentile(l[:,2:-2],99.9), brad=brad)
def fmt(t, s):
    return (f"  {t:5s} box>=248 {s['c248']:5.1f}% >=250 {s['c250']:5.1f}% | disc L10/50/90 {s['L10']:.0f}/{s['L50']:.0f}/{s['L90']:.0f} sd {s['sd']:4.1f} | rim(0.85-1.02R) L {s['rimL']:.0f} RGB {s['rim'].round(0)} B-R {s['rimBR']:+.0f} (L>200 {s['rimbBR']:+.0f})"
            f" | skirt 1.1-1.4R L {s['skL']:.0f} B-R {s['skBR']:+.0f} | bright r {s['brad']:.0f} | p99 {s['p99']:.0f} p99.9 {s['p999']:.0f}")
names = sorted({f[:-5] for f in os.listdir(D) if f.endswith('.json')})
keys = sorted({n.split('_', 1)[1] for n in names})
rows = []
for k in keys:
    pose = k.split('_')[0]
    if f'lane_{k}' not in names or f'off_{k}' not in names: continue
    a, ma = rd(f'lane_{k}'); b, mb = rd(f'off_{k}')
    o = mb['orb']; cx, cy, R0 = o['x'], o['y'], o['r']
    print(f"== {k}  orb ({cx:.0f},{cy:.0f}) R {R0:.1f}  clock {mb.get('clock', 0):.2f}/{ma.get('clock', 0):.2f}  lane-orb ({ma['orb']['x']:.0f},{ma['orb']['y']:.0f})")
    so = stats(b, cx, cy, R0); sl = stats(a, cx, cy, R0)
    print(fmt('OFF', so)); print(fmt('LANE', sl))
    if f'main_{k}' in names:
        c, mc = rd(f'main_{k}'); print(f"  main(:5197) vs off: max abs diff {np.abs(c - b).max():.0f} ({'IDENTICAL' if np.abs(c-b).max()==0 else 'DIFFER'})")
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]; rr = np.hypot(xx - cx, yy - cy)
    la, lb = luma(a), luma(b)
    inner = (rr < 0.8 * R0) & (la > 225) & (lb > 225)
    if inner.sum() > 20:
        print(f"  inner disc (r<0.8R, L>225 both) n {inner.sum()} lane-off RGB {(a[inner]-b[inner]).mean(0).round(1)}")
    # ice around the orb (crystals and orb masked), annuli
    sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
    cr = ((a[..., 2] - a[..., 0] >= 60) & (sat(a) > 0.3)) | ((b[..., 2] - b[..., 0] >= 60) & (sat(b) > 0.3))
    from numpy.lib.stride_tricks import sliding_window_view as sw
    pad = np.pad(cr, 4); dil = sw(pad, (9, 9)).max(axis=(-1, -2))
    d = la - lb
    ann = []
    for r0, r1 in ((1.02, 1.25), (1.25, 1.5), (1.5, 2.0), (2.0, 2.5), (2.5, 3.5)):
        mm = ~dil & (rr >= r0 * R0) & (rr < r1 * R0)
        if mm.sum() > 20: ann.append(f"{r0:.2f}-{r1:.2f}R {d[mm].mean():+5.2f}")
    print('  ice annuli dL (lane-off, crystals masked): ' + ' | '.join(ann))
    far = ~dil & (rr > 3.5 * R0)
    print(f"  far (r>3.5R, no crystals) px changed>2: {(np.abs(a-b).max(-1)[far]>2).mean()*100:.2f}%  max {np.abs(a-b).max(-1)[far].max():.0f}")
    # crops: off | lane | REF and 200-255 stretch
    hs = int(max(80, min(150, 1.45 * R0)))
    ref, (rx, ry) = refs[pose]; r = load(f'{R}/{ref}.png')
    c_ = lambda im, x, y: crop(im, int(x) - hs, int(y) - hs, 2 * hs, 2 * hs)
    cs = [c_(b, cx, cy), c_(a, cx, cy), c_(r, rx, ry)]
    st = [(x - 200) / 55 * 255 for x in cs]
    dm = np.clip(np.abs(c_(a, cx, cy) - c_(b, cx, cy)).max(-1) * 8, 0, 255)[..., None].repeat(3, -1)
    save(f'{O}/det_{k}.png', vstack([hstack(cs + [dm]), hstack(st + [dm * 0])]))
