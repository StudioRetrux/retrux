// Round-8 T10: loop F015 (q01) shows one ring edge-on as a thin diagonal ribbon across the orb; the reference cups the orb
// in a ring tilted ~25 deg toward the camera (a bowl, bbox ~x610-870 y295-450, an ice edge across the orb at y ~333-336, the
// orb pure white only at y ~342-357). Round 7 shipped bm6c0 (B -6, C 0) and overshot from a dome to a ribbon; by
// interpolation the bowl lies ~60 % of the way back (B ~+2, C ~+8). hideB / hideC: which ring is the ribbon.
const T = (b, c, dd) => ({ tune: { loopTipDeg: [5, b, c, dd], loopTipAt: [0, 0.5, 0.5, 0.5], loopTipWidth: 0.45 } });
const HIDE = (i) => `h.rings.groups[${i}].visible = false;`;
export default {
  b0c8: T(0, 8, 8),
  b2c8: T(2, 8, 8),
  b4c10: T(4, 10, 8),
  hideB: { ...T(-6, 0, 8), js: HIDE(1) },
  hideC: { ...T(-6, 0, 8), js: HIDE(2) },
};
