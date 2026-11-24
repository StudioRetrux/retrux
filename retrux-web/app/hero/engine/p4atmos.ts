/**
 * P4 round 3, ATMOS lane (p4atmos; the P3 panel's tasks Q5 / Q14, notes/round11/p3/r11_1_plan.json; panel environment items 1, 3,
 * 6 and color_grade item 1).
 *
 * Switches (each restores MAIN's behaviour of its part exactly; read once at module load):
 *   ?p4atmos=0     the whole lane off (MAIN exactly: the same program sources, uniforms and frames)
 *   ?atmoswl=0     Q5: no waterline mist at the iceberg and the right shore
 *   ?atmosveil2=0  item 1: the massif's veil as MAIN (full density up to its white-blue top: the hard horizontal stripe)
 *   ?atmosblue2=0  Q5 (4): the left bases' haze, the left bank's colours and the dark ridge's steady fog as MAIN
 *   ?fogbank=p4    Q14 ON (int2: OFF by default = MAIN's hold fog bank, one smooth scale, and its release, all of it lingering
 *                  0.6-2 s; `?fogbank=r11` or no value = that default): the new bank's billows and body + the release split
 *   ?atmosrel=0    (with ?fogbank=p4) Q14's release split alone as MAIN (the whole bank lingers 0.6-2 s; the billows and the body stay)
 *
 * Everything is spliced into MAIN's GLSL by exact-text replacement (p4Splice throws if a target is missing), so with a part off its
 * program source is MAIN's byte for byte. Tiers: the environment's hunks (PLATE_FRAG_P4, uniforms, values) are T1 / T2 only
 * (PlateEnvironment takes the tier); Q14's billows live in the chunk the plate and the water share (GLSL_PLATE_MIST, built at
 * module load), so they apply on T0 too, where they act only while the hold's fog is up (rest frames on T0 are MAIN's).
 */
import * as THREE from "three";

export type P4AtmosFlags = {
  /** Q5: the milky waterline mist along the iceberg's foot (PLATE_FRAG, after the mist layers). */
  wl: boolean;
  /** Item 1: the massif's veil thickens gradually towards the bank and its top is feathered, lower (no level stripe). */
  veil: boolean;
  /** Q5 (4): the left bases' haze and bank bluer (B up, R down), less steady fog on the dark ridge. */
  blue: boolean;
  /** Q14: the hold bank's two-scale billows with a dense body under the lumpy top (shared chunk: plate and water). */
  bank: boolean;
  /** Q14: after a release the bank above ~3 m clears with the camera (`?atmosrel=0`: MAIN's release, the billows stay). */
  rel: boolean;
};

export function p4atmosFromUrl(): P4AtmosFlags {
  const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
  const off = q?.get("p4atmos") === "0";
  const on = (k: string) => !off && q?.get(k) !== "0";
  // (int2, lead: MAIN's hold bank + release by default; `?fogbank=p4` = this lane's Q14.) P4 round 4, lane a4 (R4-Q6): with the
  // N1 fix the two-scale bank is the default again; `?fogbank=r11` = MAIN's bank; `?p4a4=0` / `?a4bank=0` = int2's choice.
  // (int3, lead, 21 Nov: the a4 hold bank and its release are OPT-IN (`?a4bank=1`): its release fix washed the iceberg after every
  // release (rejudge A4-RJ1); by default the hold bank and release stay int2's = MAIN's.)
  const a4bank = !off && q?.get("p4a4") !== "0" && q?.get("a4bank") === "1";
  const r11 = a4bank ? q?.get("fogbank") === "r11" : q?.get("fogbank") !== "p4";
  return { wl: on("atmoswl"), veil: on("atmosveil2"), blue: on("atmosblue2"), bank: !off && !r11, rel: on("atmosrel") && !r11 };
}

const g = (x: number) => x.toFixed(3);
/**
 * Judge F2: the waterline mist's amount at engine t 3.4 + 1.333 k (k 0..12 = Loop F000..F120 every 10 frames), fitted so the berg base
 * box (x 950-1150 y 420-455) follows the reference's series there (WORK fix/an/knots.txt; Loop video frames F000..F120): the needed
 * lift over MAIN / the layer's lift at amount 1, clamped 0..1.3. 0 at L030-L040: there the reference's mist sits on the berg's right
 * part (MAIN's own band already reads +14 over the base box at L030).
 */
export const P4_WL_KNOTS: number[] = [1.21, 1.09, 0.15, 0, 0, 0.94, 1.3, 1.29, 0.69, 0.7, 0.46, 0.57, 0.75];

export const P4ATMOS: P4AtmosFlags = p4atmosFromUrl();

/**
 * P4 round 4, lane a4 (atmosphere; notes/round11/p3/r11_3_plan.json R4-Q2 / R4-Q6). Switches (read once at module load; each
 * restores int2 = MAIN for its part exactly; `?p4a4=0` the whole lane, `?p4atmos=0` the round-3 lane and this one):
 *   ?a4wl=0     R4-Q2 1: the waterline mist as int2 (round 3's thin layer, its knots, amount 1 after the knots' stretch)
 *   ?a4floe=0   R4-Q2 2: no aerial haze / contact-AO floor on the mid-ground floe band
 *   ?a4foot=0   R4-Q2 3: the left bases' ground-mist bank at MAIN's amount
 *   ?a4far=0    R4-Q2 4: the far range right of the massif and the tall berg as int2 (gain, far haze)
 *   ?a4bank=0   R4-Q6 1: int2's hold bank choice (MAIN's bank; `?fogbank=p4` round 3's bank with its N1 stripe)
 *   ?fogbank=r11  MAIN's hold bank and release (the new bank's N1 fix off with it; `?fogbank=p4` = the default)
 *   ?a4berg=0 / ?berghold=r11   R4-Q6 2 / 3: the iceberg in the hold bank and its hold grade (halved, greyed) as int2
 */
