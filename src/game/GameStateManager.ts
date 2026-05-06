import type { HudSnapshot } from "./types";
import { STORAGE_BEST } from "./constants";

export type Phase =
  | "menu"
  | "tutorial"
  | "countdown"
  | "playing"
  | "paused"
  | "gameover"
  | "attract";

export class GameStateManager {
  phase: Phase = "menu";
  bestScore = 0;
  paused = false;
  countdownValue: number | "go" | null = null;

  constructor() {
    this.loadBest();
  }

  loadBest() {
    const raw = localStorage.getItem(STORAGE_BEST);
    const n = raw ? Number(raw) : 0;
    this.bestScore = Number.isFinite(n) ? Math.floor(n) : 0;
  }

  saveBest(score: number) {
    if (score > this.bestScore) {
      this.bestScore = score;
      localStorage.setItem(STORAGE_BEST, String(this.bestScore));
    }
  }

  buildHud(score: number, coins: number, speed: number, distance: number): HudSnapshot {
    return {
      score,
      coins,
      speed,
      best: this.bestScore,
      distance,
    };
  }
}
