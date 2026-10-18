import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Trophy, Zap } from 'lucide-react';

import {
  createRealtimeTetrisState,
  getGhostRow,
  lockAndDrop,
  moveFallingCol,
  restartTetrisGame,
  TETRIS_HEIGHT,
  TETRIS_WIDTH,
  tickFallingBlock,
  type RealtimeTetrisState,
} from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function TetrisGame({ challenge, disabled, onComplete }: GameProps) {
  const target = Number(challenge.target ?? 2);
  const speed = Number(challenge.speed ?? 600);

  const [state, setState] = useState<RealtimeTetrisState>(() =>
    createRealtimeTetrisState(target, speed),
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  const completedRef = useRef(false);

  // Victory check: emit onComplete strictly once when target is achieved
  useEffect(() => {
    if (state.status === 'won' && !completedRef.current) {
      completedRef.current = true;
      onComplete({
        challengeToken: challenge.challengeToken,
        achieved: state.lines,
        actions: state.actions,
      });
    }
  }, [state.status, state.lines, state.actions, challenge.challengeToken, onComplete]);

  // Real-time falling block timer
  useEffect(() => {
    if (state.status !== 'playing' || disabled) return;

    const timer = setInterval(() => {
      setState((prev) => tickFallingBlock(prev));
    }, state.speed);

    return () => clearInterval(timer);
  }, [state.status, state.speed, disabled]);

  const handleMoveLeft = useCallback(() => {
    if (disabled) return;
    setState((prev) => moveFallingCol(prev, -1));
  }, [disabled]);

  const handleMoveRight = useCallback(() => {
    if (disabled) return;
    setState((prev) => moveFallingCol(prev, 1));
  }, [disabled]);

  const handleHardDrop = useCallback(
    (col?: number) => {
      if (disabled) return;
      if (stateRef.current.status === 'gameover') {
        completedRef.current = false;
        setState((prev) => restartTetrisGame(prev));
        return;
      }
      if (stateRef.current.status === 'playing') {
        const targetCol = col !== undefined ? col : stateRef.current.fallingCol;
        setState((prev) => lockAndDrop(prev, targetCol));
      }
    },
    [disabled],
  );

  const handleSoftDrop = useCallback(() => {
    if (disabled || stateRef.current.status !== 'playing') return;
    setState((prev) => tickFallingBlock(prev));
  }, [disabled]);

  const handleReset = useCallback(() => {
    if (disabled) return;
    completedRef.current = false;
    setState((prev) => restartTetrisGame(prev));
  }, [disabled]);

  // Keyboard navigation: ArrowLeft/ArrowRight/A/D, ArrowDown/S, Space
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        event.preventDefault();
        handleMoveLeft();
      } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        event.preventDefault();
        handleMoveRight();
      } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        event.preventDefault();
        handleSoftDrop();
      } else if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        handleHardDrop();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, handleHardDrop, handleMoveLeft, handleMoveRight, handleSoftDrop]);

  const ghostRow =
    state.status === 'playing' ? getGhostRow(state.board, state.fallingCol) : null;

  return (
    <div className="grid gap-3 text-center select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between text-sm font-bold px-1">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Trophy size={16} />
          <span>
            Lines {state.lines} / {target}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {state.status === 'playing' && (
            <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs text-emerald-300 animate-pulse">
              Falling
            </span>
          )}
          {state.status === 'gameover' && (
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs text-rose-300 font-extrabold">
              Board Full! OUT
            </span>
          )}
          {state.status === 'won' && (
            <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs text-amber-300 font-extrabold">
              Victory!
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Zap size={14} className="text-amber-400" />
          <span>{state.speed}ms</span>
        </div>
      </div>

      {/* Tetris Arcade Matrix */}
      <div className="relative mx-auto w-full max-w-xs rounded-2xl border-2 border-slate-700/80 bg-slate-950 p-3 shadow-2xl shadow-cyan-950/40">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${TETRIS_WIDTH}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: TETRIS_HEIGHT }, (_, row) =>
            Array.from({ length: TETRIS_WIDTH }, (_, col) => {
              const index = row * TETRIS_WIDTH + col;
              const isLocked = state.board[index];
              const isFalling =
                state.status === 'playing' &&
                row === state.fallingRow &&
                col === state.fallingCol;
              const isGhost =
                state.status === 'playing' &&
                ghostRow === row &&
                col === state.fallingCol &&
                row !== state.fallingRow;

              return (
                <div
                  key={`${row}-${col}`}
                  onClick={() => handleHardDrop(col)}
                  className={`aspect-square rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                    isLocked
                      ? 'bg-cyan-400 border border-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                      : isFalling
                        ? 'bg-amber-400 border border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.6)] animate-pulse'
                        : isGhost
                          ? 'border border-dashed border-amber-400/40 bg-amber-400/10'
                          : 'bg-slate-900/90 border border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {isFalling && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white opacity-80" />
                  )}
                </div>
              );
            }),
          )}
        </div>

        {/* Game Over / Out Overlay */}
        {state.status === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-slate-950/85 backdrop-blur-sm p-4">
            <p className="text-xl font-black text-rose-400">BOARD FULL! OUT</p>
            <p className="mt-1 text-xs text-slate-300">
              Lines cleared: <span className="font-bold text-white">{state.lines}</span> / {target}
            </p>
            <Button
              type="button"
              className="mt-4 bg-rose-600 hover:bg-rose-500 text-white font-bold"
              onClick={handleReset}
            >
              <RotateCcw className="mr-1.5" size={16} />
              Try Again
            </Button>
          </div>
        )}

        {/* Victory Overlay */}
        {state.status === 'won' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-slate-950/90 backdrop-blur-sm p-4">
            <Trophy className="mx-auto mb-2 text-amber-300 animate-bounce" size={36} />
            <p className="text-xl font-black text-amber-300">TARGET CLEARED!</p>
            <p className="mt-1 text-xs text-slate-200">
              Completed {state.lines} lines! Advancing...
            </p>
          </div>
        )}
      </div>

      {/* Individual Column Quick Drop Buttons (for direct clicking & automated accessibility tests) */}
      <div className="mx-auto grid w-full max-w-xs grid-cols-6 gap-1.5">
        {Array.from({ length: TETRIS_WIDTH }, (_, column) => (
          <button
            key={column}
            type="button"
            aria-label={`Drop column ${column + 1}`}
            className={`grid min-h-11 place-items-center rounded-lg border text-xs font-bold transition ${
              state.status === 'playing' && state.fallingCol === column
                ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:border-cyan-400 hover:text-cyan-300'
            }`}
            disabled={disabled || state.status !== 'playing'}
            onClick={() => handleHardDrop(column)}
          >
            <ArrowDown size={16} />
          </button>
        ))}
      </div>

      {/* Control Buttons: Left, Hard Drop / Try Again, Right */}
      <div className="mx-auto flex w-full max-w-xs gap-2">
        <Button
          type="button"
          variant="secondary"
          aria-label="Move left"
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
            onClick={() => handleHardDrop()}
          >
            <ArrowDown className="mr-1.5" size={16} />
            Hard Drop (Space)
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          aria-label="Move right"
          disabled={disabled || state.status !== 'playing'}
          onClick={handleMoveRight}
          className="flex-1 py-3"
        >
          <ArrowRight size={18} />
        </Button>
      </div>

      <p className="text-xs text-slate-400">
        ◀ ▶ to slide • ▼ soft drop • Space hard drop
      </p>
      <span className="sr-only">Board height {TETRIS_HEIGHT}</span>
    </div>
  );
}
