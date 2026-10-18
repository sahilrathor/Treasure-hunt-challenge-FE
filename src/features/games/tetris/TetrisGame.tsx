import { useState } from 'react';
import { ArrowDown } from 'lucide-react';

import { createTetrisBoard, dropBlock, TETRIS_HEIGHT, TETRIS_WIDTH } from './engine';
import type { GameProps } from '../shared/types';

export function TetrisGame({ challenge, disabled, onComplete }: GameProps) {
  const target = Number(challenge.target);
  const [board, setBoard] = useState(createTetrisBoard);
  const [lines, setLines] = useState(0);
  const [actions, setActions] = useState<string[]>([]);

  function drop(column: number) {
    if (disabled) return;
    const result = dropBlock(board, column);
    const nextActions = [...actions, `drop:${column}`];
    setActions(nextActions);
    if (result.overflow) {
      onComplete({
        challengeToken: challenge.challengeToken,
        achieved: lines,
        actions: nextActions,
      });
      return;
    }
    const nextLines = lines + result.cleared;
    setBoard(result.board);
    setLines(nextLines);
    if (nextLines >= target) {
      onComplete({
        challengeToken: challenge.challengeToken,
        achieved: nextLines,
        actions: nextActions,
      });
    }
  }

  return (
    <div className="grid gap-4 text-center">
      <p className="text-2xl font-black">
        Lines {lines} / {target}
      </p>
      <div
        className="mx-auto grid w-full max-w-xs gap-1 rounded-2xl border border-slate-700 bg-slate-950 p-3"
        style={{ gridTemplateColumns: `repeat(${TETRIS_WIDTH}, minmax(0, 1fr))` }}
      >
        {board.map((filled, index) => (
          <span
            key={index}
            className={`aspect-square rounded-sm ${filled ? 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.35)]' : 'bg-slate-900'}`}
          />
        ))}
      </div>
      <div className="mx-auto grid w-full max-w-xs grid-cols-6 gap-1">
        {Array.from({ length: TETRIS_WIDTH }, (_, column) => (
          <button
            key={column}
            aria-label={`Drop column ${column + 1}`}
            className="grid min-h-12 place-items-center rounded-lg border border-slate-700 bg-slate-900 hover:border-cyan-300"
            disabled={disabled}
            onClick={() => drop(column)}
          >
            <ArrowDown size={18} />
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-400">Drop blocks and complete full horizontal lines.</p>
      <span className="sr-only">Board height {TETRIS_HEIGHT}</span>
    </div>
  );
}
