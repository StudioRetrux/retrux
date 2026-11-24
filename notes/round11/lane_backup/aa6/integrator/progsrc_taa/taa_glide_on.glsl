#version 300 es

#define attribute in
#define varying out
#define texture2D texture
precision highp float;
	precision highp int;
	precision highp sampler2D;
	precision highp samplerCube;
	precision highp sampler3D;
	precision highp sampler2DArray;
	precision highp sampler2DShadow;
	precision highp samplerCubeShadow;
	precision highp sampler2DArrayShadow;
	precision highp isampler2D;
	precision highp isampler3D;
	precision highp isamplerCube;
	precision highp isampler2DArray;
	precision highp usampler2D;
	precision highp usampler3D;
	precision highp usamplerCube;
	precision highp usampler2DArray;
	
#define HIGH_PRECISION
#define SHADER_TYPE ShaderMaterial
#define SHADER_NAME rx-lake-edge-taa
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
#ifdef USE_INSTANCING
	attribute mat4 instanceMatrix;
#endif
#ifdef USE_INSTANCING_COLOR
	attribute vec3 instanceColor;
#endif
#ifdef USE_INSTANCING_MORPH
	uniform sampler2D morphTexture;
#endif
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
#ifdef USE_UV1
	attribute vec2 uv1;
#endif
#ifdef USE_UV2
	attribute vec2 uv2;
#endif
#ifdef USE_UV3
	attribute vec2 uv3;
#endif
#ifdef USE_TANGENT
	attribute vec4 tangent;
#endif
#if defined( USE_COLOR_ALPHA )
	attribute vec4 color;
#elif defined( USE_COLOR )
	attribute vec3 color;
#endif
#ifdef USE_SKINNING
	attribute vec4 skinIndex;
	attribute vec4 skinWeight;
#endif


varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}

//----FRAGMENT----
#version 300 es
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define gl_FragDepthEXT gl_FragDepth
#define texture2D texture
#define textureCube texture
#define texture2DProj textureProj
#define texture2DLodEXT textureLod
#define texture2DProjLodEXT textureProjLod
#define textureCubeLodEXT textureLod
#define texture2DGradEXT textureGrad
#define texture2DProjGradEXT textureProjGrad
#define textureCubeGradEXT textureGrad
precision highp float;
	precision highp int;
	precision highp sampler2D;
	precision highp samplerCube;
	precision highp sampler3D;
	precision highp sampler2DArray;
	precision highp sampler2DShadow;
	precision highp samplerCubeShadow;
	precision highp sampler2DArrayShadow;
	precision highp isampler2D;
	precision highp isampler3D;
	precision highp isamplerCube;
	precision highp isampler2DArray;
	precision highp usampler2D;
	precision highp usampler3D;
	precision highp usamplerCube;
	precision highp usampler2DArray;
	
#define HIGH_PRECISION
#define SHADER_TYPE ShaderMaterial
#define SHADER_NAME rx-lake-edge-taa
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 linearToOutputTexel( vec4 value ) {
	return LinearTransferOETF( vec4( value.rgb * mat3( 1.0000,-0.0000,-0.0000,-0.0000,1.0000,0.0000,0.0000,0.0000,1.0000 ), value.a ) );
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );
	return dot( weights, rgb );
}


uniform sampler2D uCur;
uniform sampler2D uHist;
// the (unnormalized) world ray through pixel px is uRayO + px.x uRayX + px.y uRayY (affine in px for a perspective camera)
uniform vec3 uRayO;
uniform vec3 uRayX;
uniform vec3 uRayY;
uniform mat4 uPrevVP;
uniform vec3 uCamPos;
uniform vec2 uSize;
uniform float uHistW;
// the clip: variance box (uClipG standard deviations) intersected with the 3x3 min / max; 0 = the min / max alone
uniform float uClipG;
// the 4 far taps' distance (px; 3 since the fix round: 2 left the outer rows of the waterline band untouched)
uniform int uFar;
uniform sampler2D uRefl;
uniform mat4 uReflVP;
uniform float uReflOn;
uniform vec4 uRipple;
// AA5a glide: (wSlow, wFast, v0, v1), (gamma, clip mode, tail scale, history cubic's Keys parameter a)
uniform vec4 uGlideW;
uniform vec4 uGlideC;
// the previous frame's compressed region (aaIn's uniforms when the history was written)
uniform vec3 uPrevAAPlane;
uniform mat3 uPrevAAExc;

