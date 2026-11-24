// Round-9 T04: the hold's bottom 60 px of water is a featureless, vertically smeared blur; F420 shows broad dark swells with
// lighter crests. In the hold the near lake becomes the live mirror, where (a) the crest shading k is multiplied by plateW
// (~0) and (b) the wave slopes are weakened x0.25; (c) the ripple ring fades out by uWaveReach (8 m), about where the hold
// frame's bottom sits. All hold-only (uHold), so the rest look is unchanged.
// w1: (a) + (b). w2: w1 + (c) the reach x1.6 in the hold.
const K = "  k *= plateW;";
const K_N = "  k *= max(plateW, 0.7 * uHold);";
const SL = "    vec2 sl = waveS * 0.25 + m1.yw * vec2(0.55, 0.9) * 0.035;";
const SL_N = "    vec2 sl = waveS * mix(0.25, 0.8, uHold) + m1.yw * vec2(0.55, 0.9) * 0.035;";
const ENV = "  float env = smoothstep(0.4, 1.8, r) * exp(-r / (uWaveReach * 0.7)) * (1.0 - smoothstep(uWaveReach * 0.8, uWaveReach, r));";
const ENV_N = "  float reachH = uWaveReach * mix(1.0, 1.6, uHold);\n  float env = smoothstep(0.4, 1.8, r) * exp(-r / (reachH * 0.7)) * (1.0 - smoothstep(reachH * 0.8, reachH, r));";
export default {
  w1: { water: [[K, K_N], [SL, SL_N]] },
  w2: { water: [[K, K_N], [SL, SL_N], [ENV, ENV_N]] },
};
