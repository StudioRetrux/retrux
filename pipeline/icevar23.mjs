// Ice batch 23 (T09): k15halfOrb (icevar22) is clearer / see-through but too white; the reference is clear AND cool blue.
// Same clarity settings with a bluer interface tint (0.35 / 0.45) and moderate thin-path absorption.
const FE = "float frostE = smoothstep(0.55, 0.95, max(abs(vSec.x), abs(vSec.y)));";
const FE_MIN = "float frostE = smoothstep(0.55, 0.95, min(abs(vSec.x), abs(vSec.y)));";
const COL = "vec3 col = body * (1.0 - F) + refl * F + spec;";
const LOD = "float lod = mix(1.3, 3.4, rough);";
const TINT = "vec3 tint = pow(uIceColor, vec3(1.5)) * T;";
const TABS = "vec3 T = exp(-uAbsorb * t);";
const PROX = "col += vec3(0.9, 0.95, 1.0) * uOrbGlow * 0.15 * prox * mix(0.35, 1.0, 1.0 - thick) * (0.3 + 0.7 * facing) * (1.0 - F);";
const LANT = "col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 1.05 * lantern * (1.0 - F) * mix(0.6, 1.0, 1.0 - thick);";
const MUTE = "trans = mix(vec3(tl), trans, 0.75);";
const GATE = "trans = mix(trans, vec3(tl) * vec3(0.86, 0.95, 1.08), smoothstep(0.2, 0.55, chroma));";
const v = (k, abs, mute) => ({
  frag: [
    [FE, FE_MIN],
    [LOD, "float lod = mix(0.0, 1.6, rough);"],
    [COL, "vec3 col = body * (1.0 - F * 0.7) + refl * F * 0.7 + spec * 0.7;"],
    [TINT, `vec3 tint = mix(vec3(1.0), pow(uIceColor, vec3(1.5)), ${k.toFixed(2)}) * T;`],
    [TABS, "vec3 T = exp(-uAbsorb * t - vec3(1.2, 0.55, 0.15) * max(t - 0.5, 0.0));"],
    [PROX, PROX.replace("0.15 * prox", "0.07 * prox")],
    [LANT, LANT.replace("1.05 * lantern", "0.5 * lantern")],
    ...(mute ? [[MUTE, "trans = mix(vec3(tl), trans, 0.95);"], [GATE, "trans = mix(trans, vec3(tl) * vec3(0.86, 0.95, 1.08), smoothstep(0.45, 0.8, chroma));"]] : []),
  ],
  uniforms: { uFrost: 0.45, uLens: 0.2, uScatter: 0.06, uAbsorb: abs },
});
export default {
  b35: v(0.35, [0.45, 0.22, 0.06], false),
  b45: v(0.45, [0.5, 0.25, 0.06], false),
  b35sky: v(0.35, [0.45, 0.22, 0.06], true),
  b25sky: v(0.25, [0.4, 0.2, 0.05], true),
};
