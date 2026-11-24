import * as THREE from "three";
import { HERO_CENTER, SUN_DIR } from "./config";

/**
 * Uniform objects shared by reference across materials, so one write per frame
 * updates every shader that uses them.
 */
export function createSharedUniforms() {
  return {
    uTime: { value: 0 },
    uFrame: { value: 0 },
    /** Drawing-buffer size in pixels of the main HDR target. */
    uResolution: { value: new THREE.Vector2(1, 1) },
    uSunDir: { value: new THREE.Vector3().fromArray(SUN_DIR).normalize() },
    /** Sun radiance as seen by small glossy surfaces (tuned against the Cycles frames). */
    uSunColor: { value: new THREE.Color(9.9, 8.4, 7.1).multiplyScalar(0.5) },
    uEnvMap: { value: null as THREE.Texture | null },
    uEnvIntensity: { value: 1 },
    uCloudTint: { value: new THREE.Color(1, 1, 1) },
    /** Aerial perspective added on top of the plate: start / full distance (m), amount. */
    // (0.7 before the v2 plate: its baked volumetric mist now lies at the massif's feet, and the two together read
    // doubled there, mid-left +20 L; QC round 4 also found the far right over-hazed.)
    uFog: { value: new THREE.Vector3(40, 160, 0.45) },
    /**
     * Fog falls off with height (m) so it gathers as a mist band at the mountain bases (F000, F420)
     * while the rock faces above keep their dark blue-grey contrast.
     */
    uFogHeight: { value: 4.5 },
    // Blue mist (reference haze band #8ea1bc), not a grey veil.
    uFogColor: { value: new THREE.Color(0.95, 1.2, 1.7) },
    /** Extra mip blur of the environment while dollied in (depth-of-field feel). */
    uDofBlur: { value: 0 },
    uFocusDist: { value: 21 },
    /** Scene colour (env + orb) with mips, for the refractive materials. */
    uRefraction: { value: null as THREE.Texture | null },
    uRefractionSize: { value: new THREE.Vector2(1, 1) },
    /**
     * Ice behind ice (RenderPipeline): x = 1 draws only the ring fragments behind the split depth (the orb's
     * linear view depth, y); 0 draws them all.
     */
    uRingSplit: { value: new THREE.Vector2(0, 0) },
    /** Linear view depth of the rings' back faces (0 when the pass is disabled). */
    uBackDepth: { value: null as THREE.Texture | null },
    uUseBackDepth: { value: 0 },
    /** The orb as a light for the ice and the lake: centre (m) and glow level (1 at rest). */
    uOrbCenter: { value: new THREE.Vector3().fromArray(HERO_CENTER) },
    uOrbGlow: { value: 1 },
    /** Interaction drivers (see Choreography). */
    uHold: { value: 0 },
    /** The hold fog bank's level: follows the dolly in, lingers ~1.5 s after a release (F453 / F460 keep the fog). */
    uFogHold: { value: 0 },
    uShatter: { value: 0 },
    uHover: { value: 0 },
    uImpulse: { value: 0 },
    uIntro: { value: 0 },
  };
}

export type SharedUniforms = ReturnType<typeof createSharedUniforms>;

/**
 * Defines that make three's `textureCubeUV` work on a PMREM render-target texture
 * inside a custom ShaderMaterial (mirrors WebGLProgram's generateCubeUVSize).
 */
export function cubeUVDefines(pmrem: THREE.Texture): Record<string, string> {
  const imageHeight = (pmrem.image as { height: number }).height;
  const maxMip = Math.log2(imageHeight) - 2;
  const texelHeight = 1 / imageHeight;
  const texelWidth = 1 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16));
  return {
    ENVMAP_TYPE_CUBE_UV: "",
    CUBEUV_TEXEL_WIDTH: texelWidth.toPrecision(10),
    CUBEUV_TEXEL_HEIGHT: texelHeight.toPrecision(10),
    CUBEUV_MAX_MIP: `${maxMip.toFixed(1)}`,
  };
}
