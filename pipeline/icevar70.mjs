// Round-10 hold-sweep MAJOR "straight dark-blue seam bars through the ice rings" (idle, intro, pop, hold). Hypothesis: the
// end caps of pieces that are NOT exactly at rest (uJoined 0: any pivot offset or rotation) enter the thickness pass and cut
// the thickness at every joint. k1: caps never enter the back pass (test only).
export const reset = "";
const BACK = (expr) => `
  for (const p of h.rings.pieces) {
    const b = p.mesh.userData.backMaterial;
    if (!b) continue;
    if (!b.userData.orig) b.userData.orig = b.fragmentShader;
    b.fragmentShader = ${expr};
    b.needsUpdate = true;
  }
`;
export default {
  k1: { js: BACK('b.userData.orig.replace("if (uJoined > 0.5) {", "if (true) {")') },
};
