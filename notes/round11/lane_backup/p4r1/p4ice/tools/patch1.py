import sys

F = sys.argv[1]
s = open(F).read()


def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:120])
    s = s.replace(old, new)


# ---------------------------------------------------------------- declarations + helpers (fragment, after vRingA)
rep(
    """varying vec3 vRingC;
varying vec3 vRingA;

// Octagon edges""",
    """varying vec3 vRingC;
varying vec3 vRingA;
#ifdef ICE_P4
// P4 ice lane (P3 panel tasks G5 / Q3 / Q4 / Q6 / Q10). ?p4ice=0 compiles none of this: MAIN's program exactly.
uniform vec4 uP4A;  // G5: x Bump.001 ramp-end filter per pixel footprint (MAIN 1.5), y its floor in Noise A units (MAIN 0.004),
                    // z octave fade start in cycles per pixel, gone at 2 z (MAIN 0.3), w the trace's finest octave in px (MAIN 2)
uniform vec4 uP4B;  // Q3: x / y roughness ramp lo / hi (MAIN 0.233 / 1), z Noise A stretched along the ring this many times
                    // (0 = MAIN's isotropic noise), w 1 = the noise values band-limited like their gradients (G5; MAIN 0)
uniform vec4 uP4C;  // Q4: x indirect clamp scale on direct orb paths (MAIN 1), y their lobe floor (MAIN 0.012), z orb-through
                    // variation (MAIN 0), w periwinkle hue of the orb's light inside the ice (MAIN 0)
uniform vec4 uP4D;  // Q6: x 1 = cut caps traced from their own plane (MAIN 0), y joint seam width (m, MAIN 0.012), z cap edge
                    // chamfer width (section units, 0 off), w cap glint gain
uniform vec4 uP4E;  // Q10, reached at full hold (uHold 1): x face-on lobe growth (MAIN uR11K.w), y TIR smoothing scale of the
                    // one-bounce paths (MAIN 1), z transmitted gain (MAIN uR11D.y), w chroma gain (MAIN uR11B.w)
uniform vec4 uP4F;  // Q10: x orb share of the grazing reflection tinted by IceColor (MAIN 0), y steel-blue inner rim line,
                    // z crack sheets, w ice-only blue cast (all MAIN 0)
uniform vec4 uP4G;  // Q4 / Q10: x orb-through gain at full hold (MAIN 1), y facet glint gain at full hold (MAIN 0), z / w spare
uniform float uHold;
float gP4Direct = 0.0;  // 1 while the trace looks up a first exit after <= 1 internal wall (Q4)
float gP4OrbMod = 1.0;  // orb-through modulation after the clamp (Q4: variation, hold charge)

// Value noise (chunks noised) on a lattice periodic in x with an integer period: Noise A along the ring has no seam at +-pi.
vec4 p4NoisedP(vec3 x, float per) {
  vec3 i = floor(x);
  vec3 w = fract(x);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * w * w * (w * (w - 2.0) + 1.0);
  float i0 = mod(i.x, per), i1 = mod(i.x + 1.0, per);
  float a = hash13(vec3(i0, i.y, i.z));
  float b = hash13(vec3(i1, i.y, i.z));
  float c = hash13(vec3(i0, i.y + 1.0, i.z));
  float d = hash13(vec3(i1, i.y + 1.0, i.z));
  float e = hash13(vec3(i0, i.y, i.z + 1.0));
  float f = hash13(vec3(i1, i.y, i.z + 1.0));
  float g = hash13(vec3(i0, i.y + 1.0, i.z + 1.0));
  float h = hash13(vec3(i1, i.y + 1.0, i.z + 1.0));
  float k0 = a, k1 = b - a, k2 = c - a, k3 = e - a;
  float k4 = a - b - c + d, k5 = a - c - e + g, k6 = a - b - e + f;
  float k7 = -a + b + c - d + e - f - g + h;
  float v = k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z;
  vec3 g3 = du * vec3(
    k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z,
    k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x,
    k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y);
  return vec4(v * 2.0 - 1.0, 2.0 * g3);
}
#endif

// Octagon edges""",
)

