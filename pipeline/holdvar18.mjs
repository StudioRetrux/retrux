// Round 7 composition (7.7): the hold is now too compact / tangled (~72 % of F420's width) with the orb's top half a bright
// dome; the reference flings the segments out with gaps around a flat "lips" ring that hides most of the orb.
// B back to ~-74 on screen inside the +20 pitch (bTiltDeg -94), less compaction, a horizontal spread of the side quarters.
export default {
  b94: { tune: { bTiltDeg: -94 } },
  b94c95: { tune: { bTiltDeg: -94, holdCompact: 0.95 } },
  b94c95h: { tune: { bTiltDeg: -94, holdCompact: 0.95, aOutH: 0.25 } },
  b94c1h: { tune: { bTiltDeg: -94, holdCompact: 1.0, aOutH: 0.3 } },
};
