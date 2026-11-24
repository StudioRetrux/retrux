import * as THREE from "three";
import { GLSL_AGX, GLSL_COMMON } from "../shaders/chunks";
import type { QualityProfile } from "../types";

/**
 * Post chain: physically-motivated bloom (13-tap downsample with Karis average,
 * tent upsample), then one grading pass: cursor lens, radial chromatic
 * aberration, AgX (Blender's view transform), saturation, vignette, sRGB encode
 * and per-frame dither / grain. Optional FXAA on the final sRGB image.
 *
 * The grading shader writes display-referred sRGB itself and does not include
 * three's <colorspace_fragment>, so nothing is converted twice.
 */

export type PostParams = {
  exposure: number;
  bloomStrength: number;
  /** Scene-linear brightness where bloom starts (max channel). */
  bloomThreshold: number;
  bloomKnee: number;
  vignette: number;
  chromatic: number;
  grain: number;
  saturation: number;
  /** Cursor lens, drawing-buffer pixels with y up. */
  lensCenter: THREE.Vector2;
  lensRadius: number;
  lensStrength: number;
  time: number;
  frame: number;
};

// The Cycles reference is clean: only a soft halo on the clipped orb, no grain, no CA at rest.
export const DEFAULT_POST: PostParams = {
  exposure: 1,
  // A soft, low-threshold diffusion (the reference's bright sky, snow and clouds glow gently),
  // not a hot-spot bloom: the orb stays clean.
  bloomStrength: 0.1,
  bloomThreshold: 2.0,
  bloomKnee: 1.5,
  // Matches the reference corners part of the way; the Figma overlay adds its own top / bottom shade.
  // (0.2 / 1.0 until QC round 5: frame edges lighter than the reference's, mid-chroma 10-25 % low.)
  vignette: 0.24,
  chromatic: 0,
  grain: 0,
  saturation: 1.05,
  lensCenter: new THREE.Vector2(),
  lensRadius: 40,
  lensStrength: 0,
  time: 0,
  frame: 0,
};

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const DOWN_FRAG = /* glsl */ `
${GLSL_COMMON}
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uPrefilter;
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;
vec3 s(vec2 o) { return texture2D(tSrc, vUv + uTexel * o).rgb; }
vec3 prefilterBand(vec3 c, float threshold, float knee) {
  float br = max(c.r, max(c.g, c.b));
  float rq = clamp(br - threshold + knee, 0.0, 2.0 * knee);
  rq = rq * rq / (4.0 * knee + 1e-4);
  return c * (max(rq, br - threshold) / max(br, 1e-4));
}
// Two bands: the soft environment diffusion, plus a band that only the orb core and the brightest glints
// reach, which gives the orb its halo. Kept tight: the reference glow stays inside the glass (QC round 1:
// 5.0 / 1.6 spilled a 30-35 px haze over the ice around it).
vec3 prefilter(vec3 c) {
  // The orb band tinted mint-cyan (QC rounds 8-9: "the orb glow reads blue-white / lavender, the reference's is mint-cyan").
  return prefilterBand(c, uThreshold, uKnee) + prefilterBand(c, 7.0, 1.0) * 0.8 * vec3(0.88, 1.0, 0.96);
}
float karis(vec3 c) { return 1.0 / (1.0 + luma(c)); }
void main() {
  vec3 a = s(vec2(-2.0, 2.0)), b = s(vec2(0.0, 2.0)), c = s(vec2(2.0, 2.0));
  vec3 d = s(vec2(-2.0, 0.0)), e = s(vec2(0.0, 0.0)), f = s(vec2(2.0, 0.0));
  vec3 g = s(vec2(-2.0, -2.0)), h = s(vec2(0.0, -2.0)), i = s(vec2(2.0, -2.0));
  vec3 j = s(vec2(-1.0, 1.0)), k = s(vec2(1.0, 1.0)), l = s(vec2(-1.0, -1.0)), m = s(vec2(1.0, -1.0));
  vec3 g0 = (j + k + l + m) * 0.25;
  vec3 g1 = (a + b + d + e) * 0.25;
  vec3 g2 = (b + c + e + f) * 0.25;
  vec3 g3 = (d + e + g + h) * 0.25;
  vec3 g4 = (e + f + h + i) * 0.25;
  vec3 col;
  if (uPrefilter > 0.5) {
    // Karis average on the first level kills single-pixel fireflies.
    float w0 = karis(g0) * 0.5, w1 = karis(g1) * 0.125, w2 = karis(g2) * 0.125, w3 = karis(g3) * 0.125, w4 = karis(g4) * 0.125;
    col = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
    col = prefilter(min(col, vec3(64.0)));
  } else {
    col = g0 * 0.5 + (g1 + g2 + g3 + g4) * 0.125;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Up-sample weight per source mip level (index 1 = half resolution). */
// ([1, 0.85, 0.7, 0.45, 0.3, 0.2, 0.15] until QC round 9: the pop / hold bloom skirt ~2x too wide and neutral white washed
// the hero out, pop centre saturation 0.113 vs the reference's 0.205; the orb's edge stays crisper too.)
const UP_WEIGHTS = [1, 0.85, 0.6, 0.32, 0.2, 0.12, 0.08];

const UP_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uRadius;
varying vec2 vUv;
vec3 s(vec2 o) { return texture2D(tSrc, vUv + uTexel * o).rgb; }
void main() {
  vec3 c = s(vec2(-1.0, 1.0)) + 2.0 * s(vec2(0.0, 1.0)) + s(vec2(1.0, 1.0))
         + 2.0 * s(vec2(-1.0, 0.0)) + 4.0 * s(vec2(0.0)) + 2.0 * s(vec2(1.0, 0.0))
         + s(vec2(-1.0, -1.0)) + 2.0 * s(vec2(0.0, -1.0)) + s(vec2(1.0, -1.0));
  gl_FragColor = vec4(c / 16.0 * uRadius, 1.0);
}
`;

