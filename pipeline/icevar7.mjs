// Ice variants, batch 7 (ice judge round 4): bluer, no shard blotches, weaker chrome, capped caps, soft silhouettes.
import B5 from "./icevar5.mjs";
const F = B5.frosted;
const TINT = "tint = mix(vec3(dot(tint, vec3(0.2126, 0.7152, 0.0722))), tint, 0.55);";
const MUTE = "trans = mix(vec3(tl), trans, 0.6);";
const FRES = "float F = 0.035 + (max(1.0 - mix(0.12, 0.45, frost), 0.035) - 0.035) * pow(1.0 - NdotV, 5.0);";
const SPEC = "vec3 spec = uSunColor * ggxSpec(N, V, L, rSpec);";
const LOD = "float lod = mix(1.6, 3.8, rough);";
const blue = [[TINT, "tint = mix(vec3(dot(tint, vec3(0.2126, 0.7152, 0.0722))), tint, 0.9);"]];
const chroma = [[MUTE, `trans = mix(vec3(tl), trans, 0.6);
  // Saturated refracted colour (the cobalt shards smeared by the lens) turns slate: the reference ice never
  // shows saturated blue inside, only slate-blue refracted bands.
  float chroma = max(trans.b - trans.r, 0.0) / max(tl, 1e-3);
  trans = mix(trans, vec3(tl) * vec3(0.86, 0.95, 1.08), smoothstep(0.2, 0.55, chroma));`]];
const softRim = [
  [FRES, `float F = 0.02 + (max(1.0 - mix(0.12, 0.45, frost), 0.02) - 0.02) * pow(1.0 - NdotV, 5.0);
  // The last pixel or two of the silhouette: no Fresnel spike (a 1 px white rim, dotted where it aliases).
  float sil = smoothstep(0.0, max(fwidth(NdotV) * 2.0, 0.02), dot(Ng, V));
  F *= mix(0.25, 1.0, sil);`],
  [SPEC, "vec3 spec = min(uSunColor * ggxSpec(N, V, L, rSpec), vec3(1.5)) * sil;"],
];
const lens = { uLens: 0.25 };
const lodBlur = [[LOD, "float lod = mix(2.0, 4.4, rough);"]];
const fr = F.frag;
const frNoLod = fr.filter(([a]) => !a.startsWith("float lod ="));
export default {
  v7a: { js: F.js, frag: [...fr, ...blue] },
  v7b: { js: F.js, frag: [...fr, ...blue, ...chroma, ...softRim] },
  v7c: { js: F.js, frag: [...frNoLod, ["float lod = mix(1.3, 3.8, rough);", "float lod = mix(2.0, 4.4, rough);"], ...blue, ...chroma, ...softRim], uniforms: lens },
  v7d: { js: F.js.replace("const float M = 1.50;", "const float M = 2.00;"), frag: [...frNoLod, ["float lod = mix(1.3, 3.8, rough);", "float lod = mix(2.0, 4.4, rough);"], ...blue, ...chroma, ...softRim], uniforms: lens },
};
void lodBlur;
