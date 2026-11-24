// Debug: the ridge's dotted speck line in the orbit views: crack in the proxy (the specks are a farther surface) or shading?
const END = "  gl_FragColor = vec4(mix(col, mix(MIST_COLOR * vec3(0.81, 0.9, 1.0), footC, ridgeFoot), min(mist, 0.85)), 1.0);";
const dbg = (expr) => [[END, `${END}\n  gl_FragColor = vec4(${expr}, 1.0);`]];
export default {
  // r: own distance > 100 m (massif or farther), g: ridgeBody, b: > 300 m (sky).
  dz: { plate: dbg("step(100.0, distance(cameraPosition, vWorldPos)), ridgeBody, step(300.0, distance(cameraPosition, vWorldPos))") },
  // r: the fill moved the uv, g: the rest projector does not see the fragment (fz > pz), b: 0
  df: { plate: dbg("moved, step(pz * 1.02 + 0.5, fz), 0.0") },
};
