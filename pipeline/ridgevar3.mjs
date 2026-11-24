// v5 plates published (the far-left ridge baked dark in Blender). The shader's navy overlay on (none) vs off vs a light
// grade (x0.35 of the mix).
const MIXN = "col = mix(col, navy, ridge * mix(0.95, 1.0, moved));";
export default {
  off: { plate: [[MIXN, "col = mix(col, navy, 0.0 * ridge * mix(0.95, 1.0, moved));"]] },
  light: { plate: [[MIXN, "col = mix(col, navy, 0.35 * ridge * mix(0.95, 1.0, moved));"]] },
};
