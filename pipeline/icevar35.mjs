// Ice batch 35: the hold reads as frosted wax. Rings A / B get uFracture = spreadA (~1 in the hold) and frost += 0.5 *
// uFracture: every held piece frosted (blur up to 1.6 mips, frost^2 scatter). On top of icevar34 k3.
import V from "./icevar34.mjs";
const k3 = V.k3;
const FR = "+ cellRand * 0.08 + uFracture * 0.5);";
export default {
  k3: k3,
  f1: { frag: [...k3.frag, [FR, "+ cellRand * 0.08 + uFracture * 0.1);"]], vert: k3.vert, uniforms: k3.uniforms },
  f0: { frag: [...k3.frag, [FR, "+ cellRand * 0.08);"]], vert: k3.vert, uniforms: k3.uniforms },
};