uniform vec3 uAAPlane;
uniform mat3 uAAExc;
uniform float uAAKnee;
bool aaIn(vec2 px) {
  vec3 q = vec3(px, 1.0);
  return dot(q, uAAPlane) < 0.0 && !all(greaterThanEqual(q * uAAExc, vec3(0.0)));
}
vec3 aaCompress(vec3 c) { return c / (uAAKnee + max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0)); }
vec3 aaExpand(vec3 x) { return uAAKnee * x / max(1.0 - max(dot(x, vec3(0.2126, 0.7152, 0.0722)), 0.0), 1.0 / 4096.0); }

bool taaInPrev(vec2 px) {
  vec3 q = vec3(px, 1.0);
  return dot(q, uPrevAAPlane) < 0.0 && !all(greaterThanEqual(q * uPrevAAExc, vec3(0.0)));
}
vec3 taaRay(vec2 px) {
  return uRayO + px.x * uRayX + px.y * uRayY;
}
// 1: lake, 2: solid, 0: nothing drawn
int taaKind(vec2 px, float a) {
  if (a <= 1.0) return 0;
  vec3 d = taaRay(px);
  if (d.y > -1e-5 * length(d)) return 2;
  float tw = -uCamPos.y * length(d) / d.y;
  if (abs(a - tw) <= 0.004 * tw + 0.03) return 1;
  return a < tw ? 2 : 0;
}
vec3 taaHist(vec2 uv) {
  // Catmull-Rom from 5 bilinear taps, then clamped to the 2x2 texel footprint it interpolates (no overshoot at an edge)
  vec2 sp = uv * uSize;
  vec2 tp = floor(sp - 0.5) + 0.5;
  vec2 f = sp - tp;
  // Keys cubic, a = uGlideC.w (-0.5: Catmull-Rom; more negative: sharper, less blur accumulated by the history)
  float ka = uGlideC.w;
  vec2 g1 = 1.0 - f;
  vec2 w0 = ka * f * g1 * g1;
  vec2 w1 = ((ka + 2.0) * f - (ka + 3.0)) * f * f + 1.0;
  vec2 w2 = ((ka + 2.0) * g1 - (ka + 3.0)) * g1 * g1 + 1.0;
  vec2 w3 = ka * f * f * g1;
  vec2 w12 = w1 + w2;
  vec2 t12 = (tp + w2 / w12) / uSize;
  vec2 t0 = (tp - 1.0) / uSize;
  vec2 t3 = (tp + 2.0) / uSize;
  vec3 r = texture2D(uHist, vec2(t12.x, t0.y)).rgb * (w12.x * w0.y) + texture2D(uHist, vec2(t0.x, t12.y)).rgb * (w0.x * w12.y)
    + texture2D(uHist, t12).rgb * (w12.x * w12.y) + texture2D(uHist, vec2(t3.x, t12.y)).rgb * (w3.x * w12.y)
    + texture2D(uHist, vec2(t12.x, t3.y)).rgb * (w12.x * w3.y);
  r /= w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y;
  ivec2 q = ivec2(floor(sp - 0.5));
  ivec2 n = ivec2(uSize) - 1;
  vec3 a = texelFetch(uHist, clamp(q, ivec2(0), n), 0).rgb;
  vec3 b = texelFetch(uHist, clamp(q + ivec2(1, 0), ivec2(0), n), 0).rgb;
  vec3 c = texelFetch(uHist, clamp(q + ivec2(0, 1), ivec2(0), n), 0).rgb;
  vec3 d = texelFetch(uHist, clamp(q + ivec2(1, 1), ivec2(0), n), 0).rgb;
  return clamp(r, min(min(a, b), min(c, d)), max(max(a, b), max(c, d)));
}
void main() {
  ivec2 ip = ivec2(gl_FragCoord.xy);
  ivec2 n = ivec2(uSize) - 1;
  vec4 c = texelFetch(uCur, ip, 0);
  gl_FragColor = c;
  if (uHistW <= 0.0 || !aaIn(gl_FragCoord.xy)) return;
  bool lake = false;
  bool solid = false;
  vec3 mn = c.rgb, mx = c.rgb, m1 = vec3(0.0), m2 = vec3(0.0);
  float dNear = 1e9;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      ivec2 q = clamp(ip + ivec2(i, j), ivec2(0), n);
      vec4 t = texelFetch(uCur, q, 0);
      int k = taaKind(vec2(q) + 0.5, t.a);
      lake = lake || k == 1;
      solid = solid || k == 2;
      mn = min(mn, t.rgb);
      mx = max(mx, t.rgb);
      m1 += t.rgb;
      m2 += t.rgb * t.rgb;
      if (t.a > 1.0) dNear = min(dNear, t.a);
    }
  for (int i = 0; i < 4; i++) {
    ivec2 o = (i == 0 ? ivec2(1, 0) : (i == 1 ? ivec2(-1, 0) : (i == 2 ? ivec2(0, 1) : ivec2(0, -1)))) * uFar;
    ivec2 q = clamp(ip + o, ivec2(0), n);
    int k = taaKind(vec2(q) + 0.5, texelFetch(uCur, q, 0).a);
    lake = lake || k == 1;
    solid = solid || k == 2;
  }
  if (!(lake && solid) || dNear > 1e8) return;
  // (fix, judge A-1: a colour tap outside the compressed region holds a linear value: no blend next to the region's edge, where
  // the clip box and the history would mix both spaces; the far taps only classify, by alpha)
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++)
      if (!aaIn(vec2(clamp(ip + ivec2(i, j), ivec2(0), n)) + 0.5)) return;
  vec3 dir = normalize(taaRay(gl_FragCoord.xy));
  vec4 pc = uPrevVP * vec4(uCamPos + dir * dNear, 1.0);
  if (pc.w <= 1e-4) return;
  vec2 puv = pc.xy / pc.w * 0.5 + 0.5;
  if (any(lessThan(puv, vec2(0.5) / uSize)) || any(greaterThan(puv, 1.0 - vec2(0.5) / uSize))) return;
  // (fix: the history's 4 x 4 texel footprint inside the previous frame's compressed region, else no history)
  vec2 hp = puv * uSize;
  if (!(taaInPrev(hp + vec2(-2.0)) && taaInPrev(hp + vec2(2.0, -2.0)) && taaInPrev(hp + vec2(-2.0, 2.0)) && taaInPrev(hp + vec2(2.0)))) return;
  vec3 h = taaHist(puv);
  vec3 mu = m1 / 9.0;
  vec3 sd = sqrt(max(m2 / 9.0 - mu * mu, 0.0));
  vec3 lo = mu - uGlideC.x * sd, hi = mu + uGlideC.x * sd;
  if (uGlideC.y < 0.5) { lo = max(mn, lo); hi = min(mx, hi); } else if (uGlideC.y > 2.5) {
    // step clamp: the history within kappa (= gamma) 4x-coverage steps of the local range around the current value
    vec3 st = uGlideC.x * 0.25 * (mx - mn);
    lo = max(mn, c.rgb - st); hi = min(mx, c.rgb + st);
  } else if (uGlideC.y > 1.5) { lo = mn; hi = mx; }
  h = clamp(h, lo, hi);
  // the history weight follows this pixel's own reprojection motion (main-target px per frame)
  float mv = length(puv * uSize - gl_FragCoord.xy);
  float w = uHistW > 0.0 ? mix(uGlideW.x, uGlideW.y, smoothstep(uGlideW.z, uGlideW.w, mv)) * uGlideC.z : 0.0;
  if (dir.y < -1e-5) {
    // the lake point on this pixel's ray: no history where the hero's reflection or the ring waves change the water
    vec3 P = uCamPos + dir * (-uCamPos.y / dir.y);
    if (uRipple.w > 0.0) w *= smoothstep(uRipple.w, uRipple.w + 1.5, distance(P.xz, uRipple.xz));
    if (uReflOn > 0.5) {
      vec4 rc = uReflVP * vec4(P, 1.0);
      vec2 ruv = rc.xy / rc.w * 0.5 + 0.5;
      float ra = 0.0;
      for (int i = 0; i < 5; i++) {
        vec2 o = i == 0 ? vec2(0.0) : (i == 1 ? vec2(0.008, 0.0) : (i == 2 ? vec2(-0.008, 0.0) : (i == 3 ? vec2(0.0, 0.008) : vec2(0.0, -0.008))));
        ra = max(ra, texture2D(uRefl, clamp(ruv + o, vec2(0.0), vec2(1.0))).a);
      }
      w *= 1.0 - smoothstep(0.01, 0.1, ra);
    }
  }
  gl_FragColor.rgb = mix(c.rgb, h, w);
  // band flag for EnvEdge's blur (it reads |alpha|)
  gl_FragColor.a = -c.a;
}
