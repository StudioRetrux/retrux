import sys
F = sys.argv[1]
s = open(F).read()
def rep(find, repl, count=1):
    global s
    n = s.count(find)
    if n != count:
        raise SystemExit(f"anchor x{n} (want {count}): {find[:80]!r}")
    s = s.replace(find, repl)

# ---- W3 / W4 / W5: lkChop (band limit, octave 3 share, onset feather, slope soft limit)
rep("""uniform vec4 uLkP4C;
uniform vec4 uLkP4CF;
uniform float uLkP4K;
vec2 lkChop(vec3 P, float dist, vec2 fp, float kDof) {
  float w = smoothstep(0.0, 1.0, uHold) * (1.0 - smoothstep(uLkP4C.z, uLkP4C.w, dist));
  if (w <= 0.0) return vec2(0.0);
  float L = max(fp.x, fp.y) * mix(1.0, kDof, uLkP4K);   // (uLkP4K: the share of the lake's DOF blur in the band limit)
  float a1 = uLkP4C.x * (1.0 - smoothstep(0.2, 0.45, L * uLkP4CF.x));
  float a2 = uLkP4C.y * (1.0 - smoothstep(0.2, 0.45, L * uLkP4CF.y));
  float f3 = 2.4 * uLkP4CF.y;
  float a3 = uLkP4C.y * 0.42 * (1.0 - smoothstep(0.2, 0.45, L * f3));
""", """uniform vec4 uLkP4C;
uniform vec4 uLkP4CF;
uniform float uLkP4K;
// P4 water fix (judge W3 / W4 / W5): x / y the octaves' band limit (footprint x frequency; was 0.2-0.45: the finer octaves aliased
// into 1-2 px streaks that flickered in the press and the hold), z the third octave's share (was 0.42), w the slope's soft limit
// (the deepest tilts mirrored the uniform deep-blue sky: flat-filled, hard-edged, over-saturated troughs).
uniform vec4 uLkP4B;
// P4 water fix: x the chop's own slope change per px at which it is damped (judge W3; 0 off), y the onset feather (m) inside the
// crest train's hard cuts (its front at R and the |x|, |z| 14.85 m square; judge W5: a stepped edge where the chop began).
uniform vec4 uLkP4D;
vec2 lkChop(vec3 P, float dist, vec2 fp, float kDof) {
  float w = smoothstep(0.0, 1.0, uHold) * (1.0 - smoothstep(uLkP4C.z, uLkP4C.w, dist));
  if (w <= 0.0) return vec2(0.0);
  {
    float R = mix(8.2, 21.5, smoothstep(0.0, 1.0, uHold));
    float rP = length(vec2(P.x, P.z + 8.6));
    float mP = max(abs(P.x), abs(P.z));
    w *= (1.0 - smoothstep(R - 0.5 - uLkP4D.y, R - 0.5, rP)) * (1.0 - smoothstep(14.55 - uLkP4D.y, 14.55, mP));
    if (w <= 0.0) return vec2(0.0);
  }
  float L = max(fp.x, fp.y) * mix(1.0, kDof, uLkP4K);   // (uLkP4K: the share of the lake's DOF blur in the band limit)
  float a1 = uLkP4C.x * (1.0 - smoothstep(uLkP4B.x, uLkP4B.y, L * uLkP4CF.x));
  float a2 = uLkP4C.y * (1.0 - smoothstep(uLkP4B.x, uLkP4B.y, L * uLkP4CF.y));
  float f3 = 2.4 * uLkP4CF.y;
  float a3 = uLkP4C.y * uLkP4B.z * (1.0 - smoothstep(uLkP4B.x, uLkP4B.y, L * f3));
""")
rep("""    s += w * a3 * f3 * vec2(C3 * n3.y - S3 * n3.z, S3 * n3.y + C3 * n3.z);
  }
  return s;
}
""", """    s += w * a3 * f3 * vec2(C3 * n3.y - S3 * n3.z, S3 * n3.y + C3 * n3.z);
  }
  if (uLkP4B.w > 0.0) s *= inversesqrt(1.0 + dot(s, s) / (uLkP4B.w * uLkP4B.w));   // (fix W4: soft limit)
  return s;
}
""")
# call site (TS string literal with \\n escapes; both paths)
rep(r'''      "  if (lkWv.x != 0.0 || lkWv.y != 0.0) lkWv += lkChop(vWorldPos, dist, lkP4Fp, kDof);\n" +''',
    r'''      "  vec2 lkP4Ch = lkChop(vWorldPos, dist, lkP4Fp, kDof);   // (every pixel: its derivatives below)\n" +
      "  if (uLkP4D.x > 0.0) {\n" +
      "    // P4 water fix W3: where the chop's own slope changes by more than ~uLkP4D.x per px, the reflection's lookups alias\n" +
      "    // (frame-to-frame sign-reversal flicker in the press and the hold): its amplitude falls there.\n" +
      "    vec2 lkP4Dc = fwidth(lkP4Ch);\n" +
      "    float lkP4Q = max(lkP4Dc.x, lkP4Dc.y) / uLkP4D.x;\n" +
      "    lkP4Ch *= inversesqrt(1.0 + lkP4Q * lkP4Q);\n" +
      "  }\n" +
      "  if (lkWv.x != 0.0 || lkWv.y != 0.0) lkWv += lkP4Ch;\n" +''')

