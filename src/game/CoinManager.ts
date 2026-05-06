import * as THREE from "three";
import type { CoinInstance, LaneIndex } from "./types";
import { LANES } from "./constants";

export class CoinManager {
  readonly mesh: THREE.InstancedMesh;
  private readonly pool: CoinInstance[] = [];
  private readonly dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, capacity: number) {
    const geo = new THREE.IcosahedronGeometry(0.28, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ffd966"),
      emissive: new THREE.Color("#ffaa00"),
      emissiveIntensity: 0.65,
      metalness: 0.35,
      roughness: 0.25,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < capacity; i++) {
      this.pool.push({
        lane: 0,
        z: 0,
        active: false,
        poolIndex: i,
      });
      this.hideInstance(i);
    }
    scene.add(this.mesh);
  }

  private hideInstance(i: number) {
    this.dummy.position.set(0, -5000, 0);
    this.dummy.scale.setScalar(0);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(i, this.dummy.matrix);
  }

  spawn(lane: LaneIndex, z: number): number | null {
    const free = this.pool.find((c) => !c.active);
    if (!free) return null;
    free.active = true;
    free.lane = lane;
    free.z = z;
    this.refreshInstance(free.poolIndex);
    return free.poolIndex;
  }

  releaseInZRange(zMin: number, zMax: number) {
    for (const c of this.pool) {
      if (c.active && c.z >= zMin && c.z <= zMax) this.releaseSlot(c.poolIndex);
    }
  }

  releaseSlot(index: number) {
    const c = this.pool[index];
    if (!c) return;
    c.active = false;
    this.hideInstance(index);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  refreshInstance(i: number) {
    const c = this.pool[i];
    if (!c?.active) return;
    this.dummy.position.set(LANES[c.lane], 0.55, c.z);
    this.dummy.scale.setScalar(1);
    this.dummy.rotation.y = performance.now() / 400 + i * 0.3;
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(i, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  updateMatrices() {
    for (const c of this.pool) {
      if (c.active) this.refreshInstance(c.poolIndex);
    }
  }

  tryCollect(
    playerAABB: { min: THREE.Vector3; max: THREE.Vector3 },
    playerZ: number,
  ): { index: number; x: number; y: number; z: number; lane: LaneIndex } | null {
    for (const c of this.pool) {
      if (!c.active) continue;
      const x = LANES[c.lane];
      const y = 0.55;
      const z = c.z;
      const dz = z - playerZ;
      if (
        Math.abs(dz) < 0.65 &&
        Math.abs(x - (playerAABB.min.x + playerAABB.max.x) / 2) < 0.55 &&
        playerAABB.min.y < y + 0.45 &&
        playerAABB.max.y > y - 0.35
      ) {
        return { index: c.poolIndex, x, y, z, lane: c.lane };
      }
    }
    return null;
  }

  clearAll() {
    for (const c of this.pool) {
      c.active = false;
      this.hideInstance(c.poolIndex);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    ;(this.mesh.material as THREE.Material).dispose();
  }
}
