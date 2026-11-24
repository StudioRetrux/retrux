import sys
F = sys.argv[1]
s = open(F).read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:100])
    s = s.replace(old, new)
rep("""      vec3 orbL = mix(sharpL, meanL, max(uR11F.x, smoothstep(0.25, 1.2, sig / beta)));
#ifdef ICE_P4
""", """#ifdef ICE_P4
      // (Q4: a direct path keeps more of the orb's sharp sample - its plasma structure - than the 0.3 share of the mean.)
      float dK = gP4Direct * (1.0 - smoothstep(0.45, 0.75, dmin / uOrbRadius));
      vec3 orbL = mix(sharpL, meanL, max(mix(uR11F.x, uP4G.z, dK), smoothstep(0.25, 1.2, sig / beta)));
#else
      vec3 orbL = mix(sharpL, meanL, max(uR11F.x, smoothstep(0.25, 1.2, sig / beta)));
#endif
#ifdef ICE_P4
""")
rep("""      float dK = gP4Direct * (1.0 - smoothstep(0.45, 0.75, dmin / uOrbRadius));
      vec3 thrO = uR11Tint * 0.92;""", """      vec3 thrO = uR11Tint * 0.92;""")
rep("""uniform vec4 uP4G;  // Q4 / Q10: x orb-through gain at full hold (MAIN 1), y facet glint gain at full hold (MAIN 0), z / w spare""",
    """uniform vec4 uP4G;  // Q4 / Q10: x orb-through gain at full hold (MAIN 1), y facet glint gain at full hold (MAIN 0), z the mean's share
                    // of the orb seen along a direct path (MAIN uR11F.x 0.3), w spare""")
rep("""  u.uP4G = { value: new THREE.Vector4(P4_ORB ? 1.4 : 1, P4_HOLD ? 0.5 : 0, 0, 0) };""",
    """  u.uP4G = { value: new THREE.Vector4(P4_ORB ? 1.4 : 1, P4_HOLD ? 0.5 : 0, P4_ORB ? 0.15 : u.uR11F.value.x, 0) };""")
open(F, "w").write(s)
print("ok")