# ---- W1: Q8 glint: luma-preserving cyan-white tint + gain (uLkP4G.w)
rep(r'''      "    col += mix(vec3(0.7, 0.88, 1.0), vec3(0.58, 0.83, 0.91), uLkP4G.z) * uOrbGlow * 0.5 * p4GgxAniso(Ns, V, lO, uLkP4G.x, uLkP4G.y) * (0.6 + 0.4 * spark) * zone;\n",''',
    r'''      "    // (fix W1: the cyan-white keeps MAIN's tint's luma, 0.850; uLkP4G.w a gain on the glint: the lane's first lobe was dimmer than MAIN's)\n" +
      "    col += mix(vec3(0.7, 0.88, 1.0), vec3(0.630, 0.901, 0.989), uLkP4G.z) * (uOrbGlow * 0.5 * uLkP4G.w) * p4GgxAniso(Ns, V, lO, uLkP4G.x, uLkP4G.y) * (0.6 + 0.4 * spark) * zone;\n",''')

# ---- W2: Q9's guard steps back where the quarter-size walk's taps disagree
rep(r'''      "vec3 lkBump(vec3 Pw, vec3 dPx, vec3 dPy, float kDof, out vec2 sig) {\n" +
      "  // (the ring zone, 13-28 m at rest, keeps its wavelets: F000's rings are agitated)\n" +
      "  float lkGd = smoothstep(uLkP4Gl.z, uLkP4Gl.w, distance(cameraPosition, Pw));\n",''',
    r'''      "float lkP4GJw = 0.0;   // P4 water fix W2: the guard's step-back at this pixel (lkP4GlassJump; 0 in the walk pass)\n" +
      "vec3 lkBump(vec3 Pw, vec3 dPx, vec3 dPy, float kDof, out vec2 sig) {\n" +
      "  // (the ring zone, 13-28 m at rest, keeps its wavelets: F000's rings are agitated)\n" +
      "  float lkGd = smoothstep(uLkP4Gl.z, uLkP4Gl.w, distance(cameraPosition, Pw)) * (1.0 - lkP4GJw);\n",''')
