import sys
F = sys.argv[1]
s = open(F).read()
def rep(old, new, cnt=1):
    global s
    n = s.count(old)
    assert n == cnt, (n, old[:120])
    s = s.replace(old, new)

# ---- TS switches
rep('''function p4On(quality: { marchSteps: number }) {''', '''/**
 * P4 round 3 (lane p4ice3, on top of round 1): `?p4ice3=0` restores MAIN (round 1, int1) exactly: no ICE_P4R3 define, its
 * `#ifdef ICE_P4R3` blocks stripped from both stages (their `#else` parts kept), no new uniforms. Needs the round-1 lane
 * (`?p4ice=0` turns both off). Sub-switches, uniform-level: `?icegeo=0` (F5: the GLB's L2 section, not the artist's L1
 * octagon), `?iceedge=0` (F5: MAIN's entry corner rounding in the dolly), `?icejoint=r1` (R1: round 1's V seams).
 */
const P4R3 = P4ICE && !!P4Q && P4Q.get("p4ice3") !== "0";
const P4R3_GEO = !!P4Q && P4Q.get("icegeo") !== "0";
const P4R3_EDGE = !!P4Q && P4Q.get("iceedge") !== "0";
const P4R3_JOINT = !!P4Q && P4Q.get("icejoint") !== "r1";
/** The source without the `#ifdef <name>` blocks (their `#else` parts kept); no nested conditionals inside those blocks. */
function stripDef(src: string, name: string) {
  const out: string[] = [];
  let mode = 0;
  for (const line of src.split("\\n")) {
    const t = line.trim();
    if (mode === 0 && t === "#ifdef " + name) mode = 1;
    else if (mode === 1 && t === "#else") mode = 2;
    else if (mode !== 0 && t === "#endif") mode = 0;
    else if (mode !== 1) out.push(line);
  }
  return out.join("\\n");
}
function p4On(quality: { marchSteps: number }) {''')

# ---- vertex shader: L2 -> L1 octagon remap (round-11 main, before the displacement)
rep('''void main() {
  vec3 pr = position + uNoiseOffset;
  vec3 n = normalize(normal);
  vec3 pos = position;
  vSec = vec2(0.0);
  if (uDisplace > 0.0) {
    // Along the cross-section's outward direction (position only: split vertices stay welded).''', '''#ifdef ICE_P4R3
// Round 3 (F5): the octagon the fragment shader traces (R11_OCT), outward normal and offset in units of the radial half-width.
uniform vec4 uP4L;
const vec3 R3_OCT[8] = vec3[8](
  vec3(0.98404, 0.17791, 0.98404), vec3(0.61500, 0.78855, 1.63782),
  vec3(-0.61500, 0.78855, 1.63782), vec3(-0.98404, 0.17791, 0.98404),
  vec3(-0.98404, -0.17791, 0.98404), vec3(-0.61500, -0.78855, 1.63782),
  vec3(0.61500, -0.78855, 1.63782), vec3(0.98404, -0.17791, 0.98404));
#endif
void main() {
  vec3 pr = position + uNoiseOffset;
  vec3 n = normalize(normal);
  vec3 pos = position;
  vSec = vec2(0.0);
#ifdef ICE_P4R3
  // (Round 3, F5 / the panel's composition issue 1: the artist renders the rings at SubD level 1 - an 8-point octagon section
  // with hard corners (Smooth by Angle 30) and flat octagonal caps - while hero.glb carries level 2, a rounder 16-point section
  // whose surface bulges up to 0.13 w outside that octagon between its corners, and 16-gon caps: the soft 'log' silhouettes and
  // domed ends in the dolly. Every point outside the octagon moves radially in the section onto it (uP4L.x share); points inside
  // it - the caps' interiors - stay. Position only, so split vertices stay welded; the fragment shader already traces this
  // octagon, so the outline and the shading now agree.)
  if (uP4L.x > 0.0 && uSectionHalf.y > 0.0) {
    float rl0 = length(pr.xy);
    if (rl0 > 1e-4) {
      float w0 = uSectionHalf.y / 2.077;
      vec2 q = vec2(rl0 - uSectionRadius, pr.z) / w0;
      float k = 1e9;
      for (int i = 0; i < 8; i++) {
        float dn = dot(R3_OCT[i].xy, q);
        if (dn > 1e-6) k = min(k, R3_OCT[i].z / dn);
      }
      if (k < 1.0) {
        vec2 q2 = q * mix(1.0, k, uP4L.x);
        vec3 prN = vec3(pr.xy / rl0 * (uSectionRadius + q2.x * w0), q2.y * w0);
        pos += prN - pr;
        pr = prN;
      }
    }
  }
#endif
  if (uDisplace > 0.0) {
    // Along the cross-section's outward direction (position only: split vertices stay welded).''')

# ---- fragment uniforms
rep('''uniform float uHold;
float gP4Direct = 0.0;''', '''#ifdef ICE_P4R3
uniform vec4 uP4K;  // R1 (round 3), joints face-on to their cut plane: x / y ramp on |V . n_cut| (lo / hi), z the V's flat core (full
                    // depth from this V value on: a trapezoid; 0 = the tent), w the floor of the TIR mix there (round 1: 0.12)
uniform vec4 uP4L;  // F5 (round 3): x share of the L1 octagon section (vertex, 0 = the GLB's L2 section), y the entry corners' rounding
                    // capped at this many pixel footprints (0 = MAIN's uR11F.z everywhere), z / w spare
#endif
uniform float uHold;
float gP4Direct = 0.0;''')