export type P4A4Flags = { wl: boolean; floe: boolean; foot: boolean; far: boolean; bank: boolean; berg: boolean; rel: boolean };
export function p4a4FromUrl(a: P4AtmosFlags): P4A4Flags {
  const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
  const off = q?.get("p4a4") === "0" || q?.get("p4atmos") === "0";
  const on = (k: string) => !off && q?.get(k) !== "0";
  return {
    wl: on("a4wl") && a.wl,
    floe: on("a4floe"),
    foot: on("a4foot"),
    far: on("a4far"),
    // (int3: R4-Q6 1 and 2 / 3 opt-in, `?a4bank=1` / `?a4berg=1`; the rest parts wl / floe / foot / far stay on.)
    bank: !off && q?.get("a4bank") === "1" && a.bank,
    berg: !off && q?.get("a4berg") === "1" && q?.get("berghold") !== "r11",
    // (Fix round, judge A4-J1; only with the a4 bank: `?a4rel=0` = the 12:25 build's release split and the uHold-gated wisp.)
    rel: on("a4rel") && !off && q?.get("a4bank") === "1",
  };
}
export const P4A4: P4A4Flags = p4a4FromUrl(P4ATMOS);
/**
 * R4-Q2 1: the taller waterline layer's amount at the 13 Loop knots (engine t 3.4 + 1.333 k = Loop F000..F120), refit to the berg base
 * box series (x 950-1150 y 405-455) with the new layer: (REF - base) / (layer x1 - base), base = `?atmoswl=0` (WORK tools/knotfit.py,
 * an/knots.txt: the fit box then matches the Loop series by construction, the berg base box x 950-1150 y 420-455 within 3). After the stretch the
 * amount stays at 0.12 (rejudge N2: amount 1 there kept the base above the reference's range, mean 149 vs the Loop's 131 over t 26-120;
 * the layer-free base already averages ~127 there, 148 at t 90, and the layer at 0.2 still added +5..+11: an/an_a3.txt). k0 0.85 (fit 0.93): the iceberg
 * column x 1080-1120 y 405-445 read +9 over F000 at the fit's value.
 */
export const P4A4_WL_KNOTS: number[] = [0.85, 0.73, 0.2, 0, 0.22, 0.82, 0.76, 0.57, 0.3, 0.33, 0.27, 0.42, 0.55];
/** R4-Q2 1: uP4Wl (x / y the x edges (m), z amount, w cap) and uP4WlT (x thin top, y thick top, z edge, w top noise (m)). */
export const P4A4_WL: [[number, number, number, number], [number, number, number, number]] = [
  [2.0, 18.5, 0.45, 0.55],
  [2.2, 3.6, 1.4, 0.6],
];
export const P4A4_WL_C: [number, number, number] = [0.55, 0.74, 1.08];
/** R4-Q6: the waterline layer's top in the hold (m; uP4WlZ.z): a low bright base under F420's deep slate-blue berg. */
export const A4_WL_HOLD = 0.8;
export const P4A4_WL_LATE = 0.12;

/** Replaces `a` by `b` in `src`; throws if `a` is not there exactly once (a merge that moved the target must not pass silently). */
export function p4Splice(src: string, a: string, b: string, what: string): string {
  const i = src.indexOf(a);
  if (i < 0 || src.indexOf(a, i + 1) >= 0) throw new Error(`p4atmos: ${what}: target ${i < 0 ? "not found" : "not unique"}`);
  return src.slice(0, i) + b + src.slice(i + a.length);
}

/**
 * Runtime-tunable values (`__hero.env.p4atmosUniforms`), in the environment's materials only while the lane is on (not T0).
 *
 * Q5 waterline mist (uP4Wl*): measured on the reference's rest frames at the iceberg (x 1000-1150, 6-row bands; WORK
 * an/base_boxes.txt, rowprof): F000 / Loop F045 lift the berg's lower face from the engine's flat 114-124 to 139-150 at rows
 * 408-450 (world 0.4-2.0 m at ~70 m) under a soft top near row ~405 (~2 m), the reference's thin phase (S297) still +15..+20 in the
 * last ~0.6 m over the water (rows 438-456). So: a layer whose top rides between WL_TOP.x (thin) and WL_TOP.y (thick) m on the
 * iceberg's measured mist envelope (Atmos.ts bergEnvelope, the knots fitted to the reference's berg-foot series), with a soft edge
 * (WL_TOP.z m) and a drifting ~18 m fBm on its top (WL_TOP.w m) and density; it stays in the hold (F420's iceberg base is misty).
 *   uP4Wl:  x left edge (world x, m; full 4 m further right), y right edge (gone there, from 4.5 m before), z amount, w cap. The
 *           reference's base mist covers the berg's left and middle (x 950-1150 at rest, world x ~8-17 m) but not its right end (x
 *           1150-1240 stays dark: 101-111 at rows 400-424 in F000 / L045, where MAIN already reads +20) nor the far bergs and range
 *           beyond the berg (MAIN +7..+20 brighter than the reference there): it ends at ~20 m and at the berg's depth.
 *   uP4WlZ: x near edge (world z, m: beyond the right floes; full 4 m further out), y far edge (gone there, from 6 m before)
 *   uP4WlT: x thin top, y thick top, z edge, w top noise (m)
 *   uP4WlC: the mist's colour (scene-linear, post-grade; renders ~186,198,214, between the reference's milky base and its sky)
 * uP4Blue: the left bases' haze (the plain and the mountains' feet behind the lake, below ~3-6 m; rest, every mist state) x rgb,
 *   w its weight. Matched rest frames (x 0-520 rows 420-460; x 0-120 rows 380-430): the reference's B-R 46 / 41 / 42 / 36 at F000 /
 *   L030 / L045 / S297 vs MAIN's 38 / 38 / 37 / 31, the ridge's foot saturation 0.45-0.50 vs 0.34.
 * Veil (uP4Veil): x the fall-off under the top (m; MAIN's ATMOS_VEIL_H.w 1.8), y the top's drop (m), z the wisps' share of the top (m).
 */
