---
name: hero-interaction-spec
description: "The user's binding interaction rules for the Retrux hero (click, hold, cursor, seamless motion), given 2026-11-11"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 570a569a-5122-4ff1-b51f-d34d42e5fde3
  modified: 2026-11-11T03:45:59.475Z
---

On 2026-11-11 the user specified how the hero must behave. The guiding rule: "intinya samain kaya di video" (match the State / Default Loop videos).

- A single click does nothing. Remove any click reaction: no collapse animation, no lake ripple, no sound.
- Press-and-hold zooms into the "Dyson sphere" exactly like the video (F331-F442), in slow motion:
  - the two outer rings (A quarters, B halves) open up;
  - every ring keeps moving slowly during the hold, including the inner ones. Nothing freezes into a static pose.
- Gyroscope / ring motion must be seamless: no pops, flips or snaps on any interaction.
- Cursor near the centre gives a slight zoom ("dikit aja", as in the video, ~1.12x). Cursor at the edges orbits / pans the camera "as is".
- No visual glitches anywhere. The ones they reported:
  - doubled mountains when the camera moves;
  - a weird thing at the bottom of the frame.

**Why:** they review the hero against the videos and notice anything that differs from the video or looks glitchy.

**How to apply:**
- Check every change to Choreography / Rings against these rules.
- Run the continuity probe (hero-pipeline/validate/probe_interact.mjs: a click must change nothing, no large per-frame ring steps).
- Run the glitch sweep (shoot_sweep.mjs) before shipping.

Related: [[hero-must-be-realtime-not-video]], [[retrux-hero-project-status]].
