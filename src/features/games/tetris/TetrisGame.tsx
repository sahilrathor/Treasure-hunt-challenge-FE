import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Trophy,
  Zap,
} from 'lucide-react';

import {
  createRealtimeTetrisState,
  getGhostPieceRow,
  hardDropCurrentPiece,
  moveCurrentPiece,
  restartTetrisGame,
  rotateCurrentPiece,
  TETRIS_HEIGHT,
  TETRIS_WIDTH,
  TETROMINO_COLORS,
  TETROMINO_ROTATIONS,
  tickCurrentPiece,
  type RealtimeTetrisState,
} from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function TetrisGame({ challenge, disabled, onComplete }: GameProps) {
  const target = Number(challenge.target ?? 4);
  const speed = Number(challenge.speed ?? 550);

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

  // Real-time falling piece timer
  useEffect(() => {
    if (state.status !== 'playing' || disabled) return;

    const timer = setInterval(() => {
      setState((prev) => tickCurrentPiece(prev));
    }, state.speed);

    return () => clearInterval(timer);
  }, [state.status, state.speed, disabled]);

  const handleMoveLeft = useCallback(() => {
    if (disabled || stateRef.current.status !== 'playing') return;
    setState((prev) => moveCurrentPiece(prev, -1));
  }, [disabled]);

  const handleMoveRight = useCallback(() => {
    if (disabled || stateRef.current.status !== 'playing') return;
    setState((prev) => moveCurrentPiece(prev, 1));
  }, [disabled]);

  const handleRotate = useCallback(() => {
    if (disabled || stateRef.current.status !== 'playing') return;
    setState((prev) => rotateCurrentPiece(prev));
  }, [disabled]);

  const handleSoftDrop = useCallback(() => {
    if (disabled || stateRef.current.status !== 'playing') return;
    setState((prev) => tickCurrentPiece(prev));
  }, [disabled]);

  const handleHardDrop = useCallback(() => {
    if (disabled) return;
    if (stateRef.current.status === 'gameover') {
      completedRef.current = false;
      setState((prev) => restartTetrisGame(prev));
      return;
    }
    if (stateRef.current.status === 'playing') {
      setState((prev) => hardDropCurrentPiece(prev));
    }
  }, [disabled]);

  const handleReset = useCallback(() => {
    if (disabled) return;
    completedRef.current = false;
    setState((prev) => restartTetrisGame(prev));
  }, [disabled]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        event.preventDefault();
        handleMoveLeft();
      } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        event.preventDefault();
        handleMoveRight();
      } else if (event.code === 'ArrowUp' || event.code === 'KeyW') {
        event.preventDefault();
        handleRotate();
      } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        event.preventDefault();
        handleSoftDrop();
      } else if (event.code === 'Space') {
        event.preventDefault();
        handleHardDrop();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, handleHardDrop, handleMoveLeft, handleMoveRight, handleRotate, handleSoftDrop]);

  // Calculate active piece and ghost piece matrices
  const currentMatrix =
    TETROMINO_ROTATIONS[state.currentPiece.type][state.currentPiece.rot]!;
  const currentColor = TETROMINO_COLORS[state.currentPiece.type];

  const ghostRow =
    state.status === 'playing'
      ? getGhostPieceRow(
          state.board,
          currentMatrix,
          state.currentPiece.row,
          state.currentPiece.col,
        )
      : null;

  const nextMatrix = TETROMINO_ROTATIONS[state.nextPiece][0]!;
  const nextColor = TETROMINO_COLORS[state.nextPiece];

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

        {/* Next Piece Mini Box & Speed */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2 py-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Next</span>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${nextMatrix[0]!.length}, minmax(0, 1fr))` }}>
              {nextMatrix.map((row, rIdx) =>
                row.map((val, cIdx) => (
                  <span
                    key={`${rIdx}-${cIdx}`}
                    className={`h-2 w-2 rounded-xs ${val ? nextColor.fill : 'bg-transparent'}`}
                  />
                )),
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Zap size={14} className="text-amber-400" />
            <span>{state.speed}ms</span>
          </div>
        </div>
      </div>

      {/* 10x16 Tetris Matrix */}
      <div className="relative mx-auto w-full max-w-xs rounded-2xl border-2 border-slate-700/80 bg-slate-950 p-2.5 shadow-2xl shadow-cyan-950/40">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${TETRIS_WIDTH}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: TETRIS_HEIGHT }, (_, r) =>
            Array.from({ length: TETRIS_WIDTH }, (_, c) => {
              const cellIndex = r * TETRIS_WIDTH + c;
              const lockedType = state.board[cellIndex];

              // Active falling piece check
              const isCurrent =
                state.status === 'playing' &&
                r >= state.currentPiece.row &&
                r < state.currentPiece.row + currentMatrix.length &&
                c >= state.currentPiece.col &&
                c < state.currentPiece.col + currentMatrix[0]!.length &&
                Boolean(currentMatrix[r - state.currentPiece.row]?.[c - state.currentPiece.col]);

              // Ghost projection check
              const isGhost =
                state.status === 'playing' &&
                ghostRow !== null &&
                r >= ghostRow &&
                r < ghostRow + currentMatrix.length &&
                c >= state.currentPiece.col &&
                c < state.currentPiece.col + currentMatrix[0]!.length &&
                Boolean(currentMatrix[r - ghostRow]?.[c - state.currentPiece.col]) &&
                !isCurrent;

              return (
                <div
                  key={`${r}-${c}`}
                  className={`aspect-square rounded-sm transition-all flex items-center justify-center ${
                    lockedType
                      ? `${TETROMINO_COLORS[lockedType].fill} border ${TETROMINO_COLORS[lockedType].border} ${TETROMINO_COLORS[lockedType].glow}`
                      : isCurrent
                        ? `${currentColor.fill} border ${currentColor.border} ${currentColor.glow} animate-pulse scale-[1.02]`
                        : isGhost
                          ? 'border border-dashed border-cyan-400/50 bg-cyan-400/10'
                          : 'bg-slate-900/90 border border-slate-800/80'
                  }`}
                >
                  {isCurrent && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white opacity-70" />
                  )}
                </div>
              );
            }),
          )}
        </div>

        {/* Board Full OUT Overlay */}
        {state.status === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-slate-950/90 backdrop-blur-sm p-4">
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

        {/* Target Cleared Victory Overlay */}
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

      {/* Arcade Controls */}
      <div className="mx-auto grid w-full max-w-xs gap-2">
        <div className="flex gap-2">
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

          <Button
            type="button"
            variant="secondary"
            aria-label="Rotate piece"
            disabled={disabled || state.status !== 'playing'}
            onClick={handleRotate}
            className="flex-1 py-3 border-amber-400/40 text-amber-300 hover:bg-amber-950/40 font-bold"
          >
            <RotateCw className="mr-1" size={18} />
            Rotate
          </Button>

          <Button
            type="button"
            variant="secondary"
            aria-label="Soft drop"
            disabled={disabled || state.status !== 'playing'}
            onClick={handleSoftDrop}
            className="flex-1 py-3"
          >
            <ArrowDown size={18} />
          </Button>

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

        {state.status === 'gameover' ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full border-rose-500/40 text-rose-300 hover:bg-rose-950/40 py-3 font-bold"
            onClick={handleReset}
            disabled={disabled}
          >
            <RotateCcw className="mr-1.5" size={16} />
            Try Again
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full py-3 text-sm font-extrabold"
            disabled={disabled || state.status !== 'playing'}
            onClick={handleHardDrop}
          >
            <ArrowDown className="mr-1.5" size={16} />
            Hard Drop (Space)
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-400">
        ◀ ▶ to slide • ▲ / Rotate • ▼ soft drop • Space hard drop
      </p>
      <span className="sr-only">Board height {TETRIS_HEIGHT}</span>
    </div>
  );
}
