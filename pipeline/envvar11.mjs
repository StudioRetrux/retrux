// Rest mountain-base mist (round 5 env +0.4, grade +0.5): the band at the left mountains' bases is ~200,205,215 vs the
// reference's 139,157,182 and erases the slopes; the fog stops in a vertical curtain at the ridge mask (shade = 1 -
// ridge * 0.9). Variants: softer ridge gate, less shader mist, bluer / darker mist colour, de-haze of the baked mist.
const SHADE = "float shade = 1.0 - ridge * 0.9;";
const FOGMIX = "col = mix(col, uFogColor, min(fog, 0.85));";
const MIST = "gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);";
// Baked base mist: bright, low-chroma plate pixels at the far mountains' feet (60-330 m, below ~9 m) pulled towards
// the reference's blue-grey, keeping their structure (a multiply, not a fill).
const DEHAZE = (k) => `{
    float lumaH = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float baseK = smoothstep(55.0, 80.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * (1.0 - smoothstep(2.0, 10.0, fp.y)) * uPlateDepthOn;
    baseK *= smoothstep(0.45, 0.75, lumaH);
    col = mix(col, col * vec3(0.66, 0.74, 0.86), baseK * ${k.toFixed(2)});
  }
  ${FOGMIX}`;
export default {
  gate: { plate: [[SHADE, "float shade = 1.0 - ridge * 0.35;"]] },
  less: { plate: [[SHADE, "float shade = 1.0 - ridge * 0.35;"], [MIST, "gl_FragColor = vec4(mix(col, MIST_COLOR * 0.85, min(mist * 0.55, 0.85)), 1.0);"]], js: "h.shared.uFog.value.z = 0.3;" },
  dehaze: { plate: [[SHADE, "float shade = 1.0 - ridge * 0.35;"], [FOGMIX, DEHAZE(1.0)], [MIST, "gl_FragColor = vec4(mix(col, MIST_COLOR * 0.85, min(mist * 0.55, 0.85)), 1.0);"]], js: "h.shared.uFog.value.z = 0.3;" },
};