# ---------------------------------------------------------------- band-limited fbm (G5) + ring-frame Noise A (Q3)
rep(
    """// Share of a Gaussian lobe of width sig (rad) around D, from X, that a sphere (centre C, the orb's radius) covers.""",
    """#ifdef ICE_P4
// G5: r11FbmGrad with the octave fade starting at fLo cycles per pixel (gone at 2 fLo; MAIN 0.3), and with vBand 1 the value
// band-limited too (MAIN sums every octave's value at full weight: Noise A's finest octaves switched roughness / the bump
// window at 2-3 px and boiled while the rings turned). fLo 0.3, vBand 0 = r11FbmGrad.
vec3 p4FbmGrad(vec3 x, float freq, float gain, int octaves, float pix, float lowPix, float fLo, float vBand, out float val, out vec3 gLow) {
  vec3 g = vec3(0.0);
  gLow = vec3(0.0);
  float a = 1.0, f = freq, s = 0.0;
  val = 0.0;
  mat3 m = mat3(1.0);
  vec3 y = x * freq;
  for (int i = 0; i < 7; i++) {
    if (i >= octaves) break;
    vec4 n = noised(y);
    float fade = 1.0 - smoothstep(fLo, 2.0 * fLo, f * pix);
    val += a * mix(1.0, fade, vBand) * n.x;
    g += a * fade * f * (m * n.yzw);
    gLow += a * (1.0 - smoothstep(fLo, 2.0 * fLo, f * lowPix)) * f * (m * n.yzw);
    s += a;
    a *= gain;
    f *= 2.02;
    y = RX_OCT * y * 2.02;
    m = RX_OCT_INV * m;
  }
  val = 0.5 + 0.5 * val / s;
  gLow *= 0.5 / s;
  return 0.5 * g / s;
}
// Q3: Noise A in ring coordinates (arc length / S, rho - R, axial), so its clear / frosted patches stretch S times along the
// ring (streaks, not isotropic cloud blobs). The lattice is periodic in theta (an integer cell count per revolution), octaves
// double exactly. Same outputs as p4FbmGrad: value, gradient per metre in the ring frame (gLow: the trace's octaves).
vec3 p4FbmRing(vec3 pr, float freq, float S, int octaves, float pix, float lowPix, float fLo, float vBand, out float val, out vec3 gLow) {
  float rho = max(length(pr.xy), 1e-4);
  float th = atan(pr.y, pr.x);
  float per = max(floor(6.2831853 * uSectionRadius * freq / S + 0.5), 1.0);
  vec3 ex = vec3(-pr.y, pr.x, 0.0) * (per / (6.2831853 * rho * rho));
  vec3 ey = vec3(pr.xy / rho, 0.0) * freq;
  vec3 ez = vec3(0.0, 0.0, freq);
  vec3 y = vec3(th * (per / 6.2831853) + uSeed * 7.0, (rho - uSectionRadius) * freq + 4.0 + uSeed * 13.7, pr.z * freq + 4.0 - uSeed * 5.3);
  vec3 g = vec3(0.0);
  gLow = vec3(0.0);
  float a = 1.0, f = freq, k = 1.0, s = 0.0;
  val = 0.0;
  for (int i = 0; i < 7; i++) {
    if (i >= octaves) break;
    vec4 n = p4NoisedP(y, per * k);
    float fade = 1.0 - smoothstep(fLo, 2.0 * fLo, f * pix);
    vec3 gp = k * (n.y * ex + n.z * ey + n.w * ez);
    val += a * mix(1.0, fade, vBand) * n.x;
    g += a * fade * gp;
    gLow += a * (1.0 - smoothstep(fLo, 2.0 * fLo, f * lowPix)) * gp;
    s += a;
    a *= 0.5;
    f *= 2.0;
    k *= 2.0;
    y = y * 2.0 + vec3(0.37, 1.71, 3.13);
  }
  val = 0.5 + 0.5 * val / s;
  gLow *= 0.5 / s;
  return 0.5 * g / s;
}
#endif

// Share of a Gaussian lobe of width sig (rad) around D, from X, that a sphere (centre C, the orb's radius) covers.""",
)