export function createP4AtmosUniforms() {
  return {
    // (P4 round 4 a4, R4-Q2 1, `?a4wl=0` int2's: the layer ~2x taller, its top at 2.2-3.6 m (screen y ~395 at rest), denser (amount
    // 0.45, cap 0.55) and a little greyer, ~172,187,207 (the panel's 170,185,205); uP4WlZ.w: a forced knot amount (< 0: live).)
    uP4Wl: { value: P4A4.wl ? new THREE.Vector4(...P4A4_WL[0]) : new THREE.Vector4(2.0, 18.5, 0.3, 0.4) },
    uP4WlZ: { value: new THREE.Vector4(-38.0, -64.0, P4A4.wl ? A4_WL_HOLD : 0, P4A4.wl ? -1 : 0) },
    uP4WlT: { value: P4A4.wl ? new THREE.Vector4(...P4A4_WL[1]) : new THREE.Vector4(1.0, 2.0, 0.9, 0.45) },
    uP4WlC: { value: P4A4.wl ? new THREE.Color(...P4A4_WL_C) : new THREE.Color(0.66, 0.84, 1.16) },
    uP4Veil: { value: new THREE.Vector4(3.0, 0.5, 1.6, 0) },
    // P4 round 4 a4 (only read while its parts are on): R4-Q6 1 the bank body (x its top (m), y the top's puff swing (m), z the top's
    // ramp (m), w the lower edge's swell swing (m)) and its light floor (x the billow at puff 0, y + per puff, z the lower edge (m),
    // w the release split's base (m)); R4-Q2 4 the far right (x gain, y the far haze removed, z / w the rest plate x edge); R4-Q2 2 the
    // floe band (x haze weight, y the contact-AO floor (linear luma), z its power).
    uA4Bank: { value: new THREE.Vector4(...A4_BANK[0]) },
    uA4Bank2: { value: new THREE.Vector4(...A4_BANK[1]) },
    uA4Far: { value: new THREE.Vector4(...A4_FAR) },
    uA4Floe: { value: new THREE.Vector4(...A4_FLOE) },
    uA4Wisp: { value: new THREE.Vector4(...A4_WISP) },
    uA4Rel: { value: new THREE.Vector4(...A4_REL) },
    uA4Rel2: { value: new THREE.Vector4(...A4_REL2) },
    uP4Blue: { value: new THREE.Vector4(0.94, 0.99, 1.1, 1.0) },
  };
}
export type P4AtmosUniforms = ReturnType<typeof createP4AtmosUniforms>;

/**
 * Q5 (4): the left bank's colours (post-grade scene-linear) with the lane on: MAIN's ATMOS_BANK_HI_MIST3 / LO_MIST3 / the thin
 * veil x (0.95, 0.99, 1.07). At the reference's misty rest frames (Loop F045 t 9.4, S297 t 13.3) the left bases (x 0-520,
 * rows 420-460) read 151,168,193 / 161,176,197 vs MAIN's 139,154,176 / 156,169,187: bluer (B-R 42 / 36 vs 37 / 31).
 */
export const P4_BANK_TINT: [number, number, number] = [0.95, 0.99, 1.07];
/**
 * Q5 (4) "-15 % opacity over the dark ridge": the steady fog on the ridge's body (uAtmosBank.z, MAIN 0.7) and on its upper face
 * (uAtmosRidgeFit.w, MAIN 0.35). The ridge box x 0-100 rows 285-345 at F000 / L015 / L030 / L045 / S297: MAIN +16 / +16 / +15 / +16 / +4
 * over the reference, with these +14 / +14 / +14 / +14 / +2 (0.45 / 0.18: +13 .. +1, the rest is the bake's lighter rock).
 */
export const P4_RIDGE_FOG: [number, number] = [0.55, 0.25];
/** Item 1: the shade under the veil (Atmos.ts HAZE_SHADOW, uAtmosVeilSh2.z / .w) lowered with the veil's top (m). */
export const P4_VEIL_SHADE_DROP = 0.5;

/** R4-Q6 2: the iceberg's world box for the bank (x from, x to, z from, z to; m): GLSL_ATMOS_BERG's region (x 1-27, z -64..-38). */
export const A4_BERG_BOX: [number, number, number, number] = [1.0, 27.0, -68.0, -36.0];
/** R4-Q6 1: the bank body (uA4Bank: top (m), its puff swing (m), the top's ramp (m), the lower edge's swell swing (m)) and its light
 * floor (uA4Bank2: billow at puff 0, + per puff, the lower edge (m), the release split's base (m)). */
export const A4_BANK: [[number, number, number, number], [number, number, number, number]] = [
  [4.5, 2.0, 3.5, 3.0],
  [0.55, 0.45, 2.0, 1.0],
];
/** R4-Q2 4: the far range right of the massif and the tall berg: gain, the share of the far-field haze / slope haze / fog removed,
 * the rest plate's x edge (from, to). */
