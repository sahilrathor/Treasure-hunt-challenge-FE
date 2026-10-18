import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Play, RotateCcw, Trophy } from 'lucide-react';

import {
  BIRD_RADIUS,
  BIRD_X,
  createFlappyState,
  flap,
  GROUND_HEIGHT,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
  restartAttempt,
  stepFlappy,
  type FlappyState,
} from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function FlappyBirdGame({ challenge, disabled, onComplete }: GameProps) {
  const target = Number(challenge.target ?? 3);
  const gap = Number(challenge.gap ?? 125);
  const speed = Number(challenge.speed ?? 2.4);

  const [state, setState] = useState<FlappyState>(() =>
    createFlappyState(target, gap, speed),
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  const completedRef = useRef(false);

  const handleFlap = useCallback(() => {
    if (disabled || stateRef.current.status === 'won') return;

    if (stateRef.current.status === 'crashed') {
      setState((prev) => restartAttempt(prev));
      return;
    }

    setState((prev) => flap(prev));
  }, [disabled]);

  const handleReset = useCallback(() => {
    if (disabled) return;
    setState((prev) => restartAttempt(prev));
  }, [disabled]);

  // Main 60fps game loop
  useEffect(() => {
    if (state.status !== 'playing' || disabled) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = currentTime - lastTime;
      // Step physics at ~60fps
      if (delta >= 16) {
        lastTime = currentTime;
        setState((current) => {
          const next = stepFlappy(current);
          if (next.status === 'won' && !completedRef.current) {
            completedRef.current = true;
            onComplete({
              challengeToken: challenge.challengeToken,
              achieved: next.score,
              score: next.score,
              actions: next.actions,
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

  // Keyboard controls: Space / Up Arrow
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === 'ArrowUp') {
        event.preventDefault();
        handleFlap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleFlap]);

  // Calculate bird rotation angle for realistic pitch (-25deg to +45deg)
  const birdRotation =
    state.status === 'idle'
      ? 0
      : Math.max(-25, Math.min(45, state.velocity * 4.5));

  return (
    <div className="grid gap-4 text-center">
      {/* Top HUD */}
      <div className="flex items-center justify-between text-sm font-bold px-2">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Trophy size={16} />
          <span>
            Pipes {state.score} / {target}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {state.status === 'idle' && (
            <span className="rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-xs text-cyan-300">
              Ready to Flap
            </span>
          )}
          {state.status === 'playing' && (
            <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs text-emerald-300 animate-pulse">
              Flying
            </span>
          )}
          {state.status === 'crashed' && (
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs text-rose-300">
              Crashed! Tap to Try Again
            </span>
          )}
          {state.status === 'won' && (
            <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs text-amber-300 font-extrabold">
              Victory!
            </span>
          )}
        </div>
      </div>

      {/* SVG Playfield */}
      <div
        className="relative mx-auto aspect-[320/440] w-full max-w-sm select-none overflow-hidden rounded-2xl border-2 border-cyan-500/40 shadow-2xl shadow-cyan-950/50 cursor-pointer"
        onClick={handleFlap}
      >
        <svg
          viewBox={`0 0 ${PLAYFIELD_WIDTH} ${PLAYFIELD_HEIGHT}`}
          className="h-full w-full"
        >
          <defs>
            {/* Sky gradient */}
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#082f49" />
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Neon pipe gradient */}
            <linearGradient id="pipeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="35%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Pipe lip/collar gradient */}
            <linearGradient id="pipeLipGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="50%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>

            {/* Cyber ground gradient */}
            <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect
            x="0"
            y="0"
            width={PLAYFIELD_WIDTH}
            height={PLAYFIELD_HEIGHT}
            fill="url(#skyGrad)"
          />

          {/* Ambient pixel stars */}
          <circle cx="40" cy="50" r="1.5" fill="#38bdf8" opacity="0.6" />
          <circle cx="120" cy="90" r="1.2" fill="#e0f2fe" opacity="0.8" />
          <circle cx="210" cy="40" r="1.8" fill="#38bdf8" opacity="0.7" />
          <circle cx="280" cy="110" r="1.2" fill="#bae6fd" opacity="0.5" />
          <circle cx="80" cy="160" r="1.5" fill="#e0f2fe" opacity="0.4" />
          <circle cx="250" cy="180" r="1.4" fill="#38bdf8" opacity="0.6" />

          {/* Pipes */}
          {state.pipes.map((pipe) => {
            const bottomY = pipe.topHeight + pipe.gap;
            const bottomHeight = PLAYFIELD_HEIGHT - GROUND_HEIGHT - bottomY;
            const lipHeight = 16;
            const lipOverlap = 4;

            return (
              <g key={pipe.id}>
                {/* Top Pipe Body */}
                <rect
                  x={pipe.x}
                  y="0"
                  width={pipe.width}
                  height={Math.max(0, pipe.topHeight - lipHeight)}
                  fill="url(#pipeGrad)"
                  stroke="#064e3b"
                  strokeWidth="1.5"
                />
                {/* Top Pipe Lip */}
                <rect
                  x={pipe.x - lipOverlap}
                  y={pipe.topHeight - lipHeight}
                  width={pipe.width + lipOverlap * 2}
                  height={lipHeight}
                  rx="3"
                  fill="url(#pipeLipGrad)"
                  stroke="#022c22"
                  strokeWidth="1.5"
                />

                {/* Bottom Pipe Body */}
                <rect
                  x={pipe.x}
                  y={bottomY + lipHeight}
                  width={pipe.width}
                  height={Math.max(0, bottomHeight - lipHeight)}
                  fill="url(#pipeGrad)"
                  stroke="#064e3b"
                  strokeWidth="1.5"
                />
                {/* Bottom Pipe Lip */}
                <rect
                  x={pipe.x - lipOverlap}
                  y={bottomY}
                  width={pipe.width + lipOverlap * 2}
                  height={lipHeight}
                  rx="3"
                  fill="url(#pipeLipGrad)"
                  stroke="#022c22"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

          {/* Ground */}
          <rect
            x="0"
            y={PLAYFIELD_HEIGHT - GROUND_HEIGHT}
            width={PLAYFIELD_WIDTH}
            height={GROUND_HEIGHT}
            fill="url(#groundGrad)"
            stroke="#38bdf8"
            strokeWidth="1"
          />
          {/* Ground neon grid lines */}
          <line
            x1="0"
            y1={PLAYFIELD_HEIGHT - GROUND_HEIGHT + 2}
            x2={PLAYFIELD_WIDTH}
            y2={PLAYFIELD_HEIGHT - GROUND_HEIGHT + 2}
            stroke="#06b6d4"
            strokeWidth="2"
          />

          {/* Player Bird */}
          <g
            transform={`translate(${BIRD_X}, ${state.birdY}) rotate(${birdRotation})`}
          >
            {/* Glow halo */}
            <circle
              cx="0"
              cy="0"
              r={BIRD_RADIUS + 3}
              fill="#38bdf8"
              opacity="0.25"
            />

            {/* Bird body */}
            <circle
              cx="0"
              cy="0"
              r={BIRD_RADIUS}
              fill="#facc15"
              stroke="#ca8a04"
              strokeWidth="2"
            />

            {/* Bird belly accent */}
            <ellipse
              cx="-2"
              cy="4"
              rx={BIRD_RADIUS - 4}
              ry={BIRD_RADIUS - 6}
              fill="#fef08a"
            />

            {/* Wing (animated flapping based on velocity) */}
            <ellipse
              cx="-5"
              cy={state.velocity < 0 ? -4 : 1}
              rx="6"
              ry="4"
              transform={state.velocity < 0 ? 'rotate(-25)' : 'rotate(10)'}
              fill="#eab308"
              stroke="#ca8a04"
              strokeWidth="1"
            />

            {/* Eye */}
            <circle cx="5" cy="-4" r="4.5" fill="#ffffff" />
            <circle cx="6.5" cy="-4.5" r="2" fill="#0f172a" />
            <circle cx="7.5" cy="-5.5" r="0.8" fill="#ffffff" />

            {/* Beak */}
            <polygon points="10,-2 17,1 10,4" fill="#f97316" stroke="#c2410c" strokeWidth="1" />
          </g>

          {/* Large Retro Score in Center Sky */}
          <text
            x={PLAYFIELD_WIDTH / 2}
            y="70"
            textAnchor="middle"
            fill="#ffffff"
            opacity="0.85"
            fontSize="36"
            fontWeight="900"
            fontFamily="monospace"
            className="drop-shadow-md select-none"
          >
            {state.score}
          </text>
        </svg>

        {/* Start Overlay when idle */}
        {state.status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
            <div className="rounded-2xl border border-cyan-400/40 bg-slate-900/90 p-5 shadow-xl text-center">
              <Play className="mx-auto mb-2 text-cyan-300 animate-pulse" size={32} />
              <p className="text-base font-black text-slate-100">FLAPPY BIRD</p>
              <p className="mt-1 text-xs text-slate-400">
                Pass <span className="font-bold text-cyan-300">{target}</span> pipes to clear!
              </p>
              <p className="mt-3 text-xs font-semibold text-cyan-300 animate-bounce">
                Tap Screen or Press Space to Flap
              </p>
            </div>
          </div>
        )}

        {/* Crash Overlay */}
        {state.status === 'crashed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm">
            <div className="rounded-2xl border border-rose-500/40 bg-slate-900/90 p-5 shadow-xl text-center">
              <p className="text-lg font-black text-rose-400">CRASHED!</p>
              <p className="mt-1 text-xs text-slate-300">
                Score: {state.score} / {target}
              </p>
              <p className="mt-3 text-xs font-semibold text-cyan-300">
                Tap to Try Again
              </p>
            </div>
          </div>
        )}

        {/* Victory Overlay */}
        {state.status === 'won' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm">
            <div className="rounded-2xl border border-amber-400/50 bg-slate-900/95 p-5 shadow-2xl text-center">
              <Trophy className="mx-auto mb-2 text-amber-300 animate-bounce" size={40} />
              <p className="text-xl font-black text-amber-300">TARGET CLEARED!</p>
              <p className="mt-1 text-xs text-slate-200">
                Passed {state.score} pipes! Advancing...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Touch Action Controls */}
      <div className="mx-auto flex w-full max-w-sm gap-2">
        {state.status === 'crashed' ? (
          <Button
            type="button"
            className="w-full bg-rose-600 hover:bg-rose-500 text-white"
            onClick={handleReset}
            disabled={disabled}
            aria-label="Restart Flappy Bird"
          >
            <RotateCcw className="mr-1.5" size={16} />
            Try Again
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full py-3 text-sm font-extrabold"
            onClick={handleFlap}
            disabled={disabled || state.status === 'won'}
            aria-label="Flap wings"
          >
            <ArrowUp className="mr-1.5" size={18} />
            {state.status === 'idle'
              ? 'Start / Flap Wings (Space)'
              : state.status === 'won'
                ? 'Target Completed!'
                : 'Flap Wings!'}
          </Button>
        )}
      </div>
    </div>
  );
}