# ---------------------------------------------------------------- r11Radiance: orb lobe floor + clamp (Q4)
rep(
    """  if (uRingSplit.x < 0.5) {
    float sig = 0.012 + uR11C.z * rough * rough;
    col = r11LakeOrb(X, D, col, sig);""",
    """  if (uRingSplit.x < 0.5) {
#ifdef ICE_P4
    float sig = mix(0.012, uP4C.y, gP4Direct) + uR11C.z * rough * rough;
#else
    float sig = 0.012 + uR11C.z * rough * rough;
#endif
    col = r11LakeOrb(X, D, col, sig);""",
)
rep(
    """      vec3 orbL = mix(sharpL, meanL, max(uR11F.x, smoothstep(0.25, 1.2, sig / beta)));
      col = mix(col, r11ClampOrb(orbL * uR11D.w, uR11Tint * 0.92), cov);""",
    """      vec3 orbL = mix(sharpL, meanL, max(uR11F.x, smoothstep(0.25, 1.2, sig / beta)));
#ifdef ICE_P4
      // (Q4: a direct path - first exit after <= 1 internal wall, through the orb's inner 0.45-0.75 radii - is clamped at
      // uP4C.x x the indirect limit: Cycles clamps each sample, and a straight path's samples stay together, so the band over
      // the orb keeps its lift and its structure. The ramp keeps the switch continuous. Then the orb's light keeps a
      // periwinkle hue inside the ice (luma-neutral) and its variation / hold charge, gP4OrbMod.)
      float dK = gP4Direct * (1.0 - smoothstep(0.45, 0.75, dmin / uOrbRadius));
      vec3 thrO = uR11Tint * 0.92;
      float lim = uR11M.x * mix(1.0, uP4C.x, dK);
      vec3 cO = orbL * uR11D.w;
      float sO = dot(cO * thrO, vec3(1.0));
      if (uR11M.x > 0.0 && sO > lim) cO *= lim / sO;
      cO *= mix(vec3(1.0), vec3(1.0325, 0.9808, 1.0944), uP4C.w) * gP4OrbMod;
      col = mix(col, cO, cov);
#else
      col = mix(col, r11ClampOrb(orbL * uR11D.w, uR11Tint * 0.92), cov);
#endif""",
)

# ---------------------------------------------------------------- r11Reflect: rim (Q10)
rep(
    """    float cov = r11Cover(X, R, uOrbCenter, sig);
    if (cov > 1e-3) col = mix(col, r11ClampOrb(r11OrbMean() * uR11D.w, vec3(1.0)), cov);""",
    """    float cov = r11Cover(X, R, uOrbCenter, sig);
#ifdef ICE_P4
    // (Q10: the orb seen in the grazing reflection tinted by IceColor, luma kept: MAIN's untinted mean drew the uniform mint
    // rim, q03 B-G 5-14 vs F045's neutral 19-24.)
    vec3 tR = mix(vec3(1.0), uR11Tint / dot(uR11Tint, vec3(0.2126, 0.7152, 0.0722)), uP4F.x);
    if (cov > 1e-3) col = mix(col, r11ClampOrb(r11OrbMean() * uR11D.w, vec3(1.0)) * tR, cov);
#else
    if (cov > 1e-3) col = mix(col, r11ClampOrb(r11OrbMean() * uR11D.w, vec3(1.0)), cov);
#endif""",
)

