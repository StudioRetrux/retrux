// Round-9 T14 (rest tone): the iceberg box (x1000-1150 y330-390) reads 146,168,193 vs F000's 137,155,183 (+9 / +13 / +10,
// a touch cyan). The berg grade only touches its shaded faces (luma gate), so its snow carries the excess. b38a: the same
// plate-space region and depth gate without the luma gate, x (0.94, 0.92, 0.95) at rest (fading out in the hold, where T05
// already eases the berg).
const BERG = "  col = mix(col, max(mix(vec3(lumaI), col, mix(1.5, 0.88, uHold)) * mix(0.82, 0.95, uHold), vec3(0.0)), berg * (1.0 - 0.5 * uHold));";
const b = (r, g, bl) => `${BERG}
  {
    float bergAll = smoothstep(0.624, 0.661, fr.x) * (1.0 - smoothstep(0.884, 0.922, fr.x)) * smoothstep(0.3625, 0.4, fr.y) * (1.0 - smoothstep(0.6, 0.65, fr.y));
    bergAll *= smoothstep(50.0, 55.0, pz) * (1.0 - smoothstep(78.0, 85.0, pz)) * uPlateDepthOn * (1.0 - uHold);
    col *= mix(vec3(1.0), vec3(${r}, ${g}, ${bl}), bergAll);
  }`;
export default {
  b38a: { plate: [[BERG, b("0.94", "0.92", "0.95")]] },
  b38b: { plate: [[BERG, b("0.92", "0.89", "0.93")]] },
};
