import { useCallback, useRef, useState } from 'react';
import { Sparkles, Trophy } from 'lucide-react';

import {
  getCardTheme,
  isCardMatched,
  isValidMatch,
  type MatchPair,
} from './engine';
import type { GameProps } from '../shared/types';

export function MemoryMatchGame({ challenge, disabled, onComplete }: GameProps) {
  const board = (challenge.board as number[]) ?? [];
  const targetPairs = Number(challenge.pairs ?? 6);

  const [open, setOpen] = useState<number[]>([]);
  const [matches, setMatches] = useState<MatchPair[]>([]);
  const [locked, setLocked] = useState(false);
  const [turns, setTurns] = useState(0);
  const [mismatch, setMismatch] = useState<number[]>([]);

  const completedRef = useRef(false);

  const choose = useCallback(
    (index: number) => {
      if (
        disabled ||
        locked ||
        open.includes(index) ||
        isCardMatched(matches, index) ||
        board[index] === undefined
      ) {
        return;
      }

      if (open.length === 0) {
        setOpen([index]);
        setMismatch([]);
        return;
      }

      const first = open[0]!;
      setTurns((prev) => prev + 1);

      if (isValidMatch(board, first, index)) {
        const next = [...matches, [first, index] as MatchPair];
        setMatches(next);
        setOpen([]);
        setMismatch([]);

        if (next.length >= targetPairs && !completedRef.current) {
          completedRef.current = true;
          onComplete({
            challengeToken: challenge.challengeToken,
            matches: next,
          });
        }
      } else {
        setOpen([first, index]);
        setMismatch([first, index]);
        setLocked(true);
        setTimeout(() => {
          setOpen([]);
          setMismatch([]);
          setLocked(false);
        }, 700);
      }
    },
    [disabled, locked, open, matches, board, targetPairs, challenge.challengeToken, onComplete],
  );

  // Dynamic layout for Easy (3-wide), Medium (4x4), Hard (4x6 / 6x4)
  const gridLayoutClass =
    targetPairs <= 6
      ? 'grid-cols-3 max-w-xs'
      : targetPairs <= 8
        ? 'grid-cols-4 max-w-sm'
        : 'grid-cols-4 sm:grid-cols-6 max-w-md';

  const isWon = matches.length >= targetPairs;

  return (
    <div className="grid gap-3 text-center select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between text-sm font-bold px-1">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Trophy size={16} />
          <span>
            Pairs {matches.length} / {targetPairs}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isWon && (
            <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs text-amber-300 font-extrabold animate-bounce">
              Victory!
            </span>
          )}
          {!isWon && locked && (
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs text-rose-300">
              Mismatch!
            </span>
          )}
          {!isWon && !locked && open.length === 1 && (
            <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs text-amber-300">
              Pick Second Card
            </span>
          )}
          {!isWon && !locked && open.length === 0 && (
            <span className="rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-xs text-cyan-300">
              Pick Any Card
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span>Turns: {turns}</span>
        </div>
      </div>

      {/* Card Matrix */}
      <div className="relative mx-auto w-full">
        <div className={`mx-auto grid gap-2.5 ${gridLayoutClass}`}>
          {board.map((value, index) => {
            const isMatched = isCardMatched(matches, index);
            const isFlipped = open.includes(index) || isMatched;
            const isWrong = mismatch.includes(index);
            const theme = getCardTheme(value);

            return (
              <button
                key={index}
                type="button"
                aria-label={isFlipped ? `Card ${theme.label}` : `Card ${index + 1}`}
                disabled={disabled || locked || isMatched}
                onClick={() => choose(index)}
                className={`relative aspect-square min-h-14 sm:min-h-16 rounded-2xl border-2 transition-all duration-300 transform active:scale-95 flex flex-col items-center justify-center overflow-hidden ${
                  isMatched
                    ? 'border-emerald-400/70 bg-emerald-950/40 shadow-[0_0_12px_rgba(52,211,153,0.3)] cursor-default scale-[0.98]'
                    : isWrong
                      ? 'border-rose-500 bg-rose-950/60 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-shake'
                      : isFlipped
                        ? `${theme.border} bg-slate-900 shadow-xl ${theme.glow} scale-100`
                        : 'border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 hover:border-cyan-400/50 hover:shadow-cyan-950/40 hover:scale-[1.02]'
                }`}
              >
                {isFlipped ? (
                  <div className="flex flex-col items-center justify-center animate-flipIn">
                    <span className="text-2xl sm:text-3xl filter drop-shadow-md select-none">
                      {theme.icon}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 mt-0.5 select-none tracking-tight">
                      {theme.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-slate-600 group-hover:text-cyan-400">
                    <Sparkles size={20} className="opacity-40" />
                  </div>
                )}

                {/* Subtle sheen highlight */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
              </button>
            );
          })}
        </div>

        {/* Victory Celebration Overlay */}
        {isWon && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-slate-950/90 backdrop-blur-sm p-4">
            <Trophy className="mx-auto mb-2 text-amber-300 animate-bounce" size={40} />
            <p className="text-xl font-black text-amber-300">ALL PAIRS MATCHED!</p>
            <p className="mt-1 text-xs text-slate-200">
              Completed {targetPairs} pairs in {turns} turns!
            </p>
            <p className="mt-2 text-xs font-semibold text-emerald-400">
              Advancing to clue...
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Flip cards to find and match all {targetPairs} pairs
      </p>
    </div>
  );
}
