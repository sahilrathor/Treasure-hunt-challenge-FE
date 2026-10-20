import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Coins, Heart, RotateCcw, Trophy } from 'lucide-react';

import {
  createPlatformerState,
  jumpPlayer,
  movePlayer,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
  restartAttempt,
  stepPlatformer,
  type PlatformerState,
} from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function MiniPlatformerGame({ challenge, disabled, onComplete }: GameProps) {
  const target = Number(challenge.target ?? 3);
  const speed = Number(challenge.speed ?? 3.5);
  const lives = Number(challenge.lives ?? 3);
  const difficulty = String(challenge.difficulty ?? 'easy');

  const [state, setState] = useState<PlatformerState>(() =>
    createPlatformerState(target, speed, lives, difficulty),
  );

  const stateRef = useRef(state);
  stateRef.current = state;
  const completedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleJump = useCallback(() => {
    if (disabled || stateRef.current.status !== 'playing') return;
    setState((prev) => jumpPlayer(prev));
  }, [disabled]);

  const handleMove = useCallback(
    (dir: 'left' | 'right' | 'stop') => {
      if (disabled || stateRef.current.status !== 'playing') return;
      setState((prev) => movePlayer(prev, dir));
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
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleMove('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleMove('right');
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        e.preventDefault();
        handleJump();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'a' ||
        e.key === 'A' ||
        e.key === 'ArrowRight' ||
        e.key === 'd' ||
        e.key === 'D'
      ) {
        handleMove('stop');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [disabled, handleJump, handleMove]);

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
          const next = stepPlatformer(current);
          if (next.status === 'won' && !completedRef.current) {
            completedRef.current = true;
            onComplete({
              challengeToken: challenge.challengeToken,
              achieved: next.coinsCollected,
              coinsCollected: next.coinsCollected,
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

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, PLAYFIELD_HEIGHT);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

    // Decorative grid lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < PLAYFIELD_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PLAYFIELD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < PLAYFIELD_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PLAYFIELD_WIDTH, y);
      ctx.stroke();
    }

    // Draw platforms
    for (const p of state.platforms) {
      // Platform body
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p.x, p.y, p.width, p.height);

      // Top glowing neon edge
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.width, p.y);
      ctx.stroke();
    }

    // Draw hazards (spikes)
    for (const h of state.hazards) {
      ctx.fillStyle = '#ef4444';
      const spikeCount = Math.floor(h.width / 10);
      for (let i = 0; i < spikeCount; i++) {
        const sx = h.x + i * 10;
        ctx.beginPath();
        ctx.moveTo(sx, h.y + h.height);
        ctx.lineTo(sx + 5, h.y);
        ctx.lineTo(sx + 10, h.y + h.height);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Draw Goal Portal
    const g = state.goal;
    const canExit = state.coinsCollected >= state.target;
    ctx.save();
    ctx.shadowBlur = canExit ? 15 : 5;
    ctx.shadowColor = canExit ? '#10b981' : '#64748b';
    ctx.fillStyle = canExit ? '#10b981' : '#334155';
    ctx.beginPath();
    ctx.roundRect(g.x, g.y, g.width, g.height, 10);
    ctx.fill();
    ctx.strokeStyle = canExit ? '#34d399' : '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Portal icon / glow
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(canExit ? 'EXIT' : 'LOCK', g.x + g.width / 2, g.y + g.height / 2 + 4);
    ctx.restore();

    // Draw Coins
    for (const c of state.coins) {
      if (c.collected) continue;
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#f59e0b';
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Coin inner symbol
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', c.x, c.y);
      ctx.restore();
    }

    // Draw Player
    const pl = state.player;
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#06b6d4';

    // Player body
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.roundRect(pl.x, pl.y, pl.width, pl.height, 4);
    ctx.fill();

    // Player face / eyes
    ctx.fillStyle = '#0f172a';
    const eyeOffsetX = pl.facing === 'right' ? 10 : 3;
    ctx.fillRect(pl.x + eyeOffsetX, pl.y + 5, 3, 4);

    // Player headband/visor
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(pl.x, pl.y + 3, pl.width, 3);
    ctx.restore();
  }, [state]);

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto">
      {/* Game Header */}
      <div className="flex items-center justify-between w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <Coins className="text-amber-400" size={16} />
          <span className="text-xs font-bold text-slate-300">
            Coins: <span className="text-amber-300 font-black">{state.coinsCollected}</span> / {target}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
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
      <div className="relative border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-slate-950">
        <canvas
          ref={canvasRef}
          width={PLAYFIELD_WIDTH}
          height={PLAYFIELD_HEIGHT}
          className="block w-full max-w-[400px] aspect-[400/280]"
        />

        {/* OUT / Try Again Overlay */}
        {state.status === 'crashed' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 gap-2.5 animate-in fade-in">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <RotateCcw size={24} />
            </div>
            <h3 className="text-lg font-black text-rose-400 tracking-wider uppercase">Out!</h3>
            <p className="text-xs text-slate-300 text-center max-w-[240px]">
              You lost all lives! Tap below to try again.
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
            <h3 className="text-lg font-black text-emerald-300">Goal Reached!</h3>
            <p className="text-xs text-slate-300">Target completed. Recording round attempt…</p>
          </div>
        )}
      </div>

      {/* Touch Controls Bar */}
      <div className="flex items-center justify-between w-full max-w-[400px] gap-2 px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={() => handleMove('left')}
            onPointerUp={() => handleMove('stop')}
            onPointerLeave={() => handleMove('stop')}
            className="flex items-center justify-center w-14 h-12 rounded-xl border border-slate-700 bg-slate-800 active:bg-cyan-600 active:border-cyan-400 text-slate-200 select-none shadow-md transition"
            aria-label="Move left"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            onPointerDown={() => handleMove('right')}
            onPointerUp={() => handleMove('stop')}
            onPointerLeave={() => handleMove('stop')}
            className="flex items-center justify-center w-14 h-12 rounded-xl border border-slate-700 bg-slate-800 active:bg-cyan-600 active:border-cyan-400 text-slate-200 select-none shadow-md transition"
            aria-label="Move right"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleJump}
          className="flex-1 max-w-[160px] flex items-center justify-center gap-1.5 h-12 rounded-xl border border-cyan-500/50 bg-cyan-500/20 active:bg-cyan-400 text-cyan-300 active:text-slate-950 font-black select-none shadow-md transition"
          aria-label="Jump"
        >
          <ArrowUp size={20} />
          <span>JUMP</span>
        </button>
      </div>
    </div>
  );
}
