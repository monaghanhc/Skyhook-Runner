import { GRAPPLE_LATE_TOLERANCE_Z, GRAPPLE_RANGE_Z } from "./constants";
import type { GrappleAnchor, LaneIndex } from "./types";

export function findGrappleTarget(
  playerZ: number,
  lane: LaneIndex,
  anchors: GrappleAnchor[],
): { anchor: GrappleAnchor; landingZ: number } | null {
  let best: { anchor: GrappleAnchor; landingZ: number; score: number } | null = null;
  for (const a of anchors) {
    const dz = a.z - playerZ;
    if (dz < -GRAPPLE_LATE_TOLERANCE_Z || dz > GRAPPLE_RANGE_Z) continue;

    // Favor same-lane anchors, but permit adjacent lanes for recovery.
    const laneDelta = Math.abs(a.lane - lane);
    if (laneDelta > 1) continue;

    const lanePenalty = laneDelta * 2.4;
    const score = Math.abs(dz) + lanePenalty;
    if (!best || score < best.score) {
      best = { anchor: a, landingZ: a.z + 14, score };
    }
  }
  return best ? { anchor: best.anchor, landingZ: best.landingZ } : null;
}