# ---- entry corner rounding
rep('''  vec2 n2 = r11OctNormalW(face, qe, uR11F.z + uR11K.y * pixE / w);''', '''#ifdef ICE_P4R3
  // (Round 3, F5: Cycles' L1 octagon has hard corners (Smooth by Angle 30); uR11F.z rounds them over 0.15 w against exit-wall
  // flips inside a pixel at rest, which is 10-20 px of soft shoulder once the camera dollies in: the slab edges read as a tube.
  // The rounding is capped at uP4L.y pixel footprints: unchanged at rest (4 px > 0.15 w there), crisp edges in the dolly.)
  float cornerW = uP4L.y > 0.0 ? min(uR11F.z, uP4L.y * pixE / w) : uR11F.z;
  vec2 n2 = r11OctNormalW(face, qe, cornerW + uR11K.y * pixE / w);
#else
  vec2 n2 = r11OctNormalW(face, qe, uR11F.z + uR11K.y * pixE / w);
#endif''')

# ---- joints
rep('''        float tC = abs(se) / max(abs(se) + abs(sx), 1e-6);
        float vK = se * sx < 0.0 ? 1.0 - abs(2.0 * tC - 1.0) : 0.0;
        jLine = max(jLine, (1.0 - smoothstep(0.0, uP4D.y * fX, abs(sx))) * smoothstep(fS, 3.0 * fS, abs(se)));
        crossK = uP4J.y * vK;''', '''        float tC = abs(se) / max(abs(se) + abs(sx), 1e-6);
        float vK = se * sx < 0.0 ? 1.0 - abs(2.0 * tC - 1.0) : 0.0;
        jLine = max(jLine, (1.0 - smoothstep(0.0, uP4D.y * fX, abs(sx))) * smoothstep(fS, 3.0 * fS, abs(se)));
#ifdef ICE_P4R3
        // (R1, round 3: face-on to the cut plane - q00's band ends, q03's straps - the band of crossing rays is wide and the tent
        // peaks on one pixel, so the seam vanished where F000 / F045 show crisp dark slits; there the V gets a flat core (a
        // trapezoid, full depth from vK = uP4K.z) and the steep crossing's floor rises to uP4K.w. Oblique views keep the tent.)
        float fo = smoothstep(uP4K.x, uP4K.y, abs(dot(V, nc)));
        crossK = uP4J.y * mix(vK, smoothstep(0.0, max(uP4K.z, 1e-3), vK), fo);
        jFloor = mix(0.12, uP4K.w, fo);
#else
        crossK = uP4J.y * vK;
#endif''')
rep('''      float tirK = 1.0 - smoothstep(0.62, 0.8, abs(dot(d1, nc)));  // cos 41.8 deg = 0.745
      jk = max(jk, crossK * mix(0.12, 1.0, tirK));''', '''      float tirK = 1.0 - smoothstep(0.62, 0.8, abs(dot(d1, nc)));  // cos 41.8 deg = 0.745
#ifdef ICE_P4R3
      jk = max(jk, crossK * mix(jFloor, 1.0, tirK));
#else
      jk = max(jk, crossK * mix(0.12, 1.0, tirK));
#endif''')
rep('''      float se = dot(e0, nc) + wob, sx = dot(e1, nc) + wob;
#ifdef ICE_P4
      float crossK;''', '''      float se = dot(e0, nc) + wob, sx = dot(e1, nc) + wob;
#ifdef ICE_P4R3
      float jFloor = 0.12;
#endif
#ifdef ICE_P4
      float crossK;''')

# ---- createIceMaterial: define, stripping, uniforms
rep('''  const p4 = p4On(quality);
  if (p4) defines.ICE_P4 = "";
  const mat = new THREE.ShaderMaterial({
    name: "rx-ice",
    vertexShader: ICE_VERT,
    fragmentShader: p4 ? ICE_FRAG : stripP4(ICE_FRAG),''', '''  const p4 = p4On(quality);
  if (p4) defines.ICE_P4 = "";
  const r3 = p4 && P4R3;
  if (r3) defines.ICE_P4R3 = "";
  const frag = r3 ? ICE_FRAG : stripDef(ICE_FRAG, "ICE_P4R3");
  const mat = new THREE.ShaderMaterial({
    name: "rx-ice",
    vertexShader: r3 ? ICE_VERT : stripDef(ICE_VERT, "ICE_P4R3"),
    fragmentShader: p4 ? frag : stripP4(frag),''')
rep('''  if (p4) p4Uniforms(mat);
  return mat;
}''', '''  if (p4) p4Uniforms(mat);
  if (r3) p4r3Uniforms(mat);
  return mat;
}

/** P4 round 3 (lane p4ice3) uniforms; each sub-switch restores round 1's values (MAIN = int1). */
function p4r3Uniforms(mat: THREE.ShaderMaterial) {
  const u = mat.uniforms;
  // R1: face-on joints (|V . n_cut| 0.55 -> 0.85) get a trapezoid core from vK 0.5 and a TIR-mix floor of 0.6 (round 1: tent, 0.12).
  u.uP4K = { value: P4R3_JOINT ? new THREE.Vector4(0.55, 0.85, 0.5, 0.6) : new THREE.Vector4(2, 3, 0, 0.12) };
  // F5: the artist's L1 octagon section (vertex remap, share 1); entry corners rounded over at most 4 pixel footprints.
  u.uP4L = { value: new THREE.Vector4(P4R3_GEO ? 1 : 0, P4R3_EDGE ? 4 : 0, 0, 0) };
}''')
open(F, 'w').write(s)
print('patched', len(s))
