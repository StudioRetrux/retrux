// Round-9 cursor-orbit minor: ~8 single-pixel white specks on the navy far-left ridge in the orbit plates (Cycles fireflies
// that survived the denoiser; ptr_right x~233-297 y~352-383). fx1: on the ridge, each pixel clamped against a 1.5-mip blur
// (one tap): isolated specks go, broader snow streaks (several px, inside the blur) stay.
const AT = "  // Less of it in the hold: F420's massif is a crisp blue-grey face";
export default {
  fx1: { plate: [[AT, `  if (ridgeBody > 0.0) {
    // Firefly specks on the ridge (QC round 9).
    vec3 rbf = plateGrade(samplePlate(uv, lod + 1.5));
    col = mix(col, min(col, rbf * 1.35 + vec3(0.015)), ridgeBody);
  }
${AT}`]] },
};
