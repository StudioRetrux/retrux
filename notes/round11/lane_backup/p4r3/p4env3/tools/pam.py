import numpy as np
def load_pam(p):
    b = open(p, 'rb').read()
    i = b.index(b'ENDHDR\n') + 7
    hdr = b[:i].decode().split('\n'); d = {}
    for l in hdr:
        s = l.split(' ', 1)
        if len(s) == 2: d[s[0]] = s[1]
    w, h, c = int(d['WIDTH']), int(d['HEIGHT']), int(d['DEPTH'])
    return np.frombuffer(b[i:i + w * h * c], np.uint8).reshape(h, w, c)[:, :, :3].astype(np.int16)
