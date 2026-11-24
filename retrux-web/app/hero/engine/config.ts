/**
 * Scene constants for the Retrux ice hero.
 *
 * Everything here comes from the artist's Blender scene (`Home - EXPORT.blend`)
 * and the camera solved against the reference video, converted from Blender
 * Z-up to three.js Y-up with (x, y, z)three = (x, z, -y)blender. Units are meters.
 */

export type Vec3 = [number, number, number];

/** Reference frame of the Figma / video composition. */
export const REF_WIDTH = 1440;
export const REF_HEIGHT = 766;
export const REF_ASPECT = REF_WIDTH / REF_HEIGHT;

/**
 * Rest camera (no camera exists in the .blend; solved from the video).
 * Blender euler (90 + pitch, 0, yaw), lens 42.253 mm on a 36 mm horizontal
 * sensor, i.e. 46.15 deg horizontal FOV at 1440x766.
 */
export const REST_CAMERA = {
  position: [0.23183887899931777, 2.903973052988094, 11.787528905312952] as Vec3,
  yawDeg: 0.672220988573093,
  pitchDeg: -0.048456561917928444,
  hfovDeg: 46.1484745733892,
};

/** Centre of the ring assembly / orb. */
export const HERO_CENTER: Vec3 = [0, 3.0538065433502197, -9.137568473815918];
export const ORB_RADIUS = 0.8255;
/** Radius of the sphere used for hover / press hit testing (outer ring + margin). */
export const HERO_HIT_RADIUS = 3.1;

/** Sun direction (pointing towards the sun): elevation 18.6 deg, front-left. */
export const SUN_DIR: Vec3 = [-0.8295, 0.31816, -0.45902];

export const WATER = {
  level: 0,
  /** Near lake plane (Plane.011, had the Wave modifier in Blender). */
  near: { min: [-14.871797561645508, 0, -14.871797561645508] as Vec3, max: [14.871797561645508, 0, 14.871797561645508] as Vec3 },
  /** Far lake plane (Plane.013). */
  far: { min: [-22.307697296142578, 0.0017, -56.53630065917969] as Vec3, max: [22.307697296142578, 0.0017, -11.920909881591797] as Vec3 },
  /** Origin of the concentric ripples (Blender Wave modifier start position). */
  rippleCenter: [0, 0, -8.6] as Vec3,
};

/**
 * Environment plate: Cycles render of the scene without the hero, from the
 * rest camera with overscan, stored as 8-bit sRGB with a fixed exposure.
 * linear = srgbToLinear(texel) * 2^(-exposureStops).
 */
export const PLATE = {
  file: "plate_rest.webp",
  width: 2506,
  height: 1287,
  /** Extra coverage per side, as a fraction of the reference frame width / height. */
  overscanX: 0.08,
  overscanY: 0.06,
  exposureStops: -2.158,
};

/** 360 deg Cycles panorama from the orb centre (hero hidden), three.js equirect convention. */
export const PANORAMA = {
  file: "pano_orb.exr",
};

/** Cloud cards (Blender image planes under Empty.006), world-space quads. */
export const CLOUDS: { image: string; verts: Vec3[] }[] = [
  { image: "cloud_a", verts: [[-0.992, 8.757, -104.224], [43.57, 8.757, -104.224], [-0.992, 24.159, -104.224], [43.57, 24.159, -104.224]] },
  { image: "cloud_a", verts: [[-23.363, 4.499, -84.937], [-67.925, 4.499, -84.937], [-23.363, 19.901, -84.937], [-67.925, 19.901, -84.937]] },
  { image: "cloud_a", verts: [[53.389, 17.593, -83.952], [8.827, 17.593, -83.952], [53.389, 32.995, -83.952], [8.827, 32.995, -83.952]] },
  { image: "cloud_b", verts: [[-32.253, 4.975, -110.417], [0.452, 4.975, -110.417], [-32.253, 18.201, -110.417], [0.452, 18.201, -110.417]] },
  { image: "cloud_b", verts: [[30.886, -3.603, -127.998], [88.447, -3.603, -127.998], [30.886, 19.673, -127.998], [88.447, 19.673, -127.998]] },
  { image: "cloud_b", verts: [[-48.677, 19.369, -127.998], [8.883, 19.369, -127.998], [-48.677, 42.645, -127.998], [8.883, 42.645, -127.998]] },
];

/** Asset file names inside the asset base URL (e.g. "/hero/"). */
export const ASSETS = {
  plate: PLATE.file,
  plateMeta: "plate.json",
  // Extra projectors (optional): plate_<key>.webp + plate_<key>.json for each EXTRA_PROJECTORS key.
  panorama: PANORAMA.file,
  envProxy: "env_proxy.glb",
  hero: "hero.glb",
  clouds: { cloud_a: "cloud_a.webp", cloud_b: "cloud_b.webp" },
  dracoPath: "draco/",
};

/** Ring objects as exported from Blender, innermost first. */
export const RING_NAMES = {
  inner: "Circle027",
  middle: "Circle026",
  halves: ["Circle025", "Circle032"],
  outerQuarters: ["Circle028", "Circle029", "Circle030", "Circle031"],
};
export const ORB_NAME = "Icosphere011";
export const SHARD_BELT_NAMES = ["Cube009", "Cube010"];
