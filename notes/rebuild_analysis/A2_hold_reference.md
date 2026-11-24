# A2: press-and-hold reference spec (State 2 to 5.mp4, F328-F472)

Target spec for the hold sequence (charge, pop, lunge, sustain, release, reassembly), meant to be implemented in
`retrux-web/app/hero/engine` (Choreography.ts, hero/Rings.ts, HeroEngine.ts).

Sources viewed at native 1440x766, one at a time:
- all 37 frames `scratchpad\qc\holdref\F328.jpg ... F472.jpg` (every 4th frame);
- the stills `hero-pipeline\reference\ref_F358/F402/F420/F453/F460.png`;
- `research\video_choreography.md` sections 1.2, 2.0-2.8 and 5.2-5.6;
- for the deltas: our captures `qc\b69qc\p04-p08*.png` + `log.txt`, `qc\b70sweep\sw_hold_T/R.png`, plan_round10 T12/T15/T21, and the current
  `Rings.ts` / `Choreography.ts` / `curves.ts`.

No pixel tools were run (hard rule: no python/node). All positions are visual reads of full-resolution frames.

---------------------------------------------------------------------------------------------------

## 0. Conventions

- **Pixels**: 1440x766, origin top-left, y down. Bounding boxes are `(x0,y0,x1,y1)`, **ice only** (shards and cursor excluded).
  Accuracy is ±10 px for crisp edges and ±20 px where a piece is occluded or merges into another.
- **Time**:
  - `t` = (F - 331)/30 s from the press. The pointer-down is at F330-F331. The engine's `EXPAND_CAM` / `EXPAND_POP` keys sit
    on F330.5, so engine `tp` = t + 0.017 s; the engine's `tp` also starts `HOLD_ARM` 0.25 s after the real pointer-down.
  - `tr` = (F - 443)/30 s from the release (pointer-up F442-F443).
- **Screen angle θ**: measured at the orb centre, counter-clockwise from +x.
  - 3 o'clock = 0°, 12 = 90°, 9 = 180°, 6 = 270°.
  - CCW = counter-clockwise as seen on screen; CW = clockwise.
- **Piece names**: ring A's quarters are named by where they sit at F420-F453.
  - **A-T** = top. At F420 it actually sits at 11 o'clock, top-left.
  - **A-L** = left.
  - **A-R** = right.
  - **A-B** = bottom. At F420 it actually sits at 5 o'clock, bottom-right.
  - Ring B (halves B1/B2 where they can be told apart), rings C and D, the orb.
- **"Midpoint θ / r"**: screen angle and distance from the orb centre to the middle of a quarter's centre-line.
  - Rest centre-line radius of A = 2.19 m.
  - Radius ratio = r / (2.19 m x px-per-m), not corrected for perspective.
- **Tags**:
  - **[M]** seen in the frames.
  - **[D]** calculated from [M].
  - **[I]** interpretation (3D reading). Flagged where the 2D evidence allows more than one reading.

---------------------------------------------------------------------------------------------------

## 1. Executive summary: what the hold IS (the 12 rules)

**R1. One story, about 3.1 s, rotating clockwise throughout.** [M/I]
- At the pop, ring A lies flat and edge-on, which is almost its rest orientation, rolled +7°.
- During the hold, A turns to face the camera while its four quarters separate.
- The turn is completed only by the release: at F452-F453 the quarters land face-on at 12/3/6/9 o'clock, with 25-60 px gaps on the diagonals. Ring A closes at F456.
- In 3D this is about **120° about the world axis (-1, 1, -1)/√3** (three.js: +x right, +y up, +z toward the camera). Equivalently: "pitch the front edge up 90° to face-on, then spin 90° clockwise on screen".
- That turn maps the quarters front→right (A-R), left→top (A-T), right→bottom (A-B) and back→left (A-L).

**R2. Quarter paths on screen** [M]:

| quarter | start (pop, F358) | path | end |
|---|---|---|---|
| **A-R** (front quarter) | the level bar across the orb | swings out to 3 o'clock: midpoint r 30 → 375 px over F358-F420; chord turns CW from +7° to -62° (-79° at F440) | 3 o'clock |
| **A-T, A-B** (side quarters) | end-on blocks at 9 and 3 o'clock, r ≈ 300 px | thrown out about +0.6-0.7 m at the pop, then **orbit clockwise round the orb at about 30°/s**, turning from blocks into arcs | 12 and 6 o'clock |
| **A-L** (back quarter) | hidden behind the orb | emerges at 9 o'clock by F384-F396 and stays there | 9 o'clock |

The side pair's lead over their final 12/6 o'clock slots decays roughly linearly, about 1°/frame:
- +98° at F358
- +60° at F396
- +30° at F420
- +13° at F440
- 0° at F452

**R3. The "15-20° CCW" look at F420 is a lag, not a spin.** [M]
- Nothing in the hold spins counter-clockwise.
- The side pair trails the front/back pair, so the arcs pair up:
  - **top+left** touch at 10 o'clock and **bottom+right** touch at 4 o'clock (0-15 px);
  - **wide sky gaps** of about 80-90 px open at about 12:40 and about 6:40 (F420);
  - the pairs then separate evenly (F440 gaps about 95 / 40 / 70 / 45 px), and the cross is even at F452.

**R4. Radial: the arcs frame the centre and keep growing until the release. There is no contraction while held.** [M]
- After F404 every A arc is at least 150 px from the orb's edge and 0-120 px from B's lens.
- Centre-line radius as a multiple of rest:

  | frame | mean | A-R | A-T | A-L | A-B |
  |---|---|---|---|---|---|
  | F420 | x1.14 | x1.28 | x1.14 | x1.07 | x1.05 |
  | F440 | x1.25 | x1.38 | x1.25 | x1.22 | x1.13 |

- Extent grows: 782x634 (F420) → 795x690 (F428) → 805x733 (F436) → 792x745 (F444). At F436-F444 the top arc touches y 0-5 and the bottom arc reaches y 735-750.
- Only the camera eases back 3% (F430-F442).

**R5. Chunky slabs, not ribbons.** [M]
- In the sustain each quarter shows its broad side (outer rim + flat face), band 60-110 px at 133 px/m.
- Each quarter shows **one bright cut end facing the camera**.
- The quarters thin to face-on bands (45-55 px) only in the release (F448-F453).
- Arcs may touch end to end (cap to cap) but **never cross another arc mid-span**.

**R6. Ring B is the single "lid" across the orb.** [M] It is always a near-horizontal ice band crossing the orb:

| frames | B's shape | orb coverage |
|---|---|---|
| F358-F372 | one continuous edge-on diagonal (-46°), behind A-R's bar | — |
| F396-F412 | a band over the orb | the orb's top third |
| F416-F428 | **closed lens** (390-935, 285-512) | everything except a **~30 px slit at y 410-440** and a ≤45 px cap |
| F432-F448 | a band | the orb's lower half |

- B's lid drifts from about 70 px above the orb centre (F404) to about 50 px below it (F444).
- **B's halves never read as two parted bands.** Their cut faces show only as a rounded **seam block at B's right end** (x 905-1020, y 295-440, F416-F448).

**R7. C and D stay whole, concentric and locked together, and flip face-on ↔ flat on a ~1.3 s beat.** [M]

