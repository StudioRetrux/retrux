/**
 * P4 round 4, ENV lane (p4e4; the r11_3 panel's tasks R4-G2 / R4-G3 / R4-G5, notes/round11/p3/r11_3_plan.json).
 *
 * Switches (each restores MAIN's behaviour of its part exactly; read once at module load):
 *   ?p4e4=0          the whole lane off (MAIN exactly: same programs, same textures, same frames)
 *   ?bakefill=0      R4-G3 off: MAIN's atlases with their black gutters (the GPU mip chain averaged the black into the islands'
 *                    borders, and faces inside the islands the bake never wrote sampled black: dark specks and seam ticks)
 *   ?bakecentroid=1  R4-G3 step 1a, OPT-IN (default off): the bake UV interpolated at the centroid of the covered MSAA samples
 *   ?bakegrad=1      R4-G3 step 1b, OPT-IN (default off): the baked texture's sampling footprint capped at 2^(lod + 3) texels
 *                    (A/B at the 10 pointer spots, same sim time: env specks MAIN 19 / lane 9; without the fill 19, without
 *                    centroid 8, without the cap 8: the fill is the fix, 1a / 1b showed no measurable gain, so they cost nothing
 *                    by default and do not touch the waterline AA's edge pixels)
 *   ?notch=r11       R4-G2 off: the near floe's texture without the notch-wall lift (Retopo_Plane_012_p5f.webp, or MAIN's with
 *                    ?bakefill=0): the low pointer's pan reveals a near-black notch wall below the rest frame (Cycles' own dark wall)
 *   ?nearrock=r11    R4-G5 off: MAIN's hold near-darks lift (a mix towards a constant: the flat slate wedge in the pop / release)
 * Lab knobs: `?bakegradk=x` the footprint cap in mips above the DOF level (default 3); `?e4rock=share` (G5). Both re-bake hypotheses of the plan were tested in Blender (WORK rend/, comp_e4.py): every texel the low-pointer
 * and pop / release cameras see was also seen by a plate (0-4 hidden texels per view; view / texture 1.00-1.04 on shared texels),
 * so the notch and the wedge are not bake defects: the notch is Cycles' own dark wall, the wedge the hold lift's flat target.
 */
export type P4E4Flags = {
  /** R4-G3: `centroid` on the bake UV varying (vertex + both baked fragment programs). */
  centroid: boolean;
  /** R4-G3: the baked sample's footprint is capped at 2^(lod + gradK) texels (a sliver's huge derivative cannot reach the top mips). */
  grad: boolean;
  gradK: number;
  /** R4-G3: the gutter-filled atlases (`*_p5f.webp`: every empty texel push-pull filled from its islands). */
  fill: boolean;
  /** R4-G2: the near floe's notch walls lifted in its texture where nothing at rest sees them (`Retopo_Plane_012_p5.webp`). */
  notch: boolean;
  /** R4-G5: the hold's near-darks lift (written for floe undercuts) is not applied to the rock meshes (their own shading stays). */
  nearrock: boolean;
  /** R4-G5: the share of the hold's near-darks lift the rock meshes keep (MAIN 1). Lab `?e4rock=`. */
  rockShare: number;
};

export function p4e4FromUrl(): P4E4Flags {
  const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
  const off = q?.get("p4e4") === "0";
  const on = (k: string) => !off && q?.get(k) !== "0";
  const k = Number(q?.get("bakegradk"));
  const rs = Number(q?.get("e4rock"));
  return {
    centroid: !off && q?.get("bakecentroid") === "1",
    grad: !off && q?.get("bakegrad") === "1",
    gradK: Number.isFinite(k) && q?.get("bakegradk") ? k : 3,
    fill: on("bakefill"),
    notch: !off && q?.get("notch") !== "r11",
    nearrock: !off && q?.get("nearrock") !== "r11",
    rockShare: Number.isFinite(rs) && q?.get("e4rock") ? rs : 0,
  };
}

export const P4E4: P4E4Flags = p4e4FromUrl();

function splice(s: string, a: string, b: string, what: string, all = false): string {
  if (!s.includes(a)) throw new Error(`p4e4: ${what} not found`);
  return all ? s.split(a).join(b) : s.replace(a, b);
}

/**
 * R4-G3 step 1 on the baked environment's programs (PlateEnvironment PLATE_VERT, PLATE_FRAG, PLATE_MIRROR_FRAG), by string
 * replacement: with every part off the source is returned unchanged (MAIN's program byte for byte).
 * - centroid: the bake UV is interpolated at the centroid of the pixel's covered MSAA samples, so a pixel partly covered by a
 *   sliver (the ice sheet's 1-px front face, floe pegs, rock needles) samples inside its own UV island instead of extrapolating
 *   off it into the atlas gutter. The gradients come from a plain (centre-interpolated) copy `vBakeUvD`: derivatives of a centroid
 *   varying are undefined at edges (ESSL 3.00 8.9), so the mip choice stays MAIN's for every pixel. No-op without MSAA (T0).
 *   The vertex stage also skips the card light on a zero-length normal (normalize(0) is NaN; fmax then drives the texel black).
 * - grad: the main sample's footprint is capped at 2^(lod + gradK) texels (and the blurred re-samples' level at lod + gradK): an
 *   edge-on sliver's derivative cannot reach the top mips (the island averaged with its gutter).
 */
