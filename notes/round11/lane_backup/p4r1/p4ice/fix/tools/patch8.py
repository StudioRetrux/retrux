# fixer patch8: joints = a soft V across the crossing band (peak mid-band, 0 at both edges) + the far-wall bright line;
# the ineffective F3 frost modulation and F5 Noise B fade / cap frost knobs removed (b2: no visible change); hold ramp 2.5.
import sys
F = "/Users/muhamadrifaldi/RetruxR11Work/lanes/p4ice/retrux-web/app/hero/engine/hero/IceMaterial.ts"
s = open(F).read()


def rep(old, new, n=1):
    global s
    c = s.count(old)
    if c != n:
        sys.exit(f"count {c} != {n} for: {old[:80]!r}")
    s = s.replace(old, new)


# uniforms docs
rep("""                    // noise); fix round: y Noise B's own octave fade start in cycles per pixel (0 = uP4A.z), z cut caps' frosted
                    // roughness floor (0 off), w spare
uniform vec4 uP4J;  // Q6 fix round, joints: x 1 = V profile (0 = the round-1 / MAIN collar formula with uP4D.y metres), y crossing
                    // interior share, z seam line share, w bright far-wall line gain""",
"""                    // noise), y / z / w spare
uniform vec4 uP4J;  // Q6 fix round, joints: x 1 = V profile (0 = the round-1 / MAIN collar formula with uP4D.y metres), y its depth
                    // share, z spare, w bright far-wall line gain""")
rep("""                    // of the orb seen along a direct path (MAIN uR11F.x 0.3); fix round: w the frosted share left where little
                    // light leaves through the walls (internal-reflection zones; MAIN 1)""",
"""                    // of the orb seen along a direct path (MAIN uR11F.x 0.3), w spare""")
# F5 knobs out
rep("""    ? p4FbmRing(vObjPos + 11.0 * vec3(0.0, 0.0, 1.0), 4.0 / 1.975, uP4I.x, 0.8, FINE_OCTAVES + 2, pix, 0.12, uP4I.y > 0.0 ? uP4I.y : uP4A.z, uP4B.w, nB, gBLow)
    : p4FbmGrad(p * 1.0 + 11.0, 4.0 / 1.975, 0.8, FINE_OCTAVES + 2, pix, 0.12, uP4I.y > 0.0 ? uP4I.y : uP4A.z, uP4B.w, nB, gBLow));""",
"""    ? p4FbmRing(vObjPos + 11.0 * vec3(0.0, 0.0, 1.0), 4.0 / 1.975, uP4I.x, 0.8, FINE_OCTAVES + 2, pix, 0.12, uP4A.z, uP4B.w, nB, gBLow)
    : p4FbmGrad(p * 1.0 + 11.0, 4.0 / 1.975, 0.8, FINE_OCTAVES + 2, pix, 0.12, uP4A.z, uP4B.w, nB, gBLow));""")
rep("""#ifdef ICE_P4
  // (F5 fix round: a cut cap is a sawn / chipped face, frosted like F358's, not a polished lid: its roughness floor uP4I.z.)
  rough = mix(rough, max(rough, uP4I.z), capK);
#endif
""", "")
# F3 knob out
rep("""#ifdef ICE_P4
  // (F3 fix round: where little light has left through the walls (the oblique bands' internal-reflection zones, F045's dark
  // steel band) the frosted look-through drew white ovals and lifted the band; the frosted share falls to uP4G.w there.)
  frostK *= mix(uP4G.w, 1.0, smoothstep(0.1, 0.5, wOut));
#endif
""", "")
# joints: V across the band
rep("""    vec3 dE0x = dFdx(e0), dE0y = dFdy(e0), dE1x = dFdx(e1), dE1y = dFdy(e1);
    float jLine = 0.0, jSeam = 0.0;""",
"""    vec3 dE0x = dFdx(e0), dE0y = dFdy(e0), dE1x = dFdx(e1), dE1y = dFdy(e1);
    float jLine = 0.0;""")
