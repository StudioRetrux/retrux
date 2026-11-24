---
name: retrux-mac-machine
description: "The Retrux R&D moved to an M4 Mac shared with the user's design apps — Blender/Chrome paths, iCloud-synced Documents, RAM pressure, how to run heavy jobs"
metadata:
  node_type: memory
  type: project
  originSessionId: a0f5735b-9a7f-477e-9b57-6de40ca5644b
  modified: 2026-11-14T09:39:37.394Z
---

Since 2026-11-14 the Retrux hero R&D runs on an Apple M4 Mac (10 CPU / 10 GPU cores, 16 GB) instead of the old Windows Surface.

- Blender 5.2.1 at `/Applications/Blender.app/Contents/MacOS/Blender`; Cycles **Metal GPU** works ("Apple M4 (GPU - 10 cores)"). Blender's Python (`.../Resources/5.2/python/bin/python3.13`) has numpy + OpenImageIO; Homebrew python3 has neither.
- Google Chrome for headless captures; ffmpeg at `/opt/homebrew/bin/ffmpeg`; Node 24.
- The user keeps Photoshop, Figma, Chrome, Teams and Lark open: free RAM is often < 1 GB with ~7 GB compressed. Run at most 2 heavy jobs at once (Blender, headless Chrome), under background QoS (`taskpolicy -b`).
- `~/Documents` is iCloud-synced (the repo lives there): `npm ci` there made fileproviderd spike. Put renders, captures and bake intermediates in the scratchpad, never big files in the repo.
- The user runs the site on localhost (Next dev on :3000, hero lab on :5173); previews are localhost links, no deploys unless asked.

- Internet on 2026-11-14/15 came through the user's iPhone Personal Hotspot (Wi-Fi gateway 172.20.10.1). When the phone left or the hotspot dropped (22:38-03:39), every agent died with ENOTFOUND and the session stalled until the user typed. Long autonomous runs need the phone nearby with the hotspot on, or real Wi-Fi; image-heavy agents also eat mobile data.

Related: [[retrux-round11-state]].
