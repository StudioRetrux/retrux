# Retrux ice hero: igloo.inc technique dossier and original R3F / three r184 recipes

Research date 2026-11-10. Scope: (a) web research on igloo.inc and comparable 2024-2026 glass/ice WebGL work,
(b) static analysis of the local igloo build `E:\Retrux Hero R&D\Iglo 2\`, (c) original implementation recipes
for every element of our scene with GPU-cost tiers that include the Intel Iris Plus 640, (d) a SOTY checklist.
No Chrome, Blender or other heavy process was run for this report; everything is web reading, plain-text search
and small header parsers.

**Hard rule restated:** igloo.inc is a technique and quality reference only. The extracted shaders under
`research\igloo_shaders\raw\` are third-party code kept for study. Nothing from them (code, GLSL, textures,
geometry, audio, constants used as a "copy") may go into Retrux. Every recipe in section 5 is described in our own
terms and is meant to be written from scratch.

Evidence tags used below:
- **[O]** observed directly in a local file (path plus bundle line `L####` of `App3D-5907d20f.js`, or a shader file number `#NNNN` from `research\igloo_shaders\raw\`).
- **[W]** web source (URL in section 8). Search-engine snippets that could not be opened are marked "snippet".
- **[X]** data produced by other research agents in this run (Blender inventory, camera solve), cited by file.
- **[I]** my inference or estimate. All GPU timings in this report are [I] and must be profiled.

---

## 0. Executive summary