rep("""        // (F2 fix round: F015 / F030 show a 2-3 px seam line and a bright edge line, not a painted collar. A V-shaped dark
        // line uP4D.y px either side of where the plane meets the entry face (se -> 0), a light shade where the first
        // segment crosses it (soft at both ends), and a bright line where it meets the far wall (sx -> 0).)
        float fS = abs(dot(dE0x, nc)) + abs(dot(dE0y, nc)) + 1e-5;
        float fX = clamp(abs(dot(dE1x, nc)) + abs(dot(dE1y, nc)), 0.5 * fS, 4.0 * fS);
        float inside = smoothstep(-fS, fS, -se * (sx >= 0.0 ? 1.0 : -1.0)) * smoothstep(0.0, fX, abs(sx));
        float seam = 1.0 - smoothstep(0.0, uP4D.y * fS, abs(se));
        jLine = max(jLine, (1.0 - smoothstep(0.0, uP4D.y * fX, abs(sx))) * smoothstep(fS, 3.0 * fS, abs(se)));
        jSeam = max(jSeam, seam);
        crossK = uP4J.y * inside;""",
"""        // (F2 fix round: F015 / F030 show a 2-3 px dark seam and a bright edge line, not a flat painted collar. Across the
        // band of rays whose first segment crosses the plane the shade is a V, deepest where the crossing is midway along the
        // segment and 0 at both ends (se -> 0 at the entry face, sx -> 0 at the far wall), so it has no hard edge and reads
        // as a line at any width; a bright line uP4D.y px either side of where the plane meets the far wall (sx -> 0).)
        float fS = abs(dot(dE0x, nc)) + abs(dot(dE0y, nc)) + 1e-5;
        float fX = clamp(abs(dot(dE1x, nc)) + abs(dot(dE1y, nc)), 0.5 * fS, 4.0 * fS);
        float tC = abs(se) / max(abs(se) + abs(sx), 1e-6);
        float vK = se * sx < 0.0 ? 1.0 - abs(2.0 * tC - 1.0) : 0.0;
        jLine = max(jLine, (1.0 - smoothstep(0.0, uP4D.y * fX, abs(sx))) * smoothstep(fS, 3.0 * fS, abs(se)));
        crossK = uP4J.y * vK;""")
rep("""    col *= (1.0 - uR11B.z * jk) * (1.0 - uP4J.z * jSeam) * (1.0 + uP4J.w * jLine);""",
"""    col *= (1.0 - uR11B.z * jk) * (1.0 + uP4J.w * jLine);""")
# TS defaults
rep("""  u.uP4J = { value: P4_CAP ? new THREE.Vector4(1, 0.17, 0.15, 0.15)""",
"""  u.uP4J = { value: P4_CAP ? new THREE.Vector4(1, 0.25, 0, 0.12)""")
rep("""  // w (fix round, F3): the frosted share in internal-reflection zones (1 = MAIN).
  u.uP4G = { value: new THREE.Vector4(P4_ORB ? 1.4 : 1, P4_HOLD ? 0.5 : 0, P4_ORB ? 0.15 : u.uR11F.value.x, P4_FROST ? 1 : 1) };""",
"""  u.uP4G = { value: new THREE.Vector4(P4_ORB ? 1.4 : 1, P4_HOLD ? 0.5 : 0, P4_ORB ? 0.15 : u.uR11F.value.x, 0) };""")
rep("""  // z (fix round, F1): the critical-angle ramp's width at full hold (1 = MAIN).
  u.uP4H = { value: new THREE.Vector4(0.233, 1, P4_AA ? 1 : 1, 0) };""",
"""  // z (fix round, F1): the critical-angle ramp x2.5 at full hold (1 = MAIN): p05's TIR-zone outlines soften (right arc
  // Laplacian 8.7 -> 6.2 at x2, 5.6 at x3; F402 2.9), p06 band 208.6 -> 205.6 (x2) / 202.3 (x3) vs F420 206.9 (batch b2).
  u.uP4H = { value: new THREE.Vector4(0.233, 1, P4_AA ? 2.5 : 1, 0) };""")
rep("""  // y / z (fix round, F5): Noise B's own fade start (0 = uP4A.z), cut caps' frosted roughness floor (0 off).
  u.uP4I = { value: new THREE.Vector4(P4_HOLD ? 8 : 0, 0, 0, 0) };""",
"""  u.uP4I = { value: new THREE.Vector4(P4_HOLD ? 8 : 0, 0, 0, 0) };""")
rep("""  // (Fix round, F2: with the V profile uP4D.y is the seam line's half width in pixels; uP4J below.)""",
"""  // (Fix round, F2: with the V profile (uP4J.x 1) uP4D.y is the far-wall line's half width in pixels: uP4J below.)""")
open(F, "w").write(s)
print("ok")
