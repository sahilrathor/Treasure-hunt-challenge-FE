import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Crosshair, Heart, RotateCcw, Trophy } from 'lucide-react';

import {
  createRealtimeInvaderState,
  firePlayerLaser,
  INVADER_HEIGHT,
  INVADER_WIDTH,
  moveRealtimeShip,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
  restartRealtimeInvaders,
  SHIP_HEIGHT,
  SHIP_WIDTH,
  SHIP_Y,
  stepRealtimeInvaders,
  type RealtimeInvaderState,
} from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function SpaceInvadersGame({ challenge, disabled, onComplete }: GameProps) {
  const target = Number(challenge.target ?? 8);
  const initialLives = Number(challenge.lives ?? 3);

  const [state, setState] = useState<RealtimeInvaderState>(() =>
    createRealtimeInvaderState(target, initialLives),
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  const completedRef = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 60fps real-time arcade game loop
  useEffect(() => {
    if (state.status !== 'playing' || disabled) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = currentTime - lastTime;
      if (delta >= 16) {
        lastTime = currentTime;
        setState((current) => {
          const next = stepRealtimeInvaders(current);
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

  const handleMoveLeft = useCallback(() => {
    if (disabled || stateRef.current.status !== 'playing') return;
    setState((prev) => moveRealtimeShip(prev, prev.shipX - 24));
  }, [disabled]);

  const handleMoveRight = useCallback(() => {
    if (disabled || stateRef.current.status !== 'playing') return;
    setState((prev) => moveRealtimeShip(prev, prev.shipX + 24));
  }, [disabled]);

  const handleFire = useCallback(() => {
    if (disabled) return;
    if (stateRef.current.status === 'gameover') {
      completedRef.current = false;
      setState((prev) => restartRealtimeInvaders(prev));
      return;
    }
    if (stateRef.current.status === 'playing') {
      setState((prev) => firePlayerLaser(prev));
    }
  }, [disabled]);

  const handleReset = useCallback(() => {
    if (disabled) return;
    completedRef.current = false;
    setState((prev) => restartRealtimeInvaders(prev));
  }, [disabled]);

  // Keyboard navigation: ArrowLeft/ArrowRight/A/D to move, Space/W/ArrowUp to fire
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        event.preventDefault();
        handleMoveLeft();
      } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        event.preventDefault();
        handleMoveRight();
      } else if (
        event.code === 'Space' ||
        event.code === 'ArrowUp' ||
        event.code === 'KeyW'
      ) {
        event.preventDefault();
        handleFire();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, handleFire, handleMoveLeft, handleMoveRight]);

  // Touch and pointer tracking on the SVG playfield
  const updateShipFromClientX = useCallback(
    (clientX: number) => {
      if (disabled || !svgRef.current || stateRef.current.status !== 'playing') return;
      const rect = svgRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const svgX = ((clientX - rect.left) / rect.width) * PLAYFIELD_WIDTH;
      setState((prev) => moveRealtimeShip(prev, svgX - SHIP_WIDTH / 2));
    },
    [disabled],
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    if (stateRef.current.status === 'gameover') {
      handleReset();
      return;
    }
    updateShipFromClientX(e.clientX);
    handleFire();
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    if (e.buttons > 0 || e.pointerType === 'touch' || e.pointerType === 'mouse') {
      updateShipFromClientX(e.clientX);
    }
  };

  const isFlickering = state.invulnerableTicks > 0 && Math.floor(state.invulnerableTicks / 4) % 2 === 0;

  return (
    <div className="grid gap-3 text-center select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between text-sm font-bold px-1">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Trophy size={16} />
          <span>
            Invaders {state.destroyed.length} / {target}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {state.status === 'playing' && (
            <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs text-emerald-300 animate-pulse">
              Battle Active
            </span>
          )}
          {state.status === 'gameover' && (
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs text-rose-300 font-extrabold">
              Fleet Invaded! OUT
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

      {/* SVG Arcade Playfield */}
      <div
        className="relative mx-auto aspect-[320/400] w-full max-w-sm overflow-hidden rounded-2xl border-2 border-cyan-500/40 bg-slate-950 shadow-2xl shadow-cyan-950/40 cursor-crosshair"
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
            {/* Space background radial gradient */}
            <radialGradient id="spaceBg" cx="50%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#0b1329" />
              <stop offset="60%" stopColor="#060914" />
              <stop offset="100%" stopColor="#020308" />
            </radialGradient>

            {/* Ship cyan gradient */}
            <linearGradient id="shipGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>

            {/* Laser player bullet glow filter */}
            <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={PLAYFIELD_WIDTH} height={PLAYFIELD_HEIGHT} fill="url(#spaceBg)" />

          {/* Twinkling ambient pixel stars */}
          <circle cx="25" cy="40" r="1.2" fill="#e0f2fe" opacity="0.6" />
          <circle cx="85" cy="95" r="1.5" fill="#38bdf8" opacity="0.5" />
          <circle cx="150" cy="50" r="1.0" fill="#e0e7ff" opacity="0.7" />
          <circle cx="220" cy="110" r="1.4" fill="#a855f7" opacity="0.4" />
          <circle cx="290" cy="65" r="1.2" fill="#38bdf8" opacity="0.6" />
          <circle cx="45" cy="180" r="1.5" fill="#e0f2fe" opacity="0.4" />
          <circle cx="190" cy="220" r="1.2" fill="#f43f5e" opacity="0.4" />
          <circle cx="270" cy="250" r="1.6" fill="#38bdf8" opacity="0.5" />
          <circle cx="110" cy="310" r="1.0" fill="#e0e7ff" opacity="0.5" />

          {/* Defense bunkers */}
          {[40, 135, 230].map((bunkerX, bIdx) => (
            <path
              key={`bunker-${bIdx}`}
              d={`M ${bunkerX} 338 L ${bunkerX + 50} 338 L ${bunkerX + 50} 348 L ${bunkerX + 38} 348 L ${bunkerX + 38} 343 L ${bunkerX + 12} 343 L ${bunkerX + 12} 348 L ${bunkerX} 348 Z`}
              fill="#10b981"
              opacity="0.35"
              stroke="#059669"
              strokeWidth="1"
            />
          ))}

          {/* Defense limit guide line */}
          <line
            x1="10"
            y1={SHIP_Y - 14}
            x2={PLAYFIELD_WIDTH - 10}
            y2={SHIP_Y - 14}
            stroke="#f43f5e"
            strokeWidth="0.5"
            strokeDasharray="3 4"
            opacity="0.25"
          />

          {/* Invaders */}
          {state.invaders.map((inv) => {
            if (!inv.alive) return null;

            return (
              <g key={inv.id} transform={`translate(${inv.x}, ${inv.y})`}>
                {/* Invader alien sprite */}
                <rect
                  x="2"
                  y="2"
                  width={INVADER_WIDTH - 4}
                  height={INVADER_HEIGHT - 4}
                  rx="3"
                  fill={inv.color}
                  opacity="0.9"
                />
                {/* Antennas / horns */}
                <line x1="4" y1="2" x2="2" y2="0" stroke={inv.color} strokeWidth="1.5" strokeLinecap="round" />
                <line x1={INVADER_WIDTH - 4} y1="2" x2={INVADER_WIDTH - 2} y2="0" stroke={inv.color} strokeWidth="1.5" strokeLinecap="round" />
                {/* Alien Eyes */}
                <circle cx="6" cy="6" r="1.5" fill="#ffffff" />
                <circle cx={INVADER_WIDTH - 6} cy="6" r="1.5" fill="#ffffff" />
                <circle cx="6.5" cy="6" r="0.8" fill="#0f172a" />
                <circle cx={INVADER_WIDTH - 5.5} cy="6" r="0.8" fill="#0f172a" />
                {/* Tentacles */}
                <line x1="5" y1={INVADER_HEIGHT - 2} x2="3" y2={INVADER_HEIGHT} stroke={inv.color} strokeWidth="1.5" strokeLinecap="round" />
                <line x1="11" y1={INVADER_HEIGHT - 2} x2="11" y2={INVADER_HEIGHT} stroke={inv.color} strokeWidth="1.5" strokeLinecap="round" />
                <line x1={INVADER_WIDTH - 5} y1={INVADER_HEIGHT - 2} x2={INVADER_WIDTH - 3} y2={INVADER_HEIGHT} stroke={inv.color} strokeWidth="1.5" strokeLinecap="round" />
              </g>
            );
          })}

          {/* Bullets */}
          {state.bullets.map((b) => (
            <g key={b.id}>
              {b.fromPlayer ? (
                // Player cyan laser beam
                <rect
                  x={b.x - 1.5}
                  y={b.y}
                  width="3"
                  height="10"
                  rx="1.5"
                  fill="#38bdf8"
                  filter="url(#laserGlow)"
                />
              ) : (
                // Enemy red plasma bomb
                <circle
                  cx={b.x}
                  cy={b.y}
                  r="3.5"
                  fill="#f43f5e"
                  filter="url(#laserGlow)"
                />
              )}
            </g>
          ))}

          {/* Explosion / Spark Particles */}
          {state.particles.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={p.life * 2.5}
              fill={p.color}
              opacity={p.life}
            />
          ))}

          {/* Player Cannon Tank Ship */}
          {!isFlickering && (
            <g transform={`translate(${state.shipX}, ${SHIP_Y})`}>
              {/* Dual laser cannon barrels */}
              <rect x={SHIP_WIDTH / 2 - 3} y="-6" width="2" height="7" fill="#38bdf8" rx="0.5" />
              <rect x={SHIP_WIDTH / 2 + 1} y="-6" width="2" height="7" fill="#38bdf8" rx="0.5" />
              {/* Turret center */}
              <polygon
                points={`${SHIP_WIDTH / 2 - 6},3 ${SHIP_WIDTH / 2}, -2 ${SHIP_WIDTH / 2 + 6},3`}
                fill="#22d3ee"
              />
              {/* Tank hull */}
              <rect
                x="2"
                y="3"
                width={SHIP_WIDTH - 4}
                height={SHIP_HEIGHT - 5}
                rx="3"
                fill="url(#shipGrad)"
                stroke="#67e8f9"
                strokeWidth="1.2"
              />
              {/* Tread treads */}
              <rect x="0" y="9" width={SHIP_WIDTH} height="6" rx="2" fill="#083344" stroke="#0e7490" strokeWidth="1" />
              <circle cx="5" cy="12" r="1.5" fill="#22d3ee" />
              <circle cx={SHIP_WIDTH / 2} cy="12" r="1.5" fill="#22d3ee" />
              <circle cx={SHIP_WIDTH - 5} cy="12" r="1.5" fill="#22d3ee" />
            </g>
          )}

          {/* Fleet Invaded / Game Over Overlay */}
          {state.status === 'gameover' && (
            <g pointerEvents="none">
              <rect
                x="24"
                y="170"
                width={PLAYFIELD_WIDTH - 48}
                height="96"
                rx="14"
                fill="#0f172a"
                fillOpacity="0.95"
                stroke="#f43f5e"
                strokeWidth="2"
              />
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="204"
                textAnchor="middle"
                fill="#f43f5e"
                fontSize="17"
                fontWeight="900"
              >
                FLEET INVADED! OUT
              </text>
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="226"
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="12"
                fontWeight="600"
              >
                Eliminated: {state.destroyed.length} / {target}
              </text>
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="248"
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
                x="20"
                y="165"
                width={PLAYFIELD_WIDTH - 40}
                height="100"
                rx="14"
                fill="#0f172a"
                fillOpacity="0.95"
                stroke="#facc15"
                strokeWidth="2"
              />
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="200"
                textAnchor="middle"
                fill="#facc15"
                fontSize="18"
                fontWeight="900"
              >
                TARGET CLEARED!
              </text>
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="224"
                textAnchor="middle"
                fill="#fef08a"
                fontSize="12"
                fontWeight="700"
              >
                All {target} invaders neutralized!
              </text>
              <text
                x={PLAYFIELD_WIDTH / 2}
                y="246"
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
          aria-label="Move ship left"
          disabled={disabled || state.status !== 'playing'}
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
            disabled={disabled || state.status !== 'playing'}
            onClick={handleFire}
          >
            <Crosshair className="mr-1.5" size={16} />
            Fire Laser (Space)
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          aria-label="Move ship right"
          disabled={disabled || state.status !== 'playing'}
          onClick={handleMoveRight}
          className="flex-1 py-3"
        >
          <ArrowRight size={18} />
        </Button>
      </div>

      <p className="text-xs text-slate-400">
        Drag / ◀ ▶ to steer • Tap / Space to fire
      </p>
    </div>
  );
}