1. igloo.inc (abeto, with agency Bureaux) is a **three.js r165, WebGL2-only, Svelte + GSAP** site with **no tone mapping** at all: every surface is either an unlit shader over **baked lightmaps** (igloo, ground, mountains at 2048^2; shattered rings at 1024^2) or a patched MeshPhysicalMaterial (the project ice cubes), and each scene is graded by a **32^3 3D LUT with tetrahedral interpolation** [O L4943, L6271, #0222-0224].
2. Renderer: `alpha:false, antialias:false, depth:false, stencil:false`; MSAA off, AA is **SMAA preset HIGH** in post; shader error checking disabled [O L4217, L4243].
3. DPR policy: `dpr<=2 ? min(dpr,1.15) : min(dpr,1.5)`, then an **adaptive multiplier 0.6..1.0 in 0.1 steps** (wait 2 s, decide every 4 s from 0.5 s FPS averages, down below 30 fps, up at 60 fps, give up after 4 direction flips) [O L9665, L4220].
4. Frame graph: each of the 3 scroll scenes renders into its **own HalfFloat composer** (RenderPass + grade pass); a fullscreen-triangle **transition shader** mixes the two visible scenes with an "ice cut" wipe driven by a 1024^2 data texture, spectral chromatic aberration and per-frame blue noise; then SMAA, a WebGL UI pass, and a **mip-chain bloom (6 levels, threshold 0.2, intensity 1, radius 0.85)** [O L9659, L4779 #0219, L6271].
5. **Ice refraction is screen-space and two-pass**: back faces are rendered first into a mip-mapped HalfFloat RT, then front faces refract that RT; roughness picks the mip (frost blur); dispersion = 3 IOR-shifted samples per channel jittered by blue noise; Beer-Lambert absorption is deliberately **disabled** and output clamped to 1 [O L7181, #0274-0276].
6. Igloo ice cube params: color `#e0e8ef`, roughness 0.65 x roughness map, IOR 1.18, envMapIntensity 0.91, CA 0.1, 3 samples, thickness 2, env = **512x256 half-float EXR** through PMREM [O L7060, L6445].
7. The mouse "frost wipe" is a **512^2 ping-pong simulation in the mesh's second UV set**: noise advection, 4-neighbour max dilation, capsule splat along the cursor segment, x0.985 decay; the growth front becomes a glowing blue rim [O #0291, #0279-0283].
8. The igloo itself is a **BatchedMesh of ice blocks** whose look comes from **two baked lightmaps (assembled and exploded) crossfaded by per-block displacement**, plus emissive accents (0.5, 0.7, 1.0), a fake SSS gradient and ground bounce [O #0258-0259, L6099].
9. Their shattered rings are **opaque, baked-texture meshes** with per-fragment `centr`/`rand` attributes from Houdini; fragments are rotated and pushed in the vertex shader by camera distance [O #0306-0307, L7356]. That is the cheapest possible "shatter" and maps directly onto our Ring 4.1-4.4 arcs.
10. Motion quality comes from **frame-rate-independent double smoothing** everywhere (target, lerp, lerp), sine-noise camera drift (amplitude 0.01-0.05), mouse look of +/-(0.07..0.1) x pi/2 rad, FOV kick of up to -5 deg with scroll velocity, and authored GSAP timelines scrubbed by scroll progress [O L4217, L6271, L7181].
11. Loading: tiny Svelte shell with an ASCII loader, dynamic import of a 1.49 MB bundle, decoders in workers (Draco 1, KTX2 1, WASM Ogg 1, EXR, ImageBitmap, MSDF layout), and a **warm-up that calls `compileAsync` + `initTexture` and renders each scene once offscreen before the reveal** [O L4217 @880967].
12. Whole site payload 19.34 MB: KTX2 12.70 MB (ETC1S for colour, raw+zstd for data), Draco 0.59 MB, OGG 2.94 MB, JS 1.84 MB [O]. Jury scores: SOTD 7.92, Dev award: **Animations 9.60**, WPO 8.00, Responsive 8.40, but Semantics 6.60, Accessibility 6.60, Markup 6.40 [W].
13. For Retrux the lesson is the same as igloo's: **bake whatever is static, simulate only what moves, and make the moving thing extraordinary.** Our hero needs more optical realism than igloo's (thick refractive milky ice, a volumetric orb), but our environment is static, which makes it cheaper than igloo's.
14. **The plate-projection hypothesis is supported, with three changes** (section 5.5): (a) mouse look must be a pure camera rotation about the lens centre so projected plates stay parallax-free; (b) the dolly (about 2x closer per [X]) needs a second plate and layered proxies (background / midground / foreground with alpha) to avoid stretching and disocclusion; (c) water must be rendered from separate passes (reflection-only plate + mask) so ripples and the live hero reflection can be composited.
15. Blender reference uses **AgX, look None, exposure 0, no motion blur, no compositor nodes, 4096 samples, filter 1.5 px** [X inventory_static.json]. So: AgX in WebGL (three r184 `AgXToneMapping` or postprocessing 6.39.1 `ToneMappingMode.AGX`, both verified installed), very restrained bloom, **no motion blur by default**.
16. Iris Plus 640 tier (T0) plan: DPR 1.0 with adaptive render scale 0.6-1.0, one plate fetch per env pixel, single-sample refraction with baked thickness, analytic sphere optics + 8-step orb march, analytic ripples, quarter-res hero reflection, 4-level bloom. Estimated 10-14 ms at rest and 18-25 ms at full dolly [I], so 30 fps worst case and 60 fps at rest is plausible but must be profiled.

---

## 1. Files produced

| Path (all under `C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad\research\`) | Content |
|---|---|
| `igloo_dossier.md` | this report |
| `igloo_shaders\raw\0001..0390_*.glsl` | 390 GLSL literals extracted from the bundle, each with offset, line and JS context header |
| `igloo_shaders\INDEX.md` | hand-annotated purpose of every custom shader (#0188-#0390) |
| `igloo_shaders\INDEX_table.md`, `index.json`, `index_named.json` | machine tables (uniforms, includes, nearest mesh name, textures loaded nearby) |
| `igloo_shaders\ktx2_inventory.json` | header dump of all 49 KTX2 files (size, mips, ETC1S/UASTC/raw, transfer) |
| `igloo_shaders\igloo_key_params.json` | the key numeric parameters of this report in JSON |
| `igloo_shaders\README.md` | do-not-reuse notice and ranges |
| `igloo_scripts\*.py` | extract_glsl, summarize_index, grep_ctx, name_shaders, ktx2_headers, exr_header, mat_summary, api_check (all read-only, run with `python -I`) |

---

## 2. Web research

### 2.1 igloo.inc: credits, stack, awards

- Built by **abeto** ("a small, specialised team of technical artists making interactive experiences and games on the web"); **Bureaux** proposed the collaboration, supplied moodboards, renders, 3D assets, a content outline, music and SFX [W Awwwards case study]. The bundle prints `console.log("🧊 by https://abeto.co")` [O L4740]. KTX2 writer fields read "abeto :D" and "vicente :D" [O ktx2_inventory.json]; the Webby page credits "Vicente V, Engineer, Abeto / Pudgy Penguins" [W].
- Stated tools: Houdini and Blender (3D, textures), Figma / Photoshop / Affinity (UI), Three.js, three-mesh-bvh, Svelte, GSAP, Vite, vanilla JS, DaVinci Resolve (sound) [W case study]. All of three, three-mesh-bvh (`boundsTree`, `shapecast`, `raycastFirst`), Svelte (`__svelte_` keyframes), GSAP (plugin version 3.12.5) and the pmndrs postprocessing library are visible in the bundle [O].
- Stated custom tech: "a custom procedural algorithm grows ice-crystal structures inside a base shape such as a cube or cylinder"; a "volume data exporter" turning VDB into a browser format smaller than a typical image; a fluid simulation; real-time intro instead of video; scene transitions mixing chromatic aberration, "tech displacement" and frost; text scramble by shifting an SDF texture offset to avoid browser style recalculation; background loading and shader compilation [W case study]. Every one of these is confirmed in code (sections 3.5-3.12).
- Awards: Awwwards **Site of the Year 2024** and **Developer Site of the Year 2024** [W search snippets of awwwards.com/annual-awards-2024; pages returned 404 to direct fetch]; SOTD 23 Jul 2024 with 7.92 (Design 8.05, Usability 7.50, Creativity 8.31, Content 7.91) and Developer award 7.66 (Semantics/SEO 6.60, **Animations/Transitions 9.60**, Accessibility 6.60, **WPO 8.00**, Responsive 8.40, Markup 6.40) [W awwwards.com/sites/igloo-inc]; Webby Winner 2026 Best Visual Design - Aesthetic, nominee Technical Achievement [W].

### 2.2 What the juries praised

- SOTY jury (snippet): the site "accomplishes something I've seen very few other sites accomplish": an immersive 3D experience that stays an **easy-to-navigate scroll** interaction. Developer SOTY (snippet): it "redefines the standards of what kind of creative coding should be showcased". [W snippets, not verbatim-verified]
- The numeric breakdown is the useful part: SOTY-level dev scores were driven by **animation/transition craft (9.6)** and **performance (8.0)**; semantics, accessibility and markup were mediocre (6.4-6.6) and did not block the top award [W]. A 2026 juror write-up names the same three gates: a specific art direction where static frames already look intentional, directed motion with meaning, and about 60 fps on mid-range hardware, plus a reduced-motion path; "missing any one caps a site in the mid-7s" [W hontran.dev].

### 2.3 Other 2024-2026 references with ice, glass or crystal heroes

| Site / piece | Recognition | Techniques reported | Relevance to us |
|---|---|---|---|
| **Dracarys** by Robert Borghesi (dghez) | Awwwards SOTD 30 Jul 2024 (7.52), Dev 7.39 with Animations 8.20 [W] | Water, ice, flames, frost; GPGPU particle sim on a skinned mesh; **GPGPU water simulation with mouse trail on the floor using a custom reflective material**; custom pipeline with bloom, colour correction, **LUT and frost** post; loop animations moved into vertex shaders to free the CPU [W three.js forum] | Closest reference for our water: an interactive height-field sim under a reflective material, plus LUT grading like igloo |
| **Vercel prism hero** (vgpu launch, Codrops 3 Sep 2026) | Codrops feature; award not verified [W] | WebGPU; light paths first ray-traced with **16 jittered samples per frame accumulated over time**, then the dispersed fan turned into a mesh; glass shader uses an env map for surroundings; static shadow painted as a texture; expensive noise normal map **rendered once to a static texture at startup**; **low-quality mode when battery < 30 % and not charging, or when frame rate is unstable** [W snippets] | Validates: bake the expensive normal noise once; temporal accumulation for dispersion on the high tier; battery-aware quality drop |
| **DeepSee Commerce** (Hon Tran) | Awwwards Honorable Mention [W] | Underwater iceberg metaphor; scroll-driven camera descent; depth fog and light scattering; **capped DPR, compressed assets, render only when visible** [W] | Same performance hygiene we need on the iGPU |
| **Oryzo** (Lusion) | Awwwards SOTM April 2026 + Developer [W] | Single hero object "rendered like a film"; Houdini + Redshift for the look; image sequences and video were tried and **rejected for lack of interactivity**; eased physics-like motion; scroll moves the camera through depth [W] | Same "single hero object" brief and the same no-video decision as ours |
| **Liquid glass grid** (Codrops Sep 2026), **Volatile Nexus** (Codrops Aug 2026) | tutorials / experiments, not award-verified; Codrops returned 403 to direct fetch [W snippets] | MeshPhysicalMaterial with transmission + ior + thickness + `dispersion` (already present in r165: the `dispersion` uniform appears in the bundle's meshphysical shader, #0111); per-channel IOR for dispersion; caustics with cubes and sound | Confirms that three's built-in dispersion is now a credible baseline for the mid tier |

---

## 3. Static analysis of the igloo build

### 3.1 Inventory and payload [O]

- `index.html` (846 B) loads `assets/index-2d900c2d.js` (16.5 KB Svelte shell), which dynamically imports `assets/App3D-5907d20f.js` (1,487,398 B, 9,665 lines, 243 `void main`).
- Totals by type: KTX2 49 files 12,700,764 B; Draco `.drc` 22 files 592,021 B (all geometry of the whole site); OGG 18 files 2,939,575 B; JS 8 files 1,835,663 B; WASM 2 files 758,862 B (basis 472,914 + draco 285,948); EXR 260,540 B; fonts 193,060 B; total 19,343,203 B.
- Five 1,410-byte files (`assets\cubes_env.exr`, `assets\perlin-datatexture.png`, `assets\cubes\advect.png`, `assets\cubes\bg.png`, `assets\uv\uvchecker-srgb.png`) are HTML pages saved by the cloner, not assets; the real ones live under `assets\images\`.
- KTX2 encoding policy (from headers): **colour, lightmaps, normals and roughness in ETC1S/BasisLZ with full mip chains** (lightmaps 2048^2 at 533-842 KB, normal maps 2048^2 at 1.08-1.13 MB, roughness 1024^2 at 236-248 KB, ring colour 1024^2 at 219-229 KB, ring AO 256^2 at 17 KB); **data textures as raw RGBA + zstd, linear, 1 mip** (scroll 1024^2 1.29 MB, frost 256^2 135 KB, perlin 64^2 3.8 KB, blue noise 128^2 50 KB, LUTs 32^3 14-41 KB, volumes 64^3 318-837 KB, UI icons 64-128 px SDFs under 5 KB, MSDF font atlas 512x1024 110 KB).
- Environment map: `images\cubes_env.exr` is **512x256, half-float RGBA, ZIP** [O exr_header.py] and only used by the project-cube scene.

### 3.2 Architecture and frame loop [O]

- Event bus emits `webgl_prerender`, `webgl_render`, `webgl_postrender` from a GSAP ticker; FPS is averaged every 0.5 s over at least 5 frames [O L4217 @842897].
- A global uniform block `Global{resolution, resolutionUI, aspect, time, dtRatio}` is shared by every custom material through `uniformsGroups` (UBO, WebGL2) [O #0189].
- Scenes: `{igloo, cubes, entry}` are scroll scenes, each with its own composer; plus a project-detail scene and a UI scene [O L9659]. Only scenes intersecting the current scroll window get `isSceneVisible=true` and render that frame.
- The main composer's RenderPass draws a single fullscreen triangle whose material is the transition shader `f3` (#0219); a second material `p3` (#0221) is used for the very first fade-in.
- Deep links: a router maps `#project-hash` URLs to the detail view; a deep link skips the intro by forcing the intro timeline to progress 1 [O L9659 @1480849].

### 3.3 Renderer setup [O]

| Item | Value | Evidence |
|---|---|---|
| three.js | r165 (`Aa="165"`) | L5 |
| API | WebGL2 only; aborts if `webgl2` is unavailable; r163+ build rejects WebGL1 | L9665, L3802 |
| Context | `new WebGLRenderer({alpha:false, antialias:false, stencil:false, depth:false})` | L4217 @874671 |
| Debug | `debug.checkShaderErrors = false` (saves a sync per program) | L4217 |
| Float RT | 1x1 float render-target probe at init; `floatLinearFiltering` from `OES_texture_float_linear` | L4217, #0192 |
| Tone mapping | never set by the app, stays NoToneMapping | grep L3551/L3802 only internal |
| Colour space | default sRGB output; data textures loaded as linear "data"/"colordata" | L4219 @962026 |
| DPR | `dpr<=2 ? min(dpr,1.15) : min(dpr,1.5)`; canvas sized directly to `floor(css * DPR)`, renderer pixelRatio stays 1 | L9665, L4243 |
| Adaptive DPR | see section 3.13 | L4220 |
| Shadows | `shadowMap.enabled = true`, type PCFSoftShadowMap (minified constant `ly = 2`), though the visible looks are baked | L9665, L5 |
| Texture types | render targets HalfFloat (`Mi = 1016`); GPGPU particle state in Float RGBA DataTextures (`Lt = 1015`) | L5, L7832 |
| Canvas | appended inside a **closed shadow DOM** | L4243 |
| Resize | debounced 500 ms (50 ms in another mode) | L4217 @850416 |

### 3.4 Render passes and post chain [O]

```
per visible scroll scene (HalfFloat ping-pong RTs, full internal res):
  RenderPass(scene, camera)
  grade pass:
    igloo : diagonal gradient mix(0.8,1.0,(u+v)/2) * uGradientAlpha, then 32^3 LUT tetrahedral   (#0224)
    cubes : 32^3 LUT tetrahedral                                                                   (#0269)
    entry : angular blur + square displacement when near a ring, HSV lift, animated corner glare  (#0350)
main composer (HalfFloat):
  1. fullscreen triangle "transition" shader samples tScene1/tScene2 (+tCubes,+tDetail)          (#0219)
  2. SMAA preset HIGH (encodeOutput true)                                                        (L4243 @1034162)
  3. UI scene pass (all UI is WebGL)                                                             (L9659)
  4. mipmap Bloom: levels 6, luminanceThreshold 0.2 (0 in entry), intensity 1, radius 0.85      (L6271, L7181, L8736)
```
- Transition shader details [O #0219]: when scrolling between scenes, a cut line inclined by `-0.2 * aspect` sweeps the screen; the cut shape, a "tech displacement" and a slope jitter come from the R, G, B channels of `scroll-datatexture.ktx2`; each side is sampled through a **5-tap spectral chromatic aberration** (hue-weighted barrel offsets, #0215) whose strength ramps near the cut; outgoing/incoming scenes get a 0.4 vertical parallax with a cubic ease; per-pixel blue noise breaks up CA seams; the blue-noise offset is re-randomised **every frame** from JS (`Math.random()*10, *12.5`).
- Project-detail transition: the same compositor displaces UVs with `frost-datatexture.ktx2` (ice displacement) scaled by `(1 - progress)`, adds a small horizontal "tech" jitter, and cross-fades with CA.

### 3.5 How the ice, frost and refraction are done (project ice cubes) [O]

- Material: `WL extends MeshPhysicalMaterial` with `defines.AWESOME_SAMPLES = 3` and `onBeforeCompile` replacing `transmission_pars_fragment`, `transmission_fragment`, `roughnessmap_fragment`, `normal_fragment_maps` and the final `outgoingLight` line [O L6445, #0274-0283].
- Parameters set per cube [O L7060]: base colour `#e0e8ef`; `roughness 0.65` multiplied by the green channel of `cubeN_roughness.ktx2` (1024^2); tangent normal map `cubeN_normal.ktx2` (2048^2), `normalScale 1`; `ior 1.18`; `reflectivity 0.3`; `envMap` = PMREM of the 512x256 EXR, `envMapIntensity 0.91`, `envMapRotation.y = pi`; uniforms `uChromaticAberration 0.1`, `uThickness 2`, `uColorFrost #83a1c5`, attenuation colour white with distance 0.
- **Two-pass transmission** [O L7181 @1307419], each frame:
  1. Set every cube to **BackSide**, point its transmission sampler at a static background image (`cubes/bg.png`, with sampler size forced to 4x4 so the roughness LOD blurs it), make the **inner logo mesh visible**, hide cards/plexus/texts, and render the whole scene into `_transmissionRT` (HalfFloat, `generateMipmaps:true`, LinearMipmapLinear, no MSAA).
  2. Set cubes to **FrontSide**, sample `_transmissionRT`, hide the inner logo, show everything else, render normally.
  The logo therefore exists only "inside" the ice, seen through two refractions.
- Refraction maths (reimplementation of three's transmission): exit point = surface point + `refract(-v, n, 1/ior)` scaled by thickness and model scale, projected to screen; mip level = `log2(RTwidth) * roughness * clamp(2*ior - 2, 0, 1)` (frosted blur from the mip chain); `volumeAttenuation()` returns 1 (Beer-Lambert commented out, "fix"); `totalDiffuse` replaced by the transmitted colour and clamped to [0,1] [O #0275-0276].
- Dispersion: 3 iterations; the R sample uses `ior`, G uses `ior * (1 + CA*(i+n)/3)`, B uses `ior * (1 + 2*CA*(i+n)/3)`; thickness is also smeared by `thickness * roughness^0.33 * (i+n)/3`; `n` is per-pixel blue noise; the normal is perturbed by `roughness^2 * 2 * blueNoiseVector` (rough areas scatter more) [O #0276]. That is 9 transmission fetches per pixel.
- Mouse frost wipe [O #0291, L6896]: a 512x512 HalfFloat ping-pong RT in the cube's **UV1** space. Each update: advect the lookup UV by a tiling noise texture (`advect.png` x3), take the **max of the 4 neighbours** (the cleared region grows outward), add a **capsule splat** along the segment from the previous to the current hit UV (radius `0.05*smoothstep(0.1, 1, v)`, cubic falloff), multiply by **0.985** per update, clamp to 1; G channel = growth front (new minus old). The hit UV (UV1) comes from a three-mesh-bvh raycast against the cube. The splat strength `v` is a cursor-speed envelope: `target += distUV*6; target *= 0.88; v = lerp(v, power4.out(target), 0.1)`; it resets after 0.15 s idle or a jump > 0.3 UV, and **the sim only steps when at least 15 ms have passed** (about 66 Hz cap, so it behaves the same on 60 and 120 Hz screens) [O L6977].
- Using the frost map [O #0280-0283]: `roughness *= 1 - frost` (the wiped area becomes clear ice), normal-map strength `*= 1 - frost`, emissive `+= rim * #83a1c5`, `+= triangles * rim * 10`, `+= triangles * frost^2` (a tiling triangle texture sparkles inside the wipe), final colour clamped. The frost-wipe speed also drives a looping "shard" sound.
- Camera in this scene: base (0,0,5), mouse displacement (0.1, 0.05), shake 0.02 at speed 0.1, FOV = `45 - 5*|scrollVelocity|`, cubes spaced every 5.75 units [O L7181].
- Not used: no back-face depth/thickness buffer, no volumetric marching, no caustics on the cubes. The "procedural crystal growth" lives in the **geometry and the baked normal/roughness maps** (Houdini) [W + O].

### 3.6 How the igloo and its ice blocks get their look [O]

- Every environment mesh uses a small custom unlit shader over **baked colour/lightmaps**: `igloo/ground_color` (2048^2), `ground_glow` (1024^2, pulses with `sin(x - t)`), `mountain_color` (2048^2), `ground_sansigloo_color`, sky gradient sphere r=800 (`#d1d6e3` to `#afb6c7`), snow-drift planes made of three multiplied scrolling `wind_noise` lookups x8 [#0225-0242].
- The igloo is a **BatchedMesh** (one draw call) of ice blocks; per-block matrices are written every frame and a small float **options texture** carries per-block displacement and bounce [#0258, L6099].
- Shading [#0259]: `mix(assembled_lightmap, exploded_lightmap + 0.05, clamp(5*displacement))`, i.e. **two baked lighting solutions, one for the assembled dome and one for the exploded state**; emission attribute squared x displacement x blue (0.5, 0.7, 1.0); idle glow = emission^8 x 0.5 x travelling sine; inner-face glow for faces away from camera; fake sunlight SSS = `(x*0.1 + 0.4) * 0.3 * min(y + 0.5, 1) * 0.5`; ground bounce = `(1 - smoothstep(-1.5, 1, y)) * bounce * (0.8, 0.9, 1.0) * 0.25`.
- Block motion [L6099]: the cursor is projected onto a plane 19.25 units in front of the camera and lerped (0.05); each block's target displacement is the max of an idle breathing term (product of two sines, x rand, x 0.5) and a hover push that fades from `0.5 + 0.3*sin(t + 12.3*rand.x)*rand.y` at 1 unit to 0 at 3 units; the target goes through **two cascaded frame-rate-independent lerps (0.06, 0.06)**; blocks move along their centroid direction and rotate by up to 0.5 rad x displacement; only upper blocks (centroid y above ~0.45-0.7) move; scrolling away explodes the dome further with random spin x -1.5.
- Intro "materialise" [#0230, #0259, L6271]: a radial wavefront (distance + noise x 3.5) reveals terrain and igloo with a blue triangle-pattern shock front (`falloffsmooth` with 3-10 unit margins).

### 3.7 Shattered rings (entry scene) [O]

- 3 rings alternate two Houdini meshes (`shattered_ring2.drc` 44 KB, `shattered_ring.drc` 41 KB), stacked every 2.5 units from y = -1.65, rotated -90 deg about X; each has a **1024^2 colour map** and a **256^2 AO/glow map** [L7356, ktx2_inventory].
- Vertex shader [#0306]: per-vertex `centr` (fragment centroid) and `rand` (vec3) attributes; each fragment rotates about its own centroid around a random axis by `0.5 * smoothstep(1.5, 12, depth)` plus a camera-entry term; is pushed outward along `centr` by 0.075-0.15 while the camera is near; wobbles with `sin(rand.x*5 + 0.5*t + 15*(centr.x+centr.y+centr.z)) * 0.05`; the whole ring spins in two planes by up to 0.3*pi as the camera approaches.
- Fragment shader [#0307]: baked colour faded into a screen-space diagonal gradient (`#6a6f7d` to `#e1e6f1`, modulated by sine noise) by distance; emissive from the glow map x (0.5, 0.7, 1.0) x noise when the camera is close.
- The camera flies **through** the rings on a scroll-scrubbed GSAP timeline; rings switch off by progress windows (0.34 / 0.43 / 0.52); a "portals" loop swells as `ease(fit(minDistance(progress, [0.28, 0.375, 0.465]), 0, 0.04, 1, 0), power2.out) * 0.9` [L8736].

### 3.8 Particles, volumes, fluid [O]

- Volume particles [L7832, #0328-0331]: **150,000 GPGPU particles** (positions and velocities in float textures, written in one pass with **MRT** `layout(location = 1) out`), confined to a 0.65 cube then a cylinder (r 0.275, y -0.34..0.35). Forces per frame: screen-space fluid velocity push (stable-fluids sim at 128^2, splatRadius 0.22, splatForce 35, 2 pressure iterations, velocity dissipation 0.98); **bitangent (divergence-free) 4D noise**; spring to original position; **attraction to a VDB-derived 3D texture** (RGB = gradient, A = signed distance; 64^3 or 32^3 raw RGBA + zstd KTX2); friction 0.9 per 60 fps frame. Lighting is computed in the sim: wrap diffuse (wrap 0.25) against the SDF gradient (GPU Gems ch. 16 style) stored in `pos.w`; speed smoothed into `vel.w` drives colour from `#b5d5ff` / `#bdc6d4` / `#222b42` to `#d7ebfa`.
- Snow: 1,200 instanced 0.075 x 0.15 quads, GPGPU, wrapped in a 25 x 10 x 25 "treadmill" box around the camera [#0248-0251, L5703].
- Igloo "plexus" points/lines and digit particles add the techno layer [#0253-0257].

### 3.9 MSDF text and UI in WebGL [O]

- All UI text and icons are WebGL: MSDF font atlas (IBM Plex Mono Medium, 512x1024 raw RGBA) and SDF icon textures [#0190, #0353-0366].
- Text layout runs in `msdfworker` and emits per-glyph attributes: position, uv, `centr` (glyph centre), `uvMask` (atlas bounds), `textWeights` (glyph index 0..1, word index 0..1), `lineWeights` (index in line, word in line, line index) [O msdfworker-ac346fa7.js].
- Reveal: two progress uniforms; alpha uses a moving `falloff` over `textWeights.x` with margin 0.1; the second progress drives a **scramble**: while it is below 1, the glyph's atlas UV is shifted by `0.125 * (floor((1 - p) * 5.753) mod 8)`, so letters flick through other glyphs before settling [#0260]. Blink = alpha `0.6 + 0.4 * (floor(blink*5) mod 2)` [#0261]. Typical durations: show1 0.4 s and show2 0.75 s `sine.out`, staggered per line, x1.75 for later lines; hide 0.4 s [L6271 @1192445].
- Logo / buttons reveal through a block mask sampled from the scroll data texture with 3 random steps [#0352].
- Cursor: **no custom cursor**; hover sets `cursor: pointer`, draggables use `grab`/`grabbing` [O L4604].

### 3.10 Audio [O]

- 18 OGG files (music 1.53 MB, room tone 610 KB, wind 573 KB, the rest 3-62 KB) decoded by a **WASM Ogg-Vorbis decoder in a worker** (pool of 1), then copied into an AudioBuffer [L4217 @884793].
- Mix [L4747]: music 0.2 loop; room 0.45 loop; wind loop driven by igloo scroll `fit(p, .05, .2, 0, 1) * fit(p, .75, .95, 1, 0) * 0.4`; igloo hum x0.5; "shard" loop follows the frost-wipe velocity (attack lerp 0.2, release 0.05) x0.5; "portals" loop as in 3.7; "particles" loop = `0.04*e + splatVelocity*0.21`; UI one-shots 0.3-0.5; **3 beep variants picked at random with a 0.4 s minimum interval**.
- **Muted by default** (`muted: true`), toggled by the WebGL "Sound: on/off" control; master gain uses `setTargetAtTime(v, now, 0.01)`; audio pauses on tab hide.

### 3.11 Scroll and camera choreography [O]

- Scroll [L9659]: wheel delta x **0.00075**; two-stage smoothing (`lerpFPSLimited(target1, target2, 0.075, cap)` then `lerpFPS(y, target1, 0.15)`), target clamped to +/-0.5625 of a page from the current value; velocity accumulates |dy| with friction 0.98 and is clamped 0..1; the site **loops infinitely** (scroll modulo total height); after **1.4 s idle** it auto-centres to the nearest scene boundary with ease `inOut3` (`M0,0 C0.6,0 0,1 1,1`) over 2 s or more.
- Each scene holds a **paused GSAP timeline** authored in seconds; every frame `timeline.progress(sceneProgress)` scrubs it; at init they call `progress(1)` then `progress(0)` to prime start values [L6271, L8736].
- Camera rig [L4217 @861440]: base position/target/up; mouse adds a spherical offset of `pointer(-1..1) * pi/2 * displacement` (igloo 0.07 x 0.025 = up to 6.3 deg x 2.3 deg), smoothed with lerp 0.035 per 60 fps frame (0.015 in the entry scene); **shake** = sine-noise(time x shakeSpeed) x amplitude (0.01-0.05); touch release eases back at half speed; responsive `zoom = min(1, aspect * 1.25)` (1.5 in entry) instead of changing FOV.
- Frame-rate independence everywhere: `damp(k, ratio) = 1 - exp(ln(1-k) * ratio)`, `friction(k, ratio) = exp(ln(k) * ratio)`, where `ratio = dt / (1000/60)` [L4217 @852219]; the same helpers exist in GLSL (#0318).
- Custom eases [L4217 @842897, L9665]: inOut1 `C0.5,0 0.1,1`, inOut2 `C0.56,0 0,1`, inOut3 `C0.6,0 0,1`, inOut4 `C0.4,0 -0.06,1`, plus inOut5, entry_ease(_2,_3), igloo_ease_1; GSAP defaults `power2.inOut`, 0.6 s, `overwrite: "auto"`, `force3D`.
- Intro [L6271 @1195626, L9659]: first frame fades from a flat colour over 1 s; camera starts at (-14, 21, 14) looking at (0, 0.5, 0) and blends into the scroll path over 5.5 s (`inOut1`, starts at 2 s); outline materialises over 2.5 s, igloo over 2.25 s from 1.1 s; bloom intensity eases 1.5 to 1 over 2 s; UI appears at 4.5 s; scrolling unlocks after 5 s.

### 3.12 Loading strategy [O]

1. `index.html` paints a Svelte loader immediately: background `#A0A5B1`, a 10-character ASCII bar (`---===+++=`) animated by CSS `content` keyframes, 17 px monospace with a soft text glow.
2. The 1.49 MB App3D module is dynamically imported; it checks WebGL2, registers eases, inits the renderer and audio context, then constructs **all** scenes.
3. Decoders in workers: Draco (limit 1), KTX2/Basis (limit 1), Ogg WASM (1), EXR (three's EXRLoader in a worker), ImageBitmap (fetch + `createImageBitmap` off-thread), MSDF text layout [L4220 @1014643, workers].
4. **GPU warm-up per scene** [L4217 @880967]: traverse, force everything visible and non-culled, collect textures, `await renderer.compileAsync(scene, camera)` (KHR_parallel_shader_compile when present) and `renderer.initTexture(t)` for each texture, render once into a dummy RT, restore visibility. The main composite materials are also pre-uploaded by swapping them onto the fullscreen mesh once [L9659].
5. The loader fades only after every scene is uploaded: text 250 ms, container 750 ms, cubic in-out. Two of the three VDB volumes keep loading in the background.

### 3.13 Adaptive quality [O]

- Only DPR adapts: multiplier m in [0.6, 1.0]; starts 2 s after the scene becomes active; FPS samples every 0.5 s; decision every 4 s with at least 5 samples: `avg < 30 and m > 0.6` gives m -= 0.1; `avg >= 60 and m < 1` gives m += 0.1; a counter of direction changes stops the controller after 4 flips ("Adaptive DPR stopped.") [L4220].
- Other cost control is structural: only 1-2 scenes render per frame, decoders limited to 1 worker, baked lighting, small env map, 3 dispersion samples, 128^2 fluid, debug checks off. No GPU-tier detection, no `prefers-reduced-motion` handling [O grep: no hits].

### 3.14 Useful negatives (what igloo does not do)

No tone mapping, no real-time GI, no SSR, no shadows on the hero looks (baked), no Beer-Lambert (disabled), no thickness buffer, no volumetric raymarch in surfaces, no TAA, no motion blur, no custom cursor, no reduced-motion path, no DOM text for the experience. Their realism budget goes into baked maps and motion; their optical tricks are cheap and screen-space.

---

## 4. Translating to Retrux

Principles drawn from the analysis:
1. **Bake the static world, spend GPU only on the hero.** Our environment never changes, so it can be even cheaper than igloo's (they still shade dozens of unlit meshes and smoke layers).
2. **One premium optical effect, made robust.** igloo's ice reads as premium because roughness-driven blur, blue-noise-jittered dispersion and clamped output never alias or flicker. Our rings need the same discipline plus real thickness and milky scattering.
3. **Motion is the award.** Double-smoothed springs, sine-noise drift, timed GSAP choreography, frame-rate independence, sound tied to velocity.
4. **Warm everything before the reveal.** Compile shaders, upload textures, render once offscreen.

| igloo technique (observed) | Our element | Our original equivalent |
|---|---|---|
| Baked 2048^2 lightmaps on unlit env meshes | arctic lake environment | camera-projected Cycles plates on proxies (5.5) |
| Two-pass back-face transmission RT + roughness mips + 3-sample CA | ice rings | scene RT with mips, real thickness from back-face depth (T1+) or baked thickness (T0), per-channel IOR, Beer tint, milky scatter, crack layers (5.1) |
| Assembled vs exploded lightmap crossfade, centroid attributes, cascaded lerps | ring shatter into Ring 4.1-4.4 arcs | fragment swap at identical pose, per-fragment centroid pivots, spring-driven offsets, fracture faces flagged milky (5.1, 5.8) |
| Mouse frost RT in UV1 (dilation + decay) | optional hover frost on rings | same idea, our own sim: hover "breath" frost that blooms and fades (5.1 optional) |
| PMREM of a small EXR | reflections | PMREM of a Cycles 360 panorama from the hero position (5.5) |
| GPGPU particles / snow | shards, optional snow | instanced shards animated fully in the vertex shader (5.3) |
| LUT per scene, no tone mapping | colour pipeline | AgX (matches Blender) + optional residual 32^3 LUT (5.7) |
| Blue noise re-randomised per frame | dither, jitter | 128^2 blue noise, random offset per frame (5.7) |
| Adaptive DPR 0.6-1.0 | quality tiers | detect-gpu start tier + FPS-driven render-scale controller (5.0) |
| WebGL MSDF UI | Figma nav/H1/subline | keep DOM text (SEO/a11y, Space Grotesk), animate with GSAP SplitText-style per-character reveals; WebGL only for the cursor disc distortion (5.8) |

---

## 5. Implementation recipes (original), with GPU-cost tiers

### 5.0 Budget, tiers and tier selection

Target machine facts: Surface Laptop 1, Intel Iris Plus 640 (Gen9.5 GT3e, 48 EU, about 0.8 TFLOPS FP32, 64 MB eDRAM, shared dual-channel LPDDR3-1866 at about 30 GB/s theoretical) [I from public specs]. A HalfFloat fullscreen read+write at 1.3 MP moves about 21 MB, roughly 0.7-1.0 ms on this GPU before any ALU [I].

| Tier | Who | Internal resolution | Budget at rest / during full dolly |
|---|---|---|---|
| **T0** | Iris Plus 640, UHD 620, older integrated | DPR forced to 1.0, render scale 0.85 adaptive down to 0.6 | 14 ms / 33 ms (60 fps at rest, 30 fps worst) |
| **T1** | Iris Xe, Apple M1, GTX 1050-1650 class | DPR min(dpr, 1.25), scale 1.0 adaptive to 0.7 | 10 ms / 16 ms |
| **T2** | RTX / M1 Pro and up | DPR min(dpr, 1.5) (2.0 on 4K), scale 1.0 | 8 ms / 12 ms |

Selection: start tier from `detect-gpu` (5.0.70 is installed in `retrux-web`) plus `navigator.hardwareConcurrency` and `deviceMemory`; then run our own controller in the spirit of igloo's: sample FPS every 0.5 s, wait 2 s after reveal, decide every 3-4 s, step the render scale by 0.1 within the tier's range, drop a whole tier if scale is at minimum and FPS is still below 28, raise only when above 58 for two windows, freeze after 4 reversals. drei 10.7.7's `PerformanceMonitor` (has `onDecline`, `onIncline`, `flipflops`, `bounds`, verified) can host this logic. Optional battery rule (Vercel prism): drop to T0 when `navigator.getBattery()` reports < 30 % and not charging.

Frame graph (all tiers; T-specific steps marked):
```
CPU   : input, springs (hold, shatter, camera), ring transforms, uniforms; shards/ripples are GPU-only
P0    : hero reflection RT (mirrored camera, simplified hero material)  T0 1/4 res, T1 1/2, T2 1/2-1
P1 env: sky gradient -> cloud sprites -> plate-projected layers (bg, mid, fg) -> water (plate + ripple
        distortion + P0 composite) -> shards (opaque, write depth)                -> envRT (HalfFloat)
P2    : ring back-face depth -> thicknessRT (R16F)                       T1 half res, T2 full; T0 skip
P3    : copy envRT -> refrRT (with mips) ; draw orb + band + rings into envRT reading refrRT
P4    : bloom (mip chain) -> AgX -> optional LUT -> grain/dither -> SMAA -> canvas
DOM   : nav, H1, subline, "Scroll to Explore", "Sound", cursor
```
In R3F 9 this is a `useFrame(..., 1)` that takes over rendering (priority > 0 disables the default render) and calls `gl.setRenderTarget` per pass, or a pmndrs `EffectComposer` with custom passes. Keep `gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}`; keep depth on the default framebuffer only if a pass draws directly to screen.

### 5.1 Ice rings (refraction, frost, internal cracks/bubbles, dispersion)

Look target (KV and video): thick chunky bands with near-rectangular sections, milky frosted interiors that still show the background bent through them, bright chiseled edges, slightly bluer where thick, visible crack planes, faint colour fringes at grazing edges. Blender source: group `Ice.004` on the 8 ring objects `Circle.025-.032`: Principled IOR 1.5, transmission 1.0, roughness from Noise (scale 4.2, detail 8) through a colour ramp, bump from Noise (scale 4.0, detail 8, strength 0.06) plus a **Voronoi bump (strength 0.2)** for cracks, plus displacement [X inventory_static.json].

Assets and bakes (Blender, Cycles):
- Meshes: `ring_01..04.glb` (129-142 KB) assembled; `Ring 4.1-4.4.glb` (38-40 KB) arcs with `Normal 4.1-4.4.png` (1.47-2.09 MB PNG). Only ring 4 has fragments today; rings 1-3 need the same fracture (or reuse ring-4 style cuts).
- Bake per ring at 2048^2 (T1/T2) and 1024^2 (T0): (1) tangent normal containing the Voronoi crack bump and noise bump; (2) a linear packed "ice" map: R = frost amount (the roughness ramp output), G = thickness proxy (AO baked with flipped normals, distance about the section width), B = crack-line mask (Voronoi edge distance thresholded), A = convex-edge mask (curvature/pointiness). Encode the normal as **KTX2 UASTC + RDO + zstd** (normals suffer in ETC1S; igloo accepted ETC1S at 1.1 MB per 2048^2 [O]), the packed map as UASTC or ETC1S **linear**.
- Mark fracture (inner) faces of the arcs with a vertex attribute `fracture = 1`.

Shader (custom `ShaderMaterial`, written from scratch). Inputs: refrRT (copy of envRT with mips), PMREM env, thicknessRT (T1+), packed map, normal map, 128^2 blue noise, a 512^2 tiling crack/bubble texture, uniforms `ior = 1.31` (real ice; Blender used 1.5, keep 1.31-1.5 as an art knob), `absorb`, `frostTint`, `time`.
1. Normal from the map; keep full detail where frost is high, soften by 30 % where clear.
2. Fresnel (Schlick): F0 = ((ior-1)/(ior+1))^2 = 0.018 at 1.31. Reflection = PMREM(reflect(-V,N), roughness = mix(0.04, 0.35, frost)) x F, plus a GGX highlight from the scene's key light direction (read the Blender sun if present; otherwise the brightest env direction).
3. Thickness t: T1/T2 = backDepth(screenUV) - frontDepth (view space), clamped 0.02-0.6 units; T0 = packed.G x 0.35 units.
4. Exit point: P + refract(-V, N, 1/ior) x t, projected to refrRT UV. Mip LOD = `log2(width) * 0.6 * (0.15 + 0.85*frost)^1.5`, max 6 (frosted blur, igloo-style use of mips).
5. Dispersion: T0 none, except an optional 2-tap edge fringe (+/-0.6 px along the screen normal) where F > 0.3. T1: one exit point per channel with ior - 0.008 / ior / ior + 0.008. T2: 6 wavelengths with spectral weights, IOR offsets jittered by blue noise, 50 % history blend only when the ring's angular speed is low (otherwise ghosting).
6. Absorption tint (Beer-Lambert, unlike igloo): transmitted x exp(-absorb x t x 2) with absorb = (0.55, 0.22, 0.08) per unit, so 0.3 units of ice gives a light cyan cast; tune against the KV.
7. Milky scatter: s = scatterStrength x (1 - exp(-t x (0.8 + 3 x frost))), scatterStrength about 0.65; colour = mix(transmitted, frostTint x PMREM_irradiance(N), s), frostTint about (0.86, 0.92, 1.0). This is what makes thick parts glow white like the reference.
8. Internal cracks and bubbles: T0 1 parallax layer, T1 3 layers, T2 3D march. Parallax layer i: offset the UV by the tangent-space refracted direction x depth_i (0.25, 0.5, 0.8 of t), sample the crack texture, add its value x (0.25 / i) x sky irradiance and darken slightly behind it. T2: march 12-16 steps through a 64^3 R8 tileable crack/bubble volume (`Data3DTexture`, 262 KB) between entry and exit, accumulating scatter with exp(-sigma x s).
9. Edges: + packed.A x (0.25 + 0.75 (1 - NdotV)) x 0.6 x sky irradiance, the bright chiseled rim.
10. Fracture faces: force frost = 1 and crack density high, so broken faces read as fresh white ice.
11. Output: transmitted x (1 - F) + reflection, opaque (we composite refraction ourselves). Clamp below a sane maximum (for example 8 in linear) before bloom to avoid fireflies.

Ring-through-ring refraction: refrRT does not contain the rings, so a ring behind another ring disappears inside it. T0: accept. T1: two buckets per frame, rings whose centre is behind the orb first, copy envRT again, then the front bucket (one extra copy, about 0.7 ms at T1 resolution [I]). T2: sort per ring and copy between each draw only during the dolly.

Optional hover frost (our own idea in the spirit of igloo's wipe): a 256^2 R16F map per ring in UV space; the pointer hit (three-mesh-bvh 0.8.3 is installed) splats "breath" frost that spreads and decays; frost raises roughness and the milky term locally. Skip at T0.

Motion blur: the Blender reference has none (render `use_motion_blur = false`) [X], so none by default. Fast tumbling stays sharp, as in the video.

Cost per ring pixel: T0 about 7 fetches + 120 ALU; T1 about 14 fetches; T2 30+ fetches. Estimated whole-ring cost on Iris Plus 640 at T0: 0.4-0.8 ms at rest (hero covers about 12 % of the frame) and 2-4 ms at full dolly [I].

### 5.2 Glass orb (inner glowing clouds, iridescent rim, band ring)

Blender source [X]: `magick_ball_01.002` on `Icosphere.011`: shell Principled IOR 1.25, transmission 0.995, white; a Fresnel(IOR 2.0) into a colour ramp for the rim; interior **Principled Volume** whose density/emission come from 4D noise (scale 7.57, detail 4, roughness 0.87, lacunarity 1.14) shaped by two radial falloffs (`(|p| x 5.07)^-1` for a bright core and `(|p| x 4.73)^5.5` for the edge) and further noises (scales 2.36 / 11.06 / 0.83). Orb radius about 0.83 units, about 68-70 px on screen at rest and about 130 px when held (low confidence) [X camera_solve_states.json].

Recipe:
- Shell: draw the sphere mesh but do the optics analytically in the fragment shader (exact ray-sphere maths, no back-face pass). F0 = ((1.25-1)/(1.25+1))^2 = 0.012; reflection from PMREM. Refraction: refract in at the entry point, intersect the far side analytically, refract out, then look up refrRT at the projected exit ray (or PMREM when it leaves the screen). This gives the inverted, magnified background seen in the KV.
- Iridescent rim: weight = F x 0.6, colour from a thin-film approximation of our own (a cosine palette over (1 - NdotV) x 2.2 plus a slow time drift), amplitude 0.15-0.3, rim only. three's built-in `iridescence` (thin film, IOR about 1.3, 100-400 nm) is an acceptable T0 fallback if we keep a physical shell.
- Interior clouds: march from entry to exit. Density = fbm from a 64^3 RGBA8 tileable noise volume (4 octaves packed in channels, 1 MB) sampled at two drifting offsets (imitates the 4D W axis) times the radial shaping above; emission white (1.0, 0.98, 0.96) x 2-6 in linear so AgX rolls it into a soft white, matching Blender. Steps: T0 8 (with blue-noise start jitter), T1 16, T2 32 plus temporal accumulation (the orb moves slowly).
- Band ring: the thin horizontal band of ring 4 [X: "ring4_band" tracked in the camera solve]; use the ring shader at T0 settings.
- Glow: rely on bloom of the emissive core; add a cheap additive halo sprite only if bloom is too subtle at T0.
- Cost: tiny footprint (about 15 k px at rest, 53 k px when held): a 16-step march is 0.25-0.85 M 3D fetches, well under 0.5 ms even on Iris [I]. **T1 orb quality is affordable on T0.**

### 5.3 Instanced cobalt crystal shards

Blender source [X]: `Object_2.008-.010`, material with baseColor + specular textures, roughness 0.5. KV shows 25-30 shards in view.
- Geometry: the 2-3 crystal variants decimated to 100-200 triangles each; one `InstancedMesh` per variant (2-3 draw calls), 48 instances total (T0 32, T2 64).
- Per-instance attributes: orbit radius (1.6-2.8 x orb radius), orbit tilt, phase, angular speed (0.25-0.7 rad/s, mixed directions), spin axis and speed (1-3 rad/s), scale (0.6-1.2), seed. All motion in the vertex shader from `time`, zero CPU per frame. Burst on shatter: push outward by `burst x (0.5 + seed)` with a per-instance delay of up to 0.15 s and extra spin.
- Shading: flat facet normals; cobalt body (about linear (0.03, 0.08, 0.45), measure from KV); PMREM specular (roughness 0.15-0.25, F0 0.05) plus key-light GGX; fake transmission: backlight term `pow(max(dot(V, -L), 0), 6) x 0.6 x (0.2, 0.45, 1.0)`; rim `(1 - NdotV)^3 x 0.5 x sky irradiance`.
- Order: render shards in P1 (into envRT with depth) so rings refract the shards behind them and depth-test against shards in front.
- Cost: negligible, under 0.2 ms at all tiers [I].

### 5.4 Water (reflections and concentric ripples)

Blender source [X]: `Procedural Water Surface` on `Plane.011`, `Plane.013`: Principled metallic 1.0, roughness 0.0345, transmission 1, noise bump (a near-mirror). Camera height about 2.9 units, hero about 21 units away [X], so the view meets the water at about 8 deg: Schlick Fresnel with F0 0.02 is about 0.4-0.55 there, which is why the hero reflection is strong in the KV [I].
- Base: the plate already holds Cycles' mirror reflection of the environment. Render two extra Cycles passes for water: a **reflection-only pass** (glossy direct + indirect) and a **water mask** (object index or cryptomatte for the two planes).
- Ripples (all tiers): analytic height `sum_i A_i exp(-r / L_i) sin(k_i r - w_i t + phi_i)` around the hero's footprint on the water, 3 terms, wavelengths 0.4-0.6 units, phase speed 0.3-0.5 units/s, amplitudes 0.004-0.01 (measure against `State 2 to 5.mp4`), plus two scrolling tiling detail normals (512^2, UV scale 3-6, speed 0.01-0.03). Normal from the analytic derivative.
- Distortion: inside the mask, offset the reflection-plate lookup by `n.xz x 8-14 px` (at 1440 px width) faded with distance.
- Hero reflection: mirror the camera about the water plane (clip plane at water height), render orb + rings + shards with a simplified material (no dispersion, 1 crack layer, 4-step orb) into a T0 1/4, T1 1/2 res RT; composite with Fresnel and the same distortion; blur grows with distance from the contact point.
- Interaction: hold multiplies ripple amplitude by (1 + 2 x hold); shatter launches one travelling ring impulse `A exp(-((r - c (t - t0)) / w)^2)`. T2: a 256^2 height-field simulation (ping-pong RG16F, damping 0.985-0.995 per 60 fps frame) centred under the hero, like Dracarys' GPGPU water [W].
- Cost: T0 about 0.3 ms for the masked water plus about 0.5 ms for the quarter-res reflection [I].

### 5.5 Plate-projected environment: assessment of the lead's hypothesis

Hypothesis: static environment shown with camera-projected Cycles plates (rest plate + dolly plate, blended by dolly progress) on decimated proxies; sky and clouds live; a 360 deg Cycles panorama from the hero position as reflection env; live ripples and live hero reflections; fully real-time hero.

Evidence **for**:
- It is the same philosophy that won SOTY: igloo's entire environment is baked into textures and drawn with trivial unlit shaders [O 3.6]. Plates go one step further (they also bake GI, snow SSS, haze, AgX look and Cycles' 4096-sample quality [X]) for one texture fetch per pixel, the cheapest way to hit Blender fidelity on an Iris Plus 640.
- Our camera is nearly static: rest camera about (0.23, -11.79, 2.90), 42.3 mm equivalent, hfov 46.1 deg [X]. **A pure rotation about the lens centre creates zero parallax**, so mouse look implemented as small yaw/pitch (not orbit translation) keeps projected plates exact; only overscan is needed.
- Memory is fine: a 2880x1536 plate is 4.4 MB on GPU as BC7 (UASTC transcode), 5.9 MB with mips, 2-4 MB download [I]; 3 layers x 2 cameras stay under 36 MB of VRAM.
- A reflection panorama from the hero position is the right env for the hero; igloo used a far smaller one (512x256 half float) [O].

Evidence **against / risks**:
- **The dolly is large**: another agent's (low-confidence) solve has the held camera at about (0.04, -1.53, 2.26), about 10.7 units from the orb instead of 20.9 [X]. That is translation, so near geometry (water around the hero, foreground rocks and slabs) shows strong parallax, magnification up to 2x and disocclusion behind foreground rocks. A single rest plate would stretch and smear there, so the second plate is necessary, as the lead proposed; a third mid plate may be needed if ghosting shows.
- View-dependent effects are frozen per plate (glints on ice floes, water reflections); between plates they cross-fade rather than move. Mitigation: water from separate passes (5.4); keep the plate blend window narrow.
- Proxy accuracy decides quality. Decimating `Environment.glb` (68 MB) blindly loses silhouettes. Better: per-layer **depth meshes** built from the Cycles Z pass (for example a 256x144 grid displaced by depth, about 74 k triangles per layer), with edges cut where depth jumps.
- The hero must be absent from plates (hidden, not holdout), so hero shadow/caustic contributions on the environment are lost; add a soft contact darkening on the water if needed.

Verdict: **supported, with these modifications.**
1. Three layers with alpha, each rendered from the rest camera and from the dolly-end camera: background (mountains, far ice, haze; sky transparent), midground (icebergs, floating slabs, water), foreground (rocks). The background layer renders with foreground hidden (a clean plate), so disocclusion fills correctly.
2. Passes per camera: beauty without hero, water reflection-only, water mask, Z, optionally normals. Film transparent for the sky region (today `film_transparent = false` [X]).
3. Projection: each proxy vertex gets clip coordinates from both plate cameras (two fixed view-projection uniforms); the fragment samples both plates and blends with weight `w = smoothstep(0.25, 0.75, dolly)`, preferring per pixel the plate with higher texel density for that surface and rejecting a plate where the fragment fails its depth test against that plate's Z (shadow-map style test, T1+). T0: plain blend by w.
4. Resolution: 2880x1536 per plate for T1/T2 (2x of 1440x767 plus about 7 % overscan for mouse look); T0 ships 1920x1024 versions. KTX2 UASTC + RDO + zstd.
5. Colour: export plates as **linear EXR** (Blender writes EXR scene-linear regardless of view transform) and store them as 8-bit with an invertible log curve (for example `y = log2(1 + 4x) / log2(1 + 64)`, decode in shader), so plates and hero meet in the same linear space and AgX is applied once at the end. With that curve one 8-bit step is about 1.7 % of the radiance at an encoded 0.8 (radiance about 6.8), about 3-4 % after block-compression error, which AgX's highlight compression plus grain should hide [I]; check the sky gradient for banding first. The fallback (display-referred plates with the hero tone-mapped separately) double-tonemaps whatever the rings refract and is harder to match.
6. Reflection env: a 2048x1024 half-float EXR panorama rendered from the orb centre with the hero hidden, PMREM'd at load (T0 may use 1024x512).
7. Camera rules for plates: mouse look = rotation only, at most about 1.5 deg yaw and 0.8 deg pitch; handheld drift as rotation only (0.1-0.2 deg sine noise); no lateral camera translation except the authored dolly.

Cost: T0 one plate fetch (plus one for the water mask) per env pixel, about 0.6-1.0 ms at 1.3 MP; T1/T2 two plates plus depth tests, about 1.2-1.8 ms [I].

### 5.6 Live sky, clouds, haze

- Sky: Blender sky is an emissive backdrop `BG.001`, emission (0.166, 0.271, 0.552) x 4.0 in linear [X]. Draw a fullscreen gradient first, defined by colours sampled from the Cycles sky render at zenith and horizon (one 1D LUT row), with very slow low-frequency noise (0.5 % amplitude) so it is alive but matches.
- Clouds: the Blender scene uses 6 cloud image planes (`cloud_PNG112207` x3, `cloud_PNG112221` x3) [X]; place the same images (from `HOME - Assets\Environment\Textures`, 2.32 MB and 1.46 MB PNG; convert to KTX2 with alpha, about 0.3-0.5 MB each) at the same 3D positions, drift 1-3 px/s on screen, slight UV breathing; they sit behind the background layer's alpha. Because the camera only rotates, distant clouds stay consistent with the plates.
- Haze: baked into the plates. Live layers (hero, its reflection, clouds near the horizon) get an exponential distance fog towards the horizon colour sampled from the plate; for the hero at about 21 units the fog weight is small (a few per cent) but it seats the hero in the air.
- Cost: under 0.3 ms [I].

### 5.7 Post: bloom, grain, CA, AgX, LUT, AA, motion blur

- Pipeline in linear HalfFloat until the tone map. renderer.toneMapping stays NoToneMapping; tone mapping happens once in the final effect.
- **AgX**: postprocessing 6.39.1 `ToneMappingEffect({ mode: ToneMappingMode.AGX })` (enum value 7, verified) or three r184 `AgXToneMapping` in our own final pass (verified). Blender used AgX, look None, exposure 0, gamma 1 [X] (not Filmic, so do not use a Filmic/ACES curve), so exposure 1.0 in three. Validate with a test chart rendered in both (grey ramp 0.01-16, saturated primaries, the plate itself); bake any residual into a **32^3 LUT applied with tetrahedral interpolation** (postprocessing `LUT3DEffect`, option `tetrahedralInterpolation`, verified), exactly the grading role igloo's LUTs play.
- **Bloom**: the reference has no compositor glare [X], so keep it restrained: mipmap blur, levels 5 (T0 4), radius 0.6-0.7, intensity 0.3-0.5, threshold at linear luminance 1.0 with smoothing 0.3, so only the orb core and specular glints bloom. igloo's 0.2 / 1.0 / 0.85 / 6 levels is a deliberately dreamy look for a grey world and would wash out our daylight scene.
- **Grain / dither**: after the tone map, 128^2 blue noise with a new random offset every frame (igloo does the same), amplitude 1-2 / 255; optional 1-1.5 % luminance-weighted film grain at T1/T2.
- **CA**: off in the steady state (the reference has none); radial at the corners at most 1 px if wanted; a 3-5 px transient during the shatter peak (0.2-0.3 s), the way igloo reserves CA for transitions.
- **AA**: SMAA after the tone map (T0 preset MEDIUM, T1/T2 HIGH, igloo uses HIGH); MSAA x4 on the hero pass only at T2.
- **Motion blur**: off (reference has none). If ever wanted at T2: per-object velocity for rings only, 8 taps, shutter 0.3.
- Cost: T0 bloom about 1.2 ms (starting at half res), final composite + SMAA about 1.5 ms [I].

### 5.8 Interaction choreography: cursor, press-hold dolly, shatter, reassemble

- **Hold value h** in [0, 1]: critically damped spring towards 1 on press (omega 7 rad/s, about 0.68 s to 95 %) and towards 0 on release (omega 5 rad/s, about 0.95 s). Drives everything below, so all states stay synchronised and interruptible mid-way.
- **Camera**: interpolate position and lens between the rest pose and the dolly pose with smootherstep(h); keep rotation-only mouse look (5.5) scaled down by (1 - 0.5h); add rotation-only sine-noise drift of 0.1-0.2 deg (igloo's shake amplitudes are 0.01-0.05 in their units).
- **Shatter** s = smoothstep(0.15, 0.6, h): at s > 0 swap each assembled ring for its fragments at the identical pose (invisible swap); offsets = radial x s x (0.15-0.4 units) + spin about the arc tangent of 15-35 deg x s; per-fragment delay rand x 0.12 s; each fragment target goes through two cascaded frame-rate-independent lerps (k about 0.08 then 0.06 per 60 fps frame), the soft-start/soft-stop quality seen in igloo's blocks. Ring tumble speed rises with h (match the reference); shards burst (5.3); a ripple impulse fires (5.4).
- **Reassemble**: spring with damping ratio 0.7 (about 4.6 % overshoot) so pieces click home; swap back to assembled meshes when all offsets < 0.001.
- **Cursor**: DOM element, `pointer-events: none`, `transform: translate3d` updated in rAF with exponential smoothing (k about 25/s). Idle: hollow ring about 22-24 px, 1.5 px white border. Hold: grows to the 80 px translucent disc (fill rgba(255,255,255,0.25-0.3)) in 0.35 s on an expo-out curve; release 0.25 s. Over nav links: 40 px ring with `mix-blend-mode: difference`. SOTY touch: inside the disc, the final WebGL pass slightly frosts or magnifies the scene (a 1-2 tap offset lookup), cheaper than CSS `backdrop-filter` on the iGPU. Hide the native cursor over the canvas only; keep it on form controls. Touch devices: no cursor, use press-hold directly.
- **Sound** (muted by default, "Sound" toggle bottom-right as in Figma): ambience bed (wind, distant ice creaks, soft water lap), orb hum, tumble whoosh with gain following ring angular speed, an ice-creak swell following dh/dt, a shatter hit when s crosses 0.2, a crystalline reassemble chime, UI ticks with 3 random variants and >= 0.4 s spacing (igloo's anti-machine-gun rule). Master gain ramps with `setTargetAtTime(..., 0.01-0.05)`; fade to 0 on `visibilitychange`. Provide AAC/M4A (or Opus) plus a decoder fallback for older Safari, the problem igloo solved with a WASM Ogg worker.

### 5.9 Loading and warm-up for our app

- First paint: DOM typography and nav immediately (Space Grotesk preloaded, `font-display: swap`); a still poster of the KV (`D\Home - Hero.png`, 1.18 MB; ship as AVIF/WebP about 150-250 KB) behind the canvas for LCP, cross-faded to the live canvas over 0.8-1.2 s when warm. This is a still placeholder, not a video, but confirm it with the lead against the "no pre-rendered video" rule.
- Order: rest plates + proxies, hero meshes + maps, PMREM env, dolly plates, then audio after the first user gesture.
- Decode in workers with low limits on this 2C/4T laptop (DRACO and KTX2 workers 1-2 each, as igloo uses 1).
- Warm-up before reveal: `await gl.compileAsync(scene, camera)` (KHR_parallel_shader_compile is used when present), `gl.initTexture(t)` for every texture, render one frame of each pass (including the shatter fragments and the dolly plates, which otherwise compile on first press) into an offscreen target. All three APIs are present in three r184 [O api_check].
- Payload goal: under 6-8 MB before reveal; igloo's whole three-scene site is 19.3 MB and its first scene about 4-5 MB [O].

---

## 6. SOTY quality-markers checklist

Loading and intro
- [ ] Something designed is on screen within 1 s (igloo: animated ASCII loader at once); no blank canvas, no spinner.
- [ ] The loader hands over seamlessly (igloo: 250 ms text fade, 750 ms container fade, cubic in-out) and the first live frame fades in from the loader colour (1 s).
- [ ] Shaders compiled, textures uploaded and every pass rendered once before reveal; the first press/shatter never hitches.
- [ ] A real-time, authored intro (igloo: 5.5 s camera arc, staggered materialise, UI at 4.5 s, input unlocked at 5 s); for us a 2-3 s settle of rings and camera, with input accepted early.
- [ ] Deep links and reloads skip the intro.

Transitions
- [ ] Every state change is choreographed: cuts with displacement, CA and noise on a curve (igloo's "ice cut" wipe), never a plain cross-fade.
- [ ] Interruptible: reversing mid-transition reverses smoothly from the current value (springs or `overwrite: "auto"`).
- [ ] Custom eases with character (igloo defines 9 cubic-bezier curves) and consistent durations.

Micro-interactions
- [ ] The hero reacts to the cursor even before clicking (igloo: blocks lift within 1-3 units of the cursor, frost wipes, particles push).
- [ ] Double-smoothed, frame-rate-independent motion everywhere (same feel at 30, 60 and 120 Hz); feedback simulations stepped at a capped rate (igloo steps its frost sim at most every 15 ms) so 120 Hz screens do not decay twice as fast.
- [ ] Subtle handheld drift and mouse look; FOV or zoom kicks on velocity (igloo: -5 deg at full scroll speed).
- [ ] Hover states on every interactive element with sound and motion (igloo: logo, links, arrows each have reveal + sound).

Cursor
- [ ] Custom cursor latency under 1 frame, no jitter, correct over iframes/links, hidden on touch.
- [ ] State morphs (ring to disc) timed to the hold spring; the disc subtly affects the scene beneath it.

Sound
- [ ] Muted by default with a clear, always-visible toggle; state remembered.
- [ ] Layered mix: music bed (igloo 0.2), ambience (0.45), interaction loops whose gain follows velocity, randomised UI one-shots with minimum spacing (0.4 s).
- [ ] Fades on tab hide; no clicks or pops (gain ramps).

Typography and motion
- [ ] Per-character / per-line staggered reveals (igloo: glyph index weights, 0.4 s + 0.75 s, scramble through other glyphs before settling).
- [ ] Type stays crisp and legible over the 3D (contrast checked over the brightest sky/snow areas of the plate).
- [ ] Layout respects the Figma grid at 1440 and scales by ratio, not by reflow.

Performance
- [ ] 60 fps at rest on mid-range, at least 30 fps worst case on the Iris Plus 640, measured.
- [ ] Adaptive resolution with hysteresis and a freeze after repeated flips (igloo: 0.6-1.0, step 0.1, 4 s windows, 4 flips).
- [ ] Render only what is visible; pause on hidden tab; no per-frame allocations; capped DPR.
- [ ] Compressed everything (KTX2, Draco/Meshopt, compressed audio); decoder workers limited.

Details that separate SOTY from good
- [ ] Blue-noise dithering re-randomised every frame, so gradients (sky, frost) never band.
- [ ] Output clamped / fireflies controlled before bloom; no shimmering on refractive edges.
- [ ] Colour pipeline matches the art reference (AgX + residual LUT), checked side by side with the Blender frame.
- [ ] Physically motivated touches: Fresnel-strong water reflections at grazing angles, white fracture faces, a ripple impulse on shatter.
- [ ] Responsive camera framing per aspect (igloo: `zoom = min(1, aspect*1.25)`) rather than cropping the hero.
- [ ] Graceful fallbacks: WebGL2 missing, low battery, `prefers-reduced-motion` (igloo has none; a juror counts it), keyboard focus states, real DOM headings for SEO and screen readers (igloo scored 6.4-6.6 there and still won, so this is cheap differentiation).

---

## 7. Risks and unknowns

- igloo was not run on the Iris Plus 640 (Chrome was not allowed for this task), so no measured FPS for the reference; all timings here are estimates.
- Bundle line numbers refer to this local copy; the clone's `index-2d900c2d.js` points `modulepreload` at `https://www.igloo.inc/`, so running the clone may touch the CDN despite its `CLAUDE.md`.
- SOTY and Developer-SOTY jury quotes are search snippets (pages 404 on fetch); Codrops articles returned 403, so the Vercel-prism and Volatile-Nexus details are snippet-level.
- The dolly camera pose comes from another agent's low-confidence solve (t = 13 s); the plate plan depends on the true dolly distance and path.
- Two-plate blending, depth-mesh proxies and log-encoded HDR plates are untested here; ghosting at depth edges and 8-bit banding in the sky are the likely failure modes.
- three r184 AgX versus Blender 5.2 AgX parity is assumed close, not verified; budget a test-chart comparison and a LUT.
- Ring-through-ring refraction ordering costs an extra RT copy at T1; without it, overlapping rings look emptier than in the Cycles reference.
- Only ring 4 has fracture GLBs and normal maps; rings 1-3 need the same treatment.
- `navigator.getBattery` and `deviceMemory` are Chromium-only; detect-gpu benchmark data may not list every iGPU string.

---

## 8. Sources

Web:
- Awwwards case study: https://www.awwwards.com/igloo-inc-case-study.html
- Awwwards site page and scores: https://www.awwwards.com/sites/igloo-inc
- Awwwards 2024 SOTY / Developer SOTY (snippets; 404 on fetch): https://www.awwwards.com/annual-awards-2024/site-of-the-year , https://www.awwwards.com/annual-awards-2024/developer-site-of-the-year
- Webby 2026: https://winners.webbyawards.com/2026/websites-and-mobile-sites/features-design/best-visual-design-aesthetic/361001/igloo-inc
- three.js forum, igloo launch post by vlucendo: https://discourse.threejs.org/t/landing-site-igloo-inc/67249
- Dracarys on Awwwards: https://www.awwwards.com/sites/dracarys ; three.js forum: https://discourse.threejs.org/t/dracarys-webgl-experiment-on-gpgpu-particles-sim-postprocessing/67031
- Vercel prism (Codrops, snippets): https://tympanus.net/codrops/2026/09/03/from-rays-to-meshes-building-vercels-prism-with-vgpu/
- Liquid glass grid (Codrops, snippets): https://tympanus.net/codrops/2026/09/08/building-an-infinite-liquid-glass-grid-with-three-js-webgpu-and-tsl/
- Volatile Nexus (Codrops, 403): https://tympanus.net/codrops/2026/08/31/volatile-nexus-tinkering-with-glass-caustics-cubes-and-sound-in-three-js/
- Lusion Oryzo BTS: https://blog.lusion.co/oryzo-bts-part-2-7-3d-design-and-motion-graphics ; roundup: https://www.utsubo.com/blog/best-threejs-websites-2026
- Juror criteria: https://www.hontran.dev/blog/best-award-winning-websites-2026 ; DeepSee: https://www.hontran.dev/blog/webgl-website-examples

Local (read-only):
- `E:\Retrux Hero R&D\Iglo 2\index.html`, `assets\index-2d900c2d.js` (loader), `assets\App3D-5907d20f.js` (lines cited as L####), `assets\*worker-*.js`, `assets\images\**\*.ktx2`, `assets\images\cubes_env.exr`
- Other agents: `research\blender\inventory_static.json` (render, colour management, materials), `research\blender\camera_solve_states.json` (camera poses)
- Installed versions verified in `E:\Retrux Hero R&D\retrux-web\node_modules`: three 0.184.0, postprocessing 6.39.1, drei 10.7.7, fiber 9.6.0, @react-three/postprocessing 3.0.4, three-mesh-bvh 0.8.3, gsap 3.15.0, detect-gpu 5.0.70.
