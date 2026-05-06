import * as THREE from "three";
import type { LaneIndex, ObstacleKind } from "./types";
import { LANES } from "./constants";
import { buildObstacleAABB } from "./CollisionSystem";

export type MeshKind = "box" | "drone" | "laser";

const BOX_CAPACITY = 72;
const DRONE_CAPACITY = 36;
const LASER_CAPACITY = 24;

export interface ManagedObstacle {
  kind: ObstacleKind;
  lane: LaneIndex;
  z: number;
  meshKind: MeshKind;
  poolIndex: number;
  active: boolean;
}

export class ObstacleManager {
  readonly boxes: THREE.InstancedMesh;
  readonly drones: THREE.InstancedMesh;
  readonly lasers: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();

  readonly list: ManagedObstacle[] = [];

  private boxFree: boolean[] = [];
  private droneFree: boolean[] = [];
  private laserFree: boolean[] = [];

  constructor(scene: THREE.Scene) {
    const boxGeo = new THREE.BoxGeometry(1.1, 1, 1);
    const boxMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#4dd2ff"),
      emissive: new THREE.Color("#1188cc"),
      emissiveIntensity: 0.25,
      metalness: 0.4,
      roughness: 0.35,
    });
    this.boxes = new THREE.InstancedMesh(boxGeo, boxMat, BOX_CAPACITY);
    this.boxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.boxes.frustumCulled = false;

    // Duck-under drone: avoid gem-like silhouette so it doesn't read as a pickup.
    const droneGeo = new THREE.SphereGeometry(0.58, 10, 8);
    const droneMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#2a2f3a"),
      emissive: new THREE.Color("#ff1f3d"),
      emissiveIntensity: 0.9,
      metalness: 0.65,
      roughness: 0.18,
    });
    this.drones = new THREE.InstancedMesh(droneGeo, droneMat, DRONE_CAPACITY);
    this.drones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.drones.frustumCulled = false;

    const laserGeo = new THREE.BoxGeometry(2.6, 0.35, 0.45);
    const laserMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ff4444"),
      emissive: new THREE.Color("#ff0000"),
      emissiveIntensity: 0.9,
      metalness: 0.2,
      roughness: 0.2,
      transparent: true,
      opacity: 0.92,
    });
    this.lasers = new THREE.InstancedMesh(laserGeo, laserMat, LASER_CAPACITY);
    this.lasers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.lasers.frustumCulled = false;

    scene.add(this.boxes, this.drones, this.lasers);

    this.boxFree = Array.from({ length: BOX_CAPACITY }, () => true);
    this.droneFree = Array.from({ length: DRONE_CAPACITY }, () => true);
    this.laserFree = Array.from({ length: LASER_CAPACITY }, () => true);

    for (let i = 0; i < BOX_CAPACITY; i++) this.hideMesh(this.boxes, i);
    for (let i = 0; i < DRONE_CAPACITY; i++) this.hideMesh(this.drones, i);
    for (let i = 0; i < LASER_CAPACITY; i++) this.hideMesh(this.lasers, i);
  }

  private hideMesh(mesh: THREE.InstancedMesh, i: number) {
    this.dummy.position.set(0, -5000, 0);
    this.dummy.scale.setScalar(0);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(i, this.dummy.matrix);
  }

  clearAll() {
    for (const o of this.list) {
      if (!o.active) continue;
      o.active = false;
      this.releaseSlot(o);
    }
    this.list.length = 0;
    this.boxFree.fill(true);
    this.droneFree.fill(true);
    this.laserFree.fill(true);
    for (let i = 0; i < BOX_CAPACITY; i++) this.hideMesh(this.boxes, i);
    for (let i = 0; i < DRONE_CAPACITY; i++) this.hideMesh(this.drones, i);
    for (let i = 0; i < LASER_CAPACITY; i++) this.hideMesh(this.lasers, i);
    this.boxes.instanceMatrix.needsUpdate = true;
    this.drones.instanceMatrix.needsUpdate = true;
    this.lasers.instanceMatrix.needsUpdate = true;
  }

  private acquireSlot(kind: ObstacleKind): { meshKind: MeshKind; poolIndex: number } | null {
    if (kind === "drone") {
      const idx = this.droneFree.indexOf(true);
      if (idx === -1) return null;
      this.droneFree[idx] = false;
      return { meshKind: "drone", poolIndex: idx };
    }
    if (kind === "laser") {
      const idx = this.laserFree.indexOf(true);
      if (idx === -1) return null;
      this.laserFree[idx] = false;
      return { meshKind: "laser", poolIndex: idx };
    }
    const idx = this.boxFree.indexOf(true);
    if (idx === -1) return null;
    this.boxFree[idx] = false;
    return { meshKind: "box", poolIndex: idx };
  }

  private releaseSlot(o: ManagedObstacle) {
    if (o.meshKind === "box") {
      this.boxFree[o.poolIndex] = true;
      this.hideMesh(this.boxes, o.poolIndex);
    } else if (o.meshKind === "drone") {
      this.droneFree[o.poolIndex] = true;
      this.hideMesh(this.drones, o.poolIndex);
    } else {
      this.laserFree[o.poolIndex] = true;
      this.hideMesh(this.lasers, o.poolIndex);
    }
  }

  spawn(kind: ObstacleKind, lane: LaneIndex, z: number): ManagedObstacle | null {
    const slot = this.acquireSlot(kind);
    if (!slot) return null;
    const ob: ManagedObstacle = {
      kind,
      lane,
      z,
      meshKind: slot.meshKind,
      poolIndex: slot.poolIndex,
      active: true,
    };
    this.list.push(ob);
    this.refreshTransform(ob);
    return ob;
  }

  refreshTransform(o: ManagedObstacle) {
    const lx = LANES[o.lane];
    if (o.meshKind === "drone") {
      const pulse = 0.9 + Math.sin(performance.now() / 120 + o.poolIndex * 0.4) * 0.12;
      this.dummy.position.set(lx, 1.45, o.z);
      this.dummy.scale.setScalar(pulse);
      this.dummy.rotation.set(
        performance.now() / 900,
        performance.now() / 700,
        0,
      );
      this.dummy.updateMatrix();
      this.drones.setMatrixAt(o.poolIndex, this.dummy.matrix);
      this.drones.instanceMatrix.needsUpdate = true;
      return;
    }
    if (o.meshKind === "laser") {
      this.dummy.position.set(lx, 0.85, o.z);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(0, 0, Math.sin(performance.now() / 200) * 0.08);
      this.dummy.updateMatrix();
      this.lasers.setMatrixAt(o.poolIndex, this.dummy.matrix);
      this.lasers.instanceMatrix.needsUpdate = true;
      return;
    }

    // box mesh — scale per obstacle kind
    let sx = 1.15,
      sy = 1,
      sz = 1;
    let y = 0.45;
    if (o.kind === "low") {
      sy = 0.78;
      y = 0.38;
    } else if (o.kind === "high") {
      sy = 1.55;
      y = 1.2;
    } else if (o.kind === "wall") {
      sy = 2.35;
      y = 1.15;
    }

    this.dummy.position.set(lx, y, o.z);
    this.dummy.scale.set(sx, sy, sz);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.updateMatrix();
    this.boxes.setMatrixAt(o.poolIndex, this.dummy.matrix);
    this.boxes.instanceMatrix.needsUpdate = true;
  }

  updateAnimations() {
    for (const o of this.list) {
      if (o.active) this.refreshTransform(o);
    }
  }

  collectCollisionBoxes(playerZ: number, range: number): ManagedObstacle[] {
    const out: ManagedObstacle[] = [];
    for (const o of this.list) {
      if (!o.active) continue;
      if (Math.abs(o.z - playerZ) < range) out.push(o);
    }
    return out;
  }

  remove(ob: ManagedObstacle) {
    const i = this.list.indexOf(ob);
    if (i === -1) return;
    ob.active = false;
    this.releaseSlot(ob);
    this.list.splice(i, 1);
    if (ob.meshKind === "box") this.boxes.instanceMatrix.needsUpdate = true;
    if (ob.meshKind === "drone") this.drones.instanceMatrix.needsUpdate = true;
    if (ob.meshKind === "laser") this.lasers.instanceMatrix.needsUpdate = true;
  }

  getAABB(o: ManagedObstacle) {
    return buildObstacleAABB(LANES[o.lane], o.z, o.kind);
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.boxes, this.drones, this.lasers);
    this.boxes.geometry.dispose();
    this.drones.geometry.dispose();
    this.lasers.geometry.dispose();
    ;(this.boxes.material as THREE.Material).dispose();
    ;(this.drones.material as THREE.Material).dispose();
    ;(this.lasers.material as THREE.Material).dispose();
  }
}
