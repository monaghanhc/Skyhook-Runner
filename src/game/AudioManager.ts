import { STORAGE_MUSIC } from "./constants";

export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicOscs: OscillatorNode[] = [];
  private musicOn = false;

  constructor() {
    const stored = localStorage.getItem(STORAGE_MUSIC);
    this.musicOn = stored !== "0";
  }

  setMusicEnabled(on: boolean) {
    this.musicOn = on;
    localStorage.setItem(STORAGE_MUSIC, on ? "1" : "0");
    if (!on) this.stopMusic();
    else this.ensureMusic();
  }

  getMusicEnabled() {
    return this.musicOn;
  }

  resume() {
    void this.ctx?.resume();
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  private ensureMusic() {
    if (!this.musicOn) return;
    const ctx = this.ensureContext();
    if (this.musicOscs.length) return;

    const master = ctx.createGain();
    master.gain.value = 0.06;
    master.connect(ctx.destination);

    const freqs = [196, 247, 293, 392];
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = i % 2 === 0 ? "triangle" : "sine";
      o.frequency.value = freqs[i] ?? 220;
      const g = ctx.createGain();
      g.gain.value = 0.12 + i * 0.05;
      o.connect(g);
      g.connect(master);
      o.start();
      this.musicOscs.push(o);
    }

    let t = 0;
    const step = () => {
      if (!this.musicOscs.length) return;
      t += 0.02;
      for (let i = 0; i < this.musicOscs.length; i++) {
        const osc = this.musicOscs[i];
        if (!osc) continue;
        const base = freqs[i] ?? 220;
        const wobble = 1 + 0.02 * Math.sin(t * 2 + i);
        osc.frequency.setTargetAtTime(base * wobble, ctx.currentTime, 0.05);
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  stopMusic() {
    for (const o of this.musicOscs) {
      try {
        o.stop();
      } catch {
        /* ignore */
      }
    }
    this.musicOscs = [];
  }

  playCoin() {
    const ctx = this.ensureContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.06);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.12);
  }

  playJump() {
    const ctx = this.ensureContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(240, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(520, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.14);
  }

  playGrapple() {
    const ctx = this.ensureContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(120, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.07, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  }

  playHit() {
    const ctx = this.ensureContext();
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / buffer.length);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    noise.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    noise.start();
  }

  playUi() {
    const ctx = this.ensureContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(440, ctx.currentTime);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.1);
  }

  startGameplaySounds() {
    this.ensureContext();
    this.ensureMusic();
  }
}
