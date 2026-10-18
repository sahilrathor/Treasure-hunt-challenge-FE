import { useState } from 'react';

import { parseFen, pieceGlyphs, squareName } from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function ChessPuzzleGame({ challenge, disabled, onComplete }: GameProps) {
  const [board, setBoard] = useState(() => parseFen(String(challenge.fen)));
  const moveCount = Number(challenge.moveCount);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState<string[]>([]);

  function choose(index: number) {
    if (disabled || moves.length >= moveCount) return;
    if (selected === null) {
      if (board[index]) setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    const next = [...moves, `${squareName(selected)}-${squareName(index)}`];
    const nextBoard = [...board];
    nextBoard[index] = nextBoard[selected];
    nextBoard[selected] = null;
    setBoard(nextBoard);
    setMoves(next);
    setSelected(null);
    if (next.length === moveCount) {
      onComplete({ challengeToken: challenge.challengeToken, moves: next });
    }
  }

  return (
    <div className="grid gap-4">
      <div className="mx-auto grid aspect-square w-full max-w-sm grid-cols-8 overflow-hidden rounded-xl border-4 border-slate-700">
        {board.map((piece, index) => {
          const dark = (Math.floor(index / 8) + index) % 2 === 1;
          return (
            <button
              key={index}
              type="button"
              aria-label={`${squareName(index)}${piece ? ` ${piece}` : ''}`}
              disabled={disabled}
              onClick={() => choose(index)}
              className={`grid aspect-square place-items-center text-2xl sm:text-3xl ${dark ? 'bg-slate-600' : 'bg-slate-300'} ${selected === index ? 'ring-4 ring-inset ring-amber-300' : ''}`}
            >
              <span
                className={
                  piece === piece?.toUpperCase() ? 'text-white drop-shadow' : 'text-slate-950'
                }
              >
                {piece ? pieceGlyphs[piece] : ''}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-center font-bold">
        Find the best {moveCount === 1 ? 'move' : `${moveCount}-move line`}
      </p>
      <div className="min-h-8 text-center font-mono text-cyan-300">
        {moves.join(' · ') || 'Select a piece, then its destination'}
      </div>
      {moves.length ? (
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => {
            setMoves([]);
            setSelected(null);
            setBoard(parseFen(String(challenge.fen)));
          }}
        >
          Reset line
        </Button>
      ) : null}
    </div>
  );
}
