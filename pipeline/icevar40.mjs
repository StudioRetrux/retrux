// Ice batch 40: the flat milky band in front of the orb (q00 box x 640-800 / y 345-415: sd 8.9 vs 18.8, L211 vs 216) and
// the waxy hold (p06 sd 13-14 vs 21.6). Standalone patches against the CURRENT IceMaterial.ts / RenderPipeline.ts (c5 / T10 /
// k1 / f1 / uLens 0.35 are baked in); nothing is imported from older icevar files.
//   node probe_icevar.mjs <outDir> icevar40.mjs shell,shellHdr,shellNear3,combo q00,p06,p06b
//
// THE GATE. IceMaterial bends the exit ray by the FULL surface tilt (tilt = Nr - V (Nr.V), line 282), so the ring's own
// wall curvature acts as a strong converging cylinder lens. Rest camera 20.93 m from the hero, f = 1690 px/rad, ring A outer
// radius ~2.38 m (band half-width 192 px), near wall ~18.55 m away, lens 0.35 * 0.91 = 0.318, uLensDepth 6:
//   tilt_x ~ X (1/R + 1/z) = 0.474 X;  ray x-slope = X/z - 0.318 * 0.474 X = -0.098 X;  point 6 m on: 0.42 X at 24.55 m
//   -> a fragment X px off the ring axis samples the copy at ~0.32 X: the scene behind band A is magnified ~3.2x.
// The orb (r 66.7 px) then spans +-213 px through the band (the band itself is +-192 px), so the q00 box (+-80 px) samples
// only the inner +-25 px of the orb, which the copy's soft knee has flattened to a constant (~1.5). Lens 0.2 / 0.5 / 0.8
// and depth 12 give 1.6x / ~44x / -1.8x / -10x: still the orb plateau, which is why none of them moved the sd. A real
// shell (outer + inner wall, near-concentric) is a weak meniscus (f ~ -46 m): ~1x. Every variant below carries the shell
// fix; 2 and 3 each add ONE more cause on top of it (both are invisible while the band magnifies the orb core 3x).

// [v40 shell] The ring's macro curvature no longer bends the view; the chips / bumps still do (+-7 px RMS at uLens 0.35),
// and the grazing band ends and the rounded section corners (where the two faces are not parallel) keep the full lens.
const SHELL = [
  "vec3 tilt = Nr - V * dot(Nr, V);",
  `vec3 tilt = Nr - V * dot(Nr, V);
  // [v40 shell] Outer and inner walls are near-concentric (a weak meniscus, f ~ -46 m): the wall curvature does not bend
  // the view (it magnified the scene behind band A ~3.2x). Facets / bumps only, plus grazing ends and section corners.
  vec3 tiltMacro = Ng - V * dot(Ng, V);
  float macroW = max(smoothstep(0.35, 0.75, 1.0 - dot(Ng, V)), smoothstep(0.72, 0.95, min(abs(vSec.x), abs(vSec.y))));
  tilt -= tiltMacro * (1.0 - macroW);`,
];

// The lantern is the analytic stand-in for the knee-clipped orb (comment at line 456-463); with the orb's HDR back in the
// copy it is structureless light on top of structured light: off.
const LANT0 = ["col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 0.25 * lantern", "col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 0.0 * lantern"];

// The glacier in-scatter glow (0.456, 0.578, 0.776) * irr * 0.5 is ~0.28 linear luma, ~20 % of the band's light, flat (and
// added twice for ice behind ice: once in the far half that sits in the copy, once in the near half). As a gain it adds
// exactly the same light where the transmitted colour is the typical (0.74, 0.86, 1.06) (luma 0.9), more on bright refracted
// content, less on dark refracted bands: same mean and hue, ~1.3x the relative contrast.
const GLOWX = [
  "vec3 body = mix(trans, scatterLight, s) + vec3(0.456, 0.578, 0.776) * irr * 0.5;",
  `// [v40 glowGain] the glacier glow as a gain on the transmitted light (same light where trans ~ (0.74, 0.86, 1.06)).
  vec3 body = mix(trans, scatterLight, s) * (vec3(1.0) + vec3(0.31, 0.335, 0.365) * irr);`,
];

// Marker read by the NEAR3 js (the wrapper is only active while the ring shader carries it, so every other variant and the
// next pose's "none" run the build's pipeline untouched).
const MARK = [
  "uniform float uOrbGlow;",
  "uniform float uOrbGlow;\n// v40 near3 (probe js: near half drawn inside-out, D, C, B, A, with a fresh copy before each ring)",
];

