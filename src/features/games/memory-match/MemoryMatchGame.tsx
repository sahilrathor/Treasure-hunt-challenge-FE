import { useState } from 'react';

import { isCardMatched, isValidMatch, type MatchPair } from './engine';
import type { GameProps } from '../shared/types';

export function MemoryMatchGame({ challenge, disabled, onComplete }: GameProps) {
  const board = challenge.board as number[];
  const [open, setOpen] = useState<number[]>([]);
  const [matches, setMatches] = useState<MatchPair[]>([]);
  const [locked, setLocked] = useState(false);
  function choose(index: number) {
    if (disabled || locked || open.includes(index) || isCardMatched(matches, index)) return;
    if (open.length === 0) {
      setOpen([index]);
      return;
    }
    const first = open[0]!;
    if (isValidMatch(board, first, index)) {
      const next = [...matches, [first, index] as MatchPair];
      setMatches(next);
      setOpen([]);
      if (next.length === Number(challenge.pairs))
        onComplete({ challengeToken: challenge.challengeToken, matches: next });
    } else {
      setOpen([first, index]);
      setLocked(true);
      setTimeout(() => {
        setOpen([]);
        setLocked(false);
      }, 650);
    }
  }
  return (
    <div>
      <p className="mb-4 text-center text-sm text-slate-400">
        Match all {String(challenge.pairs)} pairs
      </p>
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-2">
        {board.map((value, index) => {
          const visible = open.includes(index) || isCardMatched(matches, index);
          return (
            <button
              key={index}
              disabled={disabled || locked}
              onClick={() => choose(index)}
              className={`aspect-square min-h-14 rounded-xl border text-xl font-black transition ${visible ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-slate-700 bg-slate-950 text-transparent hover:border-slate-500'}`}
            >
              {visible ? String.fromCharCode(65 + value) : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
