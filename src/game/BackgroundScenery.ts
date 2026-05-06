import * as THREE from "three";

/**
 * Cosmetic skyline / sky layers only — no collisions, cheap instancing & wire shells.
 */
export class BackgroundScenery {
  readonly root = new THREE.Group();
  private buildings: THREE.InstancedMesh;
  private skyMotes: THREE.Points;
  private holoGrid: THREE.Mesh;
  private ribbons: THREE.Mesh[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly count: number;

  constructor(scene: THREE.Scene, perf: boolean) {
    this.count = perf ? 38 : 92;

    const box = new THREE.BoxGeometry(1, 1, 1);
    const wallMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#141f36"),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.buildings = new THREE.InstancedMesh(box, wallMat, this.count);
    this.buildings.frustumCulled = false;
    this.root.add(this.buildings);

    const motesN = perf ? 240 : 680;
    const positions = new Float32Array(motesN * 3);
    for (let i = 0; i < motesN; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 460;
      positions[i * 3 + 1] = 20 + Math.random() * 115;
      positions[i * 3 + 2] = -35 + Math.random() * 260;
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.skyMotes = new THREE.Points(
      mg,
      new THREE.PointsMaterial({
        color: 0xd28cff,
        size: perf ? 0.22 : 0.4,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    );
    this.root.add(this.skyMotes);

    const gridGeo = new THREE.PlaneGeometry(170, 100, 30, 16);
    const gridMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#173054"),
      wireframe: true,
      transparent: true,
      opacity: perf ? 0.07 : 0.13,
      depthWrite: false,
    });
    this.holoGrid = new THREE.Mesh(gridGeo, gridMat);
    this.holoGrid.rotation.x = -Math.PI / 2.26;
    this.holoGrid.position.set(0, -9, 96);
    this.root.add(this.holoGrid);

    if (!perf) {
      const mkRibbon = (x: number) => {
        const geo = new THREE.PlaneGeometry(150, 38);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color("#44f5ff"),
          transparent: true,
          opacity: 0.055,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.y = Math.PI / 2;
        mesh.position.set(x, 12, 58);
        return mesh;
      };
      const left = mkRibbon(-19);
      const right = mkRibbon(19);
      this.ribbons.push(left, right);
      this.root.add(left, right);
    }

    scene.add(this.root);
  }

  update(playerZ: number, t: number) {
    const stride = 18;
    const span = stride * 16;
    const phase = ((playerZ % span) + span) % span;

    for (let i = 0; i < this.count; i++) {
      const slot = i % 16;
      const bank = Math.floor(i / 16);
      const side = bank % 2 === 0 ? -1 : 1;
      const z = playerZ + 28 + slot * stride * 0.92 - phase * 0.22 + bank * 6;
      const w = 2.1 + ((i * 3) % 8) * 0.42;
      const h = 11 + ((i * 7) % 36);
      const d = 3.2 + ((i * 5) % 10) * 0.38;
      const x =
        side *
        (11.5 + ((bank >> 1) % 4) * 3.8 + Math.sin(t * 0.17 + i * 0.13) * 0.55);
      this.dummy.position.set(x, h * 0.5 - 6.2, z);
      this.dummy.scale.set(w, h, d);
      this.dummy.rotation.y = Math.sin(t * 0.12 + i * 0.18) * 0.075;
      this.dummy.updateMatrix();
      this.buildings.setMatrixAt(i, this.dummy.matrix);
    }
    this.buildings.instanceMatrix.needsUpdate = true;

    this.skyMotes.rotation.y = t * 0.016;
    this.skyMotes.rotation.x = Math.sin(t * 0.07) * 0.025;

    this.holoGrid.position.z = playerZ + 92 + Math.sin(t * 0.33) * 5;
    this.holoGrid.rotation.z = t * 0.028;

    for (let r = 0; r < this.ribbons.length; r++) {
      const rib = this.ribbons[r];
      if (!rib) continue;
      rib.position.z = playerZ + 66 + r * 5;
      const m = rib.material as THREE.MeshBasicMaterial;
      m.opacity = 0.038 + Math.sin(t * 1.25 + r * 2.1) * 0.02;
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.root);
    this.buildings.geometry.dispose();
    (this.buildings.material as THREE.Material).dispose();
    this.skyMotes.geometry.dispose();
    (this.skyMotes.material as THREE.Material).dispose();
    this.holoGrid.geometry.dispose();
    (this.holoGrid.material as THREE.Material).dispose();
    for (const rib of this.ribbons) {
      rib.geometry.dispose();
      (rib.material as THREE.Material).dispose();
    }
  }
}
