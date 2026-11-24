import sys
F = sys.argv[1]
s = open(F).read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:100])
    s = s.replace(old, new)
rep("""uniform vec4 uP4G;  // Q4 / Q10: x orb-through gain at full hold (MAIN 1), y facet glint gain at full hold (MAIN 0), z / w spare
""", """uniform vec4 uP4G;  // Q4 / Q10: x orb-through gain at full hold (MAIN 1), y facet glint gain at full hold (MAIN 0), z / w spare
uniform vec4 uP4H;  // Q3: x / y the trace's own roughness ramp lo / hi (MAIN = the material roughness, 0.233 / 1), z / w spare
""")
rep("""  float rough = mix(uP4B.x, uP4B.y, frostLin);
#else""", """  float rough = mix(uP4B.x, uP4B.y, frostLin);
  // (The trace's lobe keeps its own, narrower ramp: with the compressed material roughness (floor 0.45) its critical-angle
  // ramp and lobe growth washed out the oblique bands' dark steel-blue TIR zones, q03 outer ring lf 20 -> 10 vs F045 23.5.)
  float roughT = mix(uP4H.x, uP4H.y, frostLin);
#else""")
rep("""  float rb = rough;
""", """#ifdef ICE_P4
  float rb = roughT;
#else
  float rb = rough;
#endif
""")
rep("""    rb = min(sqrt(rb * rb + gG * growB * growB * rough * rough), 1.0);""", """#ifdef ICE_P4
    rb = min(sqrt(rb * rb + gG * growB * growB * roughT * roughT), 1.0);
#else
    rb = min(sqrt(rb * rb + gG * growB * growB * rough * rough), 1.0);
#endif""")
rep("""  // Q4 / Q10: orb-through x1.4 and a facet glint at full hold.
  u.uP4G = { value: new THREE.Vector4(P4_ORB ? 1.4 : 1, P4_HOLD ? 0.5 : 0, 0, 0) };""", """  // Q4 / Q10: orb-through x1.4 and a facet glint at full hold.
  u.uP4G = { value: new THREE.Vector4(P4_ORB ? 1.4 : 1, P4_HOLD ? 0.5 : 0, 0, 0) };
  // Q3: the trace's own roughness ramp.
  u.uP4H = { value: P4_FROST ? new THREE.Vector4(0.233, 0.6, 0, 0) : new THREE.Vector4(0.233, 1, 0, 0) };""")
open(F, "w").write(s)
print("ok")
