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
#define SHADER_NAME rx-env-edge
#define AA_RESOLVE 
#define EDGE_BLUR 
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
#define SHADER_NAME rx-env-edge
#define AA_RESOLVE 
#define EDGE_BLUR 
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


uniform sampler2D uSrc;
uniform vec2 uTexel;
// x: relative depth jump, y: absolute jump (m) between the nearest and the farthest of the 3x3 that marks a silhouette
uniform vec2 uEdge;
// Gaussian weights of the edge-adjacent and the diagonal neighbours (centre 1)
uniform vec2 uW;
// AA5a glide: the weights on the TAA's band pixels (negative alpha)
uniform vec2 uWb;
// the plates' gain (HDR = decoded plate x gain)
uniform float uGain;
varying vec2 vUv;
#ifdef AA_RESOLVE

uniform vec3 uAAPlane;
uniform mat3 uAAExc;
uniform float uAAKnee;
bool aaIn(vec2 px) {
  vec3 q = vec3(px, 1.0);
  return dot(q, uAAPlane) < 0.0 && !all(greaterThanEqual(q * uAAExc, vec3(0.0)));
}
vec3 aaCompress(vec3 c) { return c / (uAAKnee + max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0)); }
vec3 aaExpand(vec3 x) { return uAAKnee * x / max(1.0 - max(dot(x, vec3(0.2126, 0.7152, 0.0722)), 0.0), 1.0 / 4096.0); }

vec3 aaTap(vec3 c, vec2 o) { return aaIn(gl_FragCoord.xy + o) ? aaExpand(c) : c; }
#endif
vec3 enc(vec3 c) {
  vec3 x = max(c / uGain, 0.0);
  return mix(x * 12.92, 1.055 * pow(x, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, x));
}
vec3 dec(vec3 e) {
  return mix(e / 12.92, pow((max(e, 0.0) + 0.055) / 1.055, vec3(2.4)), step(0.04045, e)) * uGain;
}
void main() {
  vec4 c0 = texture2D(uSrc, vUv + vec2(-1.0, -1.0) * uTexel);
  vec4 c1 = texture2D(uSrc, vUv + vec2(0.0, -1.0) * uTexel);
  vec4 c2 = texture2D(uSrc, vUv + vec2(1.0, -1.0) * uTexel);
  vec4 c3 = texture2D(uSrc, vUv + vec2(-1.0, 0.0) * uTexel);
  vec4 c4 = texture2D(uSrc, vUv);
  vec4 c5 = texture2D(uSrc, vUv + vec2(1.0, 0.0) * uTexel);
  vec4 c6 = texture2D(uSrc, vUv + vec2(-1.0, 1.0) * uTexel);
  vec4 c7 = texture2D(uSrc, vUv + vec2(0.0, 1.0) * uTexel);
  vec4 c8 = texture2D(uSrc, vUv + vec2(1.0, 1.0) * uTexel);
  bool gBand = c4.a < 0.0;
  c0.a = abs(c0.a); c1.a = abs(c1.a); c2.a = abs(c2.a); c3.a = abs(c3.a); c4.a = abs(c4.a);
  c5.a = abs(c5.a); c6.a = abs(c6.a); c7.a = abs(c7.a); c8.a = abs(c8.a);
  vec2 gw = gBand ? uWb : uW;
  float dmin = min(min(min(c0.a, c1.a), min(c2.a, c3.a)), min(min(c4.a, c5.a), min(min(c6.a, c7.a), c8.a)));
  float dmax = max(max(max(c0.a, c1.a), max(c2.a, c3.a)), max(max(c4.a, c5.a), max(max(c6.a, c7.a), c8.a)));
  // alpha 0 = nothing drawn there (never in the env pass: the sky card covers the frame); <= 1 = a surface without BAKED_EDGE
#ifdef AA_RESOLVE
#ifdef EDGE_BLUR
  if (dmin <= 1.0 || dmax < dmin * (1.0 + uEdge.x) + uEdge.y) {
#endif
    // Not a silhouette: the expanded resolve where the environment wrote compressed samples, nothing elsewhere.
    if (!aaIn(gl_FragCoord.xy)) discard;
    gl_FragColor = vec4(aaExpand(c4.rgb), c4.a);
    return;
#ifdef EDGE_BLUR
  }
#endif
  // A silhouette: every tap expanded where it was compressed (the alpha distances are not), then blurred as before.
  c0.rgb = aaTap(c0.rgb, vec2(-1.0, -1.0));
  c1.rgb = aaTap(c1.rgb, vec2(0.0, -1.0));
  c2.rgb = aaTap(c2.rgb, vec2(1.0, -1.0));
  c3.rgb = aaTap(c3.rgb, vec2(-1.0, 0.0));
  c4.rgb = aaTap(c4.rgb, vec2(0.0));
  c5.rgb = aaTap(c5.rgb, vec2(1.0, 0.0));
  c6.rgb = aaTap(c6.rgb, vec2(-1.0, 1.0));
  c7.rgb = aaTap(c7.rgb, vec2(0.0, 1.0));
  c8.rgb = aaTap(c8.rgb, vec2(1.0, 1.0));
#else
  if (dmin <= 1.0 || dmax < dmin * (1.0 + uEdge.x) + uEdge.y) discard;
#endif
  vec3 s = enc(c4.rgb) + gw.x * (enc(c1.rgb) + enc(c3.rgb) + enc(c5.rgb) + enc(c7.rgb))
    + gw.y * (enc(c0.rgb) + enc(c2.rgb) + enc(c6.rgb) + enc(c8.rgb));
  gl_FragColor = vec4(dec(s / (1.0 + 4.0 * gw.x + 4.0 * gw.y)), c4.a);
}
