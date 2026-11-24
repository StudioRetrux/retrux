# box stats: python3 -I box.py img.png x0 x1 y0 y1  -> mean luma, mean rgb
import sys
import numpy as np
from PIL import Image
a=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
x0,x1,y0,y1=map(int,sys.argv[2:6])
b=a[y0:y1+1,x0:x1+1]
L=b@np.array([0.2126,0.7152,0.0722])
print(f"{sys.argv[1].split('/')[-1]} [{x0}-{x1},{y0}-{y1}] luma {L.mean():.1f} rgb {b.reshape(-1,3).mean(0).round(1).tolist()} min {L.min():.0f} max {L.max():.0f}")
