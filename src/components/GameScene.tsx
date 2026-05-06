import { useEffect, useRef } from "react";
import { GameEngine } from "../game/GameEngine";
import type { GameCallbacks, HudSnapshot } from "../game/types";

export type GamePhase =
  | "menu"
  | "tutorial"
  | "countdown"
  | "playing"
  | "paused"
  | "gameover";

interface GameSceneProps {
  phase: GamePhase;
  performanceMode: boolean;
  invertSwipeX: boolean;
  onHudUpdate: (h: HudSnapshot) => void;
  onGameOver: (p: { score: number; coins: number; best: number }) => void;
  onCrash: () => void;
  onCoinWorldPickup: (x: number, y: number, z: number) => void;
  beginPlayToken: number;
  onEngineReady?: (engine: GameEngine) => void;
}

export function GameScene({
  phase,
  performanceMode,
  invertSwipeX,
  onHudUpdate,
  onGameOver,
  onCrash,
  onCoinWorldPickup,
  beginPlayToken,
  onEngineReady,
}: GameSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: GameCallbacks = {
      onHudUpdate,
      onGameOver,
      onCrash,
      onCoinPickup: (pos, _lane) => {
        onCoinWorldPickup(pos.x, pos.y, pos.z);
      },
    };

    const engine = new GameEngine({
      canvas,
      callbacks,
      performanceMode,
      attractMode: true,
    });
    engineRef.current = engine;
    onEngineReady?.(engine);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setCallbacks({
      onHudUpdate,
      onGameOver,
      onCrash,
      onCoinPickup: (pos) => onCoinWorldPickup(pos.x, pos.y, pos.z),
    });
  }, [onHudUpdate, onGameOver, onCrash, onCoinWorldPickup]);

  useEffect(() => {
    engineRef.current?.setPerformanceMode(performanceMode);
  }, [performanceMode]);

  useEffect(() => {
    engineRef.current?.setInvertHorizontalSwipe(invertSwipeX);
  }, [invertSwipeX]);

  useEffect(() => {
    engineRef.current?.setPaused(phase === "paused" || phase === "countdown");
  }, [phase]);

  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    if (phase === "menu") e.backToMenu();
  }, [phase]);

  useEffect(() => {
    if (beginPlayToken > 0) {
      engineRef.current?.beginPlay();
    }
  }, [beginPlayToken]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none select-none"
      style={{ touchAction: "none" }}
    />
  );
}
