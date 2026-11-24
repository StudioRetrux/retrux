// The pale, stair-stepped patch at the massif's base in cursor-orbit views (ptr_top_left ~127-230, 405-432): the haze,
// fog, mist and region masks after the projector blend all read the REST projector's depth (pz, fp, d) and its fill
// source uv, even where the rest plate cannot see the fragment and an extra projector (orbN / orbP / hold / tilt)
// supplies its colour. There pz / fp belong to the rest plate's occluder or fill source (fp.y of the ridge, so baseK's
// x0.52-0.78 darkening and the haze switch off), and the effects jump at the rest depth map's occlusion boundary.
// hidX: tint fragments hidden from the rest plate but seen by an extra projector (magenta).
// fp1: ownK = extra share x rest-hidden; there the fragment's own position / depth drive haze, fog and masks, uv0
// keys the region masks, and the local-contrast references (farBand mb, baseK mbl, sampled from the REST plate) are
// neutralised (they would compare the extra plate's colour with another place's blur).
const BLEND_END = "    col = acc / wsum;\n  }\n#endif";
const OCCZ = "  float occZ = textureLod(uPlateDepth, clamp(uv0, vec2(0.0), vec2(1.0)), 0.0).r;";
export default {
  hidX: { plate: [[BLEND_END, "    col = acc / wsum;\n    col = mix(col, vec3(1.0, 0.0, 1.0), 0.6 * step(0.5, (1.0 - vis1) * (wsum - w0) / wsum));\n  }\n#endif"]] },
  fp1: {
    plate: [
      [OCCZ, OCCZ + "\n  float ownK = 0.0;"],
      [BLEND_END, `    col = acc / wsum;
    // Hidden from the rest plate but seen by an extra projector: haze, fog and masks at the fragment itself.
    ownK = (1.0 - vis1) * (wsum - w0) / wsum;
    if (ownK > 0.0) {
      pz = mix(pz, fz, ownK);
      fp = mix(fp, vWorldPos, ownK);
      d = distance(cameraPosition, fp);
      if (ownK > 0.5) uv = uv0;
    }
  }
#endif`],
      ["    vec3 mb = plateGrade(samplePlate(uv, lod + 2.5));", "    vec3 mb = mix(plateGrade(samplePlate(uv, lod + 2.5)), col, ownK);"],
      ["      vec3 mbl = plateGrade(samplePlate(uv, lod + 2.5));", "      vec3 mbl = mix(plateGrade(samplePlate(uv, lod + 2.5)), col, ownK);"],
    ],
  },
};
