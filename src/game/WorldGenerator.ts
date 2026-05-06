import { CHUNK_LENGTH, DIFFICULTY_SCORE_STEP } from "./constants";
import type { GrappleAnchor, LaneIndex, ObstacleKind } from "./types";

export interface FloorSegment {
  start: number;
  end: number;
}

export interface ChunkPlan {
  id: number;
  startZ: number;
  endZ: number;
  segments: FloorSegment[];
  hasGap: boolean;
  gapStartZ: number;
  gapEndZ: number;
  grapple?: GrappleAnchor;
  obstacles: { kind: ObstacleKind; lane: LaneIndex; z: number }[];
  coins: { lane: LaneIndex; z: number }[];
}

function randLane(): LaneIndex {
  return (Math.floor(Math.random() * 3) % 3) as LaneIndex;
}

/** difficulty 0..1 */
export function planChunk(
  startZ: number,
  id: number,
  score: number,
  menuOnly = false,
): ChunkPlan {
  const endZ = startZ + CHUNK_LENGTH;
  if (menuOnly) {
    return {
      id,
      startZ,
      endZ,
      segments: [{ start: startZ, end: endZ }],
      hasGap: false,
      gapStartZ: startZ,
      gapEndZ: startZ,
      obstacles: [],
      coins: [],
    };
  }

  const difficulty = Math.min(1, score / DIFFICULTY_SCORE_STEP);
  const gapRoll = Math.random() < 0.12 + difficulty * 0.22 && id > 2;

  let segments: FloorSegment[];
  let grapple: GrappleAnchor | undefined;
  let gapStartZ = startZ;
  let gapEndZ = startZ;

  if (gapRoll) {
    const gapLen = 8 + Math.floor(Math.random() * 5);
    const margin = 4;
    const gapStart = startZ + margin + Math.random() * (CHUNK_LENGTH - gapLen - margin * 2);
    const gapEnd = gapStart + gapLen;
    gapStartZ = gapStart;
    gapEndZ = gapEnd;
    segments = [
      { start: startZ, end: gapStart },
      { start: gapEnd, end: endZ },
    ];
    const lane = randLane();
    grapple = { lane, z: gapStart - 3.5, chunkId: id };
  } else {
    segments = [{ start: startZ, end: endZ }];
    gapStartZ = startZ;
    gapEndZ = startZ;
  }

  const obstacles: ChunkPlan["obstacles"] = [];
  const occupied: { lane: LaneIndex; z: number }[] = [];

  const tryPushObs = (lane: LaneIndex, z: number, kind: ObstacleKind) => {
    if (z < startZ + 3 || z > endZ - 3) return false;
    for (const o of occupied) {
      if (o.lane === lane && Math.abs(o.z - z) < 4.2) return false;
    }
    obstacles.push({ kind, lane, z });
    occupied.push({ lane, z });
    return true;
  };

  const obsCount = 2 + Math.floor(difficulty * 4 + Math.random() * 2);
  for (let i = 0; i < obsCount; i++) {
    const lane = randLane();
    const z = startZ + 5 + Math.random() * (CHUNK_LENGTH - 10);
    const roll = Math.random();
    let kind: ObstacleKind = "low";
    if (roll < 0.28 - difficulty * 0.05) kind = "high";
    else if (roll < 0.48) kind = "wall";
    else if (roll < 0.72 + difficulty * 0.08) kind = "drone";
    else if (roll < 0.88 + difficulty * 0.1) kind = "laser";
    else kind = "low";

    // Avoid spawning inside gap
    if (gapRoll && grapple) {
      const gs = gapStartZ;
      const ge = gapEndZ;
      if (z > gs - 1 && z < ge + 1) continue;
    }

    tryPushObs(lane, z, kind);
  }

  const coins: ChunkPlan["coins"] = [];
  const coinCount = 6 + Math.floor(Math.random() * 7 + difficulty * 4);
  for (let i = 0; i < coinCount; i++) {
    const lane = randLane();
    const z = startZ + 4 + Math.random() * (CHUNK_LENGTH - 8);
    let clash = false;
    for (const o of obstacles) {
      if (o.lane === lane && Math.abs(o.z - z) < 2.8) clash = true;
    }
    if (gapRoll && grapple) {
      const gs = gapStartZ;
      const ge = gapEndZ;
      if (z > gs - 2 && z < ge + 2) clash = true;
    }
    if (!clash) coins.push({ lane, z });
  }

  return {
    id,
    startZ,
    endZ,
    segments,
    hasGap: gapRoll,
    gapStartZ,
    gapEndZ,
    grapple,
    obstacles,
    coins,
  };
}

export function isOverSolidGround(z: number, segments: FloorSegment[]): boolean {
  for (const s of segments) {
    if (z >= s.start && z <= s.end) return true;
  }
  return false;
}

/** Neighbor chunks union segments for ground test */
export function mergeSegments(chunks: { segments: FloorSegment[] }[]): FloorSegment[] {
  const all: FloorSegment[] = [];
  for (const c of chunks) all.push(...c.segments);
  return all;
}

