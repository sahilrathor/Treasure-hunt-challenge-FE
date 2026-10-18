import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart, Play, RotateCcw, Trophy } from 'lucide-react';

import {
  BALL_RADIUS,
  createRealtimeBrickState,
  launchRealtimeBall,
  moveRealtimePaddle,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_Y,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
  restartRealtimeBrickGame,
  stepRealtimeBrickGame,
  type RealtimeBrickState,
} from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function BrickBreakerGame({ challenge, disabled, onComplete }: GameProps) {
  const target = Number(challenge.target ?? 10);
  const initialLives = Number(challenge.lives ?? 3);

  const [state, setState] = useState<RealtimeBrickState>(() =>
    createRealtimeBrickState(target, initialLives),
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  const completedRef = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 60fps real-time physics game loop
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
          const next = stepRealtimeBrickGame(current);
          if (next.status === 'won' && !completedRef.current) {
            completedRef.current = true;
            onComplete({
              challengeToken: challenge.challengeToken,
              achieved: target,
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
  }, [state.status, disabled, onComplete, challenge.challengeToken, target]);

  const handleLaunch = useCallback(() => {
    if (disabled) return;
    if (stateRef.current.status === 'gameover') {
      completedRef.current = false;
      setState((prev) => restartRealtimeBrickGame(prev));
      return;
    }
    if (stateRef.current.status === 'ready') {
      setState((prev) => launchRealtimeBall(prev));
    }
  }, [disabled]);

  const handleMoveLeft = useCallback(() => {
    if (disabled) return;
    setState((prev) => moveRealtimePaddle(prev, prev.paddleX - 26));
  }, [disabled]);

  const handleMoveRight = useCallback(() => {
    if (disabled) return;
    setState((prev) => moveRealtimePaddle(prev, prev.paddleX + 26));
  }, [disabled]);

  const handleReset = useCallback(() => {
    if (disabled) return;
    completedRef.current = false;
    setState((prev) => restartRealtimeBrickGame(prev));
  }, [disabled]);

  // Keyboard navigation: ArrowLeft/ArrowRight/A/D to move paddle, Space to launch
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        event.preventDefault();
        handleMoveLeft();
      } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        event.preventDefault();
        handleMoveRight();
      } else if (event.code === 'Space') {
        event.preventDefault();
        handleLaunch();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, handleLaunch, handleMoveLeft, handleMoveRight]);

  // Touch and mouse pointer tracking on the SVG playfield
  const updatePaddleFromClientX = useCallback(
    (clientX: number) => {
      if (disabled || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const svgX = ((clientX - rect.left) / rect.width) * PLAYFIELD_WIDTH;
      setState((prev) => moveRealtimePaddle(prev, svgX - PADDLE_WIDTH / 2));
    },
    [disabled],
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    if (stateRef.current.status === 'gameover') {
      handleReset();
      return;
    }
    updatePaddleFromClientX(e.clientX);
    if (stateRef.current.status === 'ready') {
      const rect = e.currentTarget.getBoundingClientRect();
      const svgY = ((e.clientY - rect.top) / rect.height) * PLAYFIELD_HEIGHT;
      // Tapping in the arena launches the ball
      if (svgY < PADDLE_Y - 20) {
        handleLaunch();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    if (e.buttons > 0 || e.pointerType === 'touch' || e.pointerType === 'mouse') {
      updatePaddleFromClientX(e.clientX);
    }
  };

  return (
    <div className="grid gap-3 text-center select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between text-sm font-bold px-1">
        <div className="flex items-center gap-1.5 text-fuchsia-300">
          <Trophy size={16} />
          <span>
            Bricks {state.broken.length} / {target}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {state.status === 'ready' && (
            <span className="rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-xs text-cyan-300">
              Ready to Launch
            </span>
          )}
          {state.status === 'playing' && (
            <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs text-emerald-300 animate-pulse">
              Ball In Play
            </span>
          )}
          {state.status === 'gameover' && (
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs text-rose-300">
              Out of Lives
            </span>
          )}
          {state.status === 'won' && (
            <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs text-amber-300 font-extrabold">
              Victory!
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-rose-400 font-semibold" title={`Lives: ${state.lives}`}>
          {Array.from({ length: state.maxLives }, (_, index) => (
            <Heart
              key={index}
              size={16}
              className={`transition-all duration-300 ${
                index < state.lives
                  ? 'fill-rose-500 text-rose-400 scale-100'
                  : 'text-slate-600 fill-transparent scale-75 opacity-40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* SVG Arcade Arena */}
      <div
        className="relative mx-auto aspect-[320/400] w-full max-w-sm overflow-hidden rounded-2xl border-2 border-fuchsia-500/40 bg-slate-950 shadow-2xl shadow-fuchsia-950/40 cursor-pointer"
        style={{ touchAction: 'none' }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${PLAYFIELD_WIDTH} ${PLAYFIELD_HEIGHT}`}
          className="h-full w-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        >
          <defs>
            {/* Background gradient */}
            <radialGradient id="arenaBg" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#1e1035" />
              <stop offset="50%" stopColor="#0d081f" />
              <stop offset="100%" stopColor="#030208" />
            </radialGradient>

            {/* Paddle neon gradient */}
            <linearGradient id="paddleGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            {/* Ball radial glow gradient */}
            <radialGradient id="ballGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fef08a" />
              <stop offset="85%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#eab308" />
            </radialGradient>

            {/* Subtle glow filter */}
            <filter id="ballGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={PLAYFIELD_WIDTH} height={PLAYFIELD_HEIGHT} fill="url(#arenaBg)" />

          {/* Ambient retro grid lines */}
          <line x1="0" y1="180" x2={PLAYFIELD_WIDTH} y2="180" stroke="#f43f5e" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.15" />
          <line x1="0" y1="260" x2={PLAYFIELD_WIDTH} y2="260" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.15" />
          <line x1="0" y1="340" x2={PLAYFIELD_WIDTH} y2="340" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.2" />

          {/* Ambient pixel stars */}
          <circle cx="30" cy="50" r="1.2" fill="#e0e7ff" opacity="0.5" />
          <circle cx="110" cy="220" r="1.5" fill="#f43f5e" opacity="0.4" />
          <circle cx="280" cy="90" r="1.2" fill="#38bdf8" opacity="0.5" />
          <circle cx="230" cy="270" r="1.4" fill="#a855f7" opacity="0.4" />

          {/* Bricks */}
          {state.bricks.map((brick) => {
            const isBroken = state.broken.includes(brick.id);
            if (isBroken) return null;

            return (
              <g key={brick.id}>
                {/* Brick Base */}
                <rect
                  x={brick.x}
                  y={brick.y}
                  width={brick.width}
                  height={brick.height}
                  rx="3"
                  fill={brick.fill}
                  stroke={brick.border}
                  strokeWidth="1.5"
                />
                {/* 3D Top Bevel Highlight */}
                <line
                  x1={brick.x + 3}
                  y1={brick.y + 2}
                  x2={brick.x + brick.width - 3}
                  y2={brick.y + 2}
                  stroke={brick.topHighlight}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </g>
            );
          })}

          {/* Paddle */}
          <g>
            <rect
              x={state.paddleX}
              y={PADDLE_Y}
              width={PADDLE_WIDTH}
              height={PADDLE_HEIGHT}
              rx="5"
              fill="url(#paddleGrad)"
              stroke="#67e8f9"
              strokeWidth="1.5"
            />
            {/* Paddle center neon indicator */}
            <rect
              x={state.paddleX + PADDLE_WIDTH / 2 - 2}
              y={PADDLE_Y + 2}
              width="4"
              height="6"
              rx="1"
              fill="#f43f5e"
              opacity="0.9"
            />
          </g>

          {/* Ball */}
          <circle
            cx={state.ballX}
            cy={state.ballY}
            r={BALL_RADIUS}
            fill="url(#ballGrad)"
            stroke="#fef08a"
            strokeWidth="1"
            filter="url(#ballGlow)"
          />

          {/* Ready Overlay */}
          {state.status === 'ready' && state.broken.length === 0 && (
            <g pointerEvents="none">
              <rect
                x="20"
                y="190"
                width={PLAYFIELD_WIDTH - 40}
                height="80"
                rx="12"
                fill="#0f172a"
                fillOpacity="0.85"
                stroke="#06b6d4"
                strokeWidth="1.5"
              />
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="218"
                textAnchor="middle"
                fill="#f8fafc"
                fontSize="15"
                fontWeight="900"
              >
                BRICK BREAKER
              </text>
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="238"
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="11"
                fontWeight="600"
              >
                Break all {target} bricks to clear!
              </text>
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="256"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="10"
              >
                Drag / ◀ ▶ to aim • Tap / Space to launch
              </text>
            </g>
          )}

          {/* Out of Lives / Game Over Overlay */}
          {state.status === 'gameover' && (
            <g pointerEvents="none">
              <rect
                x="30"
                y="180"
                width={PLAYFIELD_WIDTH - 60}
                height="90"
                rx="14"
                fill="#0f172a"
                fillOpacity="0.95"
                stroke="#f43f5e"
                strokeWidth="2"
              />
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="212"
                textAnchor="middle"
                fill="#f43f5e"
                fontSize="17"
                fontWeight="900"
              >
                OUT OF LIVES!
              </text>
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="234"
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="12"
                fontWeight="600"
              >
                Broken: {state.broken.length} / {target}
              </text>
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="254"
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="11"
                fontWeight="700"
              >
                Tap or click Try Again below
              </text>
            </g>
          )}

          {/* Victory Overlay */}
          {state.status === 'won' && (
            <g pointerEvents="none">
              <rect
                x="24"
                y="170"
                width={PLAYFIELD_WIDTH - 48}
                height="100"
                rx="14"
                fill="#0f172a"
                fillOpacity="0.95"
                stroke="#facc15"
                strokeWidth="2"
              />
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="204"
                textAnchor="middle"
                fill="#facc15"
                fontSize="18"
                fontWeight="900"
              >
                TARGET CLEARED!
              </text>
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="228"
                textAnchor="middle"
                fill="#fef08a"
                fontSize="12"
                fontWeight="700"
              >
                Shattered all {target} bricks!
              </text>
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="250"
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="11"
              >
                Advancing to clue...
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Control Buttons */}
      <div className="mx-auto flex w-full max-w-sm gap-2">
        <Button
          type="button"
          variant="secondary"
          aria-label="Move paddle left"
          disabled={disabled || state.status === 'won'}
          onClick={handleMoveLeft}
          className="flex-1 py-3"
        >
          <ArrowLeft size={18} />
        </Button>

        {state.status === 'gameover' ? (
          <Button
            type="button"
            variant="secondary"
            className="flex-[2] border-rose-500/40 text-rose-300 hover:bg-rose-950/40 py-3 font-bold"
            onClick={handleReset}
            disabled={disabled}
          >
            <RotateCcw className="mr-1.5" size={16} />
            Try Again
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-[2] py-3 text-sm font-extrabold"
            disabled={disabled || state.status === 'playing' || state.status === 'won'}
            onClick={handleLaunch}
          >
            <Play className="mr-1.5" size={16} />
            {state.status === 'won'
              ? 'Victory!'
              : state.status === 'playing'
                ? 'Ball in Play'
                : 'Launch Ball (Space)'}
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          aria-label="Move paddle right"
          disabled={disabled || state.status === 'won'}
          onClick={handleMoveRight}
          className="flex-1 py-3"
        >
          <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
