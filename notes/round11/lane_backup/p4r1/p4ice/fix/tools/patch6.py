# fixer patch6 (judge_p4ice F1-F5): exact string replacements on the lane's IceMaterial.ts
import sys
F = "/Users/muhamadrifaldi/RetruxR11Work/lanes/p4ice/retrux-web/app/hero/engine/hero/IceMaterial.ts"
s = open(F).read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    if c != n:
        sys.exit(f"count {c} != {n} for: {old[:80]!r}")
    s = s.replace(old, new)

# --- uniforms
rep("""uniform vec4 uP4F;  // Q10: x orb share of the grazing reflection tinted by IceColor (MAIN 0), y steel-blue inner rim line,
                    // z crack sheets, w ice-only blue cast (all MAIN 0)""",
"""uniform vec4 uP4F;  // Q10: x orb share of the grazing reflection tinted by IceColor (MAIN 0), y steel-blue inner rim line,
                    // z spare (the crack sheets were dropped in the fix round: invisible in every judged pose, F4), w ice-only
                    // blue cast (all MAIN 0)""")
rep("""uniform vec4 uP4H;  // Q3: x / y the trace's own roughness ramp lo / hi (MAIN = the material roughness, 0.233 / 1), z / w spare""",
"""uniform vec4 uP4H;  // Q3: x / y the trace's own roughness ramp lo / hi (MAIN = the material roughness, 0.233 / 1); G5 fix round:
                    // z the critical-angle ramp's width at full hold, every wall (MAIN 1), w spare""")
rep("""uniform vec4 uP4I;  // Q10 scrape streaks: x the fine bump's Noise B stretched along the ring this many times (0 = MAIN's isotropic
                    // noise), y / z / w spare""",
"""uniform vec4 uP4I;  // Q10 scrape streaks: x the fine bump's Noise B stretched along the ring this many times (0 = MAIN's isotropic
                    // noise); fix round: y Noise B's own octave fade start in cycles per pixel (0 = uP4A.z), z cut caps' frosted
                    // roughness floor (0 off), w spare
uniform vec4 uP4J;  // Q6 fix round, joints: x 1 = V profile (0 = the round-1 / MAIN collar formula with uP4D.y metres), y crossing
                    // interior share, z seam line share, w bright far-wall line gain""")
rep("""uniform vec4 uP4G;  // Q4 / Q10: x orb-through gain at full hold (MAIN 1), y facet glint gain at full hold (MAIN 0), z the mean's share
                    // of the orb seen along a direct path (MAIN uR11F.x 0.3), w spare""",
"""uniform vec4 uP4G;  // Q4 / Q10: x orb-through gain at full hold (MAIN 1), y facet glint gain at full hold (MAIN 0), z the mean's share
                    // of the orb seen along a direct path (MAIN uR11F.x 0.3); fix round: w the frosted share left where little
                    // light leaves through the walls (internal-reflection zones; MAIN 1)""")

# --- F5: Noise B's own fade start
rep("""    ? p4FbmRing(vObjPos + 11.0 * vec3(0.0, 0.0, 1.0), 4.0 / 1.975, uP4I.x, 0.8, FINE_OCTAVES + 2, pix, 0.12, uP4A.z, uP4B.w, nB, gBLow)
    : p4FbmGrad(p * 1.0 + 11.0, 4.0 / 1.975, 0.8, FINE_OCTAVES + 2, pix, 0.12, uP4A.z, uP4B.w, nB, gBLow));""",
"""    ? p4FbmRing(vObjPos + 11.0 * vec3(0.0, 0.0, 1.0), 4.0 / 1.975, uP4I.x, 0.8, FINE_OCTAVES + 2, pix, 0.12, uP4I.y > 0.0 ? uP4I.y : uP4A.z, uP4B.w, nB, gBLow)
    : p4FbmGrad(p * 1.0 + 11.0, 4.0 / 1.975, 0.8, FINE_OCTAVES + 2, pix, 0.12, uP4I.y > 0.0 ? uP4I.y : uP4A.z, uP4B.w, nB, gBLow));""")