# ---------------------------------------------------------------- main: cap detection (Q6)
rep(
    """  vec2 vel = vec2(dot(-V, er) / w, dot(-V, ea) / (w * ky));  // section velocity of the view ray, per metre
  int face = 0;""",
    """  vec2 vel = vec2(dot(-V, er) / w, dot(-V, ea) / (w * ky));  // section velocity of the view ray, per metre
#ifdef ICE_P4
  // Q6: a fragment on a cut cap of a piece that has left its rest place. The cap is the piece's planar cut face; MAIN shaded it
  // as the revolved octagon's wall the view would have entered by (the entry moved back onto the infinite tube, outside the
  // piece), i.e. as a continuation of the curved tube: the domed 'bone' ends. capK 1 = enter through the cap's own plane.
  float capK = 0.0;
  vec3 capN = Ng;
  if (uP4D.x > 0.5 && uPieceCuts.z > 0.5 && uPieceCuts.w < 0.999) {
    vec3 tW = normalize(cross(ea, er));
    float dCut = 1e9;
    for (int c = 0; c < 2; c++) {
      float ang = c == 0 ? uPieceCuts.x : uPieceCuts.y;
      vec3 nc = normalize(toW * vec3(-sin(ang), cos(ang), 0.0));
      vec3 rc = toW * vec3(cos(ang), sin(ang), 0.0);
      if (dot(rel, rc) <= 0.0) continue;
      float dc0 = abs(dot(rel, nc));
      if (dc0 < dCut) { dCut = dc0; capN = dot(nc, V) >= 0.0 ? nc : -nc; }
    }
    capK = smoothstep(0.75, 0.92, abs(dot(Ng, tW))) * (1.0 - smoothstep(0.03, 0.06, dCut));
  }
#endif
  int face = 0;""",
)
rep(
    """  vec3 Nmac = normalize(n2.x * er + (n2.y / ky) * ea);
  // Keep the entry face towards the camera (the fallback face of a ray that misses the octagon may not be).
  Nmac = normalize(mix(Ng, Nmac, smoothstep(0.02, 0.15, dot(Nmac, V))));""",
    """  vec3 Nmac = normalize(n2.x * er + (n2.y / ky) * ea);
  // Keep the entry face towards the camera (the fallback face of a ray that misses the octagon may not be).
  Nmac = normalize(mix(Ng, Nmac, smoothstep(0.02, 0.15, dot(Nmac, V))));
#ifdef ICE_P4
  float capEdge = 0.0;
  if (capK > 0.0) {
    // The cap's own plane, entered at the fragment (the trace below follows the ray inside the revolved octagon from there).
    vec3 Nc = capN;
    if (uP4D.z > 0.0) {
      // A narrow chamfer along the cap's octagon outline: the normal turns towards the nearest wall (a crisp bright edge).
      float dW = 1e9;
      int iW = 0;
      for (int i = 0; i < 8; i++) {
        float o = R11_OCT[i].z - dot(R11_OCT[i].xy, qf);
        if (o < dW) { dW = o; iW = i; }
      }
      vec3 nWc = normalize(R11_OCT[iW].x * er + R11_OCT[iW].y * ea);
      capEdge = 1.0 - smoothstep(0.0, uP4D.z, dW);
      Nc = normalize(mix(Nc, nWc, 0.5 * capEdge));
      if (dot(Nc, V) < 0.05) Nc = capN;
    }
    Nmac = normalize(mix(Nmac, Nc, capK));
    sEnt *= 1.0 - capK;
    qe = mix(qe, qf, capK);
  }
#endif""",
)

