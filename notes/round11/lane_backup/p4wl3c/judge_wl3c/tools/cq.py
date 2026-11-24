import sys,re
t=sys.stdin.read(); m=re.search(r'len med (\d+)',t); c=re.search(r'\(13[23]\d, np.float64\([\d.]+\), (\d+)',t); c2=re.search(r'\(120\d, np.float64\([\d.]+\), (\d+)',t)
print('med',m.group(1),'x1334',c.group(1) if c else None,'x1207',c2.group(1) if c2 else None)
