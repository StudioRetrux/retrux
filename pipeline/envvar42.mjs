// Debug: why the hold massif's slate term (upK) never reaches the p06 massif face. Binary-coded channels (robust to the post chain).
const END = "  gl_FragColor = vec4(mix(col, mix(MIST_COLOR, footC, ridgeFoot), min(mist, 0.85)), 1.0);";
const dbg = (expr) => [[END, `${END}\n  gl_FragColor = vec4(${expr}, 1.0);`]];
export default {
  dD: { plate: dbg("step(60.0, d), step(80.0, d), step(100.0, d)") },
  dD2: { plate: dbg("step(120.0, d), step(150.0, d), step(200.0, d)") },
  dY: { plate: dbg("step(3.0, fp.y), step(6.0, fp.y), step(12.0, fp.y)") },
  dP: { plate: dbg("step(80.0, pz), step(100.0, pz), step(130.0, pz)") },
  dH: { plate: dbg("vec3(uHold, step(0.5, uHold), step(0.95, uHold))") },
};