# ---------------------------------------------------------------- main: frost noise (G5 + Q3)
rep(
    """  float lowPixT = uR11K.z > 0.0 ? max(uR11K.z, 2.0 * pix) : 0.12;
  vec3 gA = r11FbmGrad(p + 4.0 / (4.2 / 1.975), 4.2 / 1.975, 0.5, FROST_OCTAVES, pix, lowPixT, nA, gALow);
  float frostLin = clamp((nA - 0.5423) / (0.7657 - 0.5423) + (uFrost - 0.6) * 0.8, 0.0, 1.0);
  float rough = 0.233 + 0.767 * frostLin;""",
    """#ifdef ICE_P4
  // (G5: the trace's finest octave at uP4A.w pixel footprints, octaves faded from uP4A.z cycles per pixel, values band-limited
  // with uP4B.w. Q3: Noise A stretched along the ring, uP4B.z; the roughness ramp compressed to uP4B.x .. y.)
  float lowPixT = uR11K.z > 0.0 ? max(uR11K.z, uP4A.w * pix) : 0.12;
  vec3 gA = uP4B.z > 0.0
    ? p4FbmRing(vObjPos, 4.2 / 1.975, uP4B.z, FROST_OCTAVES, pix, lowPixT, uP4A.z, uP4B.w, nA, gALow)
    : p4FbmGrad(p + 4.0 / (4.2 / 1.975), 4.2 / 1.975, 0.5, FROST_OCTAVES, pix, lowPixT, uP4A.z, uP4B.w, nA, gALow);
  float frostLin = clamp((nA - 0.5423) / (0.7657 - 0.5423) + (uFrost - 0.6) * 0.8, 0.0, 1.0);
  float rough = mix(uP4B.x, uP4B.y, frostLin);
#else
  float lowPixT = uR11K.z > 0.0 ? max(uR11K.z, 2.0 * pix) : 0.12;
  vec3 gA = r11FbmGrad(p + 4.0 / (4.2 / 1.975), 4.2 / 1.975, 0.5, FROST_OCTAVES, pix, lowPixT, nA, gALow);
  float frostLin = clamp((nA - 0.5423) / (0.7657 - 0.5423) + (uFrost - 0.6) * 0.8, 0.0, 1.0);
  float rough = 0.233 + 0.767 * frostLin;
#endif""",
)
# facets off on the cap (planar)
rep(
    """  vec3 N = normalize(Nmac + (tiltW - Nmac * dot(tiltW, Nmac)) * uR11A.y);""",
    """#ifdef ICE_P4
  vec3 N = normalize(Nmac + (tiltW - Nmac * dot(tiltW, Nmac)) * (uR11A.y * (1.0 - capK)));
#else
  vec3 N = normalize(Nmac + (tiltW - Nmac * dot(tiltW, Nmac)) * uR11A.y);
#endif""",
)
rep(
    """  float fwA = fwidth(nA) * 1.5 + 0.004;""",
    """#ifdef ICE_P4
  float fwA = fwidth(nA) * uP4A.x + uP4A.y;
#else
  float fwA = fwidth(nA) * 1.5 + 0.004;
#endif""",
)
rep(
    """  vec3 gB = toW * r11FbmGrad(p * 1.0 + 11.0, 4.0 / 1.975, 0.8, FINE_OCTAVES + 2, pix, 0.12, nB, gBLow);""",
    """#ifdef ICE_P4
  vec3 gB = toW * p4FbmGrad(p * 1.0 + 11.0, 4.0 / 1.975, 0.8, FINE_OCTAVES + 2, pix, 0.12, uP4A.z, uP4B.w, nB, gBLow);
#else
  vec3 gB = toW * r11FbmGrad(p * 1.0 + 11.0, 4.0 / 1.975, 0.8, FINE_OCTAVES + 2, pix, 0.12, nB, gBLow);
#endif""",
)

