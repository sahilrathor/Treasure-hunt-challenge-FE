import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

import { createBoard, moveBoard, peakTile, type Direction } from './engine';
import type { GameProps } from '../shared/types';

const controls = [
  ['up', ArrowUp],
  ['left', ArrowLeft],
  ['down', ArrowDown],
  ['right', ArrowRight],
] as const;

export function NumberMergeGame({ challenge, disabled, onComplete }: GameProps) {
  const [board, setBoard] = useState(createBoard);
  const [moves, setMoves] = useState<Direction[]>([]);
  const target = Number(challenge.target);
  const maxMoves = Number(challenge.maxMoves);

  function move(direction: Direction) {
    if (disabled || moves.length >= maxMoves) return;
    const moved = moveBoard(board, direction, moves.length + 1);
    if (!moved.changed) return;
    const nextMoves = [...moves, direction];
    setBoard(moved.board);
    setMoves(nextMoves);
    if (peakTile(moved.board) >= target || nextMoves.length === maxMoves) {
      onComplete({ challengeToken: challenge.challengeToken, moves: nextMoves });
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = event.key.replace('Arrow', '').toLowerCase() as Direction;
      if (controls.some(([candidate]) => candidate === direction)) {
        event.preventDefault();
        move(direction);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="grid gap-5 text-center">
      <div className="mx-auto grid size-64 grid-cols-4 gap-2 rounded-2xl bg-slate-950 p-3">
        {board.map((value, index) => (
          <div
            key={index}
            className={`grid place-items-center rounded-xl text-xl font-black ${value ? 'bg-amber-300 text-slate-950' : 'bg-slate-900'}`}
          >
            {value || ''}
          </div>
        ))}
      </div>
      <p className="font-bold">
        Highest tile {peakTile(board)} / {target} · {moves.length}/{maxMoves} moves
      </p>
      <div className="mx-auto grid grid-cols-3 gap-2">
        {controls.map(([direction, Icon], index) => (
          <button
            key={direction}
            aria-label={`Move ${direction}`}
            style={{ gridColumn: index === 0 ? '2' : undefined }}
            className="grid size-14 place-items-center rounded-xl border border-slate-700 bg-slate-950 hover:border-cyan-300"
            disabled={disabled || moves.length >= maxMoves}
            onClick={() => move(direction)}
          >
            <Icon />
          </button>
        ))}
      </div>
    </div>
  );
}
