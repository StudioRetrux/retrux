// Ghost range: in the debug tints the band between the ghost's top and the real range took the same colour under two
// different plate tints, as if something nearly opaque sat on top. Hide the clouds: if the ghost goes, it is a cloud
// card culled along the projectors' (coarse, taller) view of the far range.
export const reset = "for (const m of h.env.cloudMaterials) m.visible = true;";
export default {
  noClouds: { js: "for (const m of h.env.cloudMaterials) m.visible = false;" },
};
