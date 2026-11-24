/**
 * P4 round 1, ENV lane (p4env; the P3 panel's tasks G1 / G4 / G3, notes/round11/p3/r11_1_plan.json).
 *
 * Switches (each restores MAIN's behaviour of its part exactly; read once at module load):
 *   ?p4env=0     the whole lane off (MAIN exactly: same programs, same textures, same frames)
 *   ?p4crest=0   G1 off: the CLOUD_RANGE occluder as MAIN (the rest plate's whole skyline, evaluated at 250 m)
 *   ?p4tex=0     G4 off (texels): MAIN's baked textures (no texel repairs)
 *   ?p4card=0    G4 off (slits): MAIN's card light (the drifting cards may take a dark texel's light down to black)
 *
 * P4 round 3, ENV lane (p4env3; the round-1 judge's J1-J7, notes/round11/lane_backup/p4r1/judge_p4env). Every round-3 part rides
 * on the round-1 part it changes, so `?p4env=0` still turns the whole lane off:
 *   ?p4env3=0    every round-3 part off (the round-1 lane exactly, i.e. the int1 build)
 *   ?p4rim=0     J3 off: the far ranges' crest test without the mesh-top floor (the warm rim on the far peak in the hold / pop)
 *   ?p4luma=0    J6 off: the cards' light floor per channel (round 1) instead of on the change's luma (dark texels may lose
 *                at most 40 % of their luma, as round 1; white-lit snow / rock 65 %, so the drifting cloud shadows keep MAIN's depth)
 *   ?p4webp=0    J7 off: the lossless repaired far-range texture (round 1) instead of its lossy q100 encode
 *   ?p4crack=0   J5 off: no plate depth for the cloud cards with the mirror lake (card 0 cuts the main summit: a white zig-zag)
 */
export type P4EnvFlags = {
  /** G1: the crest occluder holds only the far ranges (deeper than RANGE_DEPTH), each column tested at its own depth. */
  crest: boolean;
  /** G4 / G3: the repaired baked textures (the `*_p4.webp` beside MAIN's). */
  tex: boolean;
  /** G4: the drifting cards' light takes at most 40 % of a texel's value (no black crevice slits / specks). */
  card: boolean;
  /** Round 3 J3: the card is hidden below the far mesh's own top too (CREST_P4_TOP), not only below the plate's skyline band. */
  rim: boolean;
  /** Round 3 J6: the card light's floor bounds the change's luma (a dark texel loses at most 40 %, white-lit 65 %), not each channel. */
  luma: boolean;
  /** Round 3 J7: the repaired far-range texture as a lossy q100 WebP (`*_p4q.webp`, 39 KB) instead of the lossless 118 KB. */
  webp: boolean;
  /** Round 3 J5: with the mirror lake the cloud cards get the plate depth for a soft fade where a card cuts a mountain. */
  crack: boolean;
  /** Round 3 J5: the soft fade's depth range (m) in front of a surface. Lab: `?p4soft=m`. */
  softM: number;
  /** Round 3 J3: the floor's soft edge (plate uv): hidden below top - [0], full above top + [1]. Lab: `?p4rimband=lo,hi`. */
  rimBand: [number, number];
  /** Round 3 J6: the share of the luma the cards may take from a dark / a white-lit texel. Lab: `?p4lumafloor=dark,white`. */
  lumaFloor: [number, number];
};

export function p4envFromUrl(): P4EnvFlags {
  const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
  const off = q?.get("p4env") === "0";
  const on = (k: string) => !off && q?.get(k) !== "0";
  const on3 = (k: string) => on("p4env3") && q?.get(k) !== "0";
  const crest = on("p4crest");
  const tex = on("p4tex");
  const card = on("p4card");
  const band = (q?.get("p4rimband") ?? "").split(",").map(Number);
  const rimBand: [number, number] = band.length === 2 && band.every((v) => Number.isFinite(v)) ? [band[0], band[1]] : [0.001, 0.0005];
  const lf = (q?.get("p4lumafloor") ?? "").split(",").map(Number);
  const lumaFloor: [number, number] = lf.length === 2 && lf.every((v) => Number.isFinite(v)) ? [lf[0], lf[1]] : [0.4, 0.65];
  return { crest, tex, card, rim: crest && on3("p4rim"), luma: card && on3("p4luma"), webp: tex && on3("p4webp"), crack: on3("p4crack"), softM: Number(q?.get("p4soft")) > 0 ? Number(q?.get("p4soft")) : 20, rimBand, lumaFloor };
}

export const P4ENV: P4EnvFlags = p4envFromUrl();
