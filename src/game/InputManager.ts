export type DigitalAction =
  | "left"
  | "right"
  | "jump"
  | "slide"
  | "grapple"
  | "pause";

export class InputManager {
  private keys = new Set<string>();
  private left = false;
  private right = false;
  private jump = false;
  private slide = false;
  private grapple = false;
  private pause = false;
  /** Touch-only discrete lane step (+1 right / -1 left), consumed in laneIntent */
  private lanePulse: -1 | 0 | 1 = 0;

  private touchStartX = 0;
  private touchStartY = 0;
  private touchTracking = false;
  /** Minimum swipe distance (px) */
  private readonly swipeThreshold = 36;
  /** Horizontal swipe must beat vertical by this ratio to count as lane change */
  private readonly laneSwipeDominance = 1.22;

  private canvas: HTMLCanvasElement | null = null;

  attach(canvas: HTMLCanvasElement) {
    this.detach();
    this.canvas = canvas;
    const opts = { passive: false };

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);

    canvas.addEventListener("pointerdown", this.onPointerDown, opts);
    canvas.addEventListener("pointermove", this.onPointerMove, opts);
    canvas.addEventListener("pointerup", this.onPointerUp, opts);
    canvas.addEventListener("pointercancel", this.onPointerUp, opts);
    canvas.addEventListener(
      "touchmove",
      (e) => {
        if (this.touchTracking) e.preventDefault();
      },
      { passive: false },
    );
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas.removeEventListener("pointermove", this.onPointerMove);
      this.canvas.removeEventListener("pointerup", this.onPointerUp);
      this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    }
    this.canvas = null;
    this.touchTracking = false;
  }

  /** Consume one-shot actions this frame */
  consumeJump(): boolean {
    const v = this.jump;
    this.jump = false;
    return v;
  }

  consumeSlide(): boolean {
    const v = this.slide;
    this.slide = false;
    return v;
  }

  consumeGrapple(): boolean {
    const v = this.grapple;
    this.grapple = false;
    return v;
  }

  consumePause(): boolean {
    const v = this.pause;
    this.pause = false;
    return v;
  }

  laneIntent(): -1 | 0 | 1 {
    const pulse = this.lanePulse;
    this.lanePulse = 0;
    if (pulse !== 0) return pulse;
    if (this.left && !this.right) return -1;
    if (this.right && !this.left) return 1;
    return 0;
  }

  clearFrameInputs() {
    // Digital one-shots cleared via consume*
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const k = e.code;
    this.keys.add(k);
    if (
      k === "ArrowLeft" ||
      k === "KeyA"
    ) {
      this.left = true;
      e.preventDefault();
    }
    if (
      k === "ArrowRight" ||
      k === "KeyD"
    ) {
      this.right = true;
      e.preventDefault();
    }
    if (k === "ArrowUp" || k === "Space") {
      this.jump = true;
      e.preventDefault();
    }
    if (k === "ArrowDown" || k === "KeyS") {
      this.slide = true;
      e.preventDefault();
    }
    if (k === "KeyE") {
      this.grapple = true;
      e.preventDefault();
    }
    if (k === "Escape") {
      this.pause = true;
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.code;
    this.keys.delete(k);
    if (k === "ArrowLeft" || k === "KeyA") this.left = false;
    if (k === "ArrowRight" || k === "KeyD") this.right = false;
  };

  private onPointerDown = (e: PointerEvent) => {
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.touchTracking = true;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.touchTracking) return;
    const dx = e.clientX - this.touchStartX;
    const dy = e.clientY - this.touchStartY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx <= this.swipeThreshold && ady <= this.swipeThreshold) return;

    const isLaneSwipe =
      adx >= ady * this.laneSwipeDominance && adx > this.swipeThreshold;
    const isVerticalSwipe =
      ady >= adx * this.laneSwipeDominance && ady > this.swipeThreshold;

    let handled = false;
    if (isLaneSwipe) {
      // Touch horizontal swipe should move in the same on-screen direction.
      this.lanePulse = dx < 0 ? 1 : -1;
      handled = true;
    } else if (isVerticalSwipe) {
      if (dy < 0) this.jump = true;
      else this.slide = true;
      handled = true;
    } else if (adx > this.swipeThreshold || ady > this.swipeThreshold) {
      if (adx >= ady) {
        this.lanePulse = dx < 0 ? 1 : -1;
      } else if (dy < 0) {
        this.jump = true;
      } else {
        this.slide = true;
      }
      handled = true;
    }

    if (handled) {
      this.touchTracking = false;
      e.preventDefault();
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    const dx = e.clientX - this.touchStartX;
    const dy = e.clientY - this.touchStartY;
    if (this.touchTracking && Math.abs(dx) < 14 && Math.abs(dy) < 14) {
      this.grapple = true;
    }
    this.touchTracking = false;
  };
}