# ---------------------------------------------------------------- main: hold lobe growth (Q10) + orb modulation (Q4)
rep(
    """  float growB = uR11K.w == 1.0 ? uR11B.x : uR11B.x * mix(1.0, uR11K.w, smoothstep(0.5, 0.85, abs(dot(V, ea))));""",
    """#ifdef ICE_P4
  // (Q10: the face-on lobe growth eases to uP4E.x in the hold, so the far-wall TIR line and the refracted orb strip stay crisp.)
  float kWh = mix(uR11K.w, uP4E.x, uHold);
  float growB = kWh == 1.0 ? uR11B.x : uR11B.x * mix(1.0, kWh, smoothstep(0.5, 0.85, abs(dot(V, ea))));
  // (Q4: the orb-through term keeps a variation - less behind frosted patches, the fine bump's value - and charges in the hold.)
  gP4OrbMod = mix(1.0, uP4G.x, uHold) * mix(1.0, 1.0 - 0.35 * smoothstep(0.35, 1.0, rough) * uR11D.z + 0.25 * (nB - 0.5), uP4C.z);
#else
  float growB = uR11K.w == 1.0 ? uR11B.x : uR11B.x * mix(1.0, uR11K.w, smoothstep(0.5, 0.85, abs(dot(V, ea))));
#endif""",
)
rep(
    """      float dc = (uR11J.y > 0.0 ? uR11J.y * rb * rb * 0.667 : -uR11J.y * rough * rough * 0.667) + uR11N.x * pxSpread;""",
    """      float dc = (uR11J.y > 0.0 ? uR11J.y * rb * rb * 0.667 : -uR11J.y * rough * rough * 0.667) + uR11N.x * pxSpread;
#ifdef ICE_P4
      if (b == 1) dc *= mix(1.0, uP4E.y, uHold);
#endif""",
)
rep(
    """      float rx = min(rb + uR11E.z * gz * gz * gz, 1.0);
      lastL = r11Radiance(P, normalize(normalize(dt) - bumpOff), rx, clamp(log2(1.0 + uR11A.w * rx * rx), 0.0, uR11E.y), hit);""",
    """      float rx = min(rb + uR11E.z * gz * gz * gz, 1.0);
#ifdef ICE_P4
      gP4Direct = b <= 1 ? 1.0 : 0.0;
#endif
      lastL = r11Radiance(P, normalize(normalize(dt) - bumpOff), rx, clamp(log2(1.0 + uR11A.w * rx * rx), 0.0, uR11E.y), hit);
#ifdef ICE_P4
      gP4Direct = 0.0;
#endif""",
)

# ---------------------------------------------------------------- transmitted gain in the hold (Q10)
rep(
    """  vec3 trans = Lt * (wT * uR11D.y) * uR11Tint;""",
    """#ifdef ICE_P4
  vec3 trans = Lt * (wT * mix(uR11D.y, uP4E.z, uHold)) * uR11Tint;
#else
  vec3 trans = Lt * (wT * uR11D.y) * uR11Tint;
#endif""",
)

# ---------------------------------------------------------------- glints, rim line, cracks (Q6 / Q10)
rep(
    """  vec3 col = trans * (1.0 - Fe) + refl * Fe + spec * Fe;
""",
    """  vec3 col = trans * (1.0 - Fe) + refl * Fe + spec * Fe;
#ifdef ICE_P4
  {
    // (Q6 / Q10: a tight sun glint, GGX alpha 0.04, on the flat cut caps and, in the hold, on the facets; widened by the
    // normal's own spread over the pixel, so it cannot sparkle.)
    float gk = uP4D.w * capK + uP4G.y * uHold;
    if (gk > 0.0) {
      float rG = sqrt(0.04 + 0.35 * nVar);
      col += min(uSunColor * ggxSpec(N, V, L, rG), vec3(3.0)) * Fe * sil * gk;
    }
  }
  if (uP4F.y > 0.0) {
    // (Q10: F045's steel-blue line 3-5 px inside the silhouette, where the side face turns away: L 173-179, B-G 34-37.)
    float ndvG = dot(Ng, V);
    float lk = smoothstep(0.08, 0.16, ndvG) * (1.0 - smoothstep(0.22, 0.34, ndvG)) * (1.0 - capK);
    col *= mix(vec3(1.0), vec3(0.74, 0.83, 1.0), lk * uP4F.y);
  }
  if (uP4F.z > 0.0 && uReflectionPass < 0.5) {
    // (Q10: sparse crack sheets, two per ring, at hash-chosen places on the centre line, each a finite disc through the section
    // at a hash-chosen tilt. Where the first internal segment crosses one, the side the view enters from darkens and the other
    // brightens: a fissure line where the sheet meets the surface (filtered over the pixel), fading along the segment.)
    float crk = 0.0;
    for (int k = 0; k < 2; k++) {
      vec3 hk = hash33(vec3(uSeed * 7.13 + float(k) * 3.71, 1.37, 9.11));
      float ang = hk.x * 6.2831853;
      vec3 rr = vec3(cos(ang), sin(ang), 0.0);
      vec3 tt = vec3(-sin(ang), cos(ang), 0.0);
      vec3 nR = normalize(tt + (hk.y - 0.5) * 1.6 * rr + (hk.z - 0.5) * 1.6 * vec3(0.0, 0.0, 1.0));
      vec3 cpW = vRingC + toW * (rr * uSectionRadius);
      vec3 nK = normalize(toW * nR);
      float s0 = dot(vWorldPos - cpW, nK);
      float s1 = dot(P1 - cpW, nK);
      float rad = length((vWorldPos - cpW) - nK * s0);
      float disc = 1.0 - smoothstep(0.55 * w * 2.0, 0.9 * w * 2.0, rad);
      if (disc <= 0.0) continue;
      float fw = max(fwidth(s0), 1e-4);
      float side = smoothstep(-fw, fw, s0) * 2.0 - 1.0;
      // crossing: the segment's two ends on opposite sides (soft over 1 cm at the far end)
      float crossK = smoothstep(-0.01, 0.01, -sign(s0) * s1) * (1.0 - smoothstep(0.0, 0.25, abs(s0)));
      crk += disc * crossK * side;
    }
    crk = clamp(crk, -1.0, 1.0) * uP4F.z;
    col *= crk > 0.0 ? mix(1.0, 0.7, crk) : mix(1.0, 1.15, -crk);
  }
#endif
""",
)

