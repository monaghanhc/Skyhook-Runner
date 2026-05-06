import { useCallback, useEffect, useRef, useState } from "react";
import { GameScene } from "./components/GameScene";
import type { GamePhase } from "./components/GameScene";
import { MainMenu } from "./components/MainMenu";
import { HUD } from "./components/HUD";
import { PauseOverlay } from "./components/PauseOverlay";
import { GameOver } from "./components/GameOver";
import { TutorialOverlay } from "./components/TutorialOverlay";
import type { HudSnapshot } from "./game/types";
import type { GameEngine } from "./game/GameEngine";
import {
  STORAGE_BEST,
  STORAGE_INVERT_SWIPE_X,
  STORAGE_PERF,
  STORAGE_TUTORIAL,
} from "./game/constants";

const initialHud: HudSnapshot = {
  score: 0,
  coins: 0,
  speed: 0,
  best: Number(localStorage.getItem(STORAGE_BEST) ?? "0") || 0,
  distance: 0,
};

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);

  const [phase, setPhase] = useState<GamePhase>("menu");
  const [hud, setHud] = useState<HudSnapshot>(initialHud);
  const [perfMode, setPerfMode] = useState(() => localStorage.getItem(STORAGE_PERF) === "1");
  const [musicOn, setMusicOn] = useState(() => localStorage.getItem("skyhook_music_enabled") !== "0");
  const [invertSwipeX, setInvertSwipeX] = useState(
    () => localStorage.getItem(STORAGE_INVERT_SWIPE_X) === "1",
  );

  const [beginPlayToken, setBeginPlayToken] = useState(0);

  const [countdown, setCountdown] = useState<number | "go" | null>(null);

  const [flash, setFlash] = useState(0);
  const [coinPopups, setCoinPopups] = useState<{ id: number; text: string; x: string; y: string }[]>([]);
  const popupId = useRef(0);

  const [gameOverStats, setGameOverStats] = useState({ score: 0, coins: 0, best: 0 });

  useEffect(() => {
    localStorage.setItem(STORAGE_PERF, perfMode ? "1" : "0");
  }, [perfMode]);

  useEffect(() => {
    localStorage.setItem("skyhook_music_enabled", musicOn ? "1" : "0");
    engineRef.current?.setMusicEnabled(musicOn);
  }, [musicOn]);

  useEffect(() => {
    localStorage.setItem(STORAGE_INVERT_SWIPE_X, invertSwipeX ? "1" : "0");
    engineRef.current?.setInvertHorizontalSwipe(invertSwipeX);
  }, [invertSwipeX]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" && phase === "playing") {
        e.preventDefault();
        setPhase("paused");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const onHudUpdate = useCallback((next: HudSnapshot) => {
    setHud(next);
  }, []);

  const onGameOver = useCallback((p: { score: number; coins: number; best: number }) => {
    setGameOverStats(p);
    setPhase("gameover");
  }, []);

  const onCrash = useCallback(() => {
    setFlash(1);
    window.setTimeout(() => setFlash(0), 220);
  }, []);

  const onCoinWorldPickup = useCallback((_x: number, _y: number, _z: number) => {
    const id = ++popupId.current;
    const x = `${18 + Math.random() * 44}%`;
    const y = `${22 + Math.random() * 18}%`;
    setCoinPopups((prev) => [...prev, { id, text: "+125", x, y }]);
    window.setTimeout(() => {
      setCoinPopups((prev) => prev.filter((p) => p.id !== id));
    }, 750);
  }, []);

  const handleEngineReady = useCallback((engine: GameEngine) => {
    engineRef.current = engine;
    engine.setMusicEnabled(musicOn);
    engine.setInvertHorizontalSwipe(invertSwipeX);
  }, [invertSwipeX, musicOn]);

  const startTutorialFlow = () => {
    const seen = localStorage.getItem(STORAGE_TUTORIAL) === "1";
    if (!seen) {
      setPhase("tutorial");
      return;
    }
    beginCountdown();
  };

  const beginCountdown = () => {
    setPhase("countdown");
    setCountdown(3);
  };

  useEffect(() => {
    if (phase !== "countdown" || countdown === null) return;

    if (countdown === "go") {
      const t = window.setTimeout(() => {
        setCountdown(null);
        setPhase("playing");
        setBeginPlayToken((n) => n + 1);
      }, 420);
      return () => window.clearTimeout(t);
    }

    const n = countdown as number;
    const t = window.setTimeout(() => {
      if (n <= 1) setCountdown("go");
      else setCountdown(n - 1);
    }, 650);
    return () => window.clearTimeout(t);
  }, [phase, countdown]);

  const restartFromGameOver = () => {
    beginCountdown();
  };

  const goMenu = () => {
    setPhase("menu");
    setCountdown(null);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-50">
      <GameScene
        phase={phase}
        performanceMode={perfMode}
        invertSwipeX={invertSwipeX}
        onHudUpdate={onHudUpdate}
        onGameOver={onGameOver}
        onCrash={onCrash}
        onCoinWorldPickup={onCoinWorldPickup}
        beginPlayToken={beginPlayToken}
        onEngineReady={handleEngineReady}
      />

      {/* Coin popups */}
      <div className="pointer-events-none absolute inset-0">
        {coinPopups.map((p) => (
          <div
            key={p.id}
            className="absolute font-mono text-sm font-bold text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.65)] transition-opacity"
            style={{ left: p.x, top: p.y, opacity: 0.95 }}
          >
            {p.text}
          </div>
        ))}
      </div>

      {/* Crash flash */}
      <div
        className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-100"
        style={{ opacity: flash * 0.55 }}
      />

      {/* UI layers */}
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {(phase === "playing" || phase === "paused") && (
          <HUD
            hud={hud}
            onPause={() => setPhase("paused")}
            musicOn={musicOn}
            onToggleMusic={() => setMusicOn((m) => !m)}
            perfMode={perfMode}
            onTogglePerf={() => setPerfMode((p) => !p)}
            invertSwipeX={invertSwipeX}
            onToggleInvertSwipeX={() => setInvertSwipeX((v) => !v)}
          />
        )}

        <div className="flex flex-1 items-center justify-center">
          {phase === "menu" && (
            <MainMenu
              onPlay={startTutorialFlow}
              perfMode={perfMode}
              onTogglePerf={() => setPerfMode((p) => !p)}
              invertSwipeX={invertSwipeX}
              onToggleInvertSwipeX={() => setInvertSwipeX((v) => !v)}
            />
          )}

          {phase === "tutorial" && (
            <TutorialOverlay
              onDismiss={() => {
                localStorage.setItem(STORAGE_TUTORIAL, "1");
                beginCountdown();
              }}
            />
          )}

          {phase === "paused" && (
            <PauseOverlay onResume={() => setPhase("playing")} onMenu={goMenu} />
          )}

          {phase === "gameover" && (
            <GameOver
              score={gameOverStats.score}
              coins={gameOverStats.coins}
              best={gameOverStats.best}
              onRestart={restartFromGameOver}
              onMenu={goMenu}
            />
          )}
        </div>
      </div>

      {/* Countdown overlay */}
      {phase === "countdown" && countdown !== null && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px]">
          <div className="text-7xl font-black text-white drop-shadow-[0_0_40px_rgba(34,211,238,0.55)] sm:text-8xl">
            {countdown === "go" ? "GO!" : countdown}
          </div>
        </div>
      )}
    </div>
  );
}