// Refraction copies (RenderPipeline BLIT_FRAG): the soft knee K 0.8 -> ceiling 1.5 on the max channel crushes everything
// bright into one plateau. Plate sky (x4.46 plate gain, blue ~2-3) -> 1.37-1.47, clouds (~4) -> 1.49, orb core (5-16) ->
// 1.49-1.50. Replaced by a half-contrast power above 0.8, m' = 0.8 sqrt(m / 0.8): the sky stays within +-8 % of now (2.0 ->
// 1.26, 2.5 -> 1.41, 3.0 -> 1.55), clouds +20 % (1.79), the orb core 6 -> 2.19 and 16 -> 3.58, mid-bright content (far ice,
// lake, 1.2-1.6) ~10 % darker. Every lookup stays at lod <= 1.6, so the old mip flood (lod up to 3.4, QC round 4) cannot
// come back. The probe restores the blit shader before each variant.
const KNEE = `
(() => {
  const bm = h.pipeline && h.pipeline.blitMaterial;
  if (!bm) { console.error("v40 knee: no blit material"); return; }
  const src = window.__blitOrig || bm.fragmentShader;
  const A = "if (uKnee > K && m > K) c.rgb *= (K + (uKnee - K) * (1.0 - exp(-(m - K) / (uKnee - K)))) / m;";
  if (src.indexOf(A) < 0) { console.error("v40 knee: blit source changed"); return; }
  bm.dispose();
  bm.fragmentShader = src.split(A).join("if (m > K) c.rgb *= K * sqrt(m / K) / m;");
  bm.needsUpdate = true;
})();
`;

// Near half drawn inside-out with a copy before each ring. In the build, three sorts opaque draws by material.id before
// depth and every piece has its own material created A -> B -> C -> D (Rings.ts:305), so in the near pass ring A is drawn
// first and refracts a copy that holds none of the near halves: at q00 all of face-on B (its walls are the reference's dark
// vertical lines at x ~585 / ~865 inside band A) and the near arcs of C / D; in the hold B's band cannot show C / D either.
// The wrapper splits the near pass into D, copy, C, copy, B, copy, A (3 extra half-res blits, no new shaders). It only acts
// while the rings use the strict near-pass depth test AND the ice shader carries the v40 near3 marker.
const NEAR3 = `
(() => {
  const P = h.pipeline, R = h.rings;
  if (!P || !R || !R.pieces || !R.materials || !R.materials.length) { console.error("v40 near3: no pipeline / rings"); return; }
  if (P.__v40Pass) return;
  const orig = P.pass;
  const idle = R.materials[0].depthFunc;
  P.__v40Pass = orig;
  P.pass = function (scene, camera, layers) {
    const m0 = R.materials[0];
    if (!m0 || m0.depthFunc === idle || m0.fragmentShader.indexOf("v40 near3") < 0) return orig.call(this, scene, camera, layers);
    const vis = R.pieces.map((p) => p.mesh.visible);
    try {
      [3, 2, 1, 0].forEach((ring, k) => {
        R.pieces.forEach((p, i) => { p.mesh.visible = vis[i] && p.ring === ring; });
        if (k > 0) { this.blit(this.main.texture, this.refraction); this.renderer.setRenderTarget(this.main); }
        orig.call(this, scene, camera, layers);
      });
    } catch (e) {
      if (!window.__v40Err) { window.__v40Err = 1; console.error("v40 near3: " + (e && e.message)); }
    } finally {
      R.pieces.forEach((p, i) => { p.mesh.visible = vis[i]; });
    }
  };
})();
`;

export default {
  // 1. The lens gate alone. Tests: is band A a 3.2x-magnified orb core? Expect the orb at true size (r ~67 px, its limb
  //    visible) inside band A, with the far band / sky beside and below it in the box: q00 box sd 8.9 -> ~10-13, mean -1..-4
  //    (the box corners lose the orb plateau); left part x 540-600 a little up. p06: the arcs show the background at ~1x
  //    through the chip mosaic (cloud / mountain edges, far pieces) instead of a 3x smear: sd 13-14 -> ~15-18, mean +-3.
  //    The orb-vs-surround step stays small (~+10 L) because the knee still flattens the orb to ~sky level (variant 2).
  shell: { frag: [SHELL] },

  // 2. shell + HDR headroom in the copies (half-contrast power instead of the 1.5 knee) + no lantern. Tests: the orb's
  //    clipped plateau. Expect the orb through band A as a bright disc with some plasma structure (~L222-226 vs ~L203
  //    around it): q00 box sd ~12-15, mean +1..+5. p06: bright orb / cloud highlights inside the ice, far ice and lake in
  //    the copy ~10 % darker (darker refracted bands): sd ~16-19, mean +-3. Without the shell this would just brighten the
  //    magnified core (+8..+11 L over the whole box), hence the pairing.
  shellHdr: { frag: [SHELL, LANT0], js: KNEE },

  // 3. shell + near halves drawn inside-out with a copy before each ring. Tests: missing see-through content (A never
  //    refracts B / C / D's near halves, B never C / D). Expect B's walls through band A at x ~570-590 and ~850-870 (the
  //    reference's dark vertical lines): left part sd 9.5 -> ~15-20; box ~11-14 (D's walls at its edges); p06 C / D arcs
  //    through B's band, A's quarters show B behind them: sd ~16-19; mean -1..-4.
  shellNear3: { frag: [SHELL, MARK], js: NEAR3 },

  // 4. Everything: shell + HDR copies + no lantern + near3 + the in-scatter glow as a gain. Expect q00 box sd ~14-18, left
  //    part ~18-24, mean -2..+4 (orb part brighter, dark bands darker); p06 sd ~18-22, mean +-4; hue kept (the gain carries
  //    the glow's blue).
  combo: { frag: [SHELL, LANT0, GLOWX, MARK], js: KNEE + NEAR3 },
};
