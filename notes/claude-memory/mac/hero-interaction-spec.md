---
name: hero-interaction-spec
description: "The user's binding interaction rules for the Retrux hero (click, hold, cursor, seamless motion), given 2026-11-11"
metadata:
  node_type: memory
  type: feedback
  originSessionId: a0f5735b-9a7f-477e-9b57-6de40ca5644b
  modified: 2026-11-15T12:23:25.135Z
---

On 2026-11-11 the user specified how the hero must behave. The guiding rule: "intinya samain kaya di video" (match the State / Default Loop videos).

- A single click does nothing. Remove any click reaction: no collapse animation, no lake ripple, no sound.
- Press-and-hold zooms into the "Dyson sphere" exactly like the video (F331-F442), in slow motion:
  - the two outer rings (A quarters, B halves) open up;
  - every ring keeps moving slowly during the hold, including the inner ones. Nothing freezes into a static pose.
- Gyroscope / ring motion must be seamless: no pops, flips or snaps on any interaction.
- 2026-11-15 clarification after seeing the round-11 hold (a key-frame arrangement plus a "breathing" loop): "2 cincin tengah kaga muter, lebih ke gerak repeat doang ... ensure 2 cincin di luar itu keep rotate but slowmo dan kebuka, but tetep seamless arah rotasinya as is, but slow mo, priorityyy!!!!!!". So during a hold the outer rings A and B keep rotating in their rest direction, in slow motion, while opening; the inner rings C and D visibly rotate too. A repeating back-and-forth motion or a direction change reads as broken. Their words beat the reference key frames, which only guide the opened shape and the camera.
- 2026-11-15 ~19:20 (after the rotating hold): "QC lagi, terutama pergerakan 2 cincin terdalam, itu kalo ga tap and hold gerakannya aneh juga, ga muter harmonize, malah gerak bolak balik doang ... ensure 2 cincin luar juga pas tap and hold presisinyaa pecahannya, ga mencang mencong, harus sesuai sejajar sebagaimana mestinya normal gerakan putaran smua bagiannya as satu kesatuan ring walaupun mecah ... lo harus cek terus sampe ga tolol ... ensure waternya realistis yaa, masa pas di gerakin cameranya malah ... kek pecah pecah ... ensure 1:1 sama yang di reference, lo pake aja blender, threejs, webgl, webgpu, whatever you need". So: the inner rings must spin continuously and harmoniously at idle too, never rock back and forth. When A and B split in the hold, every piece stays coplanar and aligned with its ring, and the pieces turn together as one ring; no per-piece tilt, spin or flex. The lake must look like real water under any camera move (no fragmenting) and match the reference. Same evening: "itu surounded cristalnya yang kecil kecil itu pas tap and hold juga ikut slowmo sesuai reference yaa": the small orbiting crystal shards slow down with the hold too, as in the reference. Then: "ensure 2 ring di dalam juga slowmo pas tap and hold ya anjing, jangan ngide, ensure overall optically 1:1 yaa as reference": the inner rings slow down in the hold as well, and NOTHING may be improvised ("jangan ngide"): every motion or visual choice must trace to the reference frames or their words, optically 1:1.
- 2026-11-15 ~19:55: "ensure juga itu si awan ga ilang ... kalo di diemin dia ilang ... ensure itu loop or gimana caranya biar dia naturally there, kalo gerak ensure loop, lo atur aja gimana biasanya 3d awwwards website works ... ensure everything looks awesome yaa, ada kabut or angin, looks natural, looks black myth wukong graphic quality level!!!, looks realistic, pantulan cahaya, air, es, angin kabut awan everything looks really magnificent render!!! ... make it awwwards worthy". Clouds must never drift away or vanish however long the page idles: they loop seamlessly. The bar is AAA realism (fog / mist, wind cues, light reflections, water, ice, clouds) while staying faithful to the reference.
- 2026-11-16 ~04:15: "ensure pas press and hold, 2 ring di luar itu tetep kebuka yaa ... itu kenapa buka nutup gitu tolol, benerin cepet": during the hold the outer rings must STAY open at a constant opening; an opening that shrinks and grows with the tumble (a frame guard) reads as broken. Keep them in frame by framing the camera, not by pulsing the opening.
- 2026-11-18 ~22:30: "benerin pinggiran air di deket es itu kalo geser kamera kek low quality anti aliasin gitu ... aneh glitch gitu, make it smooth": the waterline around the ice must stay smooth (no jaggies or crawling) while the camera moves.
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
