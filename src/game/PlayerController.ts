import * as THREE from "three";
import {
  GRAPPLE_ARC_HEIGHT,
  GRAPPLE_DURATION,
  GRAVITY,
  JUMP_VELOCITY,
  LANES,
  PLAYER_HALF_DEPTH,
  PLAYER_SLIDE_HALF_HEIGHT,
  PLAYER_STAND_HALF_HEIGHT,
  PLAYER_WIDTH,
  SLIDE_DURATION,
  LANE_SWITCH_TIME,
} from "./constants";
import type { AABB, GrappleAnchor, LaneIndex, PlayerMotion } from "./types";

export class PlayerController {
  lane: LaneIndex = 1;
  targetLane: LaneIndex = 1;
  x: number = LANES[1];
  z = 4;
  y = 0;
  vy = 0;
  speedZ = 0;

  motion: PlayerMotion = "run";
  slideTimer = 0;
  laneLerp = 1;

  grappleT = 0;
  grappleStartZ = 0;
  grappleEndZ = 0;
  grappleLane: LaneIndex = 1;

  /** Prevents one long swipe / held key from advancing multiple lanes in one go */
  private lastLaneIntent: -1 | 0 | 1 = 0;

  reset(spawnZ: number) {
    this.lane = 1;
    this.targetLane = 1;
    this.x = LANES[1];
    this.z = spawnZ;
    this.y = 0;
    this.vy = 0;
    this.motion = "run";
    this.slideTimer = 0;
    this.laneLerp = 1;
    this.grappleT = 0;
    this.lastLaneIntent = 0;
  }

  beginGrapple(anchor: GrappleAnchor, gapEndZ: number) {
    this.motion = "grapple";
    this.grappleLane = anchor.lane;
    this.targetLane = anchor.lane;
    this.grappleStartZ = this.z;
    this.grappleEndZ = gapEndZ + 2;
    this.grappleT = 0;
    this.vy = 0;
    this.y = 0;
  }

  getLaneFromInput(intent: -1 | 0 | 1): LaneIndex {
    return THREE.MathUtils.clamp(this.targetLane + intent, 0, 2) as LaneIndex;
  }

  update(
    dt: number,
    laneIntent: -1 | 0 | 1,
    jumpPressed: boolean,
    slidePressed: boolean,
    forwardSpeed: number,
    onGround: boolean,
  ) {
    this.speedZ = forwardSpeed;

    if (this.motion === "grapple") {
      this.grappleT += dt / GRAPPLE_DURATION;
      const t = THREE.MathUtils.clamp(this.grappleT, 0, 1);
      const ease = 0.5 - 0.5 * Math.cos(Math.PI * t);
      this.z = THREE.MathUtils.lerp(this.grappleStartZ, this.grappleEndZ, ease);
      this.x = THREE.MathUtils.lerp(this.x, LANES[this.grappleLane], dt * 8);
      this.y = GRAPPLE_ARC_HEIGHT * Math.sin(Math.PI * t);
      if (this.grappleT >= 1) {
        this.motion = "run";
        this.y = 0;
      }
      return;
    }

    if (this.motion === "fall") {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      this.z += forwardSpeed * dt;
      return;
    }

    // Lane switching — one step per distinct swipe direction / key edge (L / center / R)
    if (laneIntent !== 0) {
      if (laneIntent !== this.lastLaneIntent) {
        this.targetLane = this.getLaneFromInput(laneIntent);
      }
    }
    this.lastLaneIntent = laneIntent;
    const targetX = LANES[this.targetLane];
    this.x = THREE.MathUtils.lerp(this.x, targetX, dt / LANE_SWITCH_TIME);
    if (Math.abs(this.x - targetX) < 0.05) {
      this.x = targetX;
      this.lane = this.targetLane;
    }

    // Jump
    if (jumpPressed && onGround && this.slideTimer <= 0) {
      this.vy = JUMP_VELOCITY;
      this.motion = "jump";
    }

    if (slidePressed && onGround && this.slideTimer <= 0) {
      this.slideTimer = SLIDE_DURATION;
      this.motion = "slide";
    }

    // Vertical / gravity
    if (onGround && this.y <= 0.001) {
      this.y = 0;
      if (this.motion !== "slide") this.motion = "run";
    } else {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y < 0) {
        this.y = 0;
        this.vy = 0;
        if (this.slideTimer <= 0) this.motion = "run";
      }
      if (this.vy > 0.5) this.motion = "jump";
    }

    if (this.slideTimer > 0) {
      this.slideTimer -= dt;
      this.motion = "slide";
      if (this.slideTimer <= 0 && this.y <= 0) this.motion = "run";
    }

    // Advance along track
    this.z += forwardSpeed * dt;
  }

  getHalfHeight(): number {
    return this.slideTimer > 0 ? PLAYER_SLIDE_HALF_HEIGHT : PLAYER_STAND_HALF_HEIGHT;
  }

  getAABB(): AABB {
    const hh = this.getHalfHeight();
    const min = new THREE.Vector3(
      this.x - PLAYER_WIDTH / 2,
      this.y,
      this.z - PLAYER_HALF_DEPTH,
    );
    const max = new THREE.Vector3(
      this.x + PLAYER_WIDTH / 2,
      this.y + hh * 2,
      this.z + PLAYER_HALF_DEPTH,
    );
    return { min, max };
  }

  triggerFall() {
    this.motion = "fall";
    this.vy = 4;
  }
}
