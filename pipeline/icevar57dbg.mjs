// Debug for icevar57: is the streak mask ever non-zero, and does body reach the output?
const CRACK = "  body = mix(body, body * vec3(0.5, 0.6, 0.74), crackAcc * 0.7);";
const END = "  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);\n}";
const MASK = `${CRACK}
  float angQ = atan(vObjPos.y, vObjPos.x);
  float rrQ = length(vObjPos.xy);
  float stQ = fbm(vec3(angQ * 2.5, (rrQ - uSectionRadius) * 7.0, vObjPos.z * 7.0) + uSeed * 1.7, 3);
  float mQ = smoothstep(0.15, 0.55, stQ);`;
export default {
  mask: { frag: [[CRACK, MASK], [END, "  gl_FragColor = vec4(vec3(mQ), 1.0);\n}"]] },
  st: { frag: [[CRACK, MASK], [END, "  gl_FragColor = vec4(vec3(stQ * 0.5 + 0.5), 1.0);\n}"]] },
  bodyOut: { frag: [[END, "  gl_FragColor = vec4(body * 0.7, 1.0);\n}"]] },
};
