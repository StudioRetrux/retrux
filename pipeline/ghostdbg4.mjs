// Bisect the hold ghost among the post-blend effects (the raw projector blend is clean): switch each off in turn.
const AERIAL = "* 0.24 * (1.0 - 0.85 * uHold) * (1.0 - ridgeBody * 0.9));";
const BANK = "    col = mix(col, bankC, min(bk * 0.85, 0.8));";
const FOG = "  col = mix(col, mix(uFogColor, footC, ridgeFoot), min(fog, 0.85));";
const SLOPE = "  col = mix(col, uFogColor * vec3(0.9, 0.95, 1.02), slopeH * 0.15 * (1.0 - 0.7 * uHold));";
const FARB = "    col = max(col + max(col - mb, vec3(-0.03)) * 0.22 * farBand, vec3(0.0));";
const MIST = "  gl_FragColor = vec4(mix(col, mix(MIST_COLOR, footC, ridgeFoot), min(mist, 0.85)), 1.0);";
const UPK = "    col = mix(col, (vec3(lm) + (col - vec3(lm)) * 1.15) * 0.9, upK);";
export default {
  noAerial: { plate: [[AERIAL, "* 0.0 * (1.0 - 0.85 * uHold) * (1.0 - ridgeBody * 0.9));"]] },
  noBank: { plate: [[BANK, "    col = mix(col, bankC, 0.0 * bk);"]] },
  noFog: { plate: [[FOG, "  col = col;"]] },
  noSlope: { plate: [[SLOPE, "  col = col;"]] },
  noFarBand: { plate: [[FARB, "    col = col;"]] },
  noMist: { plate: [[MIST, "  gl_FragColor = vec4(col, 1.0);"]] },
  noUpK: { plate: [[UPK, "    col = col;"]] },
};
