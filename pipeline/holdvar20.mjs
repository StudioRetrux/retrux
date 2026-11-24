// Round-9 composition MAJOR (gain 0.8): the hold's outer ring stays a closed cage; F420 opens it into separated arcs with sky
// between them. Pushing the quarters outward left the frame at some press moments (holdvar19), so only the in-plane slide
// (aSlotSlide, which sets how far the quarters overlap; build [20, -12, 18, -20]) changes here: the radial extent stays.
export default {
  h20a: { tune: { aSlotSlide: [0, 0, 0, 0] } },
  h20b: { tune: { aSlotSlide: [-14, 14, -14, 14] } },
  h20c: { tune: { aSlotSlide: [14, -14, 14, -14] } },
  h20d: { tune: { aSlotSlide: [-24, 24, -24, 24] } },
};
