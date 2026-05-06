import { GRAPPLE_RANGE_Z } from "./constants";
import type { GrappleAnchor, LaneIndex } from "./types";

export function findGrappleTarget(
  playerZ: number,
  lane: LaneIndex,
  anchors: GrappleAnchor[],
): { anchor: GrappleAnchor; landingZ: number } | null {
  let best: { anchor: GrappleAnchor; landingZ: number; dz: number } | null = null;
  for (const a of anchors) {
    if (a.lane !== lane) continue;
    const dz = a.z - playerZ;
    if (dz < -2 || dz > GRAPPLE_RANGE_Z) continue;
    if (!best || Math.abs(dz) < Math.abs(best.dz)) {
      best = { anchor: a, landingZ: a.z + 14, dz };
    }
  }
  return best ? { anchor: best.anchor, landingZ: best.landingZ } : null;
}
