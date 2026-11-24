import sys
F = sys.argv[1]
s = open(F).read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:100])
    s = s.replace(old, new)
rep("""  // Q4 (ice part): direct orb paths clamp 2.2x higher with a 0.008 lobe floor, variation on, periwinkle hue.
  u.uP4C = { value: P4_ORB ? new THREE.Vector4(2.2, 0.008, 1, 1) : new THREE.Vector4(1, 0.012, 0, 0) };""",
"""  // Q4 (ice part): direct orb paths clamp 1.6x higher with a 0.008 lobe floor, variation on, periwinkle hue (x2 the plan's
  // (1, 0.95, 1.06): q03 ring D B-G +8 at x1). (2.2 put q03 ring D 14 L and the q00 band over the orb 7 L above the reference,
  // batch b2; 1.6: q00 229.3 vs F000 231.8, q03 ring D sd 14.3 vs MAIN 8.7 / F045 17.3, batch b3.)
  u.uP4C = { value: P4_ORB ? new THREE.Vector4(1.6, 0.008, 1, 2) : new THREE.Vector4(1, 0.012, 0, 0) };""")
rep("""  // Q10: at full hold face-on lobe growth 1.2, one-bounce TIR smoothing x0.7, transmitted gain 1.02, chroma 0.85.
  u.uP4E = { value: P4_HOLD ? new THREE.Vector4(1.2, 0.7, 1.02, 0.85) :""",
"""  // Q10: at full hold face-on lobe growth 1.2, one-bounce TIR smoothing x0.7, transmitted gain 0.98, chroma 0.92 (the plan's
  // 1.02 / 0.85 overshot with the brighter orb paths: p06 band L 212.8 / sat 0.138 vs F420 206.9 / 0.162, batch b2).
  u.uP4E = { value: P4_HOLD ? new THREE.Vector4(1.2, 0.7, 0.98, 0.92) :""")
rep("""  u.uP4F = { value: P4_HOLD ? new THREE.Vector4(1, 1, 1, 1) : new THREE.Vector4(0, 0, 0, 0) };""",
    """  u.uP4F = { value: P4_HOLD ? new THREE.Vector4(1, 1.3, 1, 1) : new THREE.Vector4(0, 0, 0, 0) };""")
rep("""  // Q3: the trace's own roughness ramp.
  u.uP4H = { value: P4_FROST ? new THREE.Vector4(0.233, 0.6, 0, 0) : new THREE.Vector4(0.233, 1, 0, 0) };""",
"""  // Q3: the trace's own roughness ramp: MAIN's 0.233 .. 1 (0.6 / 0.85 washed out the oblique bands' TIR zones or raised the
  // tumble crawl, batches b2 / b3: q03 outer ring L 186 / sd 30 / lf 21 at 1 vs F045 174 / 31 / 23.5; crawl 1.47 / 1.32 / 1.53
  // vs MAIN-equivalent 1.55 / 1.48 / 1.48). Only the frost terms take the compressed ramp above.
  u.uP4H = { value: new THREE.Vector4(0.233, 1, 0, 0) };""")
open(F, "w").write(s)
print("ok")
