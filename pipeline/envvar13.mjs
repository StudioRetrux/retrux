// Rest mountain-base mist (T08): the white band is baked into the plate (shader mist changes nothing there). De-haze the
// left mountains' feet towards the reference's blue-grey (box 150-450 x 385-425: ours 197,203,212, ref 138,155,181),
// restricted to mountain surfaces (left plate region, above floe height) so the far-shore strip keeps its brightness,
// and recover the slope detail with local contrast.
const FOGMIX = "col = mix(col, uFogColor, min(fog, 0.85));";
const SHADE = "float shade = 1.0 - ridge * 0.9;";
const DH = (mul, lc) => `{
    float lumaH = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float baseK = smoothstep(55.0, 80.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * (1.0 - smoothstep(4.0, 14.0, fp.y)) * smoothstep(0.4, 1.6, fp.y);
    baseK *= (1.0 - smoothstep(0.3, 0.4, restFrame(uv0).x)) * uPlateDepthOn * smoothstep(0.3, 0.55, lumaH);
    if (baseK > 0.0) {
      vec3 mbl = plateGrade(samplePlate(uv, lod + 2.5));
      col = max(col + (col - mbl) * ${lc.toFixed(2)} * baseK, vec3(0.0));
      col = mix(col, col * vec3(${mul}), baseK);
    }
  }
  ${FOGMIX}`;
export default {
  dh1: { plate: [[SHADE, "float shade = 1.0 - ridge * 0.35;"], [FOGMIX, DH("0.52, 0.62, 0.78", 0.0)]] },
  dh2: { plate: [[SHADE, "float shade = 1.0 - ridge * 0.35;"], [FOGMIX, DH("0.52, 0.62, 0.78", 0.6)]] },
  dh3: { plate: [[SHADE, "float shade = 1.0 - ridge * 0.35;"], [FOGMIX, DH("0.62, 0.70, 0.84", 0.6)]] },
};