export const A4_FAR: [number, number, number, number] = [0.8, 0.6, 0.56, 0.64];
/** R4-Q2 3: the left bases' ground-mist bank: amount factor (x uAtmosBank.x; the plan's -35 %), its top's ragged amplitude (m; MAIN 1.2). */
export const A4_FOOT: [number, number] = [0.65, 1.5];
/** R4-Q6 4: the mid-flank wisp in the hold (uA4Wisp: weight, bottom (m), top (m), noise cell (m)). */
export const A4_WISP: [number, number, number, number] = [0.16, 6.0, 15.0, 20.0];
/** Fix round (judge A4-J1): the release split (uA4Rel: x the cut's base (m), y its noise swing (m), z its ramp (m), w the share of the
 * massif's upper bank that lingers with uFogHold instead of clearing with the dolly). */
export const A4_REL: [number, number, number, number] = [3.5, 2.5, 5.0, 0.6];
/** Fix round (judge A4-J1): the release veil (uA4Rel2: x its thinning on the dark ridge's body above ~1 m (the composite's own is
 * 0.45), y its amount). */
export const A4_REL2: [number, number, number, number] = [1.0, 1.0, 0, 0];
/** R4-Q2 2: the floe band's aerial haze weight (towards the fog colour) and its contact-AO floor (linear luma; power). */
export const A4_FLOE: [number, number, number, number] = [0.12, 0.05, 0.62, 0];
/** The shared far-shore chunk (GLSL_PLATE_MIST: the plate AND the water): Q14's two-scale billows in plateBank. */
export function p4atmosMist(src: string): string {
  let s = src;
  if (P4A4.berg) {
    s = p4Splice(
      s,
      "  return hold * reach * step(d, 330.0) * hgt * plateBankBillow;\n",
      `  // P4 round 4 a4 (R4-Q6 2, p4atmos.ts, ?a4berg=0): the iceberg and the water before it stay out of the bank (F420's berg reads as
  // F000's, deep slate-blue: face 78,108,144 vs MAIN's +30-40 there); a world box over its footprint (GLSL_ATMOS_BERG's x / z
  // region, any height) with >= 4 m soft edges, so no vertical curtain. Plate and water alike (this chunk), so the shore matches.
  float bkBerg = smoothstep(${g(A4_BERG_BOX[0])}, ${g(A4_BERG_BOX[0] + 4.5)}, p.x) * (1.0 - smoothstep(${g(A4_BERG_BOX[1] - 5.0)}, ${g(A4_BERG_BOX[1])}, p.x))
    * smoothstep(${g(A4_BERG_BOX[2])}, ${g(A4_BERG_BOX[2] + 6.0)}, p.z) * (1.0 - smoothstep(${g(A4_BERG_BOX[3] - 6.0)}, ${g(A4_BERG_BOX[3])}, p.z));
  return hold * reach * step(d, 330.0) * hgt * plateBankBillow * (1.0 - bkBerg);
`,
      "a4 bank berg",
    );
  }
  if (P4A4.bank) {
    s = p4Splice(
      s,
      "float plateBankBillow = 1.0;\n",
      "float plateBankBillow = 1.0;\n// (P4 round 4 a4, p4atmos.ts: the bank body's values; the puff state 0..1 at the last plateBank call, for the release split.)\nuniform vec4 uA4Bank;\nuniform vec4 uA4Bank2;\nfloat plateBankPuff = 0.5;\n",
      "a4 puff global",
    );
    s = p4Splice(
      s,
      "  if (hold <= 0.0) return 0.0;\n",
      `  if (hold <= 0.0) return 0.0;
  // (P4 round 4 a4, cost only: in the hold the bank's noise ran for every environment fragment, the sky card and the near foreground
  // included, where its result is exactly 0: no reach at 35 m or nearer, nothing past 330 m, nothing above the highest possible top
  // (7 + 3 x 0.75 + 0.2 m) or body edge (uA4Bank.x + 0.5 uA4Bank.y + 2 uA4Bank.w x 0.875 m). Same pixels, less work.)
  if (d <= 35.0 || d > 330.0 || p.y > max(9.5, uA4Bank.x + 0.5 * uA4Bank.y + 1.75 * uA4Bank.w) + 0.5) return 0.0;
`,
      "a4 bank early out",
    );
    return p4Splice(
      s,
      "  plateBankBillow = 0.6 + 0.4 * fbm(p * 0.035 + vec3(time * 0.014, 0.0, time * 0.006), 3);",
      `  // P4 Q14 (p4atmos.ts) + round 4 a4 (R4-Q6 1, ?fogbank=r11 / ?a4bank=0): two scales, as F358 / F420's dense billowing bank: the 28 m
  // swell plus ~8 m puffs rolling up and drifting with the wind (0.43 m/s), which also break the top into lumps.
  float pbS = fbm(p * 0.035 + vec3(time * 0.014, 0.0, time * 0.006), 3);
  float pbP = fbm(vec3((p.x + 0.43 * time) * 0.12, p.y * 0.2 - time * 0.05, p.z * 0.12 + time * 0.01), 2);
  float puff = smoothstep(-0.3, 0.3, 0.45 * pbS + pbP);
  plateBankPuff = puff;
  hgt = 1.0 - smoothstep(top - 5.0 + 3.0 * (puff - 0.5), top - 1.3 + 3.0 * (puff - 0.5), p.y);
  // The dense, light body under the lumps (F420's bank body, rows 500-540 x 120-320: L157-168). Round 3 gave it fixed heights (2-5.5 m)
  // and a billow floor only inside them: a straight light stripe with a darker gap under it (rejudge N1). Now its upper edge rides
  // the puffs (+-1 m) and its lower edge the swell (2 +- ~1.5 m), and the light floor reaches down to the bank's base, so the puff
  // gaps never re-open under it: no fixed-height line, a monotone fall towards the water as F420's.
  float pbHi = uA4Bank.x + uA4Bank.y * (puff - 0.5) + 2.0 * uA4Bank.w * pbS;
  float pbUp = 1.0 - smoothstep(pbHi - uA4Bank.z, pbHi, p.y);
  float pbLo = uA4Bank2.z + uA4Bank.w * pbS;
  hgt = max(hgt, pbUp * smoothstep(pbLo, pbLo + 1.2, p.y));
  plateBankBillow = mix(0.42 + 0.8 * puff, uA4Bank2.x + uA4Bank2.y * puff, pbUp);`,
      "a4 plateBank billow",
    );
  }
  if (!P4ATMOS.bank) return s;
  return p4Splice(
    s,
    "  plateBankBillow = 0.6 + 0.4 * fbm(p * 0.035 + vec3(time * 0.014, 0.0, time * 0.006), 3);",
    `  // P4 Q14 (p4atmos.ts, ?fogbank=r11): two scales, as F358 / F420's dense billowing bank (luma spread per 20 px band 20-52 there vs
  // 10-17 for the one smooth 28 m octave): the 28 m swell plus ~8 m puffs rolling up and drifting with the wind (0.43 m/s), which
  // also break the top into lumps.
  float pbS = fbm(p * 0.035 + vec3(time * 0.014, 0.0, time * 0.006), 3);
  float pbP = fbm(vec3((p.x + 0.43 * time) * 0.12, p.y * 0.2 - time * 0.05, p.z * 0.12 + time * 0.01), 2);
  // Puffs and gaps (value noise is soft: its fBm's sd ~0.2 left MAIN's +-0.1 billow invisible), contrast-stretched; above 1 the
  // bank's two-tone colour (plate and water alike) runs on to lighter puff tops, the density being capped by the callers.
  float puff = smoothstep(-0.3, 0.3, 0.45 * pbS + pbP);
  // (Its top ~2.5 m lower, in lumps of +-1.5 m: F420's massif face over the bank is dark slate, L119-123 at rows 440-480, x 120-320,
  // and its bank starts at row ~490, where MAIN's bank top reached L131-147; the bank's own rows 480-520 sd 18-23 there vs MAIN's 8.)
  hgt = 1.0 - smoothstep(top - 5.0 + 3.0 * (puff - 0.5), top - 1.3 + 3.0 * (puff - 0.5), p.y);
  // Judge F1: under the lumps a dense, light body (F420's bank body, rows 500-540 x 120-320: L157-168, sd 8-15) from ~2.5 to ~4.5 m, so
  // the gaps between the puffs no longer open down to the massif's dark foot (the lumpy top alone: rows 500-540 L137-155 at t 25 / 40
  // and the harness p06); its height is fixed (the top's fBm swings 7 +- 2 m over time) and it stays off near the ground and the water
  // (rows 540-600 already at or over F420's 168-150 there). Fitted over 9 hold samples (WORK fix/an/sweep2.txt).
  float pbBody = (1.0 - smoothstep(3.0, 5.5, p.y)) * smoothstep(2.0, 3.0, p.y);
  hgt = max(hgt, pbBody);
  plateBankBillow = mix(0.42 + 0.8 * puff, 0.75 + 0.47 * puff, pbBody);`,
    "plateBank billow",
  );
}

