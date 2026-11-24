// The hold ghost range is the fog BANK (bisect ghostdbg4: no bank -> the band L194 -> 203, the sky 205). The bank gates on d
// from fp, which follows the REST projector: a backdrop (sky) fragment hidden from the rest plate behind the far range takes
// the range's ~180 m and passes the bank's d < 330 m, so the range's rest-view silhouette shows as a flat bank-coloured
// copy above the real range in the hold view. bankOwn: gate the bank on the fragment's own distance as well (the sky
// backdrop sits at ~360+ m from the hold camera; mountains keep their bank).
const BANK = "    float bk = plateBank(d, fp, uFogHold, uTime) * (1.0 - 0.45 * ridgeBody * smoothstep(1.0, 6.0, fp.y));";
export default {
  bankOwn: { plate: [[BANK, "    float bk = plateBank(d, fp, uFogHold, uTime) * (1.0 - 0.45 * ridgeBody * smoothstep(1.0, 6.0, fp.y)) * (1.0 - smoothstep(325.0, 340.0, distance(cameraPosition, vWorldPos)));"]] },
};
