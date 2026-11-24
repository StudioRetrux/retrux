// Ice diagnostics 4: the thickness t along the view ray (back-depth pass) as a heat map: red = t / 1.6 m, green = 1 where
// t > 0.5 m (the long-path absorption threshold), blue = inward (band mask).
const FINAL = "gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);";
export default {
  tmap: { frag: [[FINAL, "gl_FragColor = vec4(t / 1.6, step(0.5, t), inward, 1.0);"]] },
};
