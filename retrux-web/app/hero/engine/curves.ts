/**
 * Motion curves measured frame by frame from the reference (30 fps): the ring-B
 * split comes straight from the keyframes baked in `Home - Full.glb`, the camera
 * curves from far-band registration of `State 2 to 5.mp4`.
 */

/** Ring-B halves opening on a click, 1.333 s (GLB F230-F270). */
export const COLLAPSE_SPLIT = [0, 0.021, 0.046, 0.072, 0.098, 0.125, 0.152, 0.179, 0.207, 0.234, 0.261, 0.289, 0.316, 0.343, 0.37, 0.398, 0.425, 0.452, 0.479, 0.506, 0.533, 0.559, 0.586, 0.613, 0.639, 0.665, 0.691, 0.717, 0.743, 0.768, 0.794, 0.819, 0.843, 0.867, 0.891, 0.913, 0.935, 0.956, 0.975, 0.991, 1];
/** Ring-B halves snapping home after the click, 0.333 s, progress (F290-F300). */
export const COLLAPSE_RETURN = [0, 0.004, 0.015, 0.038, 0.073, 0.128, 0.21, 0.342, 0.578, 0.921, 1];
/** Ring-B split while holding, 0.5 s from 0.65 s after the press: ease-in, one-frame pop, settle (F350-F365). */
export const EXPAND_POP = [0, 0.002, 0.007, 0.018, 0.035, 0.064, 0.114, 0.219, 0.79, 0.889, 0.937, 0.965, 0.983, 0.993, 0.998, 1];
/** Ring-B return after releasing a hold, 0.667 s, progress; the snap is centred at +0.33 s (F443-F463). */
export const RELEASE_RETURN = [0, 0.001, 0.004, 0.009, 0.017, 0.03, 0.047, 0.073, 0.111, 0.177, 0.5, 0.823, 0.889, 0.927, 0.953, 0.97, 0.983, 0.991, 0.996, 0.999, 1];

/** Camera progress towards the collapse peak, seconds after the split starts. */
export const COLLAPSE_CAM: [number, number][] = [
  [0, 0], [0.033, 0.03], [0.233, 0.15], [0.433, 0.3], [0.633, 0.49], [0.933, 0.65], [1.2, 0.86], [1.667, 1],
  [1.933, 0.91], [2.033, 0.91], [2.1, 0.8], [2.167, 0.2], [2.233, 0.11], [2.333, 0],
];
/** Camera progress towards the expand pose, seconds after the press. */
export const EXPAND_CAM: [number, number][] = [
  [0, 0], [0.183, 0.007], [0.383, 0.034], [0.583, 0.093], [0.683, 0.155], [0.783, 0.278], [0.883, 0.746],
  [1.083, 0.926], [1.283, 0.959], [1.483, 0.973], [1.983, 0.999], [3.317, 1], [3.517, 0.98], [3.717, 0.967],
];
/** Camera progress back to rest, seconds after releasing a hold. */
export const RELEASE_CAM: [number, number][] = [
  [0, 0], [0.033, 0.01], [0.1, 0.095], [0.167, 0.23], [0.3, 0.68], [0.367, 0.8], [0.433, 0.87], [0.5, 0.92],
  [0.633, 0.97], [0.733, 0.99], [0.8, 1],
];

/** Camera targets around the orb: r (m), azimuth / elevation / absolute pitch (deg). */
export const CAM_TARGETS = {
  rest: { r: 20.93, az: 0.64, el: -0.41, pitch: -0.048 },
  tilt: { r: 18.7, el: -1.43, pitch: 1.5 },
  collapse: { r: 19.5, el: -1.0, pitch: 1.45 },
  expand: { r: 12.7, el: -3.3, pitch: 4.55 },
  /** Opening move: starts low and close, glides back to rest. */
  intro: { r: 17.6, el: -2.1, pitch: 2.4 },
};