export function p4e4Glsl(src: string, kind: "vert" | "frag" | "mirror"): string {
  let s = src;
  if (P4E4.centroid) {
    if (kind === "vert") {
      s = splice(s, "#ifdef BAKED_ENV\nvarying vec2 vBakeUv;\n#endif\n", "#ifdef BAKED_ENV\ncentroid varying vec2 vBakeUv;\nvarying vec2 vBakeUvD;\n#endif\n", "vert varying");
      s = splice(s, "  vBakeUv = uv;\n", "  vBakeUv = uv;\n  vBakeUvD = uv;\n", "vert assign");
      s = splice(
        s,
        "  vCardDE = cardLightDelta(wp.xyz, wn);\n",
        "  vCardDE = dot(normal, normal) > 1e-12 ? cardLightDelta(wp.xyz, wn) : 0.0;\n",
        "vert card normal",
      );
    } else {
      const decl = kind === "frag" ? "uniform float uMirrorPass;\nvarying vec2 vBakeUv;\n" : "varying vec2 vBakeUv;\n";
      s = splice(s, decl, decl.replace("varying vec2 vBakeUv;\n", "centroid varying vec2 vBakeUv;\nvarying vec2 vBakeUvD;\n"), `${kind} varying`);
      if (kind === "frag") s = splice(s, "  gBakeDx = dFdx(vBakeUv);\n  gBakeDy = dFdy(vBakeUv);\n", "  gBakeDx = dFdx(vBakeUvD);\n  gBakeDy = dFdy(vBakeUvD);\n", "frag grads");
      // the lake-mirror draw (implicit derivatives): the same texel, with the centre-interpolated gradients
      s = splice(s, "texture2D(uBaked, vBakeUv).rgb", "textureGrad(uBaked, vBakeUv, dFdx(vBakeUvD), dFdy(vBakeUvD)).rgb", `${kind} mirror sample`, true);
    }
  }
  if (P4E4.nearrock && kind === "frag") {
    // R4-G5: in the hold / pop / release the near darks lift towards the fog (QC round 8 T05: "the near floes' undercuts ... read
    // as holes") by mixing 60 % x uHold towards a constant (max(col * 1.6, fog * 0.35)). On the near-left rock's shaded flank
    // (rock_big_4.005, 14 m from the pop camera) that constant is the pale, flat slate cut-out, where Cycles renders a dark shaded
    // rock (as the rest frame shows the same rock). The lift was written for floe undercuts: the rock meshes (uE4Rock = 1, set per
    // baked material from the manifest node) keep `rockShare` of it; every other surface runs MAIN's expression (x 1.0).
    // uHold = 0 at rest, so rest frames do not move.
    const k = (1 - P4E4.rockShare).toFixed(3);
    s = splice(s, "uniform float uHold;        // dolly progress (0 at rest)\n", "uniform float uHold;        // dolly progress (0 at rest)\nuniform float uE4Rock;      // P4 round 4 (p4e4.ts): 1 on the rock meshes\n", "frag rock uniform");
    s = splice(
      s,
      "    col = mix(col, max(col * 1.6, uFogColor * 0.35), nk * 0.6);\n",
      `    // P4 round 4 (p4e4.ts ?nearrock=r11): the rocks keep ${P4E4.rockShare.toFixed(2)} of this lift (their own shaded colour).
    col = mix(col, max(col * 1.6, uFogColor * 0.35), nk * 0.6 * (1.0 - uE4Rock * ${k}));
`,
      "frag nk",
    );
  }
  if (P4E4.grad && kind === "frag") {
    const K = P4E4.gradK.toFixed(3);
    s = splice(
      s,
      "  float k = exp2(lod) * uResolution.x / 1800.0;\n  vec3 c = textureGrad(",
      `  float k = exp2(lod) * uResolution.x / 1800.0;
  // P4 round 4 (p4e4.ts ?bakegrad=0): the footprint capped at 2^(lod + ${K}) texels.
  vec2 tsE4 = vec2(textureSize(uBaked, 0));
  k *= min(1.0, exp2(lod + ${K}) / max(max(length(gBakeDx * tsE4), length(gBakeDy * tsE4)) * k, 1e-6));
  vec3 c = textureGrad(`,
      "frag grad cap",
    );
    s = splice(s, "  vec3 c = textureLod(uBaked, vBakeUv, l).rgb", `  vec3 c = textureLod(uBaked, vBakeUv, min(l, lod + ${K})).rgb`, "frag blur cap");
  }
  return s;
}
