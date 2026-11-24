// Ice batch 36: the reference's thick-lens look (dark blue-grey refracted lake / horizon bands inside the rings, F000 /
// F420) needs the bent exit ray to reach below the horizon: ours mostly re-samples the bright sky right behind -> a pale
// milky sheet. On top of icevar35 f1: lens strength and projection depth.
import V from "./icevar35.mjs";
const f1 = V.f1;
const u = (o) => ({ ...f1.uniforms, ...o });
export default {
  f1: f1,
  L5: { frag: f1.frag, vert: f1.vert, uniforms: u({ uLens: 0.5 }) },
  L8: { frag: f1.frag, vert: f1.vert, uniforms: u({ uLens: 0.8 }) },
  D12: { frag: f1.frag, vert: f1.vert, uniforms: u({ uLens: 0.35, uLensDepth: 12 }) },
  L5D12: { frag: f1.frag, vert: f1.vert, uniforms: u({ uLens: 0.5, uLensDepth: 12 }) },
};
