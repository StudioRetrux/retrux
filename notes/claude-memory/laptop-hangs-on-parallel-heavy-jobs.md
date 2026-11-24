---
name: laptop-hangs-on-parallel-heavy-jobs
description: "The user's 8 GB laptop froze (forced restart) when Blender headless and Python/numpy video analysis ran at the same time; run heavy local jobs strictly one at a time"
metadata:
  node_type: memory
  type: project
  originSessionId: 570a569a-5122-4ff1-b51f-d34d42e5fde3
  modified: 2026-11-11T13:36:08.901Z
---

On 2026-11-10 the laptop hung and the user had to restart while a research workflow ran Blender headless (opening the 100 MB `Home - EXPORT.blend` and rendering EEVEE/Workbench previews) in parallel with a Python/numpy video analysis that loaded ~135 MB frame arrays. After the restart, free RAM was only ~1.7 GB of 7.9 GB with just the IDE (Antigravity), Defender, OneDrive and Phone Link running. Workflow agent concurrency on this machine is capped at 2 (4 logical CPUs).

**Why:** Surface Laptop 1, i7-7660U, Iris Plus 640, 8 GB soldered RAM; see [[laptop-specs-and-constraints]] (memory in the Downloads-Clean-Up project).

**How to apply:** Never run two heavy local processes at once (Blender, Chrome/Playwright with WebGL, Next dev/build, big Node or numpy jobs). In workflows, pair at most one heavy agent with one light agent (web research, reading files), and tell heavy agents to check free RAM before launching a process. Prefer sequential steps over fan-out for anything that executes locally.

One headless Chrome running the hero needs ~1.5 GB. Each plate-shader recompile adds hundreds of MB more (D3D compiles of the long fill loops). three.js keeps every compiled variant until `material.dispose()`. On the evening of 2026-11-11, with the user active, free RAM went from 3.0 GB to under 0.7 GB, and the RAM watchdog killed the capture. To avoid that, dispose the material before each shader patch and run a few variants per Chrome session.

The Iris GPU also throttles. On 2026-11-11, after about 3 hours of near-continuous headless WebGL captures, the same engine build measured about 30 fps where it had measured 60 the night before. Treat fps numbers taken after long capture sessions as unreliable, compare builds back to back, and give the GPU a break.
