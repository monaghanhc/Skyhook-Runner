import { CHUNK_LENGTH, DIFFICULTY_SCORE_STEP } from "./constants";
import type { GrappleAnchor, LaneIndex, ObstacleKind } from "./types";

/** Chunks 0..INTRO_END-1: mostly jump-only obstacles, no gaps */
const INTRO_CHUNK_END = 9;
/** Chunks INTRO_END..MID_END-1: bridge difficulty before full mix */
const MID_CHUNK_END = 18;
/** Gaps require player to grapple — unlock later */
const GAP_MIN_CHUNK_ID = 14;
const GAP_MIN_SCORE = 520;
/** Minimum Z separation between obstacles in the same lane */
const LANE_BLOCK_SPACING_INTRO = 5.8;
const LANE_BLOCK_SPACING_NORMAL = 4.2;

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
  const gapEligible =
    id >= GAP_MIN_CHUNK_ID && score >= GAP_MIN_SCORE && Math.random() < 0.06 + difficulty * 0.16;
  const gapRoll = gapEligible;

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

  const laneSpacing =
    id < INTRO_CHUNK_END ? LANE_BLOCK_SPACING_INTRO : LANE_BLOCK_SPACING_NORMAL;

  const tryPushObs = (lane: LaneIndex, z: number, kind: ObstacleKind) => {
    if (z < startZ + 3 || z > endZ - 3) return false;
    for (const o of occupied) {
      if (o.lane === lane && Math.abs(o.z - z) < laneSpacing) return false;
    }
    obstacles.push({ kind, lane, z });
    occupied.push({ lane, z });
    return true;
  };

  let obsCount: number;
  if (id < INTRO_CHUNK_END) {
    if (id <= 1) obsCount = Math.random() < 0.55 ? 1 : 0;
    else if (id <= 4) obsCount = 1;
    else obsCount = Math.random() < 0.85 ? 1 : 2;
  } else if (id < MID_CHUNK_END) {
    obsCount = 1 + Math.floor(Math.random() * 2 + difficulty * 1.5);
    obsCount = Math.min(3, Math.max(1, obsCount));
  } else {
    obsCount = 2 + Math.floor(difficulty * 4 + Math.random() * 2);
    obsCount = Math.min(6, obsCount);
  }

  function pickObstacleKind(): ObstacleKind {
    if (id < INTRO_CHUNK_END) return "low";
    const roll = Math.random();
    if (id < MID_CHUNK_END) {
      if (roll < 0.55) return "low";
      if (roll < 0.82) return "high";
      if (roll < 0.93) return "wall";
      return Math.random() < 0.5 ? "drone" : "laser";
    }
    if (roll < 0.26 - difficulty * 0.05) return "high";
    if (roll < 0.46) return "wall";
    if (roll < 0.7 + difficulty * 0.08) return "drone";
    if (roll < 0.86 + difficulty * 0.1) return "laser";
    return "low";
  }

  for (let i = 0; i < obsCount; i++) {
    const lane = randLane();
    const z = startZ + 5 + Math.random() * (CHUNK_LENGTH - 10);
    const kind = pickObstacleKind();

    // Avoid spawning inside gap
    if (gapRoll && grapple) {
      const gs = gapStartZ;
      const ge = gapEndZ;
      if (z > gs - 1 && z < ge + 1) continue;
    }

    tryPushObs(lane, z, kind);
  }

  const coins: ChunkPlan["coins"] = [];
  const coinCount =
    id < INTRO_CHUNK_END
      ? 5 + Math.floor(Math.random() * 5)
      : 6 + Math.floor(Math.random() * 7 + difficulty * 4);
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

