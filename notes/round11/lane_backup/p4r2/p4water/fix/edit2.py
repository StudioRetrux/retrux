import sys
F = sys.argv[1]
s = open(F).read()
def rep(find, repl, count=1):
    global s
    n = s.count(find)
    if n != count:
        raise SystemExit(f"anchor x{n} (want {count}): {find[:80]!r}")
    s = s.replace(find, repl)
rep('''          mirrorUniforms.uLkP4G = { value: new THREE.Vector4(0.16, 0.078, 0.6, 1.0) };''',
'''          // the glint: GGX alpha across / along the view, cyan-white share, gain. Fix (judge W1): the builder's anisotropic lobe
          // (0.16 x 0.078) spread MAIN's glint (alpha 0.0784 = ggxSpec's 0.28^2) sideways and its tint lost 8 % luma: the near
          // glint was dimmer than MAIN (centre column x680-760 y640-700, frozen same-time A/B: MAIN 192.0, builder 188.4, F000 200.3).
          // Now MAIN's isotropic lobe, a cyan-white of MAIN's luma, x1.3: 196.5 (glint box x515-865 y665-710 190.7, F000 190.5).
          mirrorUniforms.uLkP4G = { value: new THREE.Vector4(0.0784, 0.0784, 0.6, 1.3) };''')
rep('''          mirrorUniforms.uLkP4GJ = { value: new THREE.Vector4(0.01, 0.04, 1, 0) };''',
'''          // (lab `?lkglassj=0`: off, the builder's Q9)
          mirrorUniforms.uLkP4GJ = { value: new THREE.Vector4(0.01, 0.04, lq?.get("lkglassj") === "0" ? 0 : 1, 0) };''')
rep('''    q9: on && lq?.get("lkglass") !== "0",''',
'''    // Q9 is OFF by default since the fix round (`?lkglass=1` turns it on, with the W2 gate; `&lkglassj=0` without it): its glassier
    // far water unmasked the orbit ghost (judge W2, ptr_left / ptr_right) that MAIN's corduroy hides, and gated off where the
    // quarter-size walk's taps disagree (the judge's fallback) it keeps ~10 % of its gain: the taps disagree over most of the far
    // water (q00 right floes lap MAIN 9.05, Q9 5.84, gated 8.23 / 8.99 with the 0.01-0.04 / 0.004-0.016 band). WORK/LOG.md fix round.
    q9: on && lq?.get("lkglass") === "1",''')
rep(''' * - Q9 (`?lkglass=0` off): the bump's alias guard beyond ~30-40 m:''',
''' * - Q9 (OFF by default since the fix round; `?lkglass=1` on): the bump's alias guard beyond ~30-40 m:''')
rep(''' * - Q8 (`?lkring=r11` off): the rest ring as physical waves: a phase-steepened (Gerstner-like) profile, narrow deep troughs and
 *   broad crests, amplitude x(1 +- 0.3) around the ring from 3- and 5-lobe terms, the crest clamp raised; the orb's glint on the
 *   ring zone anisotropic (wider across the view) and cyan-white.''',
''' * - Q8 (`?lkring=r11` off): the rest ring as physical waves: a phase-steepened (Gerstner-like) profile, narrow deep troughs and
 *   broad crests, amplitude x(1 +- 0.3) around the ring from 3- and 5-lobe terms, the crest clamp raised; the orb's glint on the
 *   ring zone cyan-white (MAIN's luma) and x1.3 (its GGX lobe can be anisotropic: uLkP4G.xy; default MAIN's isotropic alpha).''')
open(F, "w").write(s)
print("ok")
