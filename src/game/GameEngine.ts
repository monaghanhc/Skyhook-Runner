import * as THREE from "three";
import {
  CHUNK_LENGTH,
  CHUNKS_AHEAD,
  INITIAL_SPEED,
  LANES,
  MAX_SPEED,
  SPEED_RAMP_PER_SEC,
  STORAGE_BEST,
} from "./constants";
import type { ChunkPlan } from "./WorldGenerator";
import { mergeSegments, planChunk, isOverSolidGround } from "./WorldGenerator";
import { CoinManager } from "./CoinManager";
import { ObstacleManager, type ManagedObstacle } from "./ObstacleManager";
import { PlayerController } from "./PlayerController";
import { InputManager } from "./InputManager";
import { AudioManager } from "./AudioManager";
import { aabbIntersect } from "./CollisionSystem";
import { findGrappleTarget } from "./GrappleSystem";
import type { GameCallbacks, GrappleAnchor } from "./types";
import { ParticlePool } from "./particles";
import { BackgroundScenery } from "./BackgroundScenery";

type EngineMode = "menu" | "playing";

export interface EngineControllerOptions {
  canvas: HTMLCanvasElement;
  callbacks: GameCallbacks;
  performanceMode: boolean;
  /** Invincible scenic run for menu backdrop */
  attractMode?: boolean;
}

interface RuntimeChunk {
  plan: ChunkPlan;
  floors: THREE.Mesh[];
  anchors: THREE.Mesh[];
  obstacleRefs: ManagedObstacle[];
  coinIndices: number[];
}

export class GameEngine {
  private readonly canvas: HTMLCanvasElement;
  private callbacks: GameCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  private input = new InputManager();
  private audio = new AudioManager();

  private player = new PlayerController();
  private coins!: CoinManager;
  private obstacles!: ObstacleManager;
  private particles!: ParticlePool;

  private playerRig = new THREE.Group();
  private grappleLine!: THREE.Line;

  private runtimeChunks: RuntimeChunk[] = [];
  private nextChunkId = 0;
  private furthestZ = 0;

  private anchors: GrappleAnchor[] = [];

  private forwardSpeed = INITIAL_SPEED;
  private runAge = 0;
  private coinsCollected = 0;
  private distanceBase = 0;

  private shake = new THREE.Vector3();
  private crashSlow = 0;

  private mode: EngineMode = "menu";
  private paused = false;
  private attractMode = false;

  private perf = false;

  private sharedFloorGeo: THREE.BoxGeometry;
  private floorSharedMat!: THREE.MeshStandardMaterial;
  private edgeSharedMat!: THREE.MeshStandardMaterial;

  private dead = false;
  /** Cancels delayed game-over if a new run starts before the timeout fires */
  private runGeneration = 0;

  private animationId = 0;
  private backdrop!: BackgroundScenery;
  private backdropTime = 0;

  constructor(options: EngineControllerOptions) {
    this.canvas = options.canvas;
    this.callbacks = options.callbacks;
    this.perf = options.performanceMode;
    this.attractMode = options.attractMode ?? false;
    this.sharedFloorGeo = new THREE.BoxGeometry(1, 1, 1);

    this.initThree();
    this.input.attach(this.canvas);
    window.addEventListener("resize", this.onResize);
    this.loop = this.loop.bind(this);
    this.animationId = requestAnimationFrame(this.loop);
  }

  setCallbacks(cb: GameCallbacks) {
    this.callbacks = cb;
  }

  setMusicEnabled(on: boolean) {
    this.audio.setMusicEnabled(on);
  }

  getMusicEnabled() {
    return this.audio.getMusicEnabled();
  }

  setInvertHorizontalSwipe(enabled: boolean) {
    this.input.setInvertHorizontalSwipe(enabled);
  }

  setPerformanceMode(v: boolean) {
    this.perf = v;
    this.applyPixelRatio();
    this.scene.fog = this.perf
      ? new THREE.FogExp2(0x070b14, 0.028)
      : new THREE.FogExp2(0x050811, 0.038);
  }

