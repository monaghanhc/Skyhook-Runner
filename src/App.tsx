import { useCallback, useEffect, useRef, useState } from "react";
import { GameScene } from "./components/GameScene";
import type { GamePhase } from "./components/GameScene";
import { MainMenu } from "./components/MainMenu";
import { HUD } from "./components/HUD";
import { PauseOverlay } from "./components/PauseOverlay";
import { GameOver } from "./components/GameOver";
import { TutorialOverlay } from "./components/TutorialOverlay";
import { TutorialInGameTips } from "./components/TutorialInGameTips";
import type { HudSnapshot } from "./game/types";
import type { GameEngine } from "./game/GameEngine";
import { STORAGE_BEST, STORAGE_PERF, STORAGE_TUTORIAL, STORAGE_USERNAME } from "./game/constants";
import {
  fetchLeaderboard,
  leaderboardConfigured,
  submitScore,
  type LeaderboardEntry,
} from "./game/leaderboard";

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

  const [beginPlayToken, setBeginPlayToken] = useState(0);
  const [playMode, setPlayMode] = useState<"normal" | "tutorial">("normal");

  const [countdown, setCountdown] = useState<number | "go" | null>(null);
  const [showTutorialTips, setShowTutorialTips] = useState(true);

  const [flash, setFlash] = useState(0);
  const [coinPopups, setCoinPopups] = useState<{ id: number; text: string; x: string; y: string }[]>([]);
  const popupId = useRef(0);

  const [gameOverStats, setGameOverStats] = useState({ score: 0, coins: 0, best: 0 });
  const [lastRunTutorial, setLastRunTutorial] = useState(false);
  const [username, setUsername] = useState(() => localStorage.getItem(STORAGE_USERNAME) ?? "");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_PERF, perfMode ? "1" : "0");
  }, [perfMode]);

  useEffect(() => {
    localStorage.setItem("skyhook_music_enabled", musicOn ? "1" : "0");
    engineRef.current?.setMusicEnabled(musicOn);
  }, [musicOn]);

  useEffect(() => {
    localStorage.setItem(STORAGE_USERNAME, username);
  }, [username]);

  const refreshLeaderboard = useCallback(async () => {
    if (!leaderboardConfigured()) {
      setLeaderboard([]);
      setLeaderboardError("Leaderboard is not configured yet.");
      return;
    }
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const rows = await fetchLeaderboard(20);
      setLeaderboard(rows);
    } catch {
      setLeaderboardError("Could not load leaderboard right now.");
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

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

  const onGameOver = useCallback((p: { score: number; coins: number; best: number; tutorial: boolean }) => {
    setGameOverStats({ score: p.score, coins: p.coins, best: p.best });
    setLastRunTutorial(p.tutorial);
    setSubmitMessage(null);
    if (p.tutorial) {
      localStorage.setItem(STORAGE_TUTORIAL, "1");
    }
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
  }, [musicOn]);

  const startTutorialFlow = () => {
    setPlayMode("normal");
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

  const beginTutorialRun = () => {
    setPlayMode("tutorial");
    setShowTutorialTips(true);
    beginCountdown();
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
    setPlayMode("normal");
    setShowTutorialTips(true);
    beginCountdown();
  };

  const goMenu = () => {
    setPhase("menu");
    setCountdown(null);
    setPlayMode("normal");
    setShowTutorialTips(true);
  };

  const postLeaderboardScore = useCallback(async () => {
    if (lastRunTutorial) return;
    if (!leaderboardConfigured()) {
      setSubmitMessage("Leaderboard not configured on this build yet.");
      return;
    }
    const cleanName = username.trim();
    if (!cleanName) {
      setSubmitMessage("Enter a username first.");
      return;
    }
    if (gameOverStats.score <= 0) {
      setSubmitMessage("Score must be greater than zero.");
      return;
    }
    setSubmitBusy(true);
    setSubmitMessage(null);
    try {
      await submitScore(cleanName, gameOverStats.score);
      setSubmitMessage("Score posted to global leaderboard.");
      await refreshLeaderboard();
    } catch {
      setSubmitMessage("Failed to post score. Try again.");
    } finally {
      setSubmitBusy(false);
    }
  }, [gameOverStats.score, lastRunTutorial, refreshLeaderboard, username]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-50">
      <GameScene
        phase={phase}
        performanceMode={perfMode}
        onHudUpdate={onHudUpdate}
        onGameOver={onGameOver}
        onCrash={onCrash}
        onCoinWorldPickup={onCoinWorldPickup}
        beginPlayToken={beginPlayToken}
        playMode={playMode}
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
            tutorialMode={playMode === "tutorial"}
            onPause={() => setPhase("paused")}
            musicOn={musicOn}
            onToggleMusic={() => setMusicOn((m) => !m)}
            perfMode={perfMode}
            onTogglePerf={() => setPerfMode((p) => !p)}
          />
        )}

        <div className="flex flex-1 items-center justify-center">
          {phase === "menu" && (
            <MainMenu
              onPlay={startTutorialFlow}
              onTutorial={beginTutorialRun}
              leaderboard={leaderboard}
              leaderboardLoading={leaderboardLoading}
              leaderboardError={leaderboardError}
              onRefreshLeaderboard={() => void refreshLeaderboard()}
              perfMode={perfMode}
              onTogglePerf={() => setPerfMode((p) => !p)}
            />
          )}

          {phase === "tutorial" && (
            <TutorialOverlay
              onDismiss={() => {
                localStorage.setItem(STORAGE_TUTORIAL, "1");
                beginTutorialRun();
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
              tutorialRun={lastRunTutorial}
              username={username}
              onUsernameChange={setUsername}
              onSubmitScore={() => void postLeaderboardScore()}
              submitDisabled={username.trim().length === 0}
              submitBusy={submitBusy}
              submitMessage={submitMessage}
              onRestart={restartFromGameOver}
              onMenu={goMenu}
            />
          )}
        </div>

        {(phase === "playing" || phase === "paused") &&
          playMode === "tutorial" &&
          showTutorialTips && (
            <TutorialInGameTips onDismiss={() => setShowTutorialTips(false)} />
          )}
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
