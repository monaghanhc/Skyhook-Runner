import * as THREE from "three";
import type { AABB, ObstacleInstance } from "./types";

export function aabbIntersect(a: AABB, b: AABB): boolean {
  return (
    a.min.x <= b.max.x &&
    a.max.x >= b.min.x &&
    a.min.y <= b.max.y &&
    a.max.y >= b.min.y &&
    a.min.z <= b.max.z &&
    a.max.z >= b.min.z
  );
}

export function buildObstacleAABB(
  laneX: number,
  z: number,
  kind: ObstacleInstance["kind"],
): AABB {
  // Sizes tuned for gameplay readability
  switch (kind) {
    case "low": {
      const min = new THREE.Vector3(laneX - 0.65, 0, z - 0.55);
      const max = new THREE.Vector3(laneX + 0.65, 0.85, z + 0.55);
      return { min, max };
    }
    case "high": {
      const min = new THREE.Vector3(laneX - 0.65, 0.75, z - 0.55);
      const max = new THREE.Vector3(laneX + 0.65, 2.2, z + 0.55);
      return { min, max };
    }
    case "wall": {
      const min = new THREE.Vector3(laneX - 0.65, 0, z - 0.55);
      const max = new THREE.Vector3(laneX + 0.65, 2.45, z + 0.55);
      return { min, max };
    }
    case "drone": {
      const min = new THREE.Vector3(laneX - 0.75, 1.05, z - 0.75);
      const max = new THREE.Vector3(laneX + 0.75, 1.85, z + 0.75);
      return { min, max };
    }
    case "laser": {
      const min = new THREE.Vector3(laneX - 1.05, 0.65, z - 0.25);
      const max = new THREE.Vector3(laneX + 1.05, 1.05, z + 0.25);
      return { min, max };
    }
    default: {
      const min = new THREE.Vector3(laneX - 0.5, 0, z - 0.5);
      const max = new THREE.Vector3(laneX + 0.5, 2, z + 0.5);
      return { min, max };
    }
  }
}
