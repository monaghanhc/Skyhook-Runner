import type * as THREE from "three";

export type LaneIndex = 0 | 1 | 2;

export type ObstacleKind = "low" | "high" | "wall" | "drone" | "laser";

export interface AABB {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface ObstacleInstance {
  kind: ObstacleKind;
  lane: LaneIndex;
  z: number;
  active: boolean;
  meshKind: "box" | "drone" | "laser";
  poolIndex: number;
}

export interface CoinInstance {
  lane: LaneIndex;
  z: number;
  active: boolean;
  poolIndex: number;
}

export interface GrappleAnchor {
  lane: LaneIndex;
  z: number;
  chunkId: number;
}

export interface ChunkSpec {
  id: number;
  startZ: number;
  length: number;
  hasGap: boolean;
  gapStartZ: number;
  gapEndZ: number;
  grapple?: GrappleAnchor;
}

export type PlayerMotion = "run" | "jump" | "slide" | "grapple" | "fall";

export interface HudSnapshot {
  score: number;
  coins: number;
  speed: number;
  best: number;
  distance: number;
}

export interface GameCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onGameOver: (payload: { score: number; coins: number; best: number; tutorial: boolean }) => void;
  onCoinPickup?: (worldPosition: THREE.Vector3, lane: LaneIndex) => void;
  onCrash?: () => void;
  onCountdownTick?: (n: number | "go") => void;
}