| frames | C/D pose |
|---|---|
| F358-F372 | face-on, behind the pop |
| F376-F388 | flat |
| F392-F412 | face-on "portal" round the orb |
| F416-F428 | flat inside B |
| F432-F448 | face-on |
| F452-F456 | tilted whirl |
| F455-F462 | the eye |

**R8. The orb is never fully exposed during the hold.** [M]

| frames | visible share of the orb disc |
|---|---|
| F358 | ≈8% |
| F364-F384 | 20-45% |
| F396-F412 | 60-80%, top third under B |
| F420-F428 | 15-30% |
| F436-F444 | ≈50% |

- Fully visible only in the release (F452-F456).
- **Sustain orb centre is (720, 392) ±8, diameter 218 px**, not (719, 420); see section 8.

**R9. Camera vs spread timing.** [M]
- Camera: creep 0→28% (F331-F354), then lunge 28→93% (F354-F363).
- The pop impulse (side blocks out about 40 px/frame, F356-F358) happens inside the lunge.
- The **legible opening (sky between four arcs) only resolves at F404-F420**, 1.1-1.9 s after the camera has settled (96% at F369).
- At release the camera leads (fastest F446-F452) and A snaps in F448-F456, centred on F452.

**R10. Layering during the sustain** [M]:
- **In depth over the orb**: exactly one lid in front of it (A-R's bar at the pop, then B). C/D either frame the orb face-on or lie inside B.
- **On screen**: the four A arcs form the outer frame and never overlap the orb after F404. The shards ring just outside A (belt about 450 px from the orb), and a few cross the arcs.

**R11. Slow-motion everywhere, two fast events.** [M]
- During F372-F442 nothing moves faster than about 3-6 px/frame:
  - A-T's top edge rises 2-3 px/frame;
  - the side pair sweeps about 1°/frame;
  - C/D flip every ~0.65 s.
- Fast events: only the pop (F356-F358) and the release snap (F448-F456).

**R12. Silhouette.** [M]
- Wide and flat in the slab phase: aspect about 2.0 at F384 (805x390).
- Rounder in the open frame: 1.23 at F420, about 1.07 at F444.
- Always offset about 25-30 px right of the orb, because A-R is the farthest out.

---------------------------------------------------------------------------------------------------

## 2. Phase timeline

| phase | frames | t (s) | tr (s) | what happens [M unless tagged] |
|---|---|---|---|---|
| Press, cursor fill | F330-F341 | 0.00-0.33 | | Cursor disc r 7→39 px (ease-out), held at r 38.5 to F442, at about (798, 569). |
| Charge A: the eye | F332-F343 | 0.03-0.40 | | Rings pass through the near-frontal concentric pose. A at F332: 387x320 (tipped about X). A at F336: 388x373 (face-on). A at F340: 365x392 (yawed about 20°). Camera far-band +1.0 px (F336). |
| Charge B: wind-up into the X | F344-F356 | 0.43-0.83 | | A keeps tumbling at idle speed (about 170°/s: face-on F336 → edge-on F352). At F352: A is an edge-on bar rising +30°, B an edge-on bar falling -70° (an "X" knot, 384x323). At F356: A level (+10°), B -51°. A's end caps (seams) appear at both ends of A's band. Camera creep to 28% (F354). GLB B split 0→11% (invisible). |
| **Pop** | F356-F358 (impulse F357→F358) | 0.83-0.90 | | A's side quarters jump out sideways as end-on blocks: the left one 450→370 px, the right one 995→1080 px (about 40 px/frame). A's front quarter is a level bar across the orb, in front. B is one continuous -46° diagonal behind it. The orb is about 92% hidden. GLB B split 22→79%. |
| **Lunge** | F354-F363 | 0.77-1.07 | | Camera 28% → 75% (F357) → 93% (F363). The floe line drops from y 470 to 605. |
| Settle | F358-F372 | 0.90-1.37 | | Side blocks decelerate (out to +0.7 m by F364). The left block starts rising (about 5 px/frame). Camera 96% at F369. GLB B split 100% at F365. |
| Sustain I: slab cluster | F372-F392 | 1.37-2.03 | | A-R's bar turns CW (-13° at F384) and slides right. A-T's block rises at the left. A-L appears at A-R's left end. C/D lie flat (F376-F388), so the orb is only a slit. Extent about 805x390-455. |
| Sustain II: portal | F392-F412 | 2.03-2.70 | | C/D face-on tunnel framing the orb. B's band crosses over the orb's top third. A-R is a -30..-43° diagonal slab on the right. A-T is a block at the upper-left that becomes an arc. The open sky at the bottom-left (A-L to A-B, about 180-300 px) closes as A-B comes round. Orb 60-80% visible. |
| Sustain III: open frame | F412-F442 | 2.70-3.70 | | Four separate arcs round a closed B lens. Side-pair lag +30° (F420) → +13° (F440). The set grows (+0.1-0.3 m). C/D flat in B (F416-F428), then face-on (F432+). Camera eases back 100% → 96.7% (F430-F442). |
| (Contraction while held) | — | — | | **Not present in the reference.** The 3% camera pull-back is the only shrink; the ice extent keeps growing (section 8, item 2). |
| **Release** | F443-F456 | 3.73-4.17 | 0-0.43 | Disc fades F443-F447. Camera S-curve back (1% F444, 23% F448, 68% F452, 87% F456). The quarters finish the CW sweep (lag 13° → 0 by F452), turn face-on and snap in (x1.25 → x1.09 at F452 → x1.05 at F453 → closed at F456). B closes (GLB snap F452-F454). C/D tilt into a whirl round the fully visible orb. |
| Reassembly | F453-F465 | 4.07-4.47 | 0.33-0.73 | A closed with hairline seams on the diagonals (F456). Frontal "eye" F455-F462 (A face-on 390 px, three outer rings visible, inner band across the orb). Tumble resumes about F463-F465 (A a tilted ellipse at F464-F472). |

---------------------------------------------------------------------------------------------------

## 3. Camera framing per key frame

| F | t | camera progress (far band, doc 5.6) | orb Ø / hero scale | px per m at the orb | orb centre | floe-line y | left peak | ice extent (WxH), centre |
|---|---|---|---|---|---|---|---|---|
| 340 | 0.30 | ~2% | ~134 / 1.01 | 82 | (718, 365) | 470 | (250, 212) | 365x392, (715, 372) |
| 352 | 0.70 | ~19% | ~143 / ~1.08 | 87 | ~(720, 383), hidden | 492 | (245, 235) | 384x323, (720, 384) |
| 358 | 0.90 | ~78% | ~192 / ~1.44 | 116 | ~(722, 395), hidden | 585 | (235, 325) | 710x454, (725, 395) |
| 364 | 1.10 | ~93% | ~210 / ~1.57 | 127 | ~(722, 393) | 605 | (225, 340) | 795x477, (722, 386) |
| 372 | 1.37 | ~96% | ~214 / ~1.61 | 130 | (720, 392) | 612 | (225, 350) | 820x455, (720, 382) |
| 384 | 1.77 | ~98% | ~216 / ~1.63 | 132 | (720, 392) | 615 | (225, 350) | 805x390, (722, 380) |
| 396 | 2.17 | ~100% | 218 / 1.64 | 133 | (720, 392) | 615 | (240, 350) | 780x430, (725, 375) |
| 404 | 2.43 | 100% | 218 / 1.64 | 133 | (720, 392) | 615 | (240, 352) | 775x500, (737, 370) |
| 412 | 2.70 | 100% | 218 / 1.64 | 133 | (720, 392) | 615 | (240, 352) | 765x570, (747, 365) |
| 420 | 2.97 | 100% | 218 / 1.64 | 133 | (720, 392) | 618 | (240, 352) | 782x634, (749, 365) |
| 428 | 3.23 | 100% | 218 / 1.64 | 133 | (720, 392) | 618 | (240, 352) | 795x690, (747, 365) |
| 436 | 3.50 | 98% | ~215 / 1.62 | 131 | (718, 393) | 615 | (240, 350) | 805x733, (747, 368) |
| 444 | 3.77 | 96% (1% back) | ~213 / 1.60 | 129 | (718, 395) | 610 | (245, 345) | 792x745, (744, 378) |
| 452 | 4.03 | ~31% (68% back) | 160 / ~1.2 | ~95 | (720, 390) | 512 | (255, 255) | 508x492, (724, 386) |
| 460 | 4.30 | ~5% (95% back) | ~136 / 1.02 | 82 | (727, 383) | 478 | (255, 220) | 390x385, (715, 378) |

- Rest framing (F328) for comparison: floe line at y about 470, left peak (250, 212), orb (721, 370) Ø 133.
- The hold moves the background about +140 px down, which matches the doc's +136 px far-band shift.
- Dolly: r 20.93 → about 12.7 m at constant FOV, as in doc 5.2.
- **Orb y in the sustain** is from:
  - the orb cap's top edge at y 283-285 (F424, F428, F436, F440);
  - the disc's bottom edge at y 500-505 (F388-F404);
  - width 615-830 (F396-F404).

  These give a centre of 392 ±6. See section 8.1.

---------------------------------------------------------------------------------------------------

## 4. Piece identities (how each piece was traced)

Traced across all 37 frames, every 4 frames.
- **A-T** ← the **left end-on block** at the pop (F358: 370,375,495,500). [M, high confidence] It is continuous through:
  - F364 (325,335,465,480)
  - F372 (310,290,475,445)
  - F384 (320,220,535,390)
  - F396 (335,160,600,335)
  - F404 (350,120,655,300)
  - F412 (365,80,710,268)
  - F420 (382,48,765,235)
  - F440 (425,0,865,168)
  - F453 (565,152,862,242)
- **A-R** ← the **level bar across the orb** at the pop (F358: 515,290,985,478). [M, high] It turns CW and slides right:
  - F372 (550,270,1075,440)
  - F384 (625,215,1125,505)
  - F396 (700,190,1115,515)
  - F402 (738,177,1120,530), the "diagonal slab"
  - F420 (853,148,1140,578)
  - F440 (955,138,1150,605)
- **A-B** ← the **right end-on block** at the pop (F358: 985,290,1080,420). [M, medium] It slides down the right side (F364 1035-1120 → F372 1070-1130, abutting A-R's right end) and appears at the lower right from F396 (830,470,1100,590). Between F380 and F396 it overlaps A-R's lower end and the lower segment of B's diagonal, so this hand-over is the least certain link.
- **A-L** ← **not visible at the pop** (behind A-R's bar and the orb). [M, medium before F392, high after] A block appears at A-R's left end from about F372 (460,360,520,460) and becomes the left band by F392-F404 (385,290,560,480).
- **B** ← the **continuous diagonal** at the pop. [M/I, medium] Its upper segment becomes the band over the orb (F396-F408) and then the lens (F412-F428). This matches the engine's `POP_AXIS[1]` reading and the round-10 judge. Caveats:
  - the bar is 105-115 px wide, while B's 0.688 m axial height gives only 80-90 px at 116-127 px/m;
  - its length grows from about 4.3 m (F352) to about 5.2 m (F372).

  So B either shows ~15-20° of its face, or its halves part about 1 m **along** the bar, hidden behind A-R's bar.
- **C** = the face-on ring about 390-420 px across at 133 px/m (3.1 m); **D** = the ring inside it, about 320-330 px. [M, medium] At the pop only C is visible (D is behind it).
- **[I] Why the model is self-consistent**:
  - The doc's rest geometry has A horizontal (axis (0,1,0)) with its seams at 45/135/225/315°, so its quarters sit front/left/right/back.
  - That is exactly the pop pose: a front bar, two end-on side blocks and a hidden back quarter.
  - Rotating that pose 120° about (-1,1,-1)/√3 gives A face-on with the quarters at 12/3/6/9 and the seams on the diagonals, which is exactly F453.
  - At about θ = 60° this turn predicts A-T at about 135°, A-R at about 27° (still in front), A-B at about -45° and A-L at about 207°. The measured F396-F404 values are 140-150°, 8-12°, -29..-34° and 178-180°.
  - The rigid turn alone does not give the pairing; the pairing is the side pair lagging by 25-35° at F420.

---------------------------------------------------------------------------------------------------

## 5. Key-frame sheets (per piece)

Faces:
- "rim" = the outer rim (the ring's 0.843 m axial height for A, 0.688 m for B);
- "flat face" = the annular face (0.421 m wide for A, 0.344 m for B);
- "edge-on" = seen in its own plane (a straight bar);
- "end-on" = seen along the chord (a compact block showing the cut face).

### F340 (t 0.30 s): charge, passing through the eye; camera about 2%, rest framing
| piece | bbox | face | tilt | orb | gaps |
|---|---|---|---|---|---|
| A whole (quarters joined, seams hairline on the diagonals). Quadrants on screen: top (585,176,850,240), right (840,235,898,525), bottom (590,505,845,568), left (533,230,600,520) | (533,176,898,568) | flat face; outer rim visible on the left (band about 55 px left vs about 40 px right) | near face-on, yawed about 20° about the screen vertical (W/H 0.93) | encloses it | A→B 15-30 px, concentric |
| B whole (split 0) | (548,215,865,510) about 317x295 | flat face | near face-on, tipped (leaning ellipse) | encloses it | B→C/D 20-40 px |
| C/D (nested) | (600,295,850,455) | C nearly flat: its near band crosses the orb's lower half at y 375-455; D tilted round the orb's upper half (625,300,800,420) | | C hides the orb's lower half | |
| orb | centre (718,365), Ø ~134 | | | upper half visible (655,305,780,390) | |

Identities of A's quarters before the pop cannot be traced (A whole and tumbling). The engine only has to **arrive** at the pop pose.

### F352 (t 0.70 s): the X knot; camera about 19%
| piece | bbox | face | tilt | orb | gaps |
|---|---|---|---|---|---|
| A whole, edge-on bar | (528,248,912,512) | rim (about 90 px) | rising **+30°**; lower-left end (528-600, 425-512) = future A-T, upper-right end (835-912, 248-335) = future A-B [I] | crosses it | |
| B whole (split about 0.5%), edge-on bar | (618,222,805,545) | rim (about 85 px) | falling **-70°**; top end (618-718, 222-292), bottom end (700-805, 440-545) | **in front of A** at the crossing (about 700-760, 330-430) | |
| C/D | (590,280,855,480) | face-on-ish, behind the X | | | |
| orb | ~(720,383) | | | hidden except a patch (730,360,790,420) | |

The two bars counter-rotate into the pop pose:
- A goes CW +30° → +10° (F356) → +7° (F358);
- B goes CCW -70° → -51° → -46°.

### F358 (t 0.90 s): THE POP (`ref_F358`); camera about 78%, 116 px/m
| piece | bbox | face | tilt | orb | gaps |
|---|---|---|---|---|---|
| **A-R** (A's front quarter) | (515,290,985,478), 470x~125 | rim + a sliver of the underside | level bar rising **+7°** (top edge y 350 at x 520 → y 295 at x 975) | **in front of everything**; hides the orb's middle/upper part | 20 px to A-T; 0-10 px to A-B |
| **A-T** (left quarter) | (370,375,495,500), ~125x125 | **end-on**: cut face to the camera | chord points at the camera | — | outer edge at 3.0 m from the orb (+0.6 m, x1.28) |
| **A-B** (right quarter) | (985,290,1080,420), ~95x130 | end-on, abutting A-R's right end | | — | outer edge at 3.1 m (+0.7 m) |
| A-L (back quarter) | hidden | | | behind the orb | |
| **B** (both halves, GLB split 22→79%) | (500,168,935,622): one **continuous straight** bar, centre-line (545,195)→(890,595); visible above A-R (500,168,725,330) and below it (750,430,935,622) | edge-on, about 105 px thick | falling **-46°** | behind A-R, in front of C | the two segments are collinear within about 10 px (no visible parting) |
| C (+D inside) | (550,220,905,570), about 355 px | face-on, behind B | | | |
| orb | ~(722,395), Ø ~192 | | | **only a 70x50 patch (650,440,720,490)** in the lower-left quadrant, about 8% | |

Reads as a burst cross: one level bar, one 45° bar and two end blocks. The extent is (370,168,1080,622).

### F364 (t 1.10 s): settle; camera about 93%, 127 px/m
| piece | bbox | face | tilt | orb | gaps |
|---|---|---|---|---|---|
| A-R | (520,285,1030,445) | rim + underside (now about 150 px tall) | level (top edge y about 300 → 290) | in front of the orb's upper half | A-T 55 px; A-B 0-5 px |
| A-T | (325,335,465,480) | end-on block | | | outer edge at 3.1 m (+0.7 m) |
| A-B | (1035,300,1120,440) | its curvature starts to show (a "C"-shaped end) | | | +0.75 m |
| A-L | hidden; a sliver at A-R's left end (490,385,530,470) | | | | |
| B | segments (465,150,730,300) and (775,425,980,625) | edge-on, about 115 px | -45° | behind A-R | |
| C | (490,195,880,590), about 390 px | face-on, thin | | frames the orb | |
| orb | (722,393), Ø ~210 | | | patch (630,430,760,500), about 20% | |

### F372 (t 1.37 s): sustain I begins; camera about 96%
| piece | bbox | face | tilt | orb | gaps |
|---|---|---|---|---|---|
| A-R | (550,270,1075,440) | rim → broad face starting to show | level, starting to turn CW | covers the orb's upper half | 75 px to A-T; abuts A-B |
| A-T | (310,290,475,445) | end-on block, rising (centre y 437→367 since F358) | | | midpoint θ 176°, r 329 |
| A-B | (1070,330,1130,470) | arc end | | | θ -1°, r 380 |
| A-L | (460,360,520,460) [low confidence] | vertical block at A-R's left end | | | |
| B | (435,155,740,335) + (820,420,1005,610) | edge-on, about 115 px | -40° | | |
| C | (460,205,880,585), about 420 px | face-on | | frames the orb | |
| orb | (720,392), Ø ~214 | | | lower half (620,395,830,500), about 45% | |

### F384 (t 1.77 s): slab cluster, the flattest moment; camera about 98%
| piece | bbox | face | tilt | orb | gaps |
|---|---|---|---|---|---|
| A-R | (625,215,1125,505) | **broad flat face** (a big slab) | turned CW to **-13°** (top edge (640,225)→(1080,330)) | covers the orb's upper right | |
| A-T | (320,220,535,390) | cut face to the camera (320-520, 225-365); its body recedes up-right | | | θ 164°, r 306 |
| A-L | (420,345,560,460) [medium-low] | block at the left of the C/D lens | | | |
| A-B / B's lower segment | (840,420,1020,575) [ambiguous] | | | | |
| B upper segment | (430,185,650,245), partly behind A-T | | near level | | |
| C/D | flat lens (520,350,860,515) | flat (both) | horizontal | the orb is a **slit (630,420,800,470)** between their bands, about 20% | |

Extent (320,185,1125,575) = 805x390, aspect 2.06.

### F396 (t 2.17 s): portal forming; camera about 100%, 133 px/m
| piece | bbox | face | tilt | orb | gaps |
|---|---|---|---|---|---|
| A-T | (335,160,600,335) | block: bright cut face (555-600, 165-290), body descends left (335-380, 250-335) | | | θ 150°, r 291; touches A-L |
| A-R | (700,190,1115,515) | broad face + rim; top-left cut end (700-760, 195-330) | diagonal, falling about -30° | | θ 8°, r 194 (still partly in front) |
| A-L | (385,290,560,480) | two parallel strips: an arc seen nearly edge-on | descending to the right (~-50°) | | θ 178°, r 248 |
| A-B | (830,470,1100,590) | rim (underside) | | | 0-20 px under A-R; θ -29°, r 281 |
| B | upper band (560,210,720,330) between A-T and A-R, above the orb; the lower half cannot be separated (behind C/D) | rim/underside | near level | its lower edge cuts the orb's top | |
| C | (515,310,905,560) [top hidden] | face-on | | frames the orb | |
| D | (555,330,880,545) | face-on | | frames the orb | |
| orb | (720,392), Ø 218 | | | (615,335,830,500), about 80% | |

### F404 (t 2.43 s): portal (between ref_F402 and F404); camera 100%
| piece | bbox | face | tilt | orb | gaps |
|---|---|---|---|---|---|
| A-T | (350,120,655,300) | block, bright cut face (600-655, 135-250), top surface (360-650, 120-215) | | | θ 140°, r 285; touches A-L |
| A-L | (375,300,530,480) | rim | descending to the right (~-50°) | | θ 180°, r 280 |
| A-R | (760,170,1125,530) | **broad flat face** (slab about 125 px wide), top-left cut end (760-800, 170-250) | falling **-43°** | its lower-left edge grazes the orb's upper-right rim | 0-15 px to A-B; about 105 px to A-T, bridged by B behind |
| A-B | (835,470,1095,620) | rim/underside | | | θ -34°, r 294 |
| B | (385,245,840,400) | underside/rim (seen slightly from below) | rolled about -8° | **crosses the orb's upper third** (lower edge about y 345-375 over the orb; ice is translucent) | |
| C | (515,192,920,600) [top hidden] | face-on | | portal | |
| D | (555,345,880,560) | face-on | | | |
| orb | (720,392), Ø 218 | | | (612,345,830,500), about 75% | |

**Open sky at the bottom-left** (x 530-835, y 480-600): A-L and A-B are about 300 px apart. Nothing is below y about 620. In ref_F402 the extent is (350,130,1120,612).

### F412 (t 2.70 s): portal → open frame
| piece | bbox | face | tilt | orb | gaps |
|---|---|---|---|---|---|
| A-T | (365,80,710,268) | "∩" arc: rim + top face, band about 85 px; right cut end (660-710, 110-210) faces the camera | chord about +12° | | θ 126°, r ~320 |
| A-L | (365,250,560,560) | descending arc along the left, overlapping B's left tip | ~-55° | | touches A-T (0-10 px at 10 o'clock) |
| A-R | (805,160,1130,560) | rim + face, band about 100 px; top cut end (820-880, 165-215) | chord about -60° | | 95-110 px to A-T (12:30-1 o'clock) |
| A-B | (740,540,1075,650) | rim | about +8° | | 0-10 px to A-R (4 o'clock); about 180 px to A-L (7 o'clock) |
| B | upper band (390,280,870,400) + lower part (430,450,920,590) | lens forming | | upper band over the orb's top third | |
| C | (515,225,925,590), about 410 px | **face-on portal** | | frames the orb | |
| D | (555,260,885,555) | face-on | | | |
| orb | (720,392) | | | (612,375,830,500), about 60% | |

### F420 (t 2.97 s): open frame (`ref_F420`, the main sustain target)
| piece | bbox | end caps | face / band | chord (lean) | midpoint θ / r / ratio | orb |
|---|---|---|---|---|---|---|
| **A-T** | (382,48,765,235) | left (385-450, 160-235); **right (700-765, 85-180), bright cut face to the camera** | rim + flat face, 80-100 px | +12° | 117° / 333 px / x1.14 | clear by ≥150 px |
| **A-L** | (358,235,622,570) | top (360-430, 238-310) cut face visible; bottom (560-622, 500-570) | mostly flat face, 60-70 px | -55° (leans "\" about 35°) | 185° / 311 / x1.07 | clear |
| **A-R** | (853,148,1140,578) | top (853-910, 148-215) cut face; bottom (1055-1110, 540-578) | flat face + rim, 95-110 px, darker steel-blue core stripe along its inner half | -62° (leans "\" about 28°) | 2° / 375 / x1.28 | clear |
| **A-B** | (698,548,1060,682) | right (1010-1060, 548-600) cut face; left (698-745, 590-650) | rim (underside), 80-90 px | +7° | 302° / 305 / x1.05 | clear |
| **B lens** | (390,285,935,512), 545x227 | **right seam block (935,330,1020,440)** | upper lid y 290-410 (broad), **slit y 410-440** (x ≈ 600-830), lower lid y 440-512 | horizontal, near edge-on (≈15° open) | — | **hides the orb except the 30 px slit and a tiny cap (690-760, 283-290); about 15%** |
| C/D | inside the lens, seen through the slit (520,400,860,470) | | flat | horizontal | | |
| orb | (720,392), Ø 218 | | | | | |

Gaps at F420:
- Between A arcs:

  | position | between | width |
  |---|---|---|
  | **about 12:40** | A-T right cap ↔ A-R top cap | **88 px** |
  | 10 o'clock | A-T ↔ A-L | 0-10 px |
  | **about 6:40** | A-L bottom ↔ A-B left | **80-100 px** |
  | 4 o'clock | A-B ↔ A-R | 0-15 px, caps butting at about (1055, 560) |

- Between the A arcs and B's lens: A-T 55-120 px; A-R 20-35 px (to the seam block); A-B 50-110 px; A-L 0 px (touches the lens' left tip).
- Wide gaps lie on one axis, about 69° ↔ 253°; narrow gaps on about 153° ↔ 334°. The read is two brackets: (A-T+A-L) upper-left and (A-B+A-R) lower-right.

Extent (358,48,1140,682) = 782x634, centred (749,365).

### F428 (t 3.23 s)
| piece | bbox | caps | face | orb |
|---|---|---|---|---|
| A-T | (390,20,810,205) | right (760-810, 50-155) cut face; left (395-460, 140-205) | rim + face, 80-95 px | |
| A-L | (350,222,590,582) | top (355-430, 222-290); bottom (540-590, 520-582) | flat face, 60-70 px | |
| A-R | (900,140,1145,585) | top (900-985, 140-200); bottom (1045-1100, 560-585) | face + rim, 90-105 px | |
| A-B | (655,575,1035,710) | right (1000-1035, 580-640); left (655-700, 600-660) | rim, 80-90 px | |
| B lens | (400,283,930,505) + seam block (930,325,1015,430) | | closed lens | **cap (620,283,790,320)** above the upper lid + slit (640,440,800,475), about 30% |
| C/D | inside the lens | | flat | |

- Gaps: 12:40 about 90 px; 10 o'clock about 20 px (opening); 7 o'clock about 70 px; 4:30 about 20 px.
- Extent (350,20,1145,710) = 795x690.

### F436 (t 3.50 s): late sustain; camera 98%
| piece | bbox | face | orb |
|---|---|---|---|
| A-T | (415,2,848,180) | rim + face; **top edge touches y about 2** | |
| A-L | (345,210,555,595), top cap (355-430, 210-260) | flat face | |
| A-R | (940,138,1150,598) | face + rim | |
| A-B | (620,597,1012,735) | rim | |
| B | band (395,370,930,500) + seam block (915,310,1005,420) | near edge-on, seen slightly from above | **in front of the orb's lower half** |
| C | (520,215,920,555), 400x340 | near face-on (tipped about 30° about X) | frames the orb's upper half |
| D | (560,250,880,520) | near face-on | |
| orb | (718,393) | | upper half (615,285,785,380) visible, about 45% |

- Gaps: about 1 o'clock 95 px; 10 o'clock 30-40 px; 7 o'clock 70 px; 4:30 35-45 px. The cursor disc sits in the 6:30 gap.
- Extent (345,2,1150,735) = 805x733.

### F444 (t 3.77 s, tr +0.03): release starts; camera 96% (1% back)
| piece | bbox | notes |
|---|---|---|
| A-T | (445,5,880,165) | midpoint θ about 101°: the side pair still lags +11..+13° |
| A-L | (348,205,528,598) | θ about 182° |
| A-R | (965,150,1140,605) | θ about 2° |
| A-B | (590,610,985,750) | θ about -77° |
| B | (420,365,945,530) + seam block (920,295,995,415) | in front of the orb's lower half |
| C | (515,190,920,590), about 405 px | face-on |
| D | (550,225,890,555) | face-on |
| orb | (718,395), Ø ~213 | (630,290,800,420), about 50% |

- Gaps: 1 o'clock 85 px; 10 o'clock 45; 7 o'clock 75; 4:30 55.
- Extent (348,5,1140,750) = 792x745, the largest of the hold.

### F452 (t 4.03 s, tr +0.30): release; camera 31% (68% back)
| piece | bbox | face | position |
|---|---|---|---|
| A-T | (555,140,862,235) | **face-on** flat face, band 45-55 px | 12 o'clock (θ 93°), r 228 (x1.09) |
| A-L | (470,240,570,540) | face-on | 9 o'clock, r 225 |
| A-R | (882,233,978,548) | face-on | 3 o'clock, r 234 |
| A-B | (582,545,880,632) | face-on | 6 o'clock, r 221 |
| B | the outer inner ring of a tilted **whirl** (535,255,905,530), tilted about 40° | flat face | closing (GLB snap F452-F454) |
| C/D | tilted inside the whirl | | |
| orb | (720,390), Ø 160 | | (640,320,800,460), **fully exposed** (about 90%) |

- Gaps **on the diagonals**: 1:30 about 45 px; 10:30 about 35; 7:30 about 50; 4:30 about 60.
- At F453 (ref): quarters at r 203-217 px (x1.05). A-T (565,152,862,242), A-L (485,238,578,535), A-R (868,235,958,540), A-B (578,530,875,615). Diagonal gaps 25-40 px. Orb (648,325,800,455).
- Extent (470,140,978,632) = 508x492.

### F460 (t 4.30 s, tr +0.57): reassembled eye; camera 95% back
| piece | bbox | face |
|---|---|---|
| A whole | (520,185,910,570), 390x385 | face-on, hairline seams on the diagonals (ring closed since F456: (510,172,928,590) with visible seams) |
| B | (548,232,882,555) | near face-on, just inside A |
| C | (590,290,850,470) | tilted |
| D | horizontal band across the orb (615,345,830,440) | near edge-on |
| orb | (727,383), Ø ~136 | (655,310,800,455), partly behind D |

- Three outer rings are visible (A, B, C). The inner ring spans y 300-460 (T21).
- Tumble resumes: F464 A is a tilted ellipse (528,205,900,552); F468-F472 full tumble.

---------------------------------------------------------------------------------------------------

## 6. Trajectories (for keyframing)

### 6.1 Ring A's quarters: midpoint θ (deg) / r (px)
Lag = how far CCW of its final slot (A-T 90°, A-L 180°, A-R 0°, A-B 270°) the quarter still is.

| F | A-T | A-L | A-R | A-B | side-pair lag (T/B) | front/back pair (R/L) |
|---|---|---|---|---|---|---|
| 358 | 188 / 293 (block) | hidden | in front (bar +7°, r ≈ 30) | 7 / 313 (block) | +98 / +97 | — |
| 372 | 176 / 329 | (184 / 231) | 22 / 99 (bar, level) | -1 / 380 | +86 / +89 | in front |
| 384 | 164 / 306 | (182 / 230) | 12 / 158 (slab -13°) | (-4 / 363) | +74 / +86 | +12 / +2 |
| 396 | 150 / 291 | 178 / 248 | 8 / 194 (slab -30°) | -29 / 281 | +60 / +61 | +8 / -2 |
| 404 | 140 / 285 | 180 / 280 | 12 / 240 (slab -43°) | -34 / 294 | +50 / +56 | +12 / 0 |
| 420 | 117 / 333 | 185 / 311 | 2 / 375 (chord -62°) | -58 / 305 | +27 / +32 | +2 / +5 |
| 440 | 103 / 360 | 180 / 346 | 0 / 400 (chord -79°) | -76 / 326 | +13 / +14 | 0 / 0 |
| 452 | 93 / 228 | 180 / 225 | 0 / 234 | -87 / 221 | +3 / +3 | 0 / 0 |
| 453 | 90 | 180 | 0 | 270 | 0 | 0 |

- Fit [D]: side-pair lag ≈ 98° - 1.02°·(F - 358), i.e. about **-30°/s, roughly linear** from the pop to the release snap.
- Front/back pair: A-R reaches 3 o'clock (r ≥ 240) by F404. A-L is at 9 o'clock from F392.
- Chord lean of the side arcs ("\", i.e. CCW): A-L 35° / A-R 28° at F420, then 18° / 11° at F440, then 0 at F452. Top/bottom arcs: +12° / +7° (F420), then +7° / +6° (F440), then 0.
- Radial offset of the centre-line (m, perspective-uncorrected) [D]: out(θ) ≈ base + 0.22·cos(θ - 30°).
  - base +0.30 m at F420, +0.54 m at F440.
  - Release: +0.2 (F452), +0.1 (F453), 0 (F456).
  - The pop itself throws the side blocks to +0.6-0.7 m (F358-F372). They come back to x1.05-1.14 while sweeping (F404-F420), then drift out again.
- Band width (face shown) at 133 px/m:

  | quarter | band (px) | face shown |
  |---|---|---|
  | A-T | 80-100 | rim + face |
  | A-L | 60-70 | mostly flat face |
  | A-R | 95-110 | face + rim |
  | A-B | 80-90 | rim |

  All drop to 45-55 px (face-on) at F448-F453.

### 6.2 Ring B (the lid)
| F | shape | position | vs the orb |
|---|---|---|---|
| 352 | edge-on bar, -70° | (618,222,805,545) | in front at the X |
| 358-372 | one continuous edge-on bar, -46° → -40°, 105-115 px thick | (500,168,935,622) → (435,155,1005,610) | behind A-R's bar, mostly in front of the orb |
| 380-392 | rolling toward level; upper segment (430,170,720,290) | | top-left of the orb |
| 396-412 | broad band seen from below, rolled about -8° | (385,245,840,400) | **over the orb's top third**; lid centre about 70 px above the orb centre |
| 416-428 | **closed lens** (390,285,935,512), slit 25-35 px at y 410-440 | + seam block (935,330,1020,440) | hides about 85% of the orb |
| 432-448 | near edge-on band seen slightly from above | (395,360,945,530) + seam block | **over the orb's lower half**; lid centre about 40-50 px below the orb centre |
| 452-456 | closes; outer ring of the inner whirl | | orb exposed |
| 460 | near face-on just inside A | | |

B's visible lid drifts down about 120 px relative to the orb over F404-F444 (about 3 px/frame). This is consistent with B tipping about 30° about the screen X axis.

### 6.3 C and D (locked together)
- Face-on F358-F374; flat F376-F388; face-on (portal, C about 410 px) F390-F413; flat inside B F416-F429; face-on (C about 400-405 px) F432-F449.
- Then a whirl (F452-F456) and the eye (F455-F462: inner band across the orb, y 300-460).
- Flat-phase centres are about F382 and about F422; face-on centres are about F366, F402 and F441. That is a **~40-frame (1.33 s) cycle**, i.e. about 135°/s about a near-horizontal axis.

### 6.4 Orb visibility (share of its disc)
| F358 | F364 | F372 | F384 | F396 | F404 | F412 | F420 | F428 | F436 | F444 | F452 | F460 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 8% | 20% | 45% | 20% (slit) | 80% | 75% | 60% | 15% | 30% | 45% | 50% | 90% | 70% |

### 6.5 Overall extent (ice) [M]
| F358 | F364 | F372 | F384 | F396 | F404 | F412 | F420 | F428 | F436 | F444 | F452 | F460 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 710x454 | 795x477 | 820x455 | 805x390 | 780x430 | 775x500 | 765x570 | 782x634 | 795x690 | 805x733 | 792x745 | 508x492 | 390x385 |

---------------------------------------------------------------------------------------------------

## 7. Why the reference reads as a legible "exploded opening" and not a tangle

1. **Hierarchy by ring size.**
   - Only ring A explodes, and its quarters end up **outside** everything as a frame (after F404 every arc is ≥150 px from the orb's edge).
   - B stays central as one lid.
   - C/D stay whole and concentric. No inner piece is ever outside A's arcs.
2. **Motion is radial plus one shared rotation.**
   - Each quarter's offset is along its own bisector (the side blocks fly out horizontally at the pop; later the spread grows along each arc's bisector).
   - Their angular motion is a shared clockwise sweep. The only non-shared component is the side pair's lag (≤35° at F420), which decays smoothly to 0 at the release.
   - No quarter ever passes another.
3. **Gaps are big, few and consistent.**
   - F404-F420: two wide gaps (80-110 px) on one axis, with the other joints touching cap to cap.
   - F436-F444: four gaps of 35-95 px.
   - F452: four diagonal gaps of 35-60 px.
   - **Arcs never cross mid-span.** When two arcs meet, they meet end-cap to end-cap.
4. **Chunky slabs with visible cut ends.**
   - Each quarter is rolled to show its rim + face (60-110 px), so it reads as a thick piece of a broken ring.
   - The bright cut face on one end of each arc (the end flanking a gap) tells the eye "this is a fragment of a circle".
   - Long thin ribbons with no visible ends read as a tangle.
5. **Exactly one lid across the orb.**
   - At every moment one near-horizontal band crosses the orb (A-R's bar at the pop, then B). Never two crossing diagonals over the orb after F372.
   - The orb is partly covered and glows through the slit or around the lid. It is a reveal, not a bare white disc.
6. **The opening is slow and lags the camera.**
   - The camera lunges in 0.3 s (F354-F363) together with the pop impulse.
   - The opening then takes about 1.5-2 s (F372-F420) to resolve into the four-arc frame.
   - The eye gets the fast punch first and the readable composition second.
7. **Rotation sense is clockwise in motion, CCW only as a lag.**
   - The F420 "rotated 15-20° CCW" impression comes from the side pair still arriving.
   - A CCW spin, or symmetric "horns" (left and right arcs leaning in opposite directions), breaks the read.
   - In the reference both side arcs lean the **same** way ("\").
8. **The silhouette evolves from wide-flat to round.**
   - Slab phase aspect about 2.0, then open frame about 1.2, then release about 1.0.
   - Centred 25-30 px right of the orb.
9. **Everything keeps moving.**
   - Side pair about 1°/frame; A-T's top edge 2-3 px/frame; C/D flipping on a 1.3 s beat; B's lid drifting 3 px/frame.
   - It never freezes, and nothing moves fast except the pop and the release snap.

---------------------------------------------------------------------------------------------------

## 8. Corrections to video_choreography.md (2.1, 2.6, 2.7) and to older QC readings

1. **Sustain orb centre: (720, 392) ±8, Ø 218 px.** The doc's (719, 420) and the "orb 40-55 px low" readings do not hold.
   - The orb's cap top is at y 283-285 at F424 / F428 / F436 / F440; the cap is 160-170 px wide 35 px below its top, which fits r 109.
   - Its bottom edge is at y 500-505 at F388-F404.
   - The blob centroid was biased low because B / C hide the orb's top.
   - [D] With the far-band pitch +4.6°, the camera then sits about 0.95 m below the orb (y ≈ 2.10, not 2.32). Equivalently, at a fixed hold camera the hero rides about 0.2 m higher than the doc's model.
2. **No "contraction while held".** The doc's 754x690 at F436-F444 is not supported:
   - ice extent 782x634 (F420) → 795x690 (F428) → 805x733 (F436) → 792x745 (F444);
   - centre-line radius ratio grows from x1.14 to x1.25;
   - the only shrink is the camera's 3% ease-back.
3. **"Set rotated 15-20° CCW" is a static lag**, measured +27..+32° for A-T/A-B and +2..+5° for A-R/A-L at F420. The motion is a ~95° **clockwise** sweep of the side pair from the pop to F452.
4. **C/D** are not only face-on at F436-F444. They flip face-on ↔ flat on a 1.33 s cycle through the whole hold (section 6.3).
5. **B** "two stacked horizontal bands spanning y 285-505" is, on screen, **one closed lens** (two lids around a 25-35 px slit), with a seam block at its right end. **B's GLB split (+0.47 / -0.57 m) is never visible as a vertical parting.**
6. **Pairing handedness**: the arcs pair **top+left / bottom+right**, with wide gaps at about 12:40 / 6:40.
7. **Rings.ts comments (lines 418-419 and 809-811, which drive `holdW` and the spread model)** say "F420's quarters sit ~300-315 / 287 / 250 / 230 px ... tucked in at the bottom and left". They do not match.
   - Measured midpoint radii: A-T 333, A-R 375, A-B 305, A-L 311 px from (720, 392), i.e. x1.14 / 1.28 / 1.05 / 1.07.
   - All quarters are **out**; none are tucked in. The rest centre-line is 291 px at 133 px/m.

---------------------------------------------------------------------------------------------------

## 9. Engine mapping and gaps vs builds #69/#70 (suggestions; to be tuned with probe_holdvar / probe_holdbounds)

### 9.1 Where our captures differ
| capture | reference | gap |
|---|---|---|
| **p04** (pop) | F358 | The orb is clearly visible inside a face-on C/D tunnel (about (640,400,790,500)), where the reference hides about 92%. B's diagonal is broken into two blocks (530,205,700,330) + (790,420,910,550), where the reference has one continuous bar (500,168)→(935,622), 105 px thick. The level band (475,300,915,430) and the end blocks (383,395,545,515) / (915,265,1040,405) are close, but the reference's right block sits about 60 px further out (985-1080) and the left block 15 px further left. The tunnel centre is 35 px low (T21). |
| **p05** | F402 | A-T is a long thin arc (370,105,890,450) and the right arc reaches y 680, where the reference has an A-T block (350,130,640,305) with a cut face, an A-R diagonal slab (738,177,1120,530) and nothing below y 612. B is a band across the orb's middle with the orb fully exposed; the reference has B over the orb's top third and C/D as a face-on portal. |
| **p06** | F420 | Ours is a **compact "G"** (460,120,1090,655), whose top and right quarters chain into one ~150° arc. That is the **mirror** of the reference's pairing (top+left / bottom+right). Our arcs are long thin ribbons with no visible cut ends; the orb is fully exposed above B's band; the orb centre is about (730, 406), i.e. about 14 px low and 10 px right. The reference has four arcs (358,48,1140,682), x1.05-1.28 out, and a closed B lens. |
| **p07** | F453 | Our quarters are centred on the diagonals (gaps at about 12:30, 4, 7, 9:30), about 45° off. The reference has them at 12/3/6/9 with gaps on the diagonals. |
| **p08** | F460 | Inner ring y 310-415 vs 300-460; two outer rings vs three (T21). |
| **sw_hold_T / R** | — | The chained G / "horns" persist at every pointer position. The left and right arcs lean in opposite directions; in the reference both lean "\". |

### 9.2 Parameters (current values → target direction)
- **`Rings.tune.holdCompact` 0.78 → 1.0.** The reference never pulls A in.
- **Spread** (`aOutBase` -0.22, `aOutAmp` 0.15, `aOutPhaseDeg` 65, `aOutH` 0.35):
  - target out(θ) ≈ +0.30 + 0.22·cos(θ - 30°) m at F420, growing to +0.54 base by F440;
  - i.e. `aOutBase` about +0.30, `aOutAmp` 0.22, `aOutPhaseDeg` about 30, `aOutH` about 0, plus a slow growth instead of `relaxA`.
- **`relaxA`** (Choreography.ts line 351: smoothstep(3.0, 3.7, tp), applied in Rings.ts lines 827 and 836): **remove the shrink, or invert it** into +0.2 m of growth over 2.9-3.7 s.
- **Clockwise sweep instead of a fixed CCW phase.** Today: `aPhaseDeg` 22 latched to the nearest 90° step, then `aPhaseDrift` **+6°/s**, measured in the hold frame (`holdRollDeg` -15, `holdPitchDeg` +20). `A_EXPAND_TURN` 17.5° only sets the `holdW` weights (Rings.ts lines 404-424). Target:
  - in screen terms, the set's mean offset +30° (F404) → +16° (F420) → +7° (F440) → 0 (F452), about -25..-30°/s (so `aPhaseDrift` must be negative, i.e. clockwise on screen), still latched so it does not depend on the press moment;
  - the top/bottom slots lead the left/right ones by an extra ±23° (F404) → ±13° (F420) → ±6.5° (F440) → 0 (F452);
  - in `aSlotSlide` order (top, left, bottom, right), on screen with CCW positive: about [+13, -13, +13, -13] at F420;
  - **check the sign against `holdSign`**, because p06 currently produces the mirrored pairing.
- **`aSpinAmp` 22 · cos(th)** leans the side arcs in opposite directions (horns). The reference leans **both** side arcs CCW ("\" by about 30° at F420, about 15° at F440). Use a common lean, e.g. `aSlotSpin` about +15° on the left/right slots on top of the set offset, and drop the cos(th) term.
- **Face shown** (`aSlotTilt` [55,-42,48,-55], `aLowerTiltCap` 18): the target is a 60-110 px band with one cut end toward the camera (section 6.1). The bottom quarter shows its underside rim (80-90 px), so `aLowerTiltCap` 18 may be too low.
- **B lid:**
  - **`bSplitHeld` 0.35 → ≤ 0.12** (no visible parting; same as T12).
  - **`bPortalSplit` 0.6 → 0.** At F402 B is over the orb's top third; parting it exposes the orb, the opposite of the reference.
  - Add a slow B pitch so its visible lid moves from about 70 px above the orb centre (F404) to about 45 px below it (F440).
  - Keep or create a visible seam block at B's right end (x 905-1020).
- **C/D timing.** `portal` = bump(1.95, 2.25, 2.5, 2.85) is about right (reference face-on F390-F413). `faceInner` = smoothstep(2.9, 3.5) → about smoothstep(3.0, 3.35), so C/D stay flat in B until about F428 and are face-on by F432.
- **Pop** (`POP_AXIS`, `POP_WEIGHT`, the chunk term in Rings.ts line 826):
  - A is a level band rolled +7°, and it must be A's **front** quarter in front of the orb, with the side quarters end-on and thrown symmetrically to about +0.6-0.7 m. Today `chunk` is 0.52 left / 0.32 right.
  - B -46° (today 50°), **continuous**, 105-115 px thick (show about 15-20° of its face).
  - C face-on behind.
  - Orb ≤ 10% visible.
- **Release.** The quarters must finish the clockwise sweep and be face-on at the cardinal slots by tr +0.30 s (F452), at x1.09 → x1.05 (F453) → closed (F456). T21's `aRelPhaseDeg` +40 points the right way; verify the sign is CW on screen.
- **`HeroEngine` holdLift** 0.28 × camExpand. With the camera fixed on the hold plate, our p06 orb sits about 14 px low and 10 px right of (720, 392): about +0.1 m more lift and about -0.07 m in x. Re-measure on the next capture first.

### 9.3 Frame bounds and UI (a design decision to flag)
- The reference's late sustain fills the frame vertically: A-T's top edge at y 0-5, A-B's bottom edge at y 735-750 (F436-F444).
- On the site:
  - A-B would cross "Scroll to Explore" (657-783, 693-712);
  - A-L's lower end (470-555, 520-598) would cross the headline block (57-590, 465-650).
- `probe_holdbounds` (top ≥ 10, bottom ≤ 715) is stricter than the reference. Decide whether to:
  - (a) match the reference and let ice pass behind the copy; or
  - (b) cap the late growth (keep the F420-F428 extent, about 790x690, from F428 to the release).

  Do **not** cap it by pulling A in (that produced the compact G).

---------------------------------------------------------------------------------------------------

## 10. Acceptance checklist (compare in-engine 1440x766 captures at the same t)

| frame / t | must match (tolerance) |
|---|---|
| **F358 / 0.90 s** | Extent about 710x454 (±40), centre (725, 395) ±15. Level A bar 450-480 px long, 115-130 px thick, rising 5-10°, **in front**. One **continuous** B diagonal -40..-50°, 100-115 px thick, (500,168)→(935,622) ±25. End blocks at (370,375,495,500) and (985,290,1080,420) ±25. **Orb ≤ 10% visible.** C face-on (about 355 px) behind. |
| **F384 / 1.77 s** | Extent about 805x390, aspect ≥ 1.9. C/D flat (a 340 px lens), orb only a slit. A-R a slab turned -10..-15°. A-T an end-on block at the left (320,220,535,390). |
| **F402-F404 / 2.4 s** | Extent about 770x480-500, **nothing below y 615**. C/D face-on portal (C about 400 px) framing the orb, 70-80% visible. B over the orb's top third. A-R a -40..-45° slab (738-760, 170-180)→(1120, 530) ±25. A-T a block (350,120-130,640-655,300) with a visible cut face. About 300 px of open sky at the bottom-left. |
| **F420 / 2.97 s** | Extent 782x634 ±30, centre (749, 365) ±15. A-T (382,48,765,235), A-L (358,235,622,570), A-R (853,148,1140,578), A-B (698,548,1060,682), each ±20. Midpoint radii 333 / 311 / 375 / 305 px ±20. Gaps: 12:40 88 ±20, 6:40 80-100, 10 and 4 o'clock ≤ 15. **B lens (390,285,935,512) ±20, slit 25-35 px at y about 410-440, orb ≤ 20% visible.** Seam block (935,330,1020,440). Both side arcs lean "\". |
| **F440-F444 / 3.7 s** | Extent 790-810 x 735-750 (or the agreed UI-safe cap). Four gaps about 85-95 / 40-45 / 70-75 / 45-55 px. C face-on about 405 px. B in front of the orb's lower half. Orb's upper half visible. Side-pair lag about +13°. |
| **F452-F453 / tr +0.30-0.33** | Quarters face-on, centred at 12/3/6/9 (θ within ±5°). Diagonal gaps 25-60 px. Midpoint r 205-235 px. Inner whirl round a fully visible orb, Ø 150-160 px. |
| **F456 / tr +0.43** | Ring A closed with hairline seams on the diagonals, Ø about 418 px. |
| **F460 / tr +0.57** | Ring A whole and face-on, about 390 px. Three outer rings visible. Inner band across the orb, y about 300-460. |
| **continuity** | Side pair sweeps CW about 1°/frame with no reversal. No arc crosses another mid-span after F404. Exactly one lid across the orb at all times F372-F448. |
