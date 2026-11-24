// Ice batch 25: the transmitted sky behind ring B's top rim works out to ~(172,193,225) (the reference: 173,194,219), but
// we measure 148,165,182: the grazing-angle overlays (TIR darkening, long-path navy) spread broadly over the curved rim
// where the reference only has thin dark lines. Narrower / weaker TIR and path navy.
const TIR = "float tir = smoothstep(0.5, 0.85, 1.0 - dot(Nr, V)) * thick * smoothstep(0.06, 0.22, NdotV);";
const PATH = "body = mix(body, vec3(0.066, 0.162, 0.392) * (0.6 + 0.4 * irr.b), pathK * 0.45);";
export default {
  tirNarrow: { frag: [[TIR, "float tir = smoothstep(0.68, 0.92, 1.0 - dot(Nr, V)) * thick * smoothstep(0.06, 0.22, NdotV);"]] },
  pathLess: { frag: [[PATH, "body = mix(body, vec3(0.066, 0.162, 0.392) * (0.6 + 0.4 * irr.b), pathK * 0.25);"]] },
  both: {
    frag: [
      [TIR, "float tir = smoothstep(0.68, 0.92, 1.0 - dot(Nr, V)) * thick * smoothstep(0.06, 0.22, NdotV);"],
      [PATH, "body = mix(body, vec3(0.066, 0.162, 0.392) * (0.6 + 0.4 * irr.b), pathK * 0.25);"],
    ],
  },
};