# ---------------------------------------------------------------- joints (Q6)
rep(
    """      float crossK = se * sx < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 0.012, min(abs(se), abs(sx)));""",
    """#ifdef ICE_P4
      float crossK = se * sx < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, uP4D.y, min(abs(se), abs(sx)));
#else
      float crossK = se * sx < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 0.012, min(abs(se), abs(sx)));
#endif""",
)

# ---------------------------------------------------------------- chroma gain in the hold (Q10) + cast
rep(
    """  {
    float lc = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = max(vec3(lc) + (col - vec3(lc)) * uR11B.w, vec3(0.0));
  }""",
    """#ifdef ICE_P4
  // (Q10: an ice-only cast towards blue at equal luma, against the residual cyan; the chroma eases to uP4E.w in the hold.)
  col *= mix(vec3(1.0), vec3(1.0083, 0.9931, 1.0436), uP4F.w);
  {
    float lc = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = max(vec3(lc) + (col - vec3(lc)) * mix(uR11B.w, uP4E.w, uHold), vec3(0.0));
  }
#else
  {
    float lc = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = max(vec3(lc) + (col - vec3(lc)) * uR11B.w, vec3(0.0));
  }
#endif""",
)

# ---------------------------------------------------------------- JS: switches, define, uniforms
rep(
    """export const ICE_R11A = typeof location !== "undefined" && new URLSearchParams(location.search).get("ice") === "r11a";
""",
    """export const ICE_R11A = typeof location !== "undefined" && new URLSearchParams(location.search).get("ice") === "r11a";

/**
 * P4 ice lane (P3 panel tasks G5, Q3, Q4 ice part, Q6, Q10), T1 / T2 only (T0 keeps MAIN's ice). `?p4ice=0` restores MAIN
 * exactly (no ICE_P4 define, no new uniforms). Sub-switches, uniform-level in the same program: `?iceaa=r11` (G5 band
 * limit), `?icefrost=r11` (Q3 frost), `?icecap=0` (Q6 caps / joints), `?orbice=r11` (Q4 orb light in the ice),
 * `?icehold=r11` (Q10 hold drama / rim / cracks / cast).
 */
const P4Q = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
export const P4ICE = !!P4Q && P4Q.get("p4ice") !== "0";
const P4_AA = !!P4Q && P4Q.get("iceaa") !== "r11";
const P4_FROST = !!P4Q && P4Q.get("icefrost") !== "r11";
const P4_CAP = !!P4Q && P4Q.get("icecap") !== "0";
const P4_ORB = !!P4Q && P4Q.get("orbice") !== "r11";
const P4_HOLD = !!P4Q && P4Q.get("icehold") !== "r11";
function p4On(quality: { marchSteps: number }) {
  return P4ICE && iceR11(quality) && quality.marchSteps >= 4;
}
""",
)
rep(
    """  const r11 = iceR11(quality);
  if (r11) defines.ICE_R11 = "";
""",
    """  const r11 = iceR11(quality);
  if (r11) defines.ICE_R11 = "";
  const p4 = p4On(quality);
  if (p4) defines.ICE_P4 = "";
""",
)
rep(
    """      ...(!r11 ? {} : r11Uniforms()),
    },
  });
}""",
    """      ...(!r11 ? {} : r11Uniforms()),
      ...(!p4 ? {} : { uHold: shared.uHold }),
    },
  });
  if (p4) p4Uniforms(mat);
  return mat;
}

/** P4 ice lane uniforms (runtime-tunable through `__hero.rings.materials[i].uniforms`); each sub-switch restores MAIN's values. */
function p4Uniforms(mat: THREE.ShaderMaterial) {
  const u = mat.uniforms;
  // G5: ramp-end filter 4 px + 0.02, octave fade from 0.15 c/px, the trace's finest octave 3 px, values band-limited.
  u.uP4A = { value: P4_AA ? new THREE.Vector4(4, 0.02, 0.15, 3) : new THREE.Vector4(1.5, 0.004, 0.3, 2) };
  // Q3: roughness 0.45 .. 0.9, Noise A stretched 4x along the ring; w = G5's value band limit.
  u.uP4B = { value: new THREE.Vector4(P4_FROST ? 0.45 : 0.233, P4_FROST ? 0.9 : 1, P4_FROST ? 4 : 0, P4_AA ? 1 : 0) };
  if (P4_FROST) {
    // frosted-diffuse share 0.8 -> 0.5; transmitted panorama blur floor 0.45 -> 0.6 (no sky cloud shapes through a band)
    u.uR11D.value.z = 0.5;
    u.uR11E.value.w = 0.6;
  }
  // Q4 (ice part): direct orb paths clamp 2.2x higher with a 0.008 lobe floor, variation on, periwinkle hue.
  u.uP4C = { value: P4_ORB ? new THREE.Vector4(2.2, 0.008, 1, 1) : new THREE.Vector4(1, 0.012, 0, 0) };
  // Q6: caps from their own plane, joint seams 5 mm wide and 0.6 deep, a 4 % chamfer, cap glint.
  u.uP4D = { value: P4_CAP ? new THREE.Vector4(1, 0.005, 0.04, 1) : new THREE.Vector4(0, 0.012, 0, 0) };
  if (P4_CAP) u.uR11B.value.z = 0.6;
  // Q10: at full hold face-on lobe growth 1.2, one-bounce TIR smoothing x0.7, transmitted gain 1.02, chroma 0.85.
  u.uP4E = { value: P4_HOLD ? new THREE.Vector4(1.2, 0.7, 1.02, 0.85) : new THREE.Vector4(u.uR11K.value.w, 1, u.uR11D.value.y, u.uR11B.value.w) };
  // Q10: rim tint, steel-blue inner line, crack sheets, blue cast.
  u.uP4F = { value: P4_HOLD ? new THREE.Vector4(1, 1, 1, 1) : new THREE.Vector4(0, 0, 0, 0) };
  // Q4 / Q10: orb-through x1.4 and a facet glint at full hold.
  u.uP4G = { value: new THREE.Vector4(P4_ORB ? 1.4 : 1, P4_HOLD ? 0.5 : 0, 0, 0) };
}""",
)
rep(
    """  return new THREE.ShaderMaterial({
    name: "rx-ice",""",
    """  const mat = new THREE.ShaderMaterial({
    name: "rx-ice",""",
)

open(F, "w").write(s)
print("patched", F)
