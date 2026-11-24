# Retrux hero: frame-accurate choreography report
Sources: `E:\Retrux Hero R&D\State 2 to 5.mp4` (500 frames) and `Default Loop.mp4` (121 frames), plus the earlier agent's measurements in `research\video\work\`, the Blender agent's scene forensics in `research\blender\`, and the new light-weight measurements in `research\video\choreo\` (CSV/JSON/JPG only, plus 3 single-frame PNG extractions in `choreo\pal\`). Nothing in this pass used Blender, a browser, video decoding loops or the .npy arrays.

---------------------------------------------------------------------------------------------------

## 0. Conventions, what each number means, confidence tags

* **Frames**: `F###` = 0-based frame index at 30 fps, `t = F/30` s. State video F000-F499 (16.667 s), Loop F000-F120 (4.033 s). Both 1440x766, H.264 Main (MainConcept), no colour tags, decoded as BT.709 limited range to full range (`scripts\vidio.py`).
* **Pixels**: full-res 1440x766, origin top-left, y down. **NDC**: `nx = (x-720)/720`, `ny = (383-y)/383` (up = positive).
* **3D**: Blender world (Z up, metres) maps to three.js (Y up) as `(x, y, z)_three = (x_b, z_b, -y_b)`. All 3D values below are three.js unless marked "(Blender)".
* **Tags**: **[M]** measured from pixels or data (source given), **[D]** calculated from [M] plus scene geometry, **[I]** interpretation, **[R]** recommendation for the build.
* **Pixel scale at the orb, rest camera**: f = 1690.1 px, orb distance 20.927 m, so **80.76 px/m**. A 1 degree change of camera yaw/pitch moves the far background by **29.5 px** [D].

How the source numbers were produced (read from the scripts):

| file | meaning |
|---|---|
| `work\cursor_track.csv` | per-frame ring-template match (annulus template on a DoG image, Viterbi path). `r` = ring radius (search 32-45 px). `contrast` = mean luma inside r-8 minus annulus r+5..r+14: about 0 = hollow ring, +25..+52 = filled disc. Gaps filled by `cursor_track_filled.csv` (local search) and 3 manual waypoints F20 (530,394), F25 (380,408), F60 (1116,615). |
| `work\s25_measure.csv` | orb = clipped-white blob (Y>=250) centroid/bbox/area. far/mid/near = **chained** LK similarity transforms of background bands since F0. Chained values drift (about -0.13 px/frame, proven on the static Loop), so they are used for timing only. |
| `work\register_dense.txt` | **direct** SIFT fit of a frame against F0 per band (far y150-440 = mountains/icebergs, mid y445-560 = shelf/slabs, near y590-766 = rocks/water; hero disc masked). dx, dy = shift of the band's centre-column point, s = scale. This is the absolute camera proxy used here. The near band is partly contaminated by the moving ripples. |
| `work\*_shard_stats.json`, `loop_shards.json`, `loop_shardflow_0_119.json` | cobalt blobs (H 213-235 deg, S>=0.36, V>=0.72): count, size, radius from the orb, per-frame motion; dense DIS flow of cobalt pixels in the Loop. |
| `work\loop_concentric.json`, `choreo\concentric_jpg.py` | frontal-alignment metric: 1 - (angular variance / total variance) of the hero in polar coordinates, r = 60-200 px. About 0.3+ when all rings are concentric and face-on. |
| `blender\camera_solve_states.json` | Blender agent's pinhole solves at t = 0 / 2.5 / 8.5 / 13.0 s from 4-6 point correspondences (13.0 s marked low confidence). |
| `blender\forensics_final.json`, `eval_analysis.json`, `glb_anim_extract.json` | scene geometry (rings, shards, orb), Wave modifier, orb material drivers, baked GLB animation (Home - Full.glb). |

---------------------------------------------------------------------------------------------------

## 1. Cursor track summary

### 1.1 Look [M]
* **Hollow ring**: radius **39.5 px (diameter 79 px = 5.5 % of frame width)** in every hollow frame (template score up to 0.97). The stroke is a thin white line. Over sky (F078) the luma profile peaks at r 39-40 px (228 vs 206 background, about 3 px FWHM after encoding), which means white at about **55-65 % opacity, 1.5-2 px wide** [`choreo\palette.py`].
* **Pressed / held**: a translucent white **disc of radius 38.5 px (diameter 77 px)** fills the ring. Interior luma 223 vs 190 just outside (F420), so white at about **51 % opacity**. The ring stroke stays on the rim and merges with the disc edge. Ice edges seen through the disc look slightly softened (possible backdrop blur; not verified).
* **The brief's hypothesis "~30 px ring vs ~80 px disc while holding" is not supported.** Ring and disc are the same ~78-79 px. Only the fill changes.
* **Click micro-animation** (F223-F236): F223-F226 the ring contracts to r 34-35.5 (x0.87, pointer-down). F226-F232 the inner disc grows from the centre, r = 9, 17, 25, 30, 33, 36, 39 px per frame (ease-out, 0.20 s), and the ring returns to r 37.5-39.5. F233-F236 the disc fades (0.13 s). Hollow from F236.
* **Long press** (F331-F447): disc r = 7, 15, 22, 27, 31, 33, 35, 36, 37, 37, 39 px over F331-F341 (ease-out, 0.33 s). Held as a disc to F442. Fades F443-F447 (0.15 s). Hollow at F448.
* No hover state (radius and contrast unchanged over the hero F144-F179), no colour change, no trail, no motion blur, no visible lag (the overlay was composited 1:1).

### 1.2 Track [M `cursor_track.csv`, `cursor_track_filled.csv`, manual waypoints]
"dist" = distance from the rest orb centre (721, 369.5). Ring A (outer ring) screen radius at rest = 194 px, shard belt = 271 px.

| # | frames | t (s) | position (px) | look | speed | inferred action [I] |
|---|---|---|---|---|---|---|
| C1 | F000-F013 | 0.000-0.433 | (738,399), dist 34 | hollow | 0 | resting on the orb, no scene response |
| C2 | F014-F035 | 0.467-1.167 | to (530,394) F20, (380,408) F25, (218,540) F36 | hollow | avg 24 px/f (720 px/s), eased | move: sweep left/down |
| C3 | F036-F045 | 1.200-1.500 | (218,540) to (223,555) | hollow | under 2 px/f | dwell (lower-left) |
| C4 | F046-F069 | 1.533-2.300 | (232,559) to (1116,615) F60 to (1198,258) F70 | hollow (lost by detector) | avg 42 px/f (1265 px/s) | move: sweep right then up |
| C5 | F070-F084 | 2.333-2.800 | eases into (1214,187), still F77-F81 | hollow | decelerating | dwell (upper-right, sky) |
| C6 | F085-F098 | 2.833-3.267 | to (969,636) | hollow | avg 37 px/f | move down |
| C7 | F099-F126 | 3.300-4.200 | (943,683), still F108-F117, drifts to (931,666) | hollow | 0-3 px/f | dwell (lower-right, water) |
| C8 | F127-F143 | 4.233-4.767 | (928,661) to (819,513) F138 to (794,479) | hollow | about 17 px/f | move onto the hero |
| C9 | F144-F179 | 4.800-5.967 | (794,479) still, dist 132 | hollow (unchanged) | 0 | **hover/dwell on the hero** (lower-right quadrant, inside ring A) |
| C10 | F180-F203 | 6.000-6.767 | to (899,525) at F199, still F198-F203 | hollow | at most 15 px/f, eased | move off the hero, short dwell |
| C11 | F204-F222 | 6.800-7.400 | drifts to (848,446), dist 149 | hollow | 1-10 px/f | move onto the hero |
| C12 | F223-F236 | 7.433-7.867 | (848,446) | shrink, fill, fade | 0 | **CLICK** (press about 0.2-0.3 s) |
| C13 | F237-F250 | 7.900-8.333 | to (1004,658) | hollow | about 18 px/f | move off the hero |
| C14 | F251-F311 | 8.367-10.367 | (1013,670) still | hollow | 0 | dwell 2.0 s (water) |
| C15 | F312-F330 | 10.400-11.000 | to (794,528) | hollow | 14-25 px/f | move onto the hero |
| C16 | F331-F442 | 11.033-14.733 | (770,513) F334, drifts to (798,569) by F368 (dist 151 to 212), still F368-F433 | disc grows F331-F341, held F341-F442 | 0-3 px/f | **PRESS AND HOLD 3.7 s** |
| C17 | F443-F458 | 14.767-15.267 | to (848,625) F450 to (895,677) | disc fades F443-F447 | up to 15 px/f | **RELEASE** + move off |
| C18 | F459-F499 | 15.300-16.633 | (895,677) still | hollow | 0 | dwell to the end |

