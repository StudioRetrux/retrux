# fixer patch7: the seam line is a surface feature (not gated by the internal ray's TIR factor); own accumulator.
import sys
F = "/Users/muhamadrifaldi/RetruxR11Work/lanes/p4ice/retrux-web/app/hero/engine/hero/IceMaterial.ts"
s = open(F).read()


def rep(old, new, n=1):
    global s
    c = s.count(old)
    if c != n:
        sys.exit(f"count {c} != {n} for: {old[:80]!r}")
    s = s.replace(old, new)


rep("""    float jLine = 0.0;
#endif""", """    float jLine = 0.0, jSeam = 0.0;
#endif""")
rep("""        jLine = max(jLine, (1.0 - smoothstep(0.0, uP4D.y * fX, abs(sx))) * smoothstep(fS, 3.0 * fS, abs(se)));
        crossK = max(uP4J.y * inside, uP4J.z * seam);""",
"""        jLine = max(jLine, (1.0 - smoothstep(0.0, uP4D.y * fX, abs(sx))) * smoothstep(fS, 3.0 * fS, abs(se)));
        jSeam = max(jSeam, seam);
        crossK = uP4J.y * inside;""")
rep("""    col *= (1.0 - uR11B.z * jk) * (1.0 + uP4J.w * jLine);""",
"""    col *= (1.0 - uR11B.z * jk) * (1.0 - uP4J.z * jSeam) * (1.0 + uP4J.w * jLine);""")
rep("""  u.uP4J = { value: P4_CAP ? new THREE.Vector4(1, 0.17, 0.25, 0.15)""",
"""  u.uP4J = { value: P4_CAP ? new THREE.Vector4(1, 0.17, 0.15, 0.15)""")
open(F, "w").write(s)
print("ok")
