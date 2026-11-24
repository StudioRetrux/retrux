import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
def walk(o, depth=0, key="root"):
    pad = "  " * depth
    if isinstance(o, dict):
        print(f"{pad}{key}: dict({len(o)}) keys={list(o.keys())[:12]}")
        if depth < 2:
            for k, v in list(o.items())[:12]:
                walk(v, depth + 1, k)
    elif isinstance(o, list):
        print(f"{pad}{key}: list({len(o)})")
        if o and depth < 2: walk(o[0], depth + 1, key + "[0]")
    else:
        s = str(o)
        print(f"{pad}{key}: {s[:100]}")
walk(d)