const GRADE_FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_AGX}
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloomOn;
uniform float uExposure;
uniform float uBloomStrength;
uniform float uVignette;
uniform float uChromatic;
uniform float uGrain;
uniform float uSaturation;
uniform vec2 uLensCenter;
uniform float uLensRadius;
uniform float uLensStrength;
uniform vec2 uOutSize;
uniform float uFrame;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = vUv;
  // Cursor lens: a soft disc that slightly magnifies and frosts what is beneath it.
  vec2 d = px - uLensCenter;
  float r = length(d);
  float lens = uLensStrength * (1.0 - smoothstep(uLensRadius * 0.55, uLensRadius, r));
  uv -= d / uOutSize * lens * 0.14;

  vec2 c = uv - 0.5;
  // (+ lens * 0.0025 until QC round 8, T03: the cursor lens split R / B ~0.9 px over the bright ripple crests under the
  // pointer during a hold, a rainbow fringe; the lens keeps its magnify and frost.)
  float ca = uChromatic * dot(c, c) * 0.02;
  vec3 col;
  col.r = texture2D(tScene, uv - c * ca).r;
  col.g = texture2D(tScene, uv).g;
  col.b = texture2D(tScene, uv + c * ca).b;
  if (uBloomOn > 0.5) col += texture2D(tBloom, uv).rgb * uBloomStrength;

  col = agx(max(col, 0.0) * uExposure);
  float l = luma(col);
  col = max(mix(vec3(l), col, uSaturation), 0.0);
  // The reference frames fall off ~15 % at the top corners and ~30 % at the bottom ones.
  vec2 cv = c * vec2(1.0, c.y < 0.0 ? 1.0 : 0.72);
  float vig = 1.0 - uVignette * smoothstep(0.25, 1.05, length(cv) * 1.35);
  // Blue-preserving falloff: the reference's corners darken towards a deeper blue, not grey (QC round 5).
  col *= vig * mix(vec3(1.0), vec3(0.96, 0.985, 1.035), saturate((1.0 - vig) * 2.5));
  col = mix(col, col * 1.03 + 0.012, lens * 0.6);

  vec3 srgb = linearToSrgb(col);
  srgb += (ign(px, uFrame) - 0.5) / 255.0;
  float g = hash12(px + fract(uTime * 7.31) * 517.0) - 0.5;
  srgb += g * uGrain * (1.0 - 0.6 * luma(srgb));
  gl_FragColor = vec4(saturate(srgb), 1.0);
}
`;

// FXAA (luma-based edge search, after the classic "FXAA 2" formulation).
const FXAA_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
varying vec2 vUv;
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
void main() {
  vec3 rgbNW = texture2D(tSrc, vUv + vec2(-1.0, -1.0) * uTexel).rgb;
  vec3 rgbNE = texture2D(tSrc, vUv + vec2(1.0, -1.0) * uTexel).rgb;
  vec3 rgbSW = texture2D(tSrc, vUv + vec2(-1.0, 1.0) * uTexel).rgb;
  vec3 rgbSE = texture2D(tSrc, vUv + vec2(1.0, 1.0) * uTexel).rgb;
  vec3 rgbM = texture2D(tSrc, vUv).rgb;
  float lNW = lum(rgbNW), lNE = lum(rgbNE), lSW = lum(rgbSW), lSE = lum(rgbSE), lM = lum(rgbM);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
  float reduce = max((lNW + lNE + lSW + lSE) * 0.25 * 0.125, 1.0 / 128.0);
  float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
  dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * uTexel;
  vec3 a = 0.5 * (texture2D(tSrc, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tSrc, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture2D(tSrc, vUv + dir * -0.5).rgb + texture2D(tSrc, vUv + dir * 0.5).rgb);
  float lb = lum(b);
  gl_FragColor = vec4((lb < lMin || lb > lMax) ? a : b, 1.0);
}
`;

