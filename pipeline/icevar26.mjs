// Ice batch 26: with the chamfer-frost fix live, uFrost (0.4-0.5 now) controls the frost patch coverage: ring A reads
// marbled at q01 (~half its face frosted). The reference: mostly clear, frost at edges / caps. Lower coverage.
export default {
  f30: { uniforms: { uFrost: 0.3 } },
  f20: { uniforms: { uFrost: 0.2 } },
  f10: { uniforms: { uFrost: 0.1 } },
};
