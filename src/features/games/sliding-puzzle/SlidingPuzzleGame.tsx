import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Check, Grid, RotateCcw, Trophy } from 'lucide-react';

import {
  canSlideTile,
  createSlidingPuzzleState,
  slideTile,
  type SlidingPuzzleState,
} from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function SlidingPuzzleGame({ challenge, disabled, onComplete }: GameProps) {
  const size = Number(challenge.size ?? 3);
  const scrambleMoves = Number(challenge.scrambleMoves ?? 15);
  const initialTiles = Array.isArray(challenge.initialTiles)
    ? (challenge.initialTiles as number[])
    : undefined;

  const storageKey = useMemo(
    () => `sliding_puzzle_save_${challenge.challengeToken ?? 'default'}`,
    [challenge.challengeToken],
  );

  const [savedState] = useState<SlidingPuzzleState | null>(() => {
    try {
      const raw = localStorage.getItem(`sliding_puzzle_save_${challenge.challengeToken ?? 'default'}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.size === size && Array.isArray(parsed.tiles)) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const [state, setState] = useState<SlidingPuzzleState>(() =>
    savedState ?? createSlidingPuzzleState(size, scrambleMoves, initialTiles),
  );

  const completedRef = useRef(false);

  // Auto-save game state periodically after interval and on changes
  const stateRef = useRef(state);
  stateRef.current = state;

  const persistState = useCallback(() => {
    try {
      if (stateRef.current.status === 'won') {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(stateRef.current));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    persistState();
  }, [state, persistState]);

  useEffect(() => {
    const timer = setInterval(persistState, 1000);
    window.addEventListener('beforeunload', persistState);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', persistState);
      persistState();
    };
  }, [persistState]);

  const handleTileClick = useCallback(
    (tileIdx: number) => {
      if (disabled || state.status !== 'playing') return;
      const next = slideTile(state, tileIdx);
      setState(next);

      if (next.status === 'won' && !completedRef.current) {
        completedRef.current = true;
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
        onComplete({
          challengeToken: challenge.challengeToken,
          moves: next.moves,
          finalTiles: next.tiles,
        });
      }
    },
    [disabled, state, onComplete, challenge.challengeToken, storageKey],
  );

  const handleReset = useCallback(() => {
    if (disabled) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setState(createSlidingPuzzleState(size, scrambleMoves, state.initialTiles));
  }, [disabled, size, scrambleMoves, state.initialTiles, storageKey]);

  // Arrow key navigation
  useEffect(() => {
    if (disabled || state.status !== 'playing') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const emptyIdx = state.tiles.indexOf(0);
      const row = Math.floor(emptyIdx / size);
      const col = emptyIdx % size;

      let targetIdx = -1;
      if (e.key === 'ArrowUp' && row < size - 1) {
        targetIdx = emptyIdx + size; // Tile below moves up
      } else if (e.key === 'ArrowDown' && row > 0) {
        targetIdx = emptyIdx - size; // Tile above moves down
      } else if (e.key === 'ArrowLeft' && col < size - 1) {
        targetIdx = emptyIdx + 1; // Tile right moves left
      } else if (e.key === 'ArrowRight' && col > 0) {
        targetIdx = emptyIdx - 1; // Tile left moves right
      }

      if (targetIdx !== -1) {
        e.preventDefault();
        handleTileClick(targetIdx);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, state, size, handleTileClick]);

  const emptyIdx = state.tiles.indexOf(0);
  const total = size * size;

  return (
    <div className="flex flex-col items-center gap-3.5 w-full max-w-sm mx-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="text-cyan-400" size={16} />
          <span className="text-xs font-bold text-slate-300">
            Moves: <span className="text-cyan-300 font-black">{state.moveCount}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Grid size={14} className="text-amber-400" />
          <span>Goal: 1 to {total - 1}</span>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="text-xs py-1 px-2 h-7"
          onClick={handleReset}
          disabled={disabled}
        >
          <RotateCcw size={12} className="mr-1" /> Reset
        </Button>
      </div>

      {/* Sliding Puzzle Grid */}
      <div className="relative w-full aspect-square max-w-[340px] rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-2xl flex items-center justify-center">
        <div
          className="grid w-full h-full gap-2.5"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
          }}
        >
          {state.tiles.map((num, idx) => {
            if (num === 0) {
              return (
                <div
                  key="empty"
                  className="rounded-xl border border-dashed border-slate-800/80 bg-slate-900/30 flex items-center justify-center select-none"
                >
                  <span className="text-slate-700 text-xs">·</span>
                </div>
              );
            }

            const isSlidable = canSlideTile(idx, emptyIdx, size);
            const isCorrectSpot = num === idx + 1;

            return (
              <button
                key={num}
                type="button"
                onClick={() => handleTileClick(idx)}
                disabled={disabled || state.status !== 'playing' || !isSlidable}
                className={`relative flex items-center justify-center rounded-xl font-mono text-xl sm:text-2xl font-black select-none transition shadow-md ${
                  isCorrectSpot
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 border-2'
                    : isSlidable
                      ? 'border-cyan-500/60 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-200 border cursor-pointer shadow-cyan-500/10'
                      : 'border-slate-800 bg-slate-900 text-slate-300 border cursor-default'
                }`}
                aria-label={`Slide tile ${num}`}
              >
                <span>{num}</span>
                {isCorrectSpot && (
                  <Check
                    size={12}
                    className="absolute top-1.5 right-1.5 text-emerald-400"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Victory Overlay */}
        {state.status === 'won' && (
          <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 gap-2.5 animate-in fade-in">
            <Trophy className="text-emerald-400" size={36} />
            <h3 className="text-xl font-black text-emerald-300">Puzzle Solved!</h3>
            <p className="text-xs text-slate-300 text-center">
              Ordered in {state.moveCount} moves. Recording checkpoint completion…
            </p>
          </div>
        )}
      </div>

      {/* Quick helper tip */}
      <p className="text-[11px] text-slate-500 text-center">
        Tap any tile adjacent to the blank space to slide it into place.
      </p>
    </div>
  );
}
