// Round-9 bottom band: it is the LAKE under the foreground rocks (botdbg lakeR), near-black (L7-20) because the plate's
// dark rock reflections there get no lift, while the rocks above (plate shader) get the near crushed-black lift: a hard
// edge at the waterline. wl1: the same near-shadow lift on the lake (d < 12-22 m, luma < 0.02-0.12).
// ov1: T03's safety net on the plate's own bottom overscan rows (rest frame y < 0, < 12 m): luma < 0.05 lifted.
// wl1ov1: both.
const LAKE_AT = "  base *= 1.1;\n";
const LAKE_LIFT = `  base *= 1.1;
  {
    // Near crushed blacks on the water (the rocks' dark reflections at the frame bottom), as the plate's near lift.
    float nearKw = 1.0 - smoothstep(12.0, 22.0, dist);
    float lnw = dot(base, LUMA);
    float shKw = nearKw * (1.0 - smoothstep(0.02, 0.12, lnw));
    base = mix(base, mix(vec3(lnw), base, 0.7) * 1.25 + vec3(0.006, 0.008, 0.01), shKw * 0.8);
  }
`;
const PLATE_AT = "    col = mix(col, mix(vec3(ln), col, 0.7) * 1.25 + vec3(0.006, 0.008, 0.01), shK * 0.8);\n  }";
const PLATE_OV = `    col = mix(col, mix(vec3(ln), col, 0.7) * 1.25 + vec3(0.006, 0.008, 0.01), shK * 0.8);
    // The plate's bottom overscan rows (only reached by the low pointer's pan): recesses read as holes; lift their darkest.
    float ovK = (1.0 - smoothstep(-0.02, 0.0, restFrame(uv0).y)) * (1.0 - smoothstep(10.0, 14.0, d)) * uPlateDepthOn;
    float lo = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float lt = lo < 0.05 ? 0.05 * pow(max(lo, 0.0) / 0.05, 0.7) : lo;
    col = mix(col, mix(vec3(lt), col * (lt / max(lo, 1e-4)), 0.7), ovK);
  }`;
export default {
  wl1: { water: [[LAKE_AT, LAKE_LIFT]] },
  ov1: { plate: [[PLATE_AT, PLATE_OV]] },
  wl1ov1: { water: [[LAKE_AT, LAKE_LIFT]], plate: [[PLATE_AT, PLATE_OV]] },
};
