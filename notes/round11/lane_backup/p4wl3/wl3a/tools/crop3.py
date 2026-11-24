# wl3a: REF | MAIN | lane crops (rest captures, 1440x766): left water 1x (CSS 0-560 x 430-620) and 2x (CSS 0-280 x 500-620); + far 1x
import sys, json, zlib, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import load, save
def fr(d, i=2):
    M = json.load(open(d + "/meta.json")); W = M["W"]; R = M["y1"] - M["y0"]
    return np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(R, W, 4)[::-1][..., :3]
ref = load('/Users/muhamadrifaldi/RetruxR11Work/hp/reference/ref_F000.png')[..., :3]; ref = (ref * 255 if ref.max() <= 1.5 else ref).astype(np.uint8)
main = fr(sys.argv[2]); lane = fr(sys.argv[3]); out = sys.argv[4]
def trip(x0, x1, y0, y1, z, name):
    c = [a[y0:y1, x0:x1].repeat(z, 0).repeat(z, 1) for a in (ref, main, lane)]
    sep = np.full((6, c[0].shape[1], 3), 255, np.uint8)
    save(out + "_%s.png" % name, np.concatenate([c[0], sep, c[1], sep, c[2]], 0))
trip(0, 560, 430, 620, 1, "left_1x"); trip(0, 280, 500, 620, 2, "left_2x"); trip(880, 1440, 430, 600, 1, "far_1x")
d = np.abs(main.astype(int) - lane.astype(int)).max(2)
print("MAIN vs lane rest: max |d| above y 430: %d; px > 2 levels: water (y>=430) %d, above %d" % (d[:430].max(), (d[430:] > 2).sum(), (d[:430] > 2).sum()))
