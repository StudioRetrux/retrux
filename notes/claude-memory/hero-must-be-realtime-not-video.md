---
name: hero-must-be-realtime-not-video
description: "Retrux website hero must be real-time 3D (three.js), never a pre-rendered video"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 570a569a-5122-4ff1-b51f-d34d42e5fde3
  modified: 2026-11-10T16:09:57.753Z
---

The Retrux homepage hero must be real-time 3D, not a pre-rendered video, even though the reference is a Blender Cycles video. A still poster is OK only as the no-WebGL fallback.

**Why:** the user explicitly rejected video ("jangan video") and wants an igloo.inc-level interactive scene (awwwards SOTY bar).

**How to apply:** match the Cycles look with baked plates, PMREM and custom shaders inside the live engine; never swap in an mp4/webm hero. See [[retrux-hero-project-status]].
