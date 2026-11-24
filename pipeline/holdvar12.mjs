// T16 round 2: F402 / F420's ellipses are WIDER than tall (C / D ~0.75 h/w at F402, F420's centre ring ~70 deg back):
// the set is tipped about the horizontal axis, not yawed (yaw made tall ellipses, holdvar11).
export default {
  pm20: { tune: { holdPitchDeg: -20 } },
  pp20: { tune: { holdPitchDeg: 20 } },
  pm30: { tune: { holdPitchDeg: -30 } },
  pm20ym15: { tune: { holdPitchDeg: -20, holdYawDeg: -15 } },
  pm20yp15: { tune: { holdPitchDeg: -20, holdYawDeg: 15 } },
  pm20pt25: { tune: { holdPitchDeg: -20, portalTiltDeg: -25 } },
  pm20pt25p: { tune: { holdPitchDeg: -20, portalTiltDeg: 25 } },
};
