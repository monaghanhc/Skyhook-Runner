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
      const min = new THREE.Vector3(laneX - 0.62, 0, z - 0.52);
      const max = new THREE.Vector3(laneX + 0.62, 0.82, z + 0.52);
      return { min, max };
    }
    case "high": {
      const min = new THREE.Vector3(laneX - 0.65, 0.75, z - 0.55);
      const max = new THREE.Vector3(laneX + 0.65, 2.2, z + 0.55);
      return { min, max };
    }
    case "wall": {
      const min = new THREE.Vector3(laneX - 0.62, 0, z - 0.52);
      const max = new THREE.Vector3(laneX + 0.62, 2.42, z + 0.52);
      return { min, max };
    }
    case "drone": {
      const min = new THREE.Vector3(laneX - 0.68, 1.1, z - 0.68);
      const max = new THREE.Vector3(laneX + 0.68, 1.8, z + 0.68);
      return { min, max };
    }
    case "laser": {
      const min = new THREE.Vector3(laneX - 0.98, 0.68, z - 0.22);
      const max = new THREE.Vector3(laneX + 0.98, 1.02, z + 0.22);
      return { min, max };
    }
    default: {
      const min = new THREE.Vector3(laneX - 0.5, 0, z - 0.5);
      const max = new THREE.Vector3(laneX + 0.5, 2, z + 0.5);
      return { min, max };
    }
  }
}
