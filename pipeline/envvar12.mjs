// Hold fog bank / massif (round 5 env +0.5, grade +0.5): F420's massif is a crisp blue-grey alpine face (118,139,168)
// over a mid-tone blue-grey fog sea (148,165,186); ours is a pale soft massif (171,180,194) over a near-white band
// (186,192,203). Bank colour from uFogColor * 0.95 to a blue-grey ~ (148,165,186) / (204,210,221) per channel in
// linear (x 0.49 / 0.59 / 0.68), a steeper lower top, and less aerial wash on the faces.
const BANK = "col = mix(col, uFogColor * 0.95, min(plateBank(d, fp, uHold, uTime) * 0.45, 0.45));";
const BANKFN = "return hold * smoothstep(60.0, 120.0, d) * step(d, 330.0) * (1.0 - smoothstep(1.5, 10.0, p.y))";
const FAR = "col = mix(col, uFogColor * 0.85, smoothstep(60.0, 140.0, d) * step(d, 330.0) * 0.24 * (1.0 - ridge * 0.9));";
const blue = [BANK, "col = mix(col, uFogColor * vec3(0.49, 0.59, 0.68), min(plateBank(d, fp, uHold, uTime) * 0.6, 0.55));"];
const steep = [BANKFN, "return hold * smoothstep(60.0, 120.0, d) * step(d, 330.0) * (1.0 - smoothstep(0.8, 6.0, p.y))"];
const lessFar = [FAR, "col = mix(col, uFogColor * 0.85, smoothstep(60.0, 140.0, d) * step(d, 330.0) * 0.24 * (1.0 - 0.6 * uHold) * (1.0 - ridge * 0.9));"];
export default {
  blue: { plate: [blue] },
  blueSteep: { plate: [blue, steep] },
  blueSteepFar: { plate: [blue, steep, lessFar], js: "h.shared.uFog.value.z = 0.3;" },
};
