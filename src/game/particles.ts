import * as THREE from "three";

export interface BurstParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

export class ParticlePool {
  readonly group = new THREE.Group();
  private pool: BurstParticle[] = [];

  constructor(scene: THREE.Scene, count: number) {
    const geo = new THREE.TetrahedronGeometry(0.12, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ffee88"),
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.visible = false;
      this.group.add(mesh);
      this.pool.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0 });
    }
    scene.add(this.group);
  }

  burst(origin: THREE.Vector3, lowPerf: boolean) {
    const count = lowPerf ? 5 : 11;
    let k = 0;
    for (const p of this.pool) {
      if (p.life > 0) continue;
      p.life = 0.45 + Math.random() * 0.15;
      p.mesh.visible = true;
      p.mesh.position.copy(origin);
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI;
      const s = 4 + Math.random() * 7;
      p.vx = Math.cos(a) * Math.sin(b) * s;
      p.vy = Math.abs(Math.cos(b)) * s * 0.8 + 2;
      p.vz = Math.sin(a) * Math.sin(b) * s;
      k++;
      if (k >= count) break;
    }
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= 18 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const m = p.mesh.material as THREE.MeshBasicMaterial;
      m.opacity = Math.max(0, p.life * 2);
      if (p.life <= 0) {
        p.mesh.visible = false;
        m.opacity = 0;
      }
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        ;(o.material as THREE.Material).dispose();
      }
    });
  }
}
