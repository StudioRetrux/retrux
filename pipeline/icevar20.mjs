// Ice batch 20 (T09): thin ice must be nearly clear (q00 ring-B top rim = transmitted sky x tint: ours 130,155,184 vs the
// reference's 173,194,219); the blue belongs to long paths only. Interface tint near white, weak thin-path absorption,
// extra absorption past ~0.5 m of path; with the chamfer-frost fix (min) and the clarity settings.
const FE = "float frostE = smoothstep(0.55, 0.95, max(abs(vSec.x), abs(vSec.y)));";
const FE_MIN = "float frostE = smoothstep(0.55, 0.95, min(abs(vSec.x), abs(vSec.y)));";
const COL = "vec3 col = body * (1.0 - F) + refl * F + spec;";
const LOD = "float lod = mix(1.3, 3.4, rough);";
const TINT = "vec3 tint = pow(uIceColor, vec3(1.5)) * T;";
const TABS = "vec3 T = exp(-uAbsorb * t);";
const base = [[FE, FE_MIN], [LOD, "float lod = mix(0.0, 1.6, rough);"], [COL, "vec3 col = body * (1.0 - F * 0.7) + refl * F * 0.7 + spec * 0.7;"]];
const thin = (k, longAbs) => [
  [TINT, `vec3 tint = mix(vec3(1.0), pow(uIceColor, vec3(1.5)), ${k.toFixed(2)}) * T;`],
  [TABS, `vec3 T = exp(-uAbsorb * t - vec3(${longAbs}) * max(t - 0.5, 0.0));`],
];
const U = (abs) => ({ uFrost: 0.45, uLens: 0.2, uScatter: 0.06, uAbsorb: abs });
export default {
  k15: { frag: [...base, ...thin(0.15, "1.2, 0.55, 0.15")], uniforms: U([0.35, 0.18, 0.05]) },
  k25: { frag: [...base, ...thin(0.25, "1.2, 0.55, 0.15")], uniforms: U([0.35, 0.18, 0.05]) },
  k15L: { frag: [...base, ...thin(0.15, "1.8, 0.8, 0.2")], uniforms: U([0.35, 0.18, 0.05]) },
  k25lens3: { frag: [...base, ...thin(0.25, "1.2, 0.55, 0.15")], uniforms: { ...U([0.35, 0.18, 0.05]), uLens: 0.3 } },
};
