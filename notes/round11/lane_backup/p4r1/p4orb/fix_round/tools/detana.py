# p4orb fixer: metrics of detab.mjs captures (the judge's jclip / jorb / jhue / jring definitions), paired vs a base tag.
#   python3 -I detana.py DIR base tag1,tag2,... poses [cropOut]
import sys, json, os
import numpy as np, OpenImageIO as oiio
D, base, tags, poses = sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4].split(',')
REF = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
def load_png(p):
    b = oiio.ImageBuf(p); a = np.asarray(b.get_pixels(oiio.UINT8)).reshape(b.spec().height, b.spec().width, b.spec().nchannels)[..., :3]
    return a.astype(np.float32)
def save(p, a):
    a = np.clip(a, 0, 255).astype(np.uint8); h, w = a.shape[:2]
    o = oiio.ImageOutput.create(p); o.open(p, oiio.ImageSpec(w, h, 3, oiio.UINT8)); o.write_image(a); o.close()
def rd(tag, pose):
    m = json.load(open(f'{D}/{tag}_{pose}.json')); W, H = m['W'], m['H']
    a = np.frombuffer(open(f'{D}/{tag}_{pose}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
    return a, m['orb']
luma = lambda a: 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
def stats(a, cx, cy, R):
    l = luma(a); H, W = l.shape
    yy, xx = np.mgrid[0:H, 0:W]; rr = np.hypot(xx - cx, yy - cy)
    x0, y0 = int(round(cx - 120)), int(round(cy - 120)); box = a[y0:y0 + 241, x0:x0 + 241]
    disc = rr < 0.85 * R; rim = (rr >= 0.85 * R) & (rr < 1.02 * R)
    dl = l[disc]; rc = a[rim].mean(0)
    # the judge's rim (jhue): 0.85-1.02 of the bright-disc radius (~0.876 of the projected glass radius), L > 200
    Rj = 0.876 * R; rimj = (rr >= 0.85 * Rj) & (rr < 1.02 * Rj) & (l > 200); rj = a[rimj].mean(0)
    # crystals (jshard): B - R >= 85, whole frame
    aa = a[:, 2:-2]; m = (aa[..., 2] - aa[..., 0]) >= 85; pp = aa[m]
    if len(pp) > 50:
        ll = 0.2126 * pp[:, 0] + 0.7152 * pp[:, 1] + 0.0722 * pp[:, 2]; ss = (pp.max(1) - pp.min(1)) / np.maximum(pp.max(1), 1)
        shs = f"shards n {m.sum()} L med {np.median(ll):.1f} p95 {np.percentile(ll, 95):.1f} sat {np.median(ss):.3f}"
    else: shs = 'shards n/a'
    return dict(c248=100 * (box.min(-1) >= 248).mean(), c250=100 * (box.min(-1) >= 250).mean(),
                L10=np.percentile(dl, 10), L50=np.percentile(dl, 50), L90=np.percentile(dl, 90), sd=dl.std(),
                rim=rc, rimBR=rc[2] - rc[0], rimj=rj, rimjBR=rj[2] - rj[0], shs=shs, p99=np.percentile(l[:, 2:-2], 99), rr=rr, l=l)
out = []
for pose in poses:
    b, ob = rd(base, pose)
    cx, cy, R = ob['x'], ob['y'], ob['r']
    sb = stats(b, cx, cy, R)
    lb = sb['l']; rr = sb['rr']
    sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
    for tag in [base] + [t for t in tags if t != base]:
        if not os.path.exists(f'{D}/{tag}_{pose}.rgba'): continue
        a, oa = rd(tag, pose); s = stats(a, cx, cy, R); la = s['l']
        line = f"{pose} {tag:10s} R {R:5.1f} box241 >=248 {s['c248']:5.1f}% >=250 {s['c250']:5.1f}% | disc<.85R L10/50/90 {s['L10']:.0f}/{s['L50']:.0f}/{s['L90']:.0f} sd {s['sd']:4.1f} | rim .85-1.02R RGB {s['rim'].round(0)} B-R {s['rimBR']:+.0f} | rimJ RGB {s['rimj'].round(0)} B-R {s['rimjBR']:+.0f} | p99 {s['p99']:.0f} | {s['shs']}"
        if tag != base:
            inner = (rr < 0.8 * R) & (la > 225) & (lb > 225)
            d = (a[inner] - b[inner]).mean(0)
            cr = ((a[..., 2] - a[..., 0] >= 60) & (sat(a) > 0.3)) | ((b[..., 2] - b[..., 0] >= 60) & (sat(b) > 0.3))
            ring = []
            for r0, r1 in ((1.25, 1.5), (1.5, 1.75), (2.0, 2.5), (2.5, 3.0)):
                mm = (rr >= r0 * R) & (rr < r1 * R) & ~cr
                ring.append(f"{r0}-{r1}R {(la[mm] - lb[mm]).mean():+.2f}")
            line += f"\n    vs {base}: inner disc dRGB {d.round(1)} | ice annuli dL " + ", ".join(ring)
        out.append(line)
print("\n".join(out))
if len(sys.argv) > 5:
    # crops: each tag's orb (220 px) plain + stretched 200-255, and the reference for p05 / p06
    refs = {'p05': ('ref_F402', 709, 408), 'p06': ('ref_F420', 695, 414), 'p04': ('ref_F358', 677, 432), 'q00': ('ref_F000', 707, 336)}
    rows = []
    for pose in poses:
        b, ob = rd(base, pose); cx, cy = int(round(ob['x'])), int(round(ob['y']))
        ims = []
        for tag in [base] + [t for t in tags if t != base]:
            if not os.path.exists(f'{D}/{tag}_{pose}.rgba'): continue
            a, _ = rd(tag, pose); ims.append(a[cy - 110:cy + 110, cx - 110:cx + 110])
        if pose in refs:
            rf, rx, ry = refs[pose]; r = load_png(f'{REF}/{rf}.png'); ims.append(r[ry - 110:ry + 110, rx - 110:rx + 110])
        st = [(i - 200) / 55 * 255 for i in ims]
        gap = np.full((220, 4, 3), 255, np.float32)
        row = []
        for i in ims + st: row += [i, gap]
        rows.append(np.concatenate(row[:-1], 1)); rows.append(np.full((4, rows[-1].shape[1], 3), 255, np.float32))
    save(sys.argv[5], np.concatenate(rows[:-1], 0))
