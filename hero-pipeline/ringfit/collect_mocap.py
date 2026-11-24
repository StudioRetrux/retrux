"""Collect the per-frame ring measurements from a mocap workflow journal into mocap_raw.json.

usage: python collect_mocap.py <journal.jsonl> [<journal2.jsonl> ...] <out mocap_raw.json>
Several journals (e.g. a first pass plus re-runs of failed chunks) are merged; a later journal wins.
Prints which frames are present / missing (expects lf_00 .. lf_39).
"""
import json
import sys


def results(obj):
    if isinstance(obj, dict):
        if "frames" in obj and isinstance(obj["frames"], list):
            yield obj
        for v in obj.values():
            yield from results(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from results(v)


def main():
    frames = {}
    for path in sys.argv[1:-1]:
        collect(path, frames)
    finish(frames, sys.argv[-1])


def collect(path, frames):
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except json.JSONDecodeError:
                continue
            for r in results(o):
                for fr in r["frames"]:
                    name = fr.get("frame", "")
                    if "rings" in fr and all(k in fr["rings"] for k in "ABCD"):
                        frames[name] = fr


def finish(frames, out_path):
    names = [f"lf_{i:02d}" for i in range(40)]
    missing = [n for n in names if n not in frames]
    out = [frames[n] for n in names if n in frames]
    for fr in out:
        fr["t"] = int(fr["frame"][3:]) * 0.1
    json.dump({"frames": out}, open(out_path, "w"), indent=1)
    print(f"{len(out)} frames collected; missing: {', '.join(missing) if missing else 'none'}")


if __name__ == "__main__":
    main()
