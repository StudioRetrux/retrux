# big orb crops: tags (plain row + stretched 200-255 row) + the reference, for one pose of a detab dir
import sys, json, numpy as np, OpenImageIO as oiio
D, pose, tags, out = sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4]
ref = {'p05': ('ref_F402', 709, 408), 'p06': ('ref_F420', 695, 414)}[pose]
def rd(tag):
    m = json.load(open(f'{D}/{tag}_{pose}.json')); W, H = m['W'], m['H']
    return np.frombuffer(open(f'{D}/{tag}_{pose}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32), m['orb']
b = oiio.ImageBuf(f'/Users/muhamadrifaldi/RetruxR11Work/hp/reference/{ref[0]}.png'); r = np.asarray(b.get_pixels(oiio.UINT8)).reshape(b.spec().height, b.spec().width, b.spec().nchannels)[..., :3].astype(np.float32)
ims = []
for t in tags:
    a, o = rd(t); cx, cy = int(round(o['x'])), int(round(o['y'])); ims.append(a[cy - 130:cy + 130, cx - 130:cx + 130])
ims.append(r[ref[2] - 130:ref[2] + 130, ref[1] - 130:ref[1] + 130])
g = np.full((260, 6, 3), 255, np.float32)
row = lambda L: np.concatenate(sum([[i, g] for i in L], [])[:-1], 1)
img = np.concatenate([row(ims), np.full((6, row(ims).shape[1], 3), 255, np.float32), row([np.clip((i - 200) / 55 * 255, 0, 255) for i in ims])], 0)
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(img.shape[1], img.shape[0], 3, oiio.UINT8)); o.write_image(np.clip(img, 0, 255).astype(np.uint8)); o.close()