# --- F5: frosted cut caps (after the uR11M roughness block)
rep("""    rough = min(sqrt(sqrt(a2)), 1.0);
  }
  if (dot(N, V) < 0.02) N = normalize(N + V * (0.02 - dot(N, V)));""",
"""    rough = min(sqrt(sqrt(a2)), 1.0);
  }
#ifdef ICE_P4
  // (F5 fix round: a cut cap is a sawn / chipped face, frosted like F358's, not a polished lid: its roughness floor uP4I.z.)
  rough = mix(rough, max(rough, uP4I.z), capK);
#endif
  if (dot(N, V) < 0.02) N = normalize(N + V * (0.02 - dot(N, V)));""")

# --- F1: hold-scaled critical-angle ramp, every wall
rep("""#ifdef ICE_P4
      if (b == 1) dc *= mix(1.0, uP4E.y, uHold);
#endif""",
"""#ifdef ICE_P4
      if (b == 1) dc *= mix(1.0, uP4E.y, uHold);
      // (G5 fix round: in the hold the close-up arcs drew soft outlines along the internal-reflection zones' edges (p05);
      // their ramp widens to uP4H.z x at full hold only, so the idle crawl is untouched.)
      dc *= mix(1.0, uP4H.z, uHold);
#endif""")

# --- F3: frost share in internal-reflection zones
rep("""  float frostK = smoothstep(0.35, 1.0, rough) * uR11D.z;
  if (frostK > 0.0) {""",
"""  float frostK = smoothstep(0.35, 1.0, rough) * uR11D.z;
#ifdef ICE_P4
  // (F3 fix round: where little light has left through the walls (the oblique bands' internal-reflection zones, F045's dark
  // steel band) the frosted look-through drew white ovals and lifted the band; the frosted share falls to uP4G.w there.)
  frostK *= mix(uP4G.w, 1.0, smoothstep(0.1, 0.5, wOut));
#endif
  if (frostK > 0.0) {""")

# --- F4: drop the crack sheets
i0 = s.index("  if (uP4F.z > 0.0 && uReflectionPass < 0.5) {")
i1 = s.index("    col *= crk > 0.0 ? mix(1.0, 0.7, crk) : mix(1.0, 1.15, -crk);\n  }\n", i0)
i1 += len("    col *= crk > 0.0 ? mix(1.0, 0.7, crk) : mix(1.0, 1.15, -crk);\n  }\n")
s = s[:i0] + s[i1:]

# --- F2: joints, V profile
rep("""    float wob = (nA - 0.5) * 0.03;  // a slightly irregular seam (Noise A), metres
    for (int c = 0; c < 2; c++) {""",
"""    float wob = (nA - 0.5) * 0.03;  // a slightly irregular seam (Noise A), metres
#ifdef ICE_P4
    // (F2 fix round: the seam lines' pixel widths from derivatives taken here, in uniform control flow.)
    vec3 dE0x = dFdx(e0), dE0y = dFdy(e0), dE1x = dFdx(e1), dE1y = dFdy(e1);
    float jLine = 0.0;
#endif
    for (int c = 0; c < 2; c++) {""")
