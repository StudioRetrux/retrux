# Mean sRGB colour of named regions in two frames (engine vs reference), via ffmpeg area scaling.
# macOS / Linux port of region_stats.ps1 (same regions, same output columns).
#   python3 -I region_stats.py engine.png ref.png
import os
import subprocess
import sys

FF = os.environ.get("FFMPEG", "/opt/homebrew/bin/ffmpeg")
# name = w:h:x:y in 1440x766 pixels (rest camera framing)
REGIONS = {
    "sky top": "400:60:1000:10",
    "sky horizon": "200:40:1200:250",
    "left mountain": "120:90:10:200",
    "peak snow": "60:40:300:160",
    "iceberg right": "150:60:1000:330",
    "far floes": "300:30:500:470",
    "rock fg left": "200:80:30:640",
    "water near": "300:60:560:600",
    "corner TL": "160:60:0:0",
    "corner TR": "160:60:1280:0",
    "corner BL": "160:60:0:706",
    "corner BR": "160:60:1280:706",
    "mid left": "120:60:0:420",
    "mid right": "120:60:1320:420",
    "bottom centre": "200:50:620:716",
}


def mean(path, region):
    out = subprocess.run(
        [FF, "-loglevel", "error", "-i", path, "-vf", f"crop={region},scale=1:1:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return list(out[:3])


def main():
    if len(sys.argv) < 3:
        print("usage: region_stats.py engine.png reference.png")
        sys.exit(2)
    a, b = sys.argv[1], sys.argv[2]
    print(f"{'region':<15} {'engine':<16} {'reference':<16} diff")
    for name, region in REGIONS.items():
        ea = mean(a, region)
        eb = mean(b, region)
        d = [ea[i] - eb[i] for i in range(3)]
        print(f"{name:<15} {','.join(map(str, ea)):<16} {','.join(map(str, eb)):<16} {','.join(map(str, d))}")


if __name__ == "__main__":
    main()
