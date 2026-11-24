// Vertical-orbit ghost on the right floe slab: which lake path draws it? Debug tints in the water shader, and the
// plate shader's hidden fragments.
const WFINAL = "  gl_FragColor = vec4(col, 1.0);\n}";
const WDBG = `  gl_FragColor = vec4(col, 1.0);
  float filledW = step(1e-5, distance(puv, puv0)) * (1.0 - nofill);
  if (nofill > 0.5) gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.0, 0.0), 0.6);
  else if (filledW > 0.5) gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 1.0, 0.0), 0.6);
  if (occl > 0.5) gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 0.0, 1.0), 0.5);
}`;
const PFINAL = "gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);";
const PDBG = `${PFINAL}
  if (distance(uv, uv0) > 1e-5) gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.0, 1.0), 0.6);`;
export default {
  wdbg: { water: [[WFINAL, WDBG]] },
  pdbg: { plate: [[PFINAL, PDBG]] },
};