rep("""#ifdef ICE_P4
      float crossK = se * sx < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, uP4D.y, min(abs(se), abs(sx)));
#else
      float crossK = se * sx < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 0.012, min(abs(se), abs(sx)));
#endif""",
"""#ifdef ICE_P4
      float crossK;
      if (uP4J.x > 0.5) {
        // (F2 fix round: F015 / F030 show a 2-3 px seam line and a bright edge line, not a painted collar. A V-shaped dark
        // line uP4D.y px either side of where the plane meets the entry face (se -> 0), a light shade where the first
        // segment crosses it (soft at both ends), and a bright line where it meets the far wall (sx -> 0).)
        float fS = abs(dot(dE0x, nc)) + abs(dot(dE0y, nc)) + 1e-5;
        float fX = clamp(abs(dot(dE1x, nc)) + abs(dot(dE1y, nc)), 0.5 * fS, 4.0 * fS);
        float inside = smoothstep(-fS, fS, -se * (sx >= 0.0 ? 1.0 : -1.0)) * smoothstep(0.0, fX, abs(sx));
        float seam = 1.0 - smoothstep(0.0, uP4D.y * fS, abs(se));
        jLine = max(jLine, (1.0 - smoothstep(0.0, uP4D.y * fX, abs(sx))) * smoothstep(fS, 3.0 * fS, abs(se)));
        crossK = max(uP4J.y * inside, uP4J.z * seam);
      } else {
        crossK = se * sx < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, uP4D.y, min(abs(se), abs(sx)));
      }
#else
      float crossK = se * sx < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 0.012, min(abs(se), abs(sx)));
#endif""")
rep("""      jk = max(jk, crossK * mix(0.12, 1.0, tirK));
    }
    col *= 1.0 - uR11B.z * jk;
  }""",
"""      jk = max(jk, crossK * mix(0.12, 1.0, tirK));
    }
#ifdef ICE_P4
    col *= (1.0 - uR11B.z * jk) * (1.0 + uP4J.w * jLine);
#else
    col *= 1.0 - uR11B.z * jk;
#endif
  }""")

# --- TS uniforms
rep("""  u.uP4D = { value: P4_CAP ? new THREE.Vector4(1, 0.005, 0.04, 1) : new THREE.Vector4(0, 0.012, 0, 0) };""",
"""  // (Fix round, F2: with the V profile uP4D.y is the seam line's half width in pixels; uP4J below.)
  u.uP4D = { value: P4_CAP ? new THREE.Vector4(1, 1.25, 0.04, 1) : new THREE.Vector4(0, 0.012, 0, 0) };
  u.uP4J = { value: P4_CAP ? new THREE.Vector4(1, 0.17, 0.25, 0.15) : new THREE.Vector4(0, 0, 0, 0) };""")
rep("""  u.uP4F = { value: P4_HOLD ? new THREE.Vector4(1, 1.3, 1, 3) : new THREE.Vector4(0, 0, 0, 0) };""",
"""  // (z: the crack sheets were dropped in the fix round, F4: hash-placed, invisible in every judged pose, paid on every fragment.)
  u.uP4F = { value: P4_HOLD ? new THREE.Vector4(1, 1.3, 0, 3) : new THREE.Vector4(0, 0, 0, 0) };""")
rep("""  u.uP4G = { value: new THREE.Vector4(P4_ORB ? 1.4 : 1, P4_HOLD ? 0.5 : 0, P4_ORB ? 0.15 : u.uR11F.value.x, 0) };""",
"""  // w (fix round, F3): the frosted share in internal-reflection zones (1 = MAIN).
  u.uP4G = { value: new THREE.Vector4(P4_ORB ? 1.4 : 1, P4_HOLD ? 0.5 : 0, P4_ORB ? 0.15 : u.uR11F.value.x, P4_FROST ? 1 : 1) };""")
rep("""  u.uP4H = { value: new THREE.Vector4(0.233, 1, 0, 0) };""",
"""  // z (fix round, F1): the critical-angle ramp's width at full hold (1 = MAIN).
  u.uP4H = { value: new THREE.Vector4(0.233, 1, P4_AA ? 1 : 1, 0) };""")
rep("""  u.uP4I = { value: new THREE.Vector4(P4_HOLD ? 8 : 0, 0, 0, 0) };""",
"""  // y / z (fix round, F5): Noise B's own fade start (0 = uP4A.z), cut caps' frosted roughness floor (0 off).
  u.uP4I = { value: new THREE.Vector4(P4_HOLD ? 8 : 0, 0, 0, 0) };""")
open(F, "w").write(s)
print("ok", len(s))
