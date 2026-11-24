import sys, json, os, glob
# usage: python3 -I wfstat.py <workflow dir> [n]
d = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 4
for meta in sorted(glob.glob(os.path.join(d, "agent-*.meta.json"))):
    try:
        m = json.load(open(meta))
    except Exception:
        m = {}
    label = m.get("label") or m.get("description") or os.path.basename(meta)
    j = meta[: -len(".meta.json")] + ".jsonl"
    lines = open(j, encoding="utf-8", errors="replace").read().splitlines()[-60:]
    out = []
    for line in lines:
        try:
            o = json.loads(line)
        except Exception:
            continue
        ts = o.get("timestamp", "")[11:16]
        c = o.get("message", {}).get("content")
        if isinstance(c, str):
            continue
        for b in c or []:
            t = b.get("type")
            if t == "text" and b.get("text", "").strip() and "SYSTEM NOTIFICATION" not in b["text"]:
                out.append(ts + " TEXT " + b["text"][:300])
            elif t == "tool_use":
                i = b.get("input", {})
                out.append(ts + " TOOL " + str(i.get("description") or i.get("file_path") or "")[:140])
    print("==", label, "| size", os.path.getsize(j))
    for l in out[-n:]:
        print("  ", l.replace("\n", " "))