/** PLATE_FRAG (the environment's program, with GLSL_ATMOS_MIST inside): the lane's hunks. */
export function p4atmosFrag(src: string): string {
  let s = src;
  if (P4ATMOS.wl || P4ATMOS.veil || P4ATMOS.blue) {
    s = p4Splice(
      s,
      "uniform float uFogHold;     // the hold fog bank (follows the dolly in, lingers after a release)\n",
      `uniform float uFogHold;     // the hold fog bank (follows the dolly in, lingers after a release)
// P4 round 3, lane p4atmos (p4atmos.ts createP4AtmosUniforms).
uniform vec4 uP4Wl;
uniform vec4 uP4WlZ;
uniform vec4 uP4WlT;
uniform vec3 uP4WlC;
uniform vec4 uP4Blue;
`,
      "uniforms",
    );
  }
  if (P4ATMOS.veil) {
    // (The veil's uniform is declared before GLSL_ATMOS_MIST, which is spliced in above PLATE_FRAG's own uniforms.)
    s = p4Splice(s, "uniform vec4 uAtmosVeilP;     // x / y the wisps' density", "uniform vec4 uP4Veil;\nuniform vec4 uAtmosVeilP;     // x / y the wisps' density", "veil uniform");
    s = p4Splice(
      s,
      `        atmosHaze = hzK * smoothstep(uAtmosVeilH.x, uAtmosVeilH.y, hy) * (1.0 - smoothstep(top - uAtmosVeilH.w, top, hy))`,
      `        // P4 (p4atmos.ts, ?atmosveil2=0; P3 environment item 1: "a straight horizontal haze band crosses the face at y ~265-290; in
        // the reference the haze builds up gradually toward the base"): the top lower and feathered by the wisps, the density falling
        // off over uP4Veil.x m under it instead of MAIN's 1.8 m, so the bright upper colour never sits at full density in a level band.
        float topP4 = top - uP4Veil.y + uP4Veil.z * hw;
        atmosHaze = hzK * smoothstep(uAtmosVeilH.x, uAtmosVeilH.y, hy) * (1.0 - smoothstep(topP4 - uP4Veil.x, topP4, hy))`,
      "veil density",
    );
  }
  if (P4ATMOS.rel) {
    s = p4Splice(
      s,
      "    float bk = plateBank(d, fp, uFogHold, uTime) * (1.0 - 0.45 * ridgeBody * smoothstep(1.0, 6.0, fp.y)) * skyGate;\n",
      `    float bk = plateBank(d, fp, uFogHold, uTime) * (1.0 - 0.45 * ridgeBody * smoothstep(1.0, 6.0, fp.y)) * skyGate;
    // P4 Q14 (?fogbank=r11): after a release the bank above ~3 m clears with the camera (uHold, the dolly's share, over the
    // lingering uFogHold); only the low residue keeps the 0.6-2 s linger (F453 keeps a low bank, F460's mountain faces are clear:
    // the left ridge patch x 0-200 y 300-380 at p08 read 99/118/145 vs F460's 78/98/130). In the hold both are equal: unchanged.
${
        P4A4.bank && P4A4.rel
          ? `    {
      // P4 round 4 a4 fix round (judge A4-J1, ?a4rel=0 = the 12:25 split): after a release the residue had a level, flat top across the
      // dark ridge. Not the split alone: the a4 bank's own dense top (the body's 4.5 m edge, the lumpy top's 2-5.7 m ramp, the reach's
      // 2-4 m switch) sits at the release camera's eye height (2.65-2.85 m; the hold's is 2.17 m and nearer), so at every distance it
      // projects onto the horizon (even with no split: fix/an/j1_exp). So while the bank lingers past the dolly the near residue is a
      // soft veil with its own height profile instead: dense low down, fading over a wide ramp (uA4Rel.z m) from a base that rides a
      // ~12 m drifting noise (+-uA4Rel.y m) and the puffs, so it climbs the ridge unevenly and softly as F453 / F460's. The massif and the
      // far ranges (rest projector depth >= ~100 m; not the ridge's body, whose top reaches ~100 m) keep uA4Rel.w of the lingering bank
      // itself (0.6-2 s, uFogHold), so the mid flank stays veiled. In the hold uHold = uFogHold (rlK 1) and at rest uFogHold is 0: both skip this, unchanged.
      float rlK = smoothstep(0.0, 0.6, uHold / max(uFogHold, 1e-3));
      if (rlK < 1.0) {
        float rlF = smoothstep(92.0, 106.0, pz) * uPlateDepthOn * uA4Rel.w * (1.0 - ridgeBody);
        float rv = 0.0;
        // (Above x + y + z + 1 m the veil is exactly 0: its noise runs only below that, and only while the bank is out.)
        if (uFogHold > 0.0 && d > 35.0 && d <= 330.0 && fp.y < uA4Rel.x + uA4Rel.y + uA4Rel.z + 1.0) {
          float rlN = clamp(2.5 * fbm(vec3((fp.x + 0.43 * uTime) / 12.0, fp.z / 12.0 + 5.3, 0.02 * uTime + 1.1), 2), -1.0, 1.0);
          float rlLo = uA4Rel.x + uA4Rel.y * rlN + 1.5 * (plateBankPuff - 0.5);
          rv = uA4Rel2.y * uFogHold * smoothstep(35.0, 90.0, d) * (1.0 - smoothstep(rlLo - 1.0, rlLo + uA4Rel.z, fp.y)) * plateBankBillow
            * (1.0 - uA4Rel2.x * ridgeBody * smoothstep(1.0, 6.0, fp.y)) * skyGate;
        }
        // = mix(mix(rv, bk, rlK), bk, rlF): the near part hands over to the veil with the dolly's return, the far part lingers.
        bk = (1.0 - rlF) * (1.0 - rlK) * rv + mix(rlK, 1.0, rlF) * bk;
      }
    }
`
          : `    bk *= mix(1.0, smoothstep(0.0, 0.6, uHold / max(uFogHold, 1e-3)), ${P4A4.bank ? "smoothstep(uA4Bank2.w + 2.0 * plateBankPuff, uA4Bank2.w + 2.0 + 2.0 * plateBankPuff, fp.y)" : "smoothstep(2.0, 4.0, fp.y)"});
${P4A4.bank ? "    // (P4 round 4 a4, rejudge N1: the split's height band rides the bank's puffs, 1-3 m to 3-5 m, so the low residue it leaves has a\n    // ragged top; round 3's level 2-4 m band left the body's 2-3 m sliver as a straight streak at the release snap.)\n" : ""}`
      }`,
      "bank release",
    );
  }
  if (P4ATMOS.wl) {
    s = p4Splice(
      s,
      "#ifdef BAKED_EDGE\n  // Round 11 fix round: the view distance in alpha for EnvEdge",
      `#ifdef ATMOS_BERG
  {
    // P4 Q5 (p4atmos.ts, ?atmoswl=0; P3 environment item 3, color_grade item 1): the reference's milky waterline mist along the
    // iceberg and the right shore (F000, Loop F015-F045, F358, F420, F460: the berg's lower ~40 % veiled, the far bergs greyed). A
    // ground layer world-anchored over the far shore right of the hero and beyond the right floes; its top rises and falls with the
    // iceberg's measured mist envelope (BERG_ENV, Atmos.ts), lumpy and drifting with the wind. Not on the sky; in the hold too.
    float wlR = smoothstep(uP4Wl.x, uP4Wl.x + 4.0, fp.x) * (1.0 - smoothstep(uP4Wl.y - 4.5, uP4Wl.y, fp.x))
      * (1.0 - smoothstep(uP4WlZ.x - 4.0, uP4WlZ.x, fp.z)) * smoothstep(uP4WlZ.y, uP4WlZ.y + 6.0, fp.z) * skyGate;
    if (wlR > 0.0 && fp.y < uP4WlT.y + uP4WlT.z + uP4WlT.w) {
      float wlN = fbm(vec3((fp.x + 0.43 * uTime) / 18.0, fp.z / 18.0 + 3.7, uTime * 0.01), 2);
      float wlTop = mix(uP4WlT.x, uP4WlT.y, BERG_ENV(fp, uTime)) + uP4WlT.w * wlN;
${P4A4.wl ? "      // (P4 round 4 a4, R4-Q6: in the hold only a low bright base, uP4WlZ.z m; F420's berg is deep slate-blue down to it.)\n      wlTop = mix(wlTop, uP4WlZ.z + 0.3 * uP4WlT.w * wlN, uHold);\n" : ""}      float wl = wlR * (1.0 - smoothstep(wlTop - uP4WlT.z, wlTop + 0.35 * uP4WlT.z, fp.y)) * (0.85 + 0.3 * wlN);
      // Judge F2: its own amount over the reference's measured stretch (Loop F000-F120 every 10 frames = engine t 3.4 + 1.333 k), from
      // the berg base box (x 950-1150 y 420-455) the layer covers; BERG_ENV was fitted on the berg's right part (x 1060-1240), whose
      // mist peaks at L030-L040 while the base box dips there (L020 / L030 119 / 125 vs F000 149, L040 144: the mist drifts right).
      // After the stretch the envelope's own noise (BERG_ENV) carries it as before (cross-faded with bergEnvelope's own window).
      const float P4WLK[13] = float[13](${(P4A4.wl ? P4A4_WL_KNOTS : P4_WL_KNOTS).map(g).join(", ")});
      float wlS = max(uTime - 3.4, 0.0) / 1.3333;
      int wlI = int(min(floor(wlS), 12.0));
${P4A4.wl ? `      // (P4 round 4 a4, R4-Q2 1, ?a4wl=0: the knots refit to the taller layer; after the stretch a low amount, not 1 (rejudge N2);
      // uP4WlZ.w >= 0 forces the amount, for the fit's captures. The density broken along the shore by a ~7 m drifting noise.)
      float wlA = uP4WlZ.w >= 0.0 ? uP4WlZ.w : mix(mix(P4WLK[wlI], P4WLK[min(wlI + 1, 12)], smoothstep(0.0, 1.0, wlS - floor(wlS))), ${g(P4A4_WL_LATE)}, smoothstep(12.0, 15.0, wlS));
      wl *= 0.82 + 0.36 * smoothstep(-0.35, 0.35, fbm(vec3((fp.x + 0.43 * uTime) / 7.0, fp.y / 2.5, fp.z / 7.0 + 1.3), 2));` : `      float wlA = mix(mix(P4WLK[wlI], P4WLK[min(wlI + 1, 12)], smoothstep(0.0, 1.0, wlS - floor(wlS))), 1.0, smoothstep(12.0, 15.0, wlS));`}
      col = mix(col, uP4WlC * (0.97 + 0.06 * wlN), min(wl * uP4Wl.z * wlA, uP4Wl.w));
    }
  }
#endif
#ifdef BAKED_EDGE
  // Round 11 fix round: the view distance in alpha for EnvEdge`,
      "waterline",
    );
  }
  if (P4ATMOS.blue) {
    s = p4Splice(
      s,
      "#ifdef BAKED_EDGE\n  // Round 11 fix round: the view distance in alpha for EnvEdge",
      `  {
    // P4 Q5 (4) (p4atmos.ts, ?atmosblue2=0; P3 color_grade item 1 (c)): the haze at the left mountains' feet and over the plain behind
    // the lake bluer, as the reference's (a tonal shift on the composited colour; at rest, fading out with the hold's dolly).
    float blueK = smoothstep(-96.0, -88.0, fp.x) * (1.0 - smoothstep(-10.0, -4.0, fp.x)) * (1.0 - smoothstep(-62.0, -57.0, fp.z))
      * (1.0 - smoothstep(3.0, 6.0, fp.y)) * skyGate * (1.0 - uHold) * uP4Blue.w;
    col *= mix(vec3(1.0), uP4Blue.xyz, blueK);
  }
#ifdef BAKED_EDGE
  // Round 11 fix round: the view distance in alpha for EnvEdge`,
      "left blue",
    );
  }
  if (P4A4.far || P4A4.floe || P4A4.bank) {
    s = p4Splice(
      s,
      "uniform float uFogHold;     // the hold fog bank (follows the dolly in, lingers after a release)\n",
      `uniform float uFogHold;     // the hold fog bank (follows the dolly in, lingers after a release)\n// P4 round 4, lane a4 (p4atmos.ts createP4AtmosUniforms).\nuniform vec4 uA4Far;\nuniform vec4 uA4Floe;\nuniform vec4 uA4Wisp;\n${P4A4.bank && P4A4.rel ? "uniform vec4 uA4Rel;\nuniform vec4 uA4Rel2;\n" : ""}`,
      "a4 uniforms",
    );
  }
  if (P4A4.bank) {
    s = p4Splice(
      s,
      "  float fog = smoothstep(uFog.x, uFog.y, d)",
      `  {
    // P4 round 4 a4 (R4-Q6 4, ?a4bank=0 / ?fogbank=r11): one faint wisp on the massif's mid flank in the hold. F420 has a bright blue mist
    // wash over the mid face (200-330 x 360-440: 144,161,194) where the bank alone leaves the crisp dark slate (124,142,169): a veil over
    // the face above the bank (the rest projector's far surfaces, as the hold's slate term above), its height band and density broken
    // by a slow ~20 m fBm drifting with the wind; it follows the dolly (uHold) and is gone at rest.
${P4A4.rel ? "    // (Fix round, judge A4-J1, ?a4rel=0: it lingers with the bank, uFogHold, after a release; in the hold uFogHold = uHold.)\n" : ""}    float wsK = ${P4A4.rel ? "uFogHold" : "uHold"} * uA4Wisp.x * smoothstep(96.0, 104.0, pz) * step(pz, 330.0) * uPlateDepthOn * skyGate;
    if (wsK > 0.0 && fp.y > uA4Wisp.y - 5.0 && fp.y < uA4Wisp.z + 3.0) {
      float wn = fbm(vec3((fp.x + 0.43 * uTime) / uA4Wisp.w, fp.y / 6.0, fp.z / uA4Wisp.w + 2.9), 2);
      float wy = fp.y + 3.0 * wn;
      wsK *= smoothstep(uA4Wisp.y - 2.0, uA4Wisp.y + 2.0, wy) * (1.0 - smoothstep(uA4Wisp.z - 4.0, uA4Wisp.z, wy)) * smoothstep(-0.35, 0.3, wn);
      col = mix(col, uFogColor * vec3(0.85, 0.92, 1.05), wsK);
    }
  }
  float fog = smoothstep(uFog.x, uFog.y, d)`,
      "a4 wisp",
    );
  }
  if (P4A4.berg) {
    s = p4Splice(
      s,
      "  col = mix(col, max(mix(vec3(lumaI), col, mix(uAtmosGrade.x, 0.88, uHold)) * mix(uAtmosGrade.y, 0.95, uHold), vec3(0.0)), berg * (1.0 - 0.5 * uHold));\n",
      `  // (P4 round 4 a4, R4-Q6 3, ?berghold=r11 / ?a4berg=0: the rest grade in the hold too; QC round 8's halved, greyed hold grade read
  // +26 / +20 / +14 at saturation 0.29 vs F420's 102,127,160 at 0.39, and the reference's berg does not change from F000 to F420.)
  col = mix(col, max(mix(vec3(lumaI), col, uAtmosGrade.x) * uAtmosGrade.y, vec3(0.0)), berg);
`,
      "a4 berg hold grade",
    );
  }
  if (P4A4.far) {
    s = p4Splice(
      s,
      "  if (ridgeBody > 0.0) {\n    // 1-px bright specks along a diagonal",
      `  // P4 round 4 a4 (R4-Q2 4, ?a4far=0): the far range right of the massif and the tall berg behind the iceberg (rest plate x > ~0.62,
  // beyond the iceberg's depth) a touch darker, with less of the far haze below, so their grey ridges show as F000's (tall berg
  // 930-1080 x 330-390: 158,171,194 vs 171,186,205; right range 153,166,189 vs 164,178,198; far-right peaks sd 20.7 vs 13.5).
  float a4Far = smoothstep(uA4Far.z, uA4Far.w, fr.x) * smoothstep(88.0, 98.0, pz) * (1.0 - smoothstep(300.0, 330.0, pz)) * uPlateDepthOn
    * (1.0 - smoothstep(325.0, 340.0, distance(cameraPosition, vWorldPos)));
  col *= mix(1.0, uA4Far.x, a4Far);
  float a4FarH = 1.0 - uA4Far.y * a4Far;
  if (ridgeBody > 0.0) {
    // 1-px bright specks along a diagonal`,
      "a4 far gain",
    );
    s = p4Splice(
      s,
      "  col = mix(col, uFogColor * 0.85, smoothstep(60.0, 140.0, d) * step(d, 330.0) * 0.17 * (1.0 - 0.85 * uHold) * (1.0 - ridgeBody * 0.9) * skyGate);\n",
      "  col = mix(col, uFogColor * 0.85, smoothstep(60.0, 140.0, d) * step(d, 330.0) * 0.17 * (1.0 - 0.85 * uHold) * (1.0 - ridgeBody * 0.9) * skyGate * a4FarH);\n",
      "a4 far haze",
    );
    s = p4Splice(
      s,
      "  col = mix(col, uFogColor * vec3(0.9, 0.95, 1.02), slopeH * 0.15 * (1.0 - 0.7 * uHold) * skyGate);\n",
      "  col = mix(col, uFogColor * vec3(0.9, 0.95, 1.02), slopeH * 0.15 * (1.0 - 0.7 * uHold) * skyGate * a4FarH);\n",
      "a4 far slope haze",
    );
    s = p4Splice(
      s,
      "uFog.z * wispFog * shade * (1.0 - 0.33 * uHold);\n",
      "uFog.z * wispFog * shade * (1.0 - 0.33 * uHold) * a4FarH;\n",
      "a4 far fog",
    );
  }
  if (P4A4.floe) {
    s = p4Splice(
      s,
      "  col = mix(col, mix(uFogColor, footC, ridgeFoot), min(fog, 0.85));\n",
      `  col = mix(col, mix(uFogColor, footC, ridgeFoot), min(fog, 0.85));
  {
    // P4 round 4 a4 (R4-Q2 2, ?a4floe=0): the aerial fog starts at uFog.x (40 m) and never reached the mid-ground floes left of the
    // hero (d 25-70 m, below 4 m), whose baked contact AO is near-black: the reference's floe band (60-640 x 470-560) is lifted and
    // soft, 166,180,200 sd 21.7 p2 109 vs ours 157,173,195 sd 28.6 p2 79. A floor under the AO's darkest values (linear luma < floor,
    // on a power) and a light haze towards the fog colour; at rest (it fades out with the hold's dolly).
    float flK = smoothstep(25.0, 32.0, d) * (1.0 - smoothstep(60.0, 72.0, d)) * (1.0 - smoothstep(2.5, 4.0, fp.y)) * (1.0 - smoothstep(-6.0, -1.0, fp.x))
      * skyGate * (1.0 - uHold) * uPlateDepthOn;
    if (flK > 0.0) {
      float lf = dot(col, vec3(0.2126, 0.7152, 0.0722));
      if (lf < uA4Floe.y) col *= mix(1.0, uA4Floe.y * pow(max(lf, 1e-5) / uA4Floe.y, uA4Floe.z) / max(lf, 1e-5), flK);
      col = mix(col, uFogColor, uA4Floe.x * flK);
    }
  }
`,
      "a4 floe",
    );
  }
  return s;
}
