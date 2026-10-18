import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  RotateCcw,
  Trophy,
} from 'lucide-react';

import {
  canMove,
  createBoard,
  getTileStyle,
  moveBoard,
  peakTile,
  type Direction,
} from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

const controls = [
  ['up', ArrowUp, 'Move up', 'W / ▲'],
  ['left', ArrowLeft, 'Move left', 'A / ◀'],
  ['down', ArrowDown, 'Move down', 'S / ▼'],
  ['right', ArrowRight, 'Move right', 'D / ▶'],
] as const;

export function NumberMergeGame({ challenge, disabled, onComplete }: GameProps) {
  const [board, setBoard] = useState(createBoard);
  const [moves, setMoves] = useState<Direction[]>([]);
  const [status, setStatus] = useState<'playing' | 'out' | 'won'>('playing');
  const [outReason, setOutReason] = useState<string | null>(null);

  const target = Number(challenge.target) || 32;
  const maxMoves = Number(challenge.maxMoves) || 40;

  // Touch gesture tracking
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function executeMove(direction: Direction) {
    if (disabled || status !== 'playing' || moves.length >= maxMoves) return;

    const moveNumber = moves.length + 1;
    const moved = moveBoard(board, direction, moveNumber);
    if (!moved.changed) return;

    const nextMoves = [...moves, direction];
    const highest = peakTile(moved.board);

    setBoard(moved.board);
    setMoves(nextMoves);

    // 1. Victory check
    if (highest >= target) {
      setStatus('won');
      onComplete({
        challengeToken: challenge.challengeToken,
        moves: nextMoves,
      });
      return;
    }

    // 2. Out check: Moves exhausted (Do NOT call onComplete)
    if (nextMoves.length >= maxMoves) {
      setStatus('out');
      setOutReason(`Moves Exhausted! Max ${maxMoves} moves reached.`);
      return;
    }

    // 3. Out check: Board jammed, no valid moves left (Do NOT call onComplete)
    if (!canMove(moved.board)) {
      setStatus('out');
      setOutReason('Board Jammed! No valid merges remain.');
    }
  }

  function handleTryAgain() {
    setBoard(createBoard());
    setMoves([]);
    setStatus('playing');
    setOutReason(null);
  }

  // Keyboard navigation: Arrow keys & WASD
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (status !== 'playing') return;
      const key = event.key.toLowerCase();
      let direction: Direction | null = null;

      if (key === 'arrowup' || key === 'w') direction = 'up';
      else if (key === 'arrowdown' || key === 's') direction = 'down';
      else if (key === 'arrowleft' || key === 'a') direction = 'left';
      else if (key === 'arrowright' || key === 'd') direction = 'right';

      if (direction) {
        event.preventDefault();
        executeMove(direction);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Touch swipe handling
  function onTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current || status !== 'playing') return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const minSwipeDistance = 25;
    if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      executeMove(dx > 0 ? 'right' : 'left');
    } else {
      executeMove(dy > 0 ? 'down' : 'up');
    }
  }

  const currentPeak = peakTile(board);
  const movesRemaining = Math.max(0, maxMoves - moves.length);

  return (
    <div className="grid gap-4 text-center select-none max-w-sm mx-auto">
      {/* Top HUD Stats */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-bold px-1 text-slate-300">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Trophy size={16} />
          <span>
            Target: <span className="text-amber-300 font-mono text-base">{target}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Peak:</span>
          <span className="rounded-md bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 font-mono text-amber-300 text-xs sm:text-sm font-black">
            {currentPeak}
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono">
          <span className="text-slate-400">Moves:</span>
          <span
            className={`font-bold ${
              movesRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-slate-200'
            }`}
          >
            {moves.length}/{maxMoves}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div
          className={`h-full transition-all duration-200 ${
            currentPeak >= target
              ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
              : movesRemaining <= 5
              ? 'bg-rose-500'
              : 'bg-gradient-to-r from-cyan-400 to-amber-400'
          }`}
          style={{ width: `${Math.min(100, (moves.length / maxMoves) * 100)}%` }}
        />
      </div>

      {/* Main 4x4 2048 Grid Arena */}
      <div
        className="relative mx-auto aspect-square w-full max-w-[280px] sm:max-w-[300px] overflow-hidden rounded-2xl border-2 border-slate-700/80 bg-slate-950 p-2.5 shadow-2xl backdrop-blur-sm cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-2">
          {board.map((value, index) => {
            const style = getTileStyle(value);
            return (
              <div
                key={index}
                className={`flex items-center justify-center rounded-xl border font-black transition-all duration-150 ${style.bg} ${style.border} ${style.fontSize} ${
                  style.glow || ''
                } ${value ? 'scale-100 shadow-inner' : 'scale-95 opacity-40'}`}
              >
                {value || ''}
              </div>
            );
          })}
        </div>

        {/* OUT Overlay */}
        {status === 'out' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/92 p-4 backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="flex size-12 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 ring-2 ring-rose-500/50">
              <AlertTriangle size={26} />
            </div>
            <div>
              <h3 className="text-xl font-black text-rose-400 tracking-wider">OUT!</h3>
              <p className="text-xs text-rose-200/80 mt-1">{outReason}</p>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Highest Tile: <span className="font-bold text-amber-300">{currentPeak}</span> / {target}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={handleTryAgain}
              className="mt-1 flex items-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold px-6 py-2 rounded-xl shadow-lg shadow-rose-950/50"
            >
              <RotateCcw size={16} />
              <span>Try Again</span>
            </Button>
          </div>
        )}

        {/* Won Overlay */}
        {status === 'won' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 p-4 backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-400/50 animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-emerald-300 tracking-wider">TARGET REACHED!</h3>
              <p className="text-xs text-emerald-200/80 mt-1">
                Tile {target} merged in {moves.length} moves!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Directional Controls (Keyboard hints + Buttons) */}
      <div className="mx-auto grid grid-cols-3 gap-2 pt-1 max-w-[200px]">
        {controls.map(([direction, Icon, label, hint], index) => (
          <button
            key={direction}
            type="button"
            aria-label={label}
            title={`${label} (${hint})`}
            style={{ gridColumn: index === 0 ? '2' : undefined }}
            className="flex flex-col items-center justify-center size-13 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:border-cyan-400 hover:bg-slate-800 active:scale-90 transition-all text-slate-200 hover:text-cyan-300 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={disabled || status !== 'playing' || moves.length >= maxMoves}
            onClick={() => executeMove(direction)}
          >
            <Icon size={18} />
            <span className="text-[9px] text-slate-400 font-mono tracking-tighter mt-0.5">
              {direction.toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-slate-400">
        Swipe on board or use <span className="font-mono text-cyan-300">Arrow</span> /{' '}
        <span className="font-mono text-cyan-300">WASD</span> keys
      </p>
    </div>
  );
}