function target(w: number, h: number, type: THREE.TextureDataType) {
  return new THREE.WebGLRenderTarget(w, h, {
    type,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: THREE.NoColorSpace,
  });
}

export class PostChain {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh;
  private down: THREE.ShaderMaterial;
  private up: THREE.ShaderMaterial;
  private grade: THREE.ShaderMaterial;
  private fxaa: THREE.ShaderMaterial | null = null;
  private mips: THREE.WebGLRenderTarget[] = [];
  private ldr: THREE.WebGLRenderTarget | null = null;
  private outSize = new THREE.Vector2();

  constructor(
    private renderer: THREE.WebGLRenderer,
    private profile: QualityProfile["post"],
  ) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const base = { vertexShader: VERT, depthTest: false, depthWrite: false };
    this.down = new THREE.ShaderMaterial({
      ...base,
      name: "rx-bloom-down",
      fragmentShader: DOWN_FRAG,
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uPrefilter: { value: 0 }, uThreshold: { value: 2 }, uKnee: { value: 1 } },
    });
    this.up = new THREE.ShaderMaterial({
      ...base,
      name: "rx-bloom-up",
      fragmentShader: UP_FRAG,
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 0.85 } },
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    this.grade = new THREE.ShaderMaterial({
      ...base,
      name: "rx-grade",
      fragmentShader: GRADE_FRAG,
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        uBloomOn: { value: profile.bloomLevels > 0 ? 1 : 0 },
        uExposure: { value: 1 },
        uBloomStrength: { value: 0.3 },
        uVignette: { value: 0.16 },
        uChromatic: { value: 0 },
        uGrain: { value: 0 },
        uSaturation: { value: 1 },
        uLensCenter: { value: new THREE.Vector2() },
        uLensRadius: { value: 40 },
        uLensStrength: { value: 0 },
        uOutSize: { value: new THREE.Vector2(1, 1) },
        uFrame: { value: 0 },
        uTime: { value: 0 },
      },
    });
    if (profile.fxaa) {
      this.fxaa = new THREE.ShaderMaterial({
        ...base,
        name: "rx-fxaa",
        fragmentShader: FXAA_FRAG,
        uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } },
      });
    }
    this.quad = new THREE.Mesh(geo, this.grade);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  setSize(width: number, height: number) {
    for (const m of this.mips) m.dispose();
    this.mips = [];
    let w = Math.max(2, Math.round(width / 2));
    let h = Math.max(2, Math.round(height / 2));
    for (let i = 0; i < this.profile.bloomLevels; i++) {
      this.mips.push(target(w, h, THREE.HalfFloatType));
      w = Math.max(2, Math.round(w / 2));
      h = Math.max(2, Math.round(h / 2));
    }
    this.grade.uniforms.tBloom.value = this.mips[0]?.texture ?? null;
    const buf = this.renderer.getDrawingBufferSize(this.outSize);
    if (this.fxaa) {
      if (!this.ldr) this.ldr = target(buf.x, buf.y, THREE.UnsignedByteType);
      else this.ldr.setSize(buf.x, buf.y);
    }
  }

  private draw(material: THREE.ShaderMaterial, dst: THREE.WebGLRenderTarget | null) {
    this.quad.material = material;
    this.renderer.setRenderTarget(dst);
    this.renderer.render(this.scene, this.camera);
  }

  render(input: THREE.Texture, p: PostParams, out: THREE.WebGLRenderTarget | null = null) {
    const r = this.renderer;
    const prevAuto = r.autoClear;
    r.autoClear = false;

    // Bloom chain.
    if (this.mips.length) {
      let src: THREE.Texture = input;
      let srcW = (input.image as { width: number }).width || this.mips[0].width * 2;
      let srcH = (input.image as { height: number }).height || this.mips[0].height * 2;
      this.down.uniforms.uThreshold.value = p.bloomThreshold;
      this.down.uniforms.uKnee.value = p.bloomKnee;
      for (let i = 0; i < this.mips.length; i++) {
        this.down.uniforms.tSrc.value = src;
        this.down.uniforms.uTexel.value.set(1 / srcW, 1 / srcH);
        this.down.uniforms.uPrefilter.value = i === 0 ? 1 : 0;
        this.draw(this.down, this.mips[i]);
        src = this.mips[i].texture;
        srcW = this.mips[i].width;
        srcH = this.mips[i].height;
      }
      for (let i = this.mips.length - 1; i > 0; i--) {
        const s = this.mips[i];
        this.up.uniforms.tSrc.value = s.texture;
        this.up.uniforms.uTexel.value.set(1 / s.width, 1 / s.height);
        // Each coarser level contributes less (a flat 0.85 spread the halo 30-60 px from the orb).
        this.up.uniforms.uRadius.value = UP_WEIGHTS[Math.min(i, UP_WEIGHTS.length - 1)];
        this.draw(this.up, this.mips[i - 1]);
      }
    }

    const buf = r.getDrawingBufferSize(this.outSize);
    const u = this.grade.uniforms;
    u.tScene.value = input;
    u.uExposure.value = p.exposure;
    u.uBloomStrength.value = p.bloomStrength;
    u.uVignette.value = p.vignette;
    u.uChromatic.value = this.profile.chromatic ? p.chromatic : 0;
    u.uGrain.value = this.profile.grain ? p.grain : 0;
    u.uSaturation.value = p.saturation;
    u.uLensCenter.value.copy(p.lensCenter);
    u.uLensRadius.value = p.lensRadius;
    u.uLensStrength.value = p.lensStrength;
    u.uOutSize.value.set(buf.x, buf.y);
    u.uFrame.value = p.frame;
    u.uTime.value = p.time;

    if (this.fxaa && this.ldr && !out) {
      this.draw(this.grade, this.ldr);
      this.fxaa.uniforms.tSrc.value = this.ldr.texture;
      this.fxaa.uniforms.uTexel.value.set(1 / this.ldr.width, 1 / this.ldr.height);
      this.draw(this.fxaa, null);
    } else {
      this.draw(this.grade, out);
    }
    r.autoClear = prevAuto;
  }

  dispose() {
    for (const m of this.mips) m.dispose();
    this.ldr?.dispose();
    this.down.dispose();
    this.up.dispose();
    this.grade.dispose();
    this.fxaa?.dispose();
    this.quad.geometry.dispose();
  }
}
