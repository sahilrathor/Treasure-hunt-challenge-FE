import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Skull, Trophy } from 'lucide-react';

import { createSnakeState, moveSnake, type SnakeDirection } from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

const controls = [
  ['up', ArrowUp],
  ['left', ArrowLeft],
  ['down', ArrowDown],
  ['right', ArrowRight],
] as const;

export function SnakeGame({ challenge, disabled, onComplete }: GameProps) {
  const target = Number(challenge.target);
  const obstacleCount = Number(challenge.obstacles ?? 0);
  const [state, setState] = useState(() => createSnakeState(obstacleCount));
  const [actions, setActions] = useState<SnakeDirection[]>([]);

  function resetGame() {
    setState(createSnakeState(obstacleCount));
    setActions([]);
  }

  function move(direction: SnakeDirection) {
    if (disabled || state.over || state.score >= target) return;
    const next = moveSnake(state, direction);
    const nextActions = [...actions, direction];
    setState(next);
    setActions(nextActions);

    if (next.score >= target) {
      // GOAL REACHED! LEVEL CLEARED!
      onComplete({
        challengeToken: challenge.challengeToken,
        achieved: next.score,
        actions: nextActions,
      });
      return;
    }

    // When next.over is true (crashed into boundary, tail, or obstacle),
    // do NOT call onComplete! The snake is OUT!
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = event.key.replace('Arrow', '').toLowerCase() as SnakeDirection;
      if (controls.some(([candidate]) => candidate === direction)) {
        event.preventDefault();
        move(direction);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, state, actions]);

  const isWon = state.score >= target;
  const isOut = state.over && !isWon;

  return (
    <div className="grid gap-4 text-center">
      <div className="flex items-center justify-between px-2">
        <p className="text-xl sm:text-2xl font-black">
          Food {state.score} / {target}
        </p>
        {isOut && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30 animate-pulse">
            <Skull size={13} /> OUT!
          </span>
        )}
        {isWon && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
            <Trophy size={13} /> CLEARED!
          </span>
        )}
      </div>

      {isOut && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/70 p-3 text-center animate-in fade-in duration-200">
          <div className="flex items-center justify-center gap-2 text-rose-400 font-black text-sm">
            <Skull size={18} />
            <span>
              {state.crashReason === 'wall'
                ? 'OUT! You touched the boundary!'
                : state.crashReason === 'self'
                  ? 'OUT! You touched yourself (tail)!'
                  : 'OUT! You hit an obstacle!'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-300">
            Target is {target} food. You collected {state.score}.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-2.5 min-h-8 text-xs font-bold border-rose-500/40 bg-rose-900/40 hover:bg-rose-800/60 text-rose-200"
            onClick={resetGame}
          >
            <RotateCcw className="mr-1.5" size={13} /> Try Again
          </Button>
        </div>
      )}

      {isWon && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/70 p-3 text-center animate-in fade-in duration-200">
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-sm">
            <Trophy size={18} />
            <span>Target Reached! Challenge Passed!</span>
          </div>
          <p className="mt-1 text-xs text-slate-300">
            Collected all {target} food items without crashing!
          </p>
        </div>
      )}

      <div
        className={`mx-auto grid aspect-square w-full max-w-sm grid-cols-8 gap-1 rounded-2xl bg-slate-950 p-3 transition-colors ${
          isOut
            ? 'border-2 border-rose-500/60 ring-2 ring-rose-500/20'
            : isWon
              ? 'border-2 border-emerald-500/60 ring-2 ring-emerald-500/20'
              : 'border border-slate-800'
        }`}
      >
        {Array.from({ length: 64 }, (_, index) => {
          const snakeIndex = state.snake.indexOf(index);
          return (
            <span
              key={index}
              className={`rounded-sm transition-colors ${
                index === state.food
                  ? 'animate-pulse bg-rose-400'
                  : state.obstacles.includes(index)
                    ? 'bg-slate-600'
                    : snakeIndex === 0
                      ? isOut
                        ? 'bg-rose-500 ring-1 ring-rose-300'
                        : isWon
                          ? 'bg-emerald-300'
                          : 'bg-cyan-200'
                      : snakeIndex > 0
                        ? isOut
                          ? 'bg-rose-900/60'
                          : isWon
                            ? 'bg-emerald-500'
                            : 'bg-emerald-400'
                        : 'bg-slate-900'
              }`}
            />
          );
        })}
      </div>

      <div className="mx-auto grid grid-cols-3 gap-2">
        {controls.map(([direction, Icon], index) => (
          <Button
            key={direction}
            type="button"
            variant="secondary"
            aria-label={`Move ${direction}`}
            style={{ gridColumn: index === 0 ? '2' : undefined }}
            className="size-14 p-0"
            disabled={disabled || state.over || isWon}
            onClick={() => move(direction)}
          >
            <Icon />
          </Button>
        ))}
      </div>

      {isOut ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            onClick={resetGame}
          >
            <RotateCcw className="mr-1.5" size={13} /> Restart Snake Run
          </Button>
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          Use the arrows. Avoid the walls, your tail, and gray obstacles.
        </p>
      )}
    </div>
  );
}