### 1.3 Action list [I]
move F014-F035, dwell F036-F045, move F046-F069, dwell F070-F084, move F085-F098, dwell F099-F126, move to hero F127-F143, **hover on hero F144-F179**, move/dwell F180-F222, **click F223 (down) to about F230-F232 (up)**, move F237-F250, dwell F251-F311, move to hero F312-F330, **press F330/F331, hold to F442, release F443**, move F443-F458, dwell to the end.

---------------------------------------------------------------------------------------------------

## 2. State segmentation of "State 2 to 5.mp4"

### 2.0 Master timeline
The old build's names fit the evidence: 02 Stillness = dwell alignment, 03 Tilt = pointer orbit plus hover low-angle push-in, 04 Collapse = click, 05 Expand = hold [I]. The segmentation below is from the video alone.

| seg | frames | t (s) | trigger (cursor) | camera [M register_dense] | hero |
|---|---|---|---|---|---|
| **S1 Idle** | F000-F013 | 0.00-0.43 | none (C1) | rest | identical to Default Loop F0-F13 |
| **S2 Pointer orbit ("Tilt" parallax)** | F014-F126 | 0.47-4.20 | moves C2-C7 | orbits around the orb following the pointer (lag about 0.1 s), then recentres F085-F124 | tumbling |
| S2' Dwell alignment ("Stillness") | F035-F045, F075-F089, F113-F127 | 1.17-1.50, 2.50-2.97, 3.77-4.23 | dwells C3, C5, C7 | holds offset (C3, C5) / recentres (C7) | rings ease into the frontal concentric pose |
| **S3 Hover push-in ("Tilt")** | F131-F198 | 4.37-6.60 | approach + hover C8-C10 | low-angle push-in, peak F165-F170, fast return F190-F196 | tumbling; aligned F155-F166 |
| S1' Idle + alignment | F198-F229 | 6.60-7.63 | dwell / drift C10-C11 | rest | aligned F195-F203, then tumbling |
| **S4 Collapse (click)** | F230-F302 | 7.67-10.07 | click C12 (down F223) | push-in ramp F229-F280, snap back F291-F297 | ring B halves split, rings flatten and splay into arcs, snap back to frontal F297-F302 |
| S1'' Idle | F303-F330 | 10.10-11.00 | dwell / move C14-C15 | rest | tumbling |
| **S5 Expand (hold)** | F331-F442 | 11.03-14.73 | press-hold C16 | creep F334-F354, lunge F354-F363, sustain | charge, pop F357-F358, outer quarters fly out, sustain |
| **S5r Release / reassembly** | F443-F465 | 14.77-15.50 | release C17 | S-curve back to rest | S-curve reassembly (snap F452-F454), frontal F455-F462 |
| S1''' Idle | F465-F499 | 15.50-16.63 | dwell C18 | rest | tumbling |

### 2.1 Global facts (all states)

**Rest camera** [M `camera_solve_states.json`, rms 2.8 px]: position **(0.2318, 2.9040, 11.7875)**, yaw +0.672 deg (looks slightly toward -X), pitch -0.048 deg, f = 1690.1 px, i.e. lens 42.25 mm on a 36 mm sensor, **hFOV 46.15 deg / vFOV 25.54 deg** at 1440x766. Orb projects at **(721.1, 369.5)**. Seen from the orb, the camera sits at r 20.928 m, azimuth +0.64 deg, elevation -0.41 deg.

**Hero geometry** [M forensics; centre (0, 3.0538, -9.1376); diameters at the rest camera, D]:

| part | objects | radius (m) | cross-section (oct.) radial x axial (m) | rest plane / axis (three.js) | rest diameter on screen |
|---|---|---|---|---|---|
| ring A (outer) | Circle.028-031, **4 x 90 deg quarters** (seams at 45/135/225/315 deg) | 1.980-2.401 | 0.421 x 0.843 | horizontal; axis (0,1,0); seen edge-on as a 68 px band | **388 px** (inner 320) |
| ring B | Circle.025 (upper half) + Circle.032 (lower half) | 1.616-1.960 | 0.344 x 0.688 | face-on to camera; axis (0,0,1) | **317 px** |
| ring C | Circle.026, one piece, 5.6 deg gap | 1.293-1.558 | 0.265 x 0.550 | rot X 125 deg; axis (0,-0.574,0.819) | 252 px |
| ring D | Circle.027, one piece, 5.6 deg gap | 1.034-1.246 | 0.212 x 0.440 | rot X 50 deg; axis (0,0.643,0.766) | 201 px |
| orb | Icosphere.011, material `magick_ball_01.002` | 0.8255 | sphere | - | **133 px** |
| shard belts | Cube.009 / Cube.010, 9 shards each = **18** | 3.36 (belt) | shards 0.837 (x14) / 0.586 (x2) / 0.474 (x2) m long, 0.22 x 0.20 m | origin (0, 2.9466, -8.9401); normals (0.264,0.964,0) and (-0.417,0.909,0), i.e. rolled +15.3 / -24.7 deg about the view axis | belt radius 271 px; shards 68/47/38 px long |

Ring clearances: A-B 0.020 m, B-C 0.058 m, C-D 0.047 m, D-orb 0.209 m. Shard angles in each belt: -167.3, -143.3, -119.4, -47.2, -0.1, 48.0, 72.2, 96.3, 120.4 deg (two gaps of about 72 deg; both belts use the same set).

**Rings in motion** [M visual on 30 fps mosaics, ±10 %]:
* **Ring A** is edge-on (horizontal band) in the Loop at F0, F27-F30, F60, F90, F120 and shows its broad face near F12-F15, F42-F48, F72-F78, F102-F108. So it makes a **half-turn every 1.0 s = 0.50 rev/s (180 deg/s)**. Its axis precesses: the broad-face view at F12-F18 is a tall ellipse leaning right, so the rotation axis is not fixed to the screen.
* **Ring B** goes from face-on (F0) to edge-on horizontal by about F15-F18: roughly 0.5 rev/s.
* **Rings C and D**: axes and rates not resolved (no 3D pose fit; no source animation exists, see risks).
* The **whole configuration repeats every 120 frames (4.000 s)** [M `jpg_compare.py`: best self-match at lag 120].
* The ring-A quarter seams are faintly visible even at rest.
* **The .blend contains no hero animation at all** [M eval_analysis: every hero object has loc/rot/scale range 0 over frames 1-250]. **The GLB bakes only the ring-B split** plus an unrelated full ring Circle.008 (0.913 rev/s for 1.7 s; not in this video). The tumbling must be rebuilt from video.

**Alignment moments** (all rings concentric and face-on, the "eye" pose) [M visual + metric]:
* Loop: F42-F48 only (metric 0.30-0.32), weak again at F105-F111 (0.19).
* State: F035-F045, F075-F089 (fully concentric F080-F086, metric 0.18-0.25 at F80-F85), F113-F127 (full F116-F125, 0.25 at F120), F155-F166 (**0.36 at F160**, the strongest), F195-F203, F297-F302, F335-F343, F436-F444 (inner rings only, during the hold), F455-F462.
* Shape of each alignment: ease in over 8-10 frames, fully aligned for 6-12 frames (0.2-0.4 s), break-up into tumbling within 3-5 frames. In the State video the alignments line up with pointer dwells (C3, C5, C7, C9, C10, C16) and with the end of each reassembly. They are also roughly periodic (F40, F82, F120, F161, F200 are about 40 frames apart), so a fixed 1.33 s cycle cannot be excluded [I].

**Shards** [M]:
* Two belts of 9 cobalt crystals at r = 3.36 m, centre 0.2 m in front of and 0.1 m below the orb.
* **Speed: 0.49 rev/s (175 deg/s), about ±10 %.** Tracked front-of-belt shards move 29-33 px/frame horizontally (`choreo\shard_track.py`, 83 tracks of at least 6 frames; distance 17.6 m gives 96 px/m, so omega = 0.102 rad/frame). Back-of-belt shards move about 24 px/frame. Dense DIS flow gives p90 22.7 px/f and median 9.8 px/f. That is lower, because DIS under-reads thin fast blobs, but still consistent with 0.4-0.5 rev/s. 0.5 rev/s = exactly 2 revolutions per 4 s loop.
* **The belts counter-rotate**: fastest front tracks go +29..+33 px/f and -26..-33 px/f. Which belt goes which way was not identified.
* Period **2.0 s**, which explains the secondary self-similarity dip of the Loop at lag 60 frames.
* Blob count 20-26 per frame at rest (some shards split into 2 blobs). Blob long side median 19-27 px, p90 42-53 px (only the saturated part is masked).
* Belt radius is unchanged in every state: p90 radius 448-463 px during the hold = 271 px x 1.65-1.7 camera zoom.
* No shard reaction to the pointer was observed (no repel/attract, no speed-up).

**Orb** [M]:
* Always an emissive core clipped to **#feffff** (Y>=250 over about 7,150 px of its visible part at rest). No pulsing measurable; the clipped area only changes with ring occlusion.
* Grey-blue "continent-like" inner shapes. Drivers: `Mapping.rotation.z = frame/200 rad`, i.e. **0.15 rad/s = 8.6 deg/s, one turn per 42 s**, and `Noise.W = frame/800`, i.e. **+0.0375/s** (one Blender frame per video frame).
* Visible white disc 133 px at rest, 129-132 px blob in the hover, **218-222 px at t = 13.4 s** (hold).
* There is **no separate band ring**. The horizontal band across the orb at rest is ring A seen edge-on (y 345-410, 68 px = 0.843 m depth).

**Water** [M Wave modifier in forensics + `choreo\ripple_jpg.py`]:
* Concentric circular waves centred at **(0, 0, -8.6)**, 0.54 m camera-side of the point under the orb (screen y about 624 at rest).
* Crest spacing **2.717 m** (= 2 x width 1.358). Speed **0.03716 m/frame = 1.115 m/s**. Temporal period **73 frames = 2.44 s** (measured 72-75 frames at 12 probe bands). Amplitude 0.226 m. Pulse width 4 / narrowness = 1.69 m.
* The wave front radius is 5.98 m at frame 1 and grows at the same 1.115 m/s, reaching the camera (20.39 m from the ripple centre) at about F388.
* On screen, crests move toward the camera at 0.56 / 0.81 / 1.0 px/frame at y = 656 / 710 / 747 px. Spacing is 41 px at y 656, 59 px at y 710, 23-30 px behind the centre [D; spatial autocorrelation 24-30 px measured].
* Water mesh: 64x64 grid over 29.7 m.
* No coupling to interaction (no click ripple, no hold ripple).

**Environment** [M]:
* Sky: single-scattering Sky Texture (sun elevation 18.6 deg, azimuth -61 deg, i.e. left and behind the hero, so the scene is soft back/side-lit), world strength 0.4. Clouds are textured planes.
* In the static Loop the sky changes slowly: MAD F0 to F120 = 6.67 vs 0.64 per 3 frames, and the right cloud block's best shift is about 20 px over 4 s, i.e. a slow drift of about 5 px/s (weak evidence).
* Mountains have heavy aerial-perspective haze plus a mist band at their base (y about 395-450). Scene mist pass is off.
* Nothing in the environment changes with state; only the camera moves.

**Post effects** [M, frames + scene settings]:
* Scene settings: Cycles, view transform Standard (an AgX entry also exists), exposure 0, filter 1.5 px, **motion blur off**, **DOF off**.
* Video: shards moving 30 px/frame are crisp, so **no motion blur**. The background is equally sharp at rest and in the hold close-up, so **no DOF**.
* Bloom: only a soft glow of about 5-10 px around the clipped orb; no glare streaks.
* No visible grain (smooth, denoised gradients). No chromatic aberration (the cursor rim profile is identical in R, G and B).
* Overall look: high-key, low-contrast, cool blue. The darkest value is #1c324f-#243343.

**Hero screen centre and size over time** [M orb blob windows (area >= 3000) + solves; size = orb diameter / 133 px]:

| window | orb centre (px) | hero scale | ring A diameter (px) |
|---|---|---|---|
| rest (F0, F124-F132, F198-F228, F303-F330, F465+) | (721, 369.5) solve; blob (716-728, 365-375) | 1.00 | 388 |
| S2 orbit left (F30-F44) | (716, 365) | 0.98-1.01 | 380-392 |
| S2 orbit right/up (t 2.5 s, F75) | (725, 354) solve | 0.977 | 379 |
| S3 hover peak (F150-F179) | (719-721, 384-385) | **1.12-1.15** (blob 129-132 vs 112-117) | 435-445 |
| S4 collapse (t 8.5 s, F255) | (720, 388) solve; blob (694-704, 403-406) | 1.05 (orb r 70 px) | 409 intact; pieces span 535 px (F255) to 580 px (F284) wide |
| S5 sustain (F390-F419; F402 direct) | (707-720, 416-430) blob; about (719, 420) direct; (720, 418) solve | **1.65** (orb 218-222 px; blob width 1.75x) | about 640 intact-equivalent; quarters span **805 x 650 px** at F420, 754 x 690 at F436-F444 |
| S5r (F450-F464) | (718, 386) | about 1.1, back to 1.0 by F465 | 432 at F455 (quarters about 10 % out) |

### 2.2 S1 Idle (F000-F013, 0.00-0.43 s)
* State F000 is the **same rendered frame as Loop F000**: hero MAD 2.99, background MAD 0.58 on 720 px JPGs; the cursor is the only difference. F005 best matches Loop F006 (4.96). By F015 the camera starts to move.
* Cursor resting on the orb at (738,399) produces **no response** for 0.43 s.
* Camera at rest (SIFT F006 is identity). Rings tumble exactly as in the Loop. Shards 0.49 rev/s.

### 2.3 S2 Pointer orbit / "Tilt" parallax (F014-F126, 0.47-4.20 s)
**Camera** [M register_dense, SIFT vs F0; far = mountains, near = rocks]:

| frame | far dx, dy (px) | near dx, dy (px) | cursor |
|---|---|---|---|
| F018 | -24.7, -0.6 | +17.1, +0.1 | moving left |
| F030 | -126.9, +9.8 (s 1.021) | +73.0, -7.3 | (~300, 450) |
| F036 | -132.7, +32.6 | +95.7, -14.9 | (218,540) arrives |
| F039-F042 (chained, drift-corrected) | peak about -155..-160, +55..+57 | +67, +5..+10 | dwell |
| F046 | -124.5, +55.1 | +43.8, -18.0 | starts right |
| F052 | -69.1, +60.4 | +55.3, -39.1 | sweeping |
| F066 | +50.9, +1.0 | -35.7, -0.3 | sweeping up |
| F072 | +93.9, -45.6 | -31.4, +15.7 | (1206,225) |
| F078-F081 (chained) | peak about +101..+111, -49 | about -94 | dwell |
| F090 | +87.7, -61.4 | -50.4, +28.8 | moving down |
| F108 | +28.6, -10.9 | -19.8, +7.9 | dwell lower-right |
| F124 / F128 | +1.5, +0.1 / +0.1, 0 | 0 | dwell, **back to rest** |

* Far and near bands move in **opposite directions** (F036: -133 vs +96). So this is a true **orbit around a pivot at the hero** with strong depth parallax, not a pan and not a zoom. Scales stay about 1.00 (far 0.99-1.02).
* Solve at t = 2.5 s (F075): camera **(1.566, 3.498, 13.264)**, yaw +4.16 deg, pitch -2.07 deg, f 1772 (vFOV 24.39 deg), r 22.46 m. Seen from the orb: **azimuth +4.00 deg (rest +0.64), elevation +1.13 deg (rest -0.41)**. The r / f change (+7 % / +4.9 %) is within the solve's distance-vs-zoom ambiguity: hero size 0.977x.
* **Gains** [D]:
  * Yaw: -5.25 deg at nx -0.70 (7.5 deg per unit), +3.49 deg at nx +0.69 (5.1 deg per unit).
  * Elevation: +1.54 deg at ny +0.51 (3.0 deg per unit), about -1.9 deg at ny -0.41 (4.6 deg per unit).
  * Sign: pointer right/up moves the camera right/up and the camera looks back at the orb.
* **Response**:
  * Follows the moving pointer with about 3-5 frames lag; settles 3 frames after the pointer stops (F036 to F039, F077 to F078-F081). This is critically damped with omega about 15-20 rad/s, or first-order tau about 0.1 s.
  * Recentre F085 to F124: 33 % left at F108 and 2 % at F124 (relative to F090). This fits a critically damped spring with **omega about 5 rad/s** starting at about F086.
  * The camera **held** its offset during the short dwells C3 (0.33 s) and C5 (0.25 s) but **recentred** during the long dwell C7 (0.6+ s) while the pointer was still off-centre (nx +0.31, ny -0.78). So the pointer-to-camera mapping is not a pure position function [I: hand-keyed demo].
* Hero centre stays within ±16 px of (721,370); size 0.98-1.01x.
* Rings: tumbling during moves; **frontal alignment during dwells** F035-F045, F075-F089, F113-F127.
* Explode: none. Shards, orb, water, post: global values.

### 2.4 S3 Hover low-angle push-in / "Tilt" (F131-F198, 4.37-6.60 s)
* **Trigger** [M]: the push-in starts at about **F130-F132** (chained far-band onset) while the pointer is still about 300-325 px from the orb centre and moving inward at 17 px/f. It reaches full effect while the pointer rests at dist 132 px (C9). The return starts at about **F188-F190** (pointer at dist 150-165 px, moving out slowly, 5-8 px/f, after starting to move at F180) and is complete by **F196-F198** (dist 230 px).
* **Camera** [M SIFT]:

  | frame | F138 | F141 | F144 | F147 | F153 | F159 | F170 (peak) | F186 | F190 | F192 | F194 | F196 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | far s | 1.006 | 1.011 | 1.015 | 1.034 | 1.026 | 1.029 | 1.053 | 1.051 | 1.045 | 1.037 | 1.015 | 1.004 |
  | far dy (px) | +8.6 | +14.6 | +20.7 | +28.0 | +35.5 | +40.5 | +45.0 | +42.9 | +37.4 | +31.5 | +20.1 | +5.0 |
  | near s | 1.034 | 1.043 | 1.079 | 1.093 | 1.128 | 1.151 | 1.163 | 1.132 | 1.131 | 1.109 | 1.060 | 1.015 |

  far dx stays -3..-9 px (negligible yaw).
* **Interpretation [D]**:
  * Horizon/background drops 45 px, so **pitch +1.5 deg**.
  * Near layers scale more than far ones (1.16 vs 1.05), so this is a **dolly-in**, not a zoom.
  * The orb drops only 15 px (370 to 385), so the camera also lowers.
  * Target pose: **r about 18.7 m (dolly-in 2.2 m, hero 1.12x), camera about 0.32 m lower (y about 2.59; elevation -1.43 deg), pitch +1.5 deg**. That gives a "look-up" low-angle feel.
* **Timing**:
  * Enter: S-curve, 50 % at about F145 (0.45 s after onset), 90 % at about F158, peak F165-F170 (about 1.2 s). This fits a critically damped spring with **omega 4-5 rad/s**.
  * Exit: 87 % of the way back in 6 frames (F190 to F196), i.e. a critically damped spring with **omega about 20 rad/s**.
* **Hero**: centre (720, 385), scale 1.12-1.15x, ring A about 440 px.
* **Rings**: tumbling, **aligned frontal F155-F166** (metric 0.36 at F160, the strongest of the video), tumbling again from F167 while the pointer still rests. No change in ring speed measurable.
* Explode: none. Shards: no reaction. Orb: unchanged (looks larger only because of the camera). Water / post: global.

### 2.5 S4 Collapse, triggered by a click (F230-F302, 7.67-10.07 s)
**Trigger**: pointer-down at **F223** (ring contracts) on the hero at dist 149 px. Disc full at F232, fades from F233, so pointer-up is at about F229-F232. The ring-B split starts at **F230** (+0.23 s after pointer-down). The sequence then runs to completion with no further input (the pointer leaves at F237 and rests on the water).

**Explode / collapse (exact from the GLB for ring B; visual for the rest)**:
* **Ring B halves** [M GLB CircleAction.009 / .010]: the upper half moves **+0.470 m** (up) and the lower half **-0.570 m** (down), i.e. about +40 / -48 px at this zoom.
  * Ramp F230 to F270 (1.333 s), nearly linear at 2.6 % of travel per frame, with an ease-out over F262-F270.
  * Hold F270-F290 (0.667 s).
  * Return F290 to F300 (0.333 s) as an ease-in snap: 0, 0.4, 1.5, 3.8, 7.3, 12.8, 21, 34, 58, 92, 100 %. Home at F300.
* **All rings** [M visual, `work\collapse_A/B.jpg`]:
  * F236-F242: open up.
  * **F248-F252: flatten into a horizontal stack** (all rings edge-on). This is the "collapse".
  * F255-F291: **splay into a loose tangle of arcs** that tumble (vertical arcs F264-F272, horizontal spread F280-F291).
  * Horizontal extent grows from 409 px (intact, at 1.05x) to **535 px (F255) and about 580 px (F284)**, i.e. pieces displaced about **+0.75..+1.0 m outward**.
  * Pieces: ring A's 4 quarters + ring B's 2 halves move apart (6 fragments). Rings C and D stay whole but reorient.
* **Reassembly**: F293-F297 the pieces snap in; **F297-F302 concentric frontal alignment**; tumbling resumes by about F305.

**Camera** [M SIFT far dy]:

| frame | F231 | F237 | F243 | F249 | F258 | F266 | F280 (peak) | F288 | F291 | F293 | F295 | F297 | F300 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| far dy (px) | +1.1 | +6.7 | +12.9 | +21.1 | +28.2 | +37.5 | +43.5 | +39.8 | +39.5 | +34.7 | +8.9 | +4.7 | about 0 |

* Profile: near-linear push from F229 to F280 (1.7 s), a short sag F280-F291, then a **0.17-0.2 s snap back** (F292-F297) in sync with the ring snap.
* Solve at t = 8.5 s (F255): camera (0.055, 2.660, 12.575), yaw 0.14 deg, pitch +1.20 deg, f 1848 (vFOV 23.42 deg), r 21.72 m, orb at (720, 388), hero 1.05x.
* Peak (F276-F288) [D]: pitch about +1.45 deg, camera about 0.25-0.35 m lower, hero 1.05-1.10x. Same flavour as the hover push-in, slower ramp and hard snap.

Shards: no change in radius or count. Orb: unchanged; exposed between the split halves. Water / post: global.

### 2.6 S5 Expand, triggered by press-and-hold (F331-F442, 11.03-14.73 s)
**Trigger**: pointer-down at **F330-F331** on the hero (dist 151 px), held 3.7 s. Charge before the burst = **0.63 s** (ring split starts at F350). **The pop is at 0.88 s** (F357-F358).

**Phases**:
1. **Charge F331-F353**:
   * Cursor fill grows (F331-F341).
   * Rings pass through the frontal alignment F335-F343, then tumble (F345-F355).
   * Camera creeps in (far dy +1.0 at F336, +4.6 at F342, +12.7 at F348, +21.1 at F351, +37.8 at F354): an ease-in.
   * Ring B begins: 0.2 % (F351), 0.7, 1.8, 3.5, 6.4, 11.4, 21.9 % (F357) [GLB].
2. **Pop F357-F358**:
   * Ring B halves jump from **21.9 % to 79.0 % in one frame**, then 88.9, 93.7, 96.5, 98.3, 99.3, 99.8 %, 100 % at F365.
   * Camera **lunge** F354 to F363: far dy +37.8, +101.5 (F357), +126.0 (F363). That is 28 % to 93 % of its travel in 9 frames.
3. **Sustain F365-F442**:
   * Camera settles (+130.4 F369, +132.3 F375), creeps to **+135.8..+136.7 (F390-F430)**, then eases back slightly to +131.5 at F442 (-3 %).
   * Ring B halves held at +0.470 / -0.570 m, i.e. **+63 / -76 px** at this zoom. At F404-F428 ring B reads as two stacked horizontal bands spanning y 285-505.
   * **Ring A quarters fly out** radially in roughly the frontal plane [M visual, `hold_B.jpg`, ±0.15 m]:
     * Peak spread about **F405-F425: +0.45..+0.8 m** beyond the rest outer radius (2.40 m), i.e. 17-33 %.
     * Combined extent **805 x 650 px** at F420.
     * Each quarter tilts individually, and the set appears rotated about **15-20 deg counter-clockwise** about the view axis (the top arc's centre is at x 580 at F420 vs 711 at rest).
     * Already contracting while still held: **754 x 690 px at F436-F444, about +0.4 m**.
   * Rings C and D stay whole and rotate to **face-on by F436-F444**, while ring B is edge-on/horizontal.
4. **Camera at sustain** [D]:
   * Measured orb diameter 218-222 px gives **hero 1.65x, so r about 12.7 m at unchanged FOV**.
   * Orb at screen y about 420, so with the camera about 0.73 m below the orb (y about 2.32; elevation -3.3 deg) the pitch is **+4.55 deg**. Check: 4.6 deg x 29.5 = 136 px, the same as the measured far-band shift of 131-137 px.
   * Low-confidence solve at t = 13.0 s: (0.044, 2.258, 1.530), pitch +5.45 deg, r 10.70 m, vFOV 25.34 deg. It assumed a 130 px orb radius; the measured radius is about 110, so prefer 12.7 m.
   * Far-band scale 1.115 and mid 1.27-1.37 confirm a ~8 m dolly with strong depth parallax.
   * The orb drops from 370 to about 420 on screen. The water shrinks to y above about 600 and sky fills the top. This needs about 18 % top plate overscan (Blender agent: 18.9 %).
5. **Shards**: same belts, same 3D radius (p90 448-463 px = 271 px x 1.65-1.7). They now read 1.65x bigger (68 px becomes about 110 px long); some pass close to the lens. Blob count 29-39. No speed change measured.
6. **Orb**: still clipped white, **218-222 px**, often partly hidden behind ring slabs (F345-F393). No brightness change.

### 2.7 S5r Release and reassembly (F443-F465, 14.77-15.50 s)
* **Trigger**: pointer-up at about F442-F443 (disc fades F443-F447).
* **Ring B** [GLB, per-frame progress back home]: F444 0.1, F445 0.4, F446 0.9, F447 1.7, F448 3.0, F449 4.7, F450 7.3, F451 11.1, F452 17.7, **F453 50.0, F454 82.3**, F455 88.9, F456 92.7, F457 95.3, F458 97.0, F459 98.3, F460 99.1, F461 99.6, F462 99.9, F463 100 %. Total **0.667 s**; the snap is centred at **+0.33 s** after release. It is the mirror image of the pop.
* **Ring A quarters** [M visual]: at F448 they sit at 1.60x ring B's radius, at F452 1.30x, at F455 about 1.33x with small gaps still visible (ring A about 432 px), and home by F460 (rest ratio 1.22x).
* **Camera** [M SIFT far dy, progress back to rest]: F444 1 %, F446 9.5 %, F448 23 %, **F452 68 %**, F454 80 %, F456 87 %, F458 92 %, F462 97 %, F465 99 %. A smooth S-curve, 50 % at about +0.28 s, done in about 0.75 s. Its fastest part (F446-F452) slightly precedes the ring snap.
* **Rings**: frontal concentric alignment **F455-F462**, tumbling again from about F465.
* **Hero**: centre (718, 386), scale about 1.1 falling to 1.0.

### 2.8 Idle after interaction (F303-F330, F465-F499)
Camera at rest. Rings tumble, but **not phase-locked to the Default Loop** (best Loop match hero MAD 7.2-10.8 vs 3.0 for a true match). Shards 0.49 rev/s. Water and sky continue on wall-clock time.

---------------------------------------------------------------------------------------------------

## 3. Palette (sampled, sRGB display values, BT.709 limited-to-full decode)
Source: `choreo\pal\s25_F000.png` (rest, identical to Loop F0), `s25_F420.png` (hold close-up), `s25_F078.png` (cursor over sky). Boxes are in full-res px. "hi"/"lo" = mean of the brightest/darkest 15 % of the box. Shard values use only cobalt pixels (H 205-240 deg, S>=0.30). Positions checked on the overlay `choreo\pal\ov_s25_F000.jpg`.

| element | hex | RGB | where (frame, box) |
|---|---|---|---|
| Sky top, upper-left (zenith blue) | **#b0c4e0** | 176,196,224 | F000 (120-180, 6-24) |
| Sky top, centre (hazy) | #dce0e9 | 220,224,233 | F000 (700-740, 6-24) |
| Sky mid, between clouds | #b6c8e4 | 182,200,228 | F000 (165-195, 140-160) |
| Sky near horizon | **#cad7ef** / #c7cfde | 202,215,239 / 199,207,222 | F000 (950-975, 290-305) / (1405-1435, 315-335) |
| Cloud lit (brightest 15 %) | **#dde0e5** / #dbdee2 | 221,224,229 | F000 right / left cloud masses |
| Cloud body (mean) | #d8dbdf / #d1dae9 | 216,219,223 / 209,218,233 | F000 (60-150,160-200) / (990-1015,150-170) |
| Cloud underside / shadow | **#d6dce7** | 214,220,231 | F000 (1120-1145, 205-222); clouds are very low-contrast |
| Mountain snow lit (brightest 15 %) | **#cdd1da** | 205,209,218 | F000 left face (190-280, 250-330) |
| Mountain snow mid-tone | #94a5bc / #8995ab | 148,165,188 / 137,149,171 | F000 right-face mean / left-face mean |
| Mountain snow shadow (darkest 15 %) | **#7d90ab** | 125,144,171 | F000 right face (300-420, 250-360) |
| Dark rock mountain (left) | **#1c324f** | 28,50,79 | F000 (30-50, 320-340) |
| Haze / mist band at mountain base | **#8ea1bc** / #7188a7 | 142,161,188 / 113,136,167 | F000 (300-460, 395-420) / (120-260, 400-430) |
| Iceberg lit top / shadow face | #9cabc1 / **#45668d** | 156,171,193 / 69,102,141 | F000 (1070-1090, 352-366) / (1180-1200, 400-420) |
| Water far | **#b9c7d6** / #aebbcb | 185,199,214 / 174,187,203 | F000 (630-650, 515-528) / (990-1010, 540-552) |
| Water near | **#bacbdc** / #96a7c0 | 186,203,220 / 150,167,192 | F000 (680-700, 722-738) / (1290-1310, 712-728) |
| Ripple highlight / trough (top / bottom 15 %) | **#c8d1e0** / **#8da2c3** | 200,209,224 / 141,162,195 | F000 ripple ring zone (500-950, 590-650) |
| Ice slabs (far floes) | **#c9d3e0** | 201,211,224 | F000 (1140-1160, 476-488) |
| Rock lit top / shadow | **#7790b1** / **#6a81a0** | 119,144,177 / 106,129,160 | F000 fg rocks (110-130,582-596) / (240-260,682-696) |
| Rock darkest (crevice) | **#243343** | 36,51,67 | F000 (570-590, 738-752) |
| Ring body over sky (ring B) | **#bbcfea** | 187,207,234 | F000 (818-830, 261-273) |
| Ring A edge-on band (thick ice) | #dae4f3 | 218,228,243 | F000 (552-568, 368-382) |
| Ring body, close-up | #a6bcd9 / #d2dff1 | 166,188,217 / 210,223,241 | F420 right arc / top arc |
| Ring edge highlight | **#dde2ec** / #c8daee | 221,226,236 / 200,218,238 | F000 ring-B rim (hi) / F420 arc edge (hi) |
| Ring dark line / refracted dark band | #9cb7d3 / **#4870a8** | 156,183,211 / 72,112,168 | F000 ring-B rim (lo) / F420 arc inner band (lo) |
| Orb centre | **#feffff** (core mean #f5fdfd) | 254,255,255 | F000 (660-790, 290-345) hi / (715-727, 316-328) |
| Orb visible core while held | #e4edf0 | 228,237,240 | F420 (730-750, 425-438), partly behind ice |
| Shard light | **#81a2d9** / #92aee0 / #a2bcf5 | 129,162,217 / 146,174,224 / 162,188,245 | F000 right shard / F420 close-ups (hi) |
| Shard mean | **#5681cb** / #4d7ac7 | 86,129,203 / 77,122,199 | F000 / F420 |
| Shard dark | **#295ba9** / #2d62b3 | 41,91,169 / 45,98,179 | F000 / F420 (lo) |
| Cursor stroke (over sky #c2d0e6) | peak #dbe5f6 | white at about 60 % | F078, r 39-40 px |
| Cursor fill (over #afc0d6) | #dbe2ea | white at about 51 % | F420 |

---------------------------------------------------------------------------------------------------

## 4. Default Loop vs the idle parts of the long video
* **Same render, same start**: Loop F000 = State F000 (hero MAD 2.99, background 0.58). The two match for the first ~15 frames (State F005 to Loop F006, F015 to F015), until the State camera starts moving.
* **Not the same loop afterwards.**
  * The State hero shows extra frontal-alignment holds (F075-F089, F113-F127, F155-F166, F195-F203) that the Loop does not have. The Loop aligns only at F042-F048 (weakly at F105-F111).
  * Post-interaction idle frames do not phase-lock to the Loop (best-match MAD 7-11 vs 3 for an identical frame).
  * The only strong later match, State F200 to Loop F048 (MAD 4.0), is simply the frontal "eye" pose.
  * Conclusion: the State video's rings are a different, interaction-keyed animation after about F045.
* **Loop length**:
  * The file has 121 frames (4.033 s).
  * The hero's best self-match lag is **120 frames (4.000 s)** (MAD 6.38, lower than the 7.05 average between frames only 3 apart). The next best is lag 60 (9.74), from the 2 s shard period.
  * **F120 is approximately F0, so drop the last frame.** Loop F000-F119 is hero-seamless with period 4.000 s.
* **Environment is NOT seamless** [M `choreo\region_seam.py`]:
  * Sky: MAD F0 to F120 = 6.67 vs 0.64 per 3-frame step (slow cloud drift/morph).
  * Water: 12.38 vs 5.44 per step. The ripple period is 2.44 s, which does not divide 4 s, and the wave front keeps expanding.
  * Mountain/mist band: 7.73 vs 2.59.
  * The camera is static (background crops F0/F60/F120 coincide; the chained-LK drift of -15 px is a tracker artifact).
  * So the Loop pops slightly in sky/water at the wrap.
* **[R]** Run the environment on continuous wall-clock time (never loop it) and make only the hero idle periodic (4.000 s), or fully procedural.

---------------------------------------------------------------------------------------------------

## 5. Implementation-ready choreography spec (three.js r184)

### 5.1 Constants (metres, three.js, Y up)
```js
export const ORB = new Vector3(0, 3.0538, -9.1376);           // pivot of everything
export const R_ORB = 0.8255;
export const RINGS = {           // inner/outer radius, cross-section (radial x axial), rest axis
  A: { rIn: 1.980, rOut: 2.401, sec: [0.421, 0.843], axis: [0, 1, 0],          pieces: 4 }, // quarters, seams 45/135/225/315 deg
  B: { rIn: 1.616, rOut: 1.960, sec: [0.344, 0.688], axis: [0, 0, 1],          pieces: 2 }, // upper/lower halves
  C: { rIn: 1.293, rOut: 1.558, sec: [0.265, 0.550], axis: [0, -0.574, 0.819], pieces: 1, gapDeg: 5.6 },
  D: { rIn: 1.034, rOut: 1.246, sec: [0.212, 0.440], axis: [0, 0.643, 0.766],  pieces: 1, gapDeg: 5.6 },
};
export const BELTS = { origin: [0, 2.9466, -8.9401], radius: 3.36,
  normals: [[0.264, 0.964, 0], [-0.417, 0.909, 0]],               // counter-rotating
  anglesDeg: [-167.3, -143.3, -119.4, -47.2, -0.1, 48.0, 72.2, 96.3, 120.4],
  lengths: { long: 0.837, mid: 0.586, short: 0.474 } };          // 14 long, 2 mid, 2 short in total
export const WATER_RIPPLE = { centre: [0, 0, -8.6], spacing: 2.717, speed: 1.115 /* m/s */,
  amp: 0.226, pulseWidth: 1.69, frontR0: 5.98 /* m at t=0 */ };
export const CAM_REST = { pos: [0.2318, 2.9040, 11.7875], yawDeg: 0.672, pitchDeg: -0.048,
  vfovDeg: 25.536, aspect: 1440 / 766 };   // rotation.order='YXZ'; rotation.y=+yaw, rotation.x=pitch
```
If the GLB is loaded with GLTFLoader, the rest pose already matches (the GLB is in metres with the same transforms).

### 5.2 Camera rig and per-state targets
Rig: spherical offset around `ORB` (radius r, azimuth az = angle from +Z toward +X, elevation el, + = camera above the orb), then look at the orb and add a pitch offset `dp` so the orb lands at the measured screen y. Keep the FOV fixed at 25.54 deg (dolly, not zoom; the solves' zoom changes are within their ambiguity). For non-1440x766 aspects, preserve the horizontal framing (hFOV 46.15 deg) or the vertical one, as the layout requires.

| target | r (m) | az (deg) | el (deg) | pitch (deg) | orb on screen | hero scale | source |
|---|---|---|---|---|---|---|---|
| REST | 20.93 | +0.64 | -0.41 | -0.05 (orb 13.5 px above centre) | (721, 370) | 1.00 | [M] solve |
| ORBIT (pointer), add to REST | 20.93 | **+6.0 x nx** | **+3.5 x ny** | look at orb | within ±16 px | 1.0 | [D/R] gains 5.1-7.5 / 3.0-4.6 measured |
| TILT (hover) | **18.7** | +0.64 | **-1.43** | **+1.5** | (720, 385) | 1.12 | [D] from far-band +45 px, near/far scale, orb y |
| COLLAPSE peak | **19.5** | +0.6 | **-1.0** | **+1.45** | (720, 390-400) | 1.05-1.10 | [D] far-band +43 px; solve t 8.5 |
| EXPAND sustain | **12.7 (±1)** | +0.64 | **-3.3** | **+4.55** | (720, 420) | 1.65 | [M/D] orb 220 px; far-band 136 px check |

Positions for reference:
* REST (0.232, 2.904, 11.789).
* TILT about (0.209, 2.587, 9.559).
* EXPAND about (0.142, 2.323, 3.539).
* Solve t 2.5 s: (1.566, 3.498, 13.264), vFOV 24.39 deg.
* Solve t 8.5 s: (0.055, 2.660, 12.575), vFOV 23.42 deg.

Plate overscan needed: at least 11 % left/right (orbit yaw ±5.25 deg = 155 px), at least 18 % top (expand pitch), about 4 % bottom [D + Blender `overscan_calc.json`]. The near rocks parallax against the mountains by up to 250 px during the orbit, so foreground rocks/ice must be real geometry or depth-displaced, not a flat projected plate.

### 5.3 Interaction model (triggers and thresholds)
```
pointer state: nx, ny (NDC), speed v (px/s), dwellTime (v < 40 px/s), dist = |pointer - projected ORB| / R_A_px
   R_A_px = projected outer radius of ring A (194 px at 1440x766 rest framing)

ORBIT    (always on): target az/el = REST + (6.0*nx, 3.5*ny) deg, spring omega 16 (zeta 1).
         Recentre after dwellTime > 0.5 s (observed: held at 0.25-0.33 s dwells, recentred at a 0.6+ s dwell),
         spring omega 5.   [I/R: the video is a keyed demo, see 2.3]
STILLNESS (rings): wAlign -> 1 when dwellTime > 0.15 s (observed lag 0-16 frames), ease about 0.3 s
         (critically damped, omega about 12), hold while dwelling (observed holds 0.2-0.4 s, re-aligning on each dwell),
         wAlign -> 0 within 0.1-0.15 s (omega about 25) as soon as v > 40 px/s.
         Forced alignment at the end of every reassembly (Collapse +2.23 s, Release +0.4 s).
HOVER/TILT: wHover target = 1 if dist < 1.0 (inside ring A) or (dist < 1.6 and moving inward);
         0 when dist > 1.0 and moving outward or after 0.3 s of outward motion.
         Enter spring omega 4.5 (90 % in about 0.85 s), exit spring omega 20 (about 0.2 s).
         Camera = lerp(REST/ORBIT, TILT, wHover). Hover is suppressed during COLLAPSE/EXPAND.
PRESS:   pointerdown with dist <= 1.0 starts pressT. Cursor: ring scale 0.87 for 0.1 s, then fill 0 to 39 px
         ease-out (0.20-0.33 s).
CLICK -> COLLAPSE: pointerup with (now - pressT) < 0.63 s -> start COLLAPSE (one-shot 2.40 s; ignore new presses
         until it ends). In the video the split starts 0.23 s after pointer-down.
HOLD  -> EXPAND: still down at pressT + 0.63 s -> EXPAND (charge, pop at pressT + 0.88 s, sustain while held).
RELEASE: pointerup during EXPAND -> RELEASE (0.667 s rings, 0.75 s camera) -> IDLE (forced alignment +0.4..0.63 s,
         tumble resumes about +0.73 s). Release before the pop (0.63-0.88 s): reverse the charge with the RELEASE
         curve scaled to the current progress.
```

### 5.4 Per-trigger timelines (relative seconds; exact frame sources in brackets)
**COLLAPSE** (t = 0 at split start = F230; pointer-down was -0.23 s):

| t (s) | event |
|---|---|
| 0.00-1.33 | ring-B halves split to +0.470 / -0.570 m, linear 2.6 %/frame, ease-out over the last 0.27 s [F230-F270] |
| 0.00-1.70 | camera push-in to COLLAPSE peak, near-linear [F229-F280] |
| 0.20-0.40 | all rings open up [F236-F242] |
| 0.60-0.73 | rings flattened into a horizontal stack (all edge-on) [F248-F252] |
| 0.83-2.03 | pieces splay into tumbling arcs; ring A quarters about 0.75-1.0 m out horizontally [F255-F291] |
| 1.33-2.00 | ring-B hold [F270-F290] |
| 2.00-2.33 | ring-B snap home (ease-in table 5.6) [F290-F300]; ring A quarters snap in [F293-F297] |
| 2.03-2.23 | camera snap back to REST (about 0.2 s) [F291-F297] |
| 2.23-2.40 | concentric frontal alignment [F297-F302] |
| about 2.50 | tumble resumes [F305] |

**EXPAND** (t = 0 at pointer-down = F330/F331):

| t (s) | event |
|---|---|
| 0.00-0.33 | cursor fill grows [F331-F341] |
| 0.10-0.40 | rings pass through the frontal alignment [F335-F343] |
| 0.10-0.77 | camera creep, ease-in, 0 to 28 % of travel [F334-F354] |
| 0.63-0.88 | ring-B split ease-in 0 to 22 % [F350-F357] |
| **0.88-0.92** | **POP**: ring-B 22 to 79 % in one frame; camera lunge 28 to 93 % over 0.77-1.07 s [F357-F358; F354-F363] |
| 0.92-1.13 | ring-B exponential settle to 100 % [F358-F365] |
| 1.13-3.0 | ring A quarters drift out to +0.45..+0.8 m radial, each tilting, set rotated 15-20 deg about the view axis; camera creeps the last 3 % (to 100 % by about 2.0 s) [F365-F420] |
| 3.0-3.7 | quarters relax to about +0.4 m; inner rings C/D ease to face-on (by 3.5 s); camera eases back 3 % [F420-F442] |
| release | RELEASE below |

**RELEASE** (t = 0 at pointer-up = F443):

| t (s) | event |
|---|---|
| 0.00-0.667 | ring-B S-curve home, snap centred at +0.33 s (table 5.6) [F443-F463] |
| 0.00-0.75 | camera S-curve back to REST, 50 % at +0.28 s [F443-F465] |
| 0.17-0.57 | ring A quarters home (1.60x, 1.30x, then 1.22x of ring B radius) [F448-F460] |
| 0.40-0.63 | concentric frontal alignment [F455-F462] |
| about 0.73 | tumble resumes [F465] |

### 5.5 Idle motion parameters
* **Ring tumble**: ring A **0.50 rev/s**, half-turn every 1.0 s, with its axis precessing. Ring B about 0.5 rev/s. C and D unresolved. **Composite period 4.000 s.**
  * [R] Build each ring as `q = q_rest * q_tumble(t)` from per-ring axis/rate pairs whose rates are integer multiples of 0.125 rev/s (so the set repeats every 4 s). Phase the rates so the frontal concentric pose occurs at t = 1.40-1.60 s of every 4 s cycle (Loop F42-F48).
  * Then do a visual match pass against Loop F000/F015/F030/F045 (`choreo\pal\loop_hero_F0-F33.jpg`, `work\loop30_F000-059.jpg`).
  * Final orientation = `slerp(q_tumble, q_front, wAlign)` (q_front = every ring face-on, axis (0,0,1)).
* **Shards**: each belt rotates about its normal at **0.49 rev/s (3.08 rad/s)** with opposite directions, radius 3.36 m. [R] A small per-shard self-spin is optional; none was measured.
* **Orb**: inner texture rotation 0.15 rad/s plus noise evolution 0.0375/s; core emissive white (clipped), soft glow radius about 5-10 px.
* **Water**: `h = 0.226 * pulse(r - 1.115*t)` with crest spacing 2.717 m, period 2.437 s, centre (0, 0, -8.6). [R] Live shader, or match the Blender Wave formula; the "front" growth is optional.
* **Clouds**: slow drift of about 5 px/s on screen (about 0.1 deg/s); keep continuous.

### 5.6 Easing curves (normalized progress, one value per 30 fps frame)
* **Collapse split** (1.333 s): 0, .021, .046, .072, .098, .125, .152, .179, .207, .234, .261, .289, .316, .343, .370, .398, .425, .452, .479, .506, .533, .559, .586, .613, .639, .665, .691, .717, .743, .768, .794, .819, .843, .867, .891, .913, .935, .956, .975, .991, 1.000 [GLB F230-F270].
* **Collapse return** (0.333 s, 1 - value): 0, .004, .015, .038, .073, .128, .210, .342, .578, .921, 1 [F290-F300]. This is close to easeInCubic for u < 0.7, then a hard snap; no overshoot.
* **Expand pop** (0.5 s): 0, .002, .007, .018, .035, .064, .114, .219, **.790**, .889, .937, .965, .983, .993, .998, 1 [F350-F365]. Ease-in, a one-frame jump, then an exponential settle.
* **Release** (0.667 s, 1 - value): 0, .001, .004, .009, .017, .030, .047, .073, .111, .177, **.500, .823**, .889, .927, .953, .970, .983, .991, .996, .999, 1 [F443-F463].
* **Camera curves** (far-band progress):
  * Tilt enter: 0, .19, .32, .46, .62, .79, .90, 1.0 at F135, 138, 141, 144, 147, 153, 159, 170.
  * Tilt exit: 1, .83, .70, .45, .11, 0 at F186, 190, 192, 194, 196, 198.
  * Collapse: .03, .15, .30, .49, .65, .86, 1.0, .91, .91, .80, .20, .11, 0 at F231, 237, 243, 249, 258, 266, 280, 288, 291, 293, 295, 297, 300.
  * Expand: .007, .034, .093, .155, .278, .746, .926, .959, .973, .999, 1.0, .98, .967 at F336, 342, 348, 351, 354, 357, 363, 369, 375, 390, 430, 436, 442.
  * Release return: .01, .095, .23, .68, .80, .87, .92, .97, .99 at F444, 446, 448, 452, 454, 456, 458, 462, 465.
* **Springs** (critically damped, x'' = w^2 (target - x) - 2w x'):
  * orbit follow w = 16
  * orbit recentre w = 5
  * tilt in w = 4.5, tilt out w = 20
  * align in w = 12, align out w = 25
  * cursor follow: 1:1 (no smoothing visible)

### 5.7 Cursor component (DOM/CSS overlay, values at a 1440 px wide viewport)
* Ring: 79 px diameter (r 39.5), 1.5-2 px white stroke at 60 % opacity, no fill. Scales with the viewport (5.49 % of width) or stays fixed in CSS px (design choice).
* Pointer-down: ring scale 0.87 for 3 frames (0.1 s), back to 1.0 over the next 3 frames. Inner disc white at 51 % grows radius 0 to 39 px from the centre with easeOutCubic over 0.20 s (click) to 0.33 s (hold). Optional `backdrop-filter: blur(4px)` (not verified).
* Pointer-up: disc opacity to 0 over 0.13-0.17 s (linear). The ring stays.
* No hover styling over the hero. No trail, no lag, no blend mode visible.

### 5.8 Post-FX for quality tiers
The reference is a clean, denoised Cycles render with **no motion blur, no DOF, no grain, no CA, no glare**. Bloom is limited to a soft halo on the clipped orb (threshold about 0.95 luma, radius about 5-10 px at 1440 w, low intensity). Tone: high-key, low-contrast; never let shadows go below about #1c324f. Any extra FX (vignette, grain) would be a departure from the reference.

### 5.9 Validation frames (compare in-engine screenshots at 1440x766)
State F000 (rest), F036/F078 (orbit extremes), F082 (alignment), F165 (tilt peak), F252 (flattened collapse), F280 (collapse peak), F297 (reassembled), F358 (pop), F402/F420 (sustain), F453 (release snap), F460 (reassembled). Loop F000, F015, F030, F045 (tumble phase). The first-pass frames are in `research\video\f6\` (every 5th frame), `keyframes\` (gridded), `work\hero30_F060-119.jpg`, `work\hold_A/B.jpg`, `work\collapse_A/B.jpg`.

---------------------------------------------------------------------------------------------------

## 6. Open questions and risks
1. **Ring tumble axes and rates for rings B/C/D are not measured.** No 3D pose fit was done, and neither the .blend nor the GLB contains the tumble animation. Ring A's 0.5 rev/s and the 4.000 s composite period are solid; the rest needs a visual match pass.
2. **Expand camera distance**: the measured orb size gives 12.7 m; the low-confidence solve gives 10.7 m. The f/distance trade-off in the t 2.5 / 8.5 s solves (f 1772 / 1848 vs 1690) is unresolved, so dolly (fixed FOV) is recommended.
3. **The State video is a keyed demo** (Blender render plus composited cursor), not a recording of a live build. The camera recentred during one dwell but not others, and the hover push-in started about 300 px from the hero and ended while the pointer was still inside ring A. The triggers in 5.3 are a recommended reading, not a proven rule. The same applies to "Stillness": dwell-triggered vs a fixed ~1.33 s alignment cycle cannot be separated from this footage.
4. Quarter-arc trajectories in both explodes come from a handful of gridded frames (±0.15 m, ±5 deg). Only the ring-B split is exact (GLB).
5. Which shard belt rotates clockwise was not determined; the counter-rotation itself is measured.
6. The scene file says 24 fps / 250 frames, while the videos are 30 fps / 500 frames. The Wave period check (73 frames) proves one Blender frame per video frame for the water, but the .blend is not the render file (no camera, no hero animation).
7. Colours assume BT.709 limited-range decoding of an untagged file. A BT.601 decode shifts blues/greens by a few units.
8. Near-band registration scales are partly contaminated by the moving ripples. Camera conclusions rely on the far band, orb size and the solves.
9. The Default Loop's sky/water do not loop seamlessly, so the web build should not copy the loop's environment timing.
