import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleDot,
  Heart,
  RotateCcw,
  Trophy,
} from 'lucide-react';

import {
  CELL_SIZE,
  COLS,
  createPacmanState,
  restartAttempt,
  ROWS,
  setPacmanDirection,
  stepPacman,
  type Direction,
  type PacmanState,
} from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function PacmanGame({ challenge, disabled, onComplete }: GameProps) {
  const target = Number(challenge.target ?? 25);
  const ghostCount = Number(challenge.ghosts ?? 1);
  const speed = Number(challenge.speed ?? 1.8);
  const lives = Number(challenge.lives ?? 3);

  const [state, setState] = useState<PacmanState>(() =>
    createPacmanState(target, ghostCount, speed, lives),
  );

  const stateRef = useRef(state);
  stateRef.current = state;
  const completedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDirection = useCallback(
    (dir: Direction) => {
      if (disabled || stateRef.current.status !== 'playing') return;
      setState((prev) => setPacmanDirection(prev, dir));
    },
    [disabled],
  );

  const handleRestart = useCallback(() => {
    if (disabled) return;
    setState((prev) => restartAttempt(prev));
  }, [disabled]);

  // Keyboard controls
  useEffect(() => {
    if (disabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleDirection('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleDirection('right');
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleDirection('up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleDirection('down');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, handleDirection]);

  // Touch swipe detection
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 15) handleDirection(dx > 0 ? 'right' : 'left');
    } else {
      if (Math.abs(dy) > 15) handleDirection(dy > 0 ? 'down' : 'up');
    }
  };

  // Main 60fps game loop
  useEffect(() => {
    if (state.status !== 'playing' || disabled) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = currentTime - lastTime;
      if (delta >= 16) {
        lastTime = currentTime;
        setState((current) => {
          const next = stepPacman(current);
          if (next.status === 'won' && !completedRef.current) {
            completedRef.current = true;
            onComplete({
              challengeToken: challenge.challengeToken,
              achieved: next.pelletsEaten,
              pelletsEaten: next.pelletsEaten,
              actions: next.actions,
              livesRemaining: next.lives,
            });
          }
          return next;
        });
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [state.status, disabled, onComplete, challenge.challengeToken]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = COLS * CELL_SIZE;
    const height = ROWS * CELL_SIZE;

    // Background
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid & Walls
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = state.grid[r]![c]!;
        const cx = c * CELL_SIZE;
        const cy = r * CELL_SIZE;

        if (cell === 1) {
          // Maze wall
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx + 1, cy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        } else if (cell === 0) {
          // Small dot
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(cx + CELL_SIZE / 2, cy + CELL_SIZE / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 2) {
          // Power Pellet
          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#f59e0b';
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(cx + CELL_SIZE / 2, cy + CELL_SIZE / 2, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Draw Pac-Man
    const px = state.pacman.x + CELL_SIZE / 2;
    const py = state.pacman.y + CELL_SIZE / 2;
    const r = CELL_SIZE / 2 - 2;

    let rotation = 0;
    if (state.pacman.dir === 'down') rotation = Math.PI / 2;
    if (state.pacman.dir === 'left') rotation = Math.PI;
    if (state.pacman.dir === 'up') rotation = (Math.PI * 3) / 2;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rotation);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, r, state.mouthAngle * Math.PI, (2 - state.mouthAngle) * Math.PI);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw Ghosts
    for (const g of state.ghosts) {
      const gx = g.x + 2;
      const gy = g.y + 2;
      const gw = CELL_SIZE - 4;
      const gh = CELL_SIZE - 4;

      ctx.save();
      ctx.fillStyle = g.isFrightened ? '#2563eb' : g.color;

      // Ghost dome
      ctx.beginPath();
      ctx.arc(gx + gw / 2, gy + gw / 2, gw / 2, Math.PI, 0, false);
      ctx.lineTo(gx + gw, gy + gh);
      // Wavy tentacles
      ctx.lineTo(gx + (gw * 3) / 4, gy + gh - 3);
      ctx.lineTo(gx + gw / 2, gy + gh);
      ctx.lineTo(gx + gw / 4, gy + gh - 3);
      ctx.lineTo(gx, gy + gh);
      ctx.closePath();
      ctx.fill();

      // Ghost eyes
      if (!g.isFrightened) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(gx + gw / 3, gy + gh / 2.5, 3, 0, Math.PI * 2);
        ctx.arc(gx + (gw * 2) / 3, gy + gh / 2.5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(gx + gw / 3, gy + gh / 2.5, 1.5, 0, Math.PI * 2);
        ctx.arc(gx + (gw * 2) / 3, gy + gh / 2.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Frightened eyes
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(gx + 3, gy + 5, 2, 2);
        ctx.fillRect(gx + gw - 5, gy + 5, 2, 2);
      }
      ctx.restore();
    }
  }, [state]);

  const canvasWidth = COLS * CELL_SIZE;
  const canvasHeight = ROWS * CELL_SIZE;

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <CircleDot className="text-amber-400" size={16} />
          <span className="text-xs font-bold text-slate-300">
            Pellets: <span className="text-amber-300 font-black">{state.pelletsEaten}</span> / {target}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {Array.from({ length: state.maxLives }).map((_, i) => (
            <Heart
              key={i}
              size={14}
              className={i < state.lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          className="text-xs py-1 px-2 h-7"
          onClick={handleRestart}
          disabled={disabled}
        >
          <RotateCcw size={12} className="mr-1" /> Reset
        </Button>
      </div>

      {/* Canvas Area */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-slate-950 flex items-center justify-center"
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="block w-full max-w-[342px] aspect-[19/15]"
        />

        {/* OUT / Try Again Overlay */}
        {state.status === 'crashed' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 gap-2.5 animate-in fade-in">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <RotateCcw size={24} />
            </div>
            <h3 className="text-lg font-black text-rose-400 tracking-wider uppercase">Caught by Ghost!</h3>
            <p className="text-xs text-slate-300 text-center max-w-[220px]">
              You ran out of lives. Tap below to retry this checkpoint!
            </p>
            <Button
              type="button"
              onClick={handleRestart}
              className="mt-1 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black px-6"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Victory Overlay */}
        {state.status === 'won' && (
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 gap-2 animate-in fade-in">
            <Trophy className="text-emerald-400" size={32} />
            <h3 className="text-lg font-black text-emerald-300">Maze Cleared!</h3>
            <p className="text-xs text-slate-300">Target pellets collected. Completing checkpoint…</p>
          </div>
        )}
      </div>

      {/* On-Screen D-Pad for Mobile */}
      <div className="flex flex-col items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => handleDirection('up')}
          className="flex items-center justify-center w-12 h-10 rounded-xl border border-slate-700 bg-slate-800 active:bg-cyan-600 active:border-cyan-400 text-slate-200 select-none shadow-sm transition"
          aria-label="Move Up"
        >
          <ArrowUp size={18} />
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleDirection('left')}
            className="flex items-center justify-center w-12 h-10 rounded-xl border border-slate-700 bg-slate-800 active:bg-cyan-600 active:border-cyan-400 text-slate-200 select-none shadow-sm transition"
            aria-label="Move Left"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleDirection('down')}
            className="flex items-center justify-center w-12 h-10 rounded-xl border border-slate-700 bg-slate-800 active:bg-cyan-600 active:border-cyan-400 text-slate-200 select-none shadow-sm transition"
            aria-label="Move Down"
          >
            <ArrowDown size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleDirection('right')}
            className="flex items-center justify-center w-12 h-10 rounded-xl border border-slate-700 bg-slate-800 active:bg-cyan-600 active:border-cyan-400 text-slate-200 select-none shadow-sm transition"
            aria-label="Move Right"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 text-center">
        Guide Pac-Man to eat glowing pellets while dodging roaming ghosts.
      </p>
    </div>
  );
}