# new Q9 edits: helper + call (appended to P4_Q9)
rep('''      "    cx *= lkGa;\\n" +
      "    cy *= lkGa;\\n",
  },
];''', '''      "    cx *= lkGa;\\n" +
      "    cy *= lkGa;\\n",
  },
  {
    // fix W2 (judge: Q9's glassier far water unmasked the orbit ghost, a quarter-size walk texel interpolated over 4 x 4 px, that
    // MAIN's corduroy hid): where the walk's four taps disagree (G6's measure) the guard steps back to MAIN's bump.
    find: "#if defined(LAKE_R12) && defined(LK_CACHEN) && defined(LK_HALF) && defined(LK_WALKREPROJ)\\n",
    repl: /* glsl */ `#if defined(LAKE_R12) && defined(LK_CACHEN) && defined(LK_HALF) && defined(LK_WALKREPROJ) && !defined(LK_WALKPASS)
// P4 water fix W2: smoothstep(uLkP4GJ.x, uLkP4GJ.y) of the walk taps' spread at this pixel (share-weighted luma + 0.25 x the
// share spread); uLkP4GJ.z 0 turns it off.
uniform vec4 uLkP4GJ;
float lkP4GlassJump() {
  if (uLkP4GJ.z <= 0.0) return 0.0;
  vec4 c = uLkWalkVP * vec4(vWorldPos, 1.0);
  vec2 wsz = vec2(textureSize(uLkWalk, 0));
  vec2 q = (c.xy / c.w * 0.5 + 0.5) * wsz - 0.5;
  ivec2 i0 = ivec2(floor(q));
  ivec2 mx = ivec2(wsz) - 1;
  vec4 a = texelFetch(uLkWalk, clamp(i0, ivec2(0), mx), 0);
  vec4 b = texelFetch(uLkWalk, clamp(i0 + ivec2(1, 0), ivec2(0), mx), 0);
  vec4 d = texelFetch(uLkWalk, clamp(i0 + ivec2(0, 1), ivec2(0), mx), 0);
  vec4 e = texelFetch(uLkWalk, clamp(i0 + ivec2(1, 1), ivec2(0), mx), 0);
  vec4 l = vec4(dot(a.rgb, LUMA), dot(b.rgb, LUMA), dot(d.rgb, LUMA), dot(e.rgb, LUMA));
  vec4 s = vec4(a.a, b.a, d.a, e.a);
  float dl = max(max(l.x, l.y), max(l.z, l.w)) - min(min(l.x, l.y), min(l.z, l.w));
  float ds = max(max(s.x, s.y), max(s.z, s.w)) - min(min(s.x, s.y), min(s.z, s.w));
  return uLkP4GJ.z * smoothstep(uLkP4GJ.x, uLkP4GJ.y, dl + 0.25 * ds);
}
#endif
#if defined(LAKE_R12) && defined(LK_CACHEN) && defined(LK_HALF) && defined(LK_WALKREPROJ)
`,
  },
  {
    find: "    lkN = lkBump(vWorldPos, lkDPx, lkDPy, kDof, lkSig);\\n",
    repl:
      "#if defined(LK_HALF) && defined(LK_WALKREPROJ) && !defined(LK_WALKPASS)\\n" +
      "    lkP4GJw = lkP4GlassJump();   // P4 water fix W2\\n" +
      "#endif\\n" +
      "    lkN = lkBump(vWorldPos, lkDPx, lkDPy, kDof, lkSig);\\n",
  },
];''')

# ---- defaults (constructor)
rep('''          mirrorUniforms.uLkP4C = { value: new THREE.Vector4(0.55, 0.22, 19.0, 26.0) };
          mirrorUniforms.uLkP4K = { value: 0.0 };
          mirrorUniforms.uLkP4CF = { value: new THREE.Vector4(0.45, 1.0, 0.35, 0.6) };''',
'''          mirrorUniforms.uLkP4C = { value: new THREE.Vector4(0.85, 0.36, 19.0, 26.0) };
          mirrorUniforms.uLkP4K = { value: 0.0 };
          mirrorUniforms.uLkP4CF = { value: new THREE.Vector4(0.3, 0.65, 0.35, 0.6) };
          // fix (judge W3 / W4 / W5): band limit 0.1-0.25 (was 0.2-0.45), no third octave (was 0.42), slope soft limit; the chop's
          // AA (its slope change per px) and the onset feather (m)
          mirrorUniforms.uLkP4B = { value: new THREE.Vector4(0.1, 0.25, 0.0, 0.3) };
          mirrorUniforms.uLkP4D = { value: new THREE.Vector4(0.07, 2.0, 0, 0) };''')
rep('''          mirrorUniforms.uLkP4G = { value: new THREE.Vector4(0.16, 0.078, 0.6, 0) };''',
'''          mirrorUniforms.uLkP4G = { value: new THREE.Vector4(0.16, 0.078, 0.6, 1.0) };''')
rep('''new THREE.Vector4(gg[0], gg[1], 30, 40) : new THREE.Vector4(0.15, 0.45, 30, 40) };''',
'''new THREE.Vector4(gg[0], gg[1], 30, 40) : new THREE.Vector4(0.15, 0.45, 30, 40) };
          // fix W2: the guard steps back where the quarter-size walk's taps disagree (band of their spread; z 1 on)
          mirrorUniforms.uLkP4GJ = { value: new THREE.Vector4(0.01, 0.04, 1, 0) };''')
open(F, "w").write(s)
print("ok")
