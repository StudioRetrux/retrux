// v7 plates: lowering the far-left ridge revealed a sunlit snow face on the massif's left shoulder (q00 ~150-215, 300-345):
// starkly white with a saturated dark-blue outline. The outline is the baseK block's local contrast (col + (col - blur) x 0.6,
// then x (0.52, 0.62, 0.78)) undershooting around a bright patch (an unsharp-mask halo). F000 shows soft grey-white there.
// lc1: the local contrast keeps its positive side (texture on the slopes) but only a little of its negative side (-0.02),
//      so bright patches get no dark ring. Same for the far band's unsharp mask (x0.22).
// lc2: lc1 + a soft highlight shoulder in the baseK zone (luma above ~0.7 compressed), so the face sits with its snow.
const BASE_LC = "      col = max(col + (col - mbl) * 0.6 * baseK, vec3(0.0));";
const BASE_LC_N = "      col = max(col + max(col - mbl, vec3(-0.02)) * 0.6 * baseK, vec3(0.0));";
const FAR_LC = "    col = max(col + (col - mb) * 0.22 * farBand, vec3(0.0));";
const FAR_LC_N = "    col = max(col + max(col - mb, vec3(-0.03)) * 0.22 * farBand, vec3(0.0));";
const BASE_MUL = "      col = mix(col, col * vec3(0.52, 0.62, 0.78), baseK);";
const BASE_MUL_N = `      col = mix(col, col * vec3(0.52, 0.62, 0.78), baseK);
      {
        float lh = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col *= mix(1.0, (0.7 + (lh - 0.7) / (1.0 + 2.5 * max(lh - 0.7, 0.0))) / max(lh, 1e-4), step(0.7, lh) * baseK);
      }`;
export default {
  lc1: { plate: [[BASE_LC, BASE_LC_N], [FAR_LC, FAR_LC_N]] },
  lc2: { plate: [[BASE_LC, BASE_LC_N], [FAR_LC, FAR_LC_N], [BASE_MUL, BASE_MUL_N]] },
};