  setAttractMode(v: boolean) {
    this.attractMode = v;
    this.resetWorld(true);
  }

  setPaused(v: boolean) {
    this.paused = v;
  }

  /** Begin gameplay after countdown */
  beginPlay() {
    this.runGeneration++;
    this.mode = "playing";
    this.attractMode = false;
    this.dead = false;
    this.resetWorld(false);
    this.paused = false;
    this.audio.resume();
    this.audio.startGameplaySounds();
  }

  /** Return to menu attract */
  backToMenu() {
    this.runGeneration++;
    this.mode = "menu";
    this.attractMode = true;
    this.resetWorld(true);
    this.forwardSpeed = INITIAL_SPEED * 0.85;
  }

  dispose() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener("resize", this.onResize);
    this.input.detach();
    this.backdrop.dispose(this.scene);
    this.particles.dispose(this.scene);
    this.coins.dispose(this.scene);
    this.obstacles.dispose(this.scene);
    this.sharedFloorGeo.dispose();
    this.floorSharedMat.dispose();
    this.edgeSharedMat.dispose();
    this.renderer.dispose();
  }

  private initThree() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04070f);
    scene.fog = this.perf
      ? new THREE.FogExp2(0x070b14, 0.028)
      : new THREE.FogExp2(0x050811, 0.038);
    this.scene = scene;

    this.camera = new THREE.PerspectiveCamera(
      62,
      this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight),
      0.1,
      320,
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.perf,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.applyPixelRatio();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.perf ? 1.05 : 1.18;

    const hemi = new THREE.HemisphereLight(0x6688ff, 0x04060a, 0.9);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xaaccff, this.perf ? 0.55 : 0.85);
    dir.position.set(8, 18, -10);
    scene.add(dir);
    if (!this.perf) {
      dir.castShadow = false;
    }

    this.coins = new CoinManager(scene, this.perf ? 240 : 420);
    this.obstacles = new ObstacleManager(scene);
    this.particles = new ParticlePool(scene, this.perf ? 18 : 44);

    this.floorSharedMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#132038"),
      emissive: new THREE.Color("#1c3a66"),
      emissiveIntensity: 0.25,
      metalness: 0.55,
      roughness: 0.35,
    });
    this.edgeSharedMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#00ffff"),
      emissive: new THREE.Color("#00ddff"),
      emissiveIntensity: this.perf ? 0.55 : 0.85,
      metalness: 0.3,
      roughness: 0.25,
    });

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starPos: number[] = [];
    for (let i = 0; i < (this.perf ? 400 : 900); i++) {
      starPos.push(
        (Math.random() - 0.5) * 420,
        40 + Math.random() * 120,
        -80 + Math.random() * 260,
      );
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xaaccff,
        size: this.perf ? 0.35 : 0.55,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    scene.add(stars);

    this.backdrop = new BackgroundScenery(scene, this.perf);

    // Player visual
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x44ffcc,
      emissive: 0x114433,
      emissiveIntensity: 0.35,
      metalness: 0.35,
      roughness: 0.4,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.35), bodyMat);
    body.position.y = 0.55;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.4), bodyMat);
    head.position.y = 1.18;
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.12, 0.15),
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: 0x00ffff,
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.15,
      }),
    );
    visor.position.set(0, 1.22, 0.18);
    this.playerRig.add(body, head, visor);
    scene.add(this.playerRig);

    const ropeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    this.grappleLine = new THREE.Line(
      ropeGeo,
      new THREE.LineBasicMaterial({
        color: 0x66ffff,
        transparent: true,
        opacity: 0.85,
      }),
    );
    this.grappleLine.frustumCulled = false;
    scene.add(this.grappleLine);
    this.grappleLine.visible = false;

    this.resetWorld(true);
  }

  private applyPixelRatio() {
    const cap = this.perf ? 1 : 2;
    const pr = Math.min(window.devicePixelRatio, cap);
    this.renderer.setPixelRatio(pr);
  }

  private onResize = () => {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private resetWorld(menuStyle: boolean) {
    this.dead = false;
    this.runtimeChunks.forEach((c) => {
      for (const m of c.floors) {
        this.scene.remove(m);
        // Shared floor geometry + shared materials — only dispose rim clones' geo if unique
        if (m.geometry !== this.sharedFloorGeo) m.geometry.dispose();
      }
      for (const a of c.anchors) {
        this.scene.remove(a);
        a.geometry.dispose();
        ;(a.material as THREE.Material).dispose();
      }
      for (const o of c.obstacleRefs) this.obstacles.remove(o);
      this.coins.releaseInZRange(c.plan.startZ, c.plan.endZ);
    });
    this.runtimeChunks = [];
    this.coins.clearAll();
    this.obstacles.clearAll();
    this.anchors = [];
    this.nextChunkId = 0;
    this.furthestZ = 0;
    this.player.reset(4);
    this.forwardSpeed = INITIAL_SPEED * (menuStyle ? 0.82 : 1);
    this.runAge = 0;
    this.coinsCollected = 0;
    this.distanceBase = this.player.z;
    this.crashSlow = 0;

    // Seed chunks
    let z = 0;
    const scoreHint = menuStyle ? 0 : 0;
    for (let i = 0; i < CHUNKS_AHEAD + 2; i++) {
      this.spawnChunkAt(z, scoreHint, menuStyle);
      z += CHUNK_LENGTH;
    }
    this.furthestZ = z;
  }

  private spawnChunkAt(startZ: number, score: number, menuStyle: boolean) {
    const id = this.nextChunkId++;
    const plan = planChunk(startZ, id, menuStyle ? 0 : score, menuStyle);
    const floors: THREE.Mesh[] = [];
    const anchors: THREE.Mesh[] = [];
    const obstacleRefs: ManagedObstacle[] = [];
    const coinIndices: number[] = [];

    for (const seg of plan.segments) {
      const len = seg.end - seg.start;
      const mid = (seg.start + seg.end) / 2;
      const floor = new THREE.Mesh(this.sharedFloorGeo, this.floorSharedMat);
      floor.scale.set(8.8, 0.42, len);
      floor.position.set(0, -0.18, mid);
      this.scene.add(floor);
      floors.push(floor);

      if (!this.perf) {
        const rim = new THREE.Mesh(this.sharedFloorGeo, this.edgeSharedMat);
        rim.scale.set(8.95, 0.06, 0.35);
        rim.position.set(0, 0.14, seg.start + 0.6);
        this.scene.add(rim);
        floors.push(rim);
        const rim2 = rim.clone();
        rim2.position.z = seg.end - 0.6;
        this.scene.add(rim2);
        floors.push(rim2);
      }
    }

    if (!menuStyle) {
      for (const o of plan.obstacles) {
        const ref = this.obstacles.spawn(o.kind, o.lane, o.z);
        if (ref) obstacleRefs.push(ref);
      }
      for (const c of plan.coins) {
        const idx = this.coins.spawn(c.lane, c.z);
        if (idx !== null) coinIndices.push(idx);
      }
    }

    if (plan.grapple && !menuStyle) {
      this.anchors.push(plan.grapple);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#66ffff"),
        emissive: new THREE.Color("#00ffff"),
        emissiveIntensity: this.perf ? 1.1 : 1.6,
        metalness: 0.2,
        roughness: 0.2,
      });
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), mat);
      ball.position.set(LANES[plan.grapple.lane], 4.4, plan.grapple.z);
      this.scene.add(ball);
      anchors.push(ball);
    }

    this.runtimeChunks.push({
      plan,
      floors,
      anchors,
      obstacleRefs,
      coinIndices,
    });
  }

  private recycleChunks(menuStyle: boolean) {
    const keepZ = this.player.z - CHUNK_LENGTH * 2;
    const score = Math.max(
      0,
      Math.floor((this.player.z - this.distanceBase) * 12) + this.coinsCollected * 125,
    );

    this.runtimeChunks = this.runtimeChunks.filter((rc) => {
      if (rc.plan.endZ < keepZ) {
        for (const m of rc.floors) {
          this.scene.remove(m);
          if (m.geometry !== this.sharedFloorGeo) m.geometry.dispose();
        }
        for (const a of rc.anchors) {
          this.scene.remove(a);
          a.geometry.dispose();
          ;(a.material as THREE.Material).dispose();
        }
        for (const o of rc.obstacleRefs) this.obstacles.remove(o);
        this.coins.releaseInZRange(rc.plan.startZ, rc.plan.endZ);
        this.anchors = this.anchors.filter((an) => an.chunkId !== rc.plan.id);
        return false;
      }
      return true;
    });

    while (this.furthestZ < this.player.z + CHUNK_LENGTH * CHUNKS_AHEAD) {
      this.spawnChunkAt(this.furthestZ, score, menuStyle);
      this.furthestZ += CHUNK_LENGTH;
    }
  }

  private loop() {
    const dtRaw = this.clock.getDelta();
    const dt = Math.min(0.033, dtRaw) * (this.crashSlow > 0 ? 0.35 : 1);
    if (this.crashSlow > 0) this.crashSlow -= dtRaw;

    const menuStyle = this.mode === "menu" || this.attractMode;

    if (!this.paused) {
      this.step(dt, menuStyle);
    }

    // Camera
    const target = new THREE.Vector3(
      this.player.x,
      this.player.y + 3.3,
      this.player.z - 13,
    );
    target.add(this.shake);
    this.camera.position.lerp(target, 0.14);
    this.camera.lookAt(this.player.x, this.player.y + 1.4, this.player.z + 8);
    this.shake.multiplyScalar(0.82);

    // Visual rig
    const slide = this.player.slideTimer > 0;
    this.playerRig.position.set(this.player.x, this.player.y, this.player.z);
    this.playerRig.scale.set(1, slide ? 0.62 : 1, 1);
    this.playerRig.rotation.z = slide ? 0.35 : Math.sin(this.runAge * 14) * 0.06;

    this.obstacles.updateAnimations();
    this.coins.updateMatrices();
    this.particles.update(dtRaw);

    this.backdropTime += dtRaw;
    this.backdrop.update(this.player.z, this.backdropTime);

    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.loop);
  }

  private step(dt: number, menuStyle: boolean) {
    if (this.dead && !menuStyle) return;

    this.runAge += dt;

    if (!menuStyle) {
      this.forwardSpeed = Math.min(
        MAX_SPEED,
        INITIAL_SPEED + this.runAge * SPEED_RAMP_PER_SEC,
      );
    } else {
      this.forwardSpeed = INITIAL_SPEED * 0.82;
    }

    const intent = this.input.laneIntent();
    const jump = this.input.consumeJump();
    const slide = this.input.consumeSlide();
    const grappleWant = this.input.consumeGrapple();
    if (this.input.consumePause()) {
      /* pause handled by React HUD */
    }

    const merged = mergeSegments(this.runtimeChunks.map((c) => c.plan));
    const solid = isOverSolidGround(this.player.z, merged);

    if (
      !menuStyle &&
      this.player.motion !== "grapple" &&
      this.player.y <= 0.06 &&
      this.player.vy <= 0 &&
      !solid
    ) {
      if (this.player.motion !== "fall") this.player.triggerFall();
    }

    let onGround =
      this.player.y <= 0.001 &&
      this.player.vy <= 0 &&
      this.player.motion !== "grapple" &&
      solid;

    // Grapple attempt
    if (
      grappleWant &&
      !menuStyle &&
      this.player.motion !== "grapple" &&
      this.player.motion !== "fall"
    ) {
      const hit = findGrappleTarget(this.player.z, this.player.lane, this.anchors);
      if (hit) {
        // landing past gap end
        const chunk = this.runtimeChunks.find((c) => c.plan.id === hit.anchor.chunkId);
        let landing = hit.landingZ;
        if (chunk?.plan.hasGap) {
          landing = chunk.plan.gapEndZ + 3;
        }
        this.player.beginGrapple(hit.anchor, landing);
        this.audio.playGrapple();
        this.grappleLine.visible = true;
      }
    }

    if (this.player.motion !== "grapple") {
      this.grappleLine.visible = false;
    } else {
      const a = new THREE.Vector3(
        LANES[this.player.grappleLane],
        4.4,
        this.player.grappleStartZ + (this.player.grappleEndZ - this.player.grappleStartZ) * 0.35,
      );
      const b = new THREE.Vector3(this.player.x, this.player.y + 1.1, this.player.z);
      this.grappleLine.geometry.setFromPoints([b, a]);
      this.grappleLine.visible = true;
    }

    this.player.update(
      dt,
      intent,
      jump,
      slide,
      this.forwardSpeed,
      onGround,
    );

    if (jump && onGround && !menuStyle) this.audio.playJump();

    // Collisions
    if (!menuStyle && this.player.motion !== "grapple" && this.player.motion !== "fall") {
      const pbox = this.player.getAABB();
      const near = this.obstacles.collectCollisionBoxes(this.player.z, 28);
      for (const o of near) {
        const obox = this.obstacles.getAABB(o);
        if (aabbIntersect(pbox, obox)) {
          this.triggerCrash();
          return;
        }
      }
    }

    // Coins
    if (!menuStyle && this.player.motion !== "fall") {
      const hit = this.coins.tryCollect(
        this.player.getAABB(),
        this.player.z,
      );
      if (hit) {
        this.coinsCollected++;
        this.coins.releaseSlot(hit.index);
        this.audio.playCoin();
        this.callbacks.onCoinPickup?.(
          new THREE.Vector3(hit.x, hit.y, hit.z),
          hit.lane,
        );
        this.particles.burst(new THREE.Vector3(hit.x, hit.y, hit.z), this.perf);
      }
    }

    if (!menuStyle && this.player.motion === "fall" && this.player.y < -14) {
      this.triggerCrash(true);
      return;
    }

    this.recycleChunks(menuStyle);

    const bestRaw = Number(localStorage.getItem(STORAGE_BEST) ?? "0");
    const best = Number.isFinite(bestRaw) ? bestRaw : 0;
    const dist = Math.max(0, this.player.z - this.distanceBase);
    const score = Math.floor(dist * 12) + this.coinsCollected * 125;

    this.callbacks.onHudUpdate({
      score,
      coins: this.coinsCollected,
      speed: this.forwardSpeed,
      best,
      distance: dist,
    });
  }

  private triggerCrash(fromFall = false) {
    if (this.mode === "menu" || this.dead) return;
    const generation = this.runGeneration;
    this.dead = true;
    this.crashSlow = 0.55;
    this.audio.playHit();
    this.callbacks.onCrash?.();
    this.shake.set(
      (Math.random() - 0.5) * 0.7,
      (Math.random() - 0.5) * 0.35,
      (Math.random() - 0.5) * 0.7,
    );

    const bestRaw = Number(localStorage.getItem(STORAGE_BEST) ?? "0");
    let best = Number.isFinite(bestRaw) ? bestRaw : 0;
    const dist = Math.max(0, this.player.z - this.distanceBase);
    const score = Math.floor(dist * 12) + this.coinsCollected * 125;
    if (score > best) {
      best = score;
      localStorage.setItem(STORAGE_BEST, String(best));
    }

    window.setTimeout(() => {
      if (generation !== this.runGeneration) return;
      this.callbacks.onGameOver({ score, coins: this.coinsCollected, best });
    }, fromFall ? 200 : 60);
  }
}
