import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

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
  const [state, setState] = useState(() => createSnakeState(Number(challenge.obstacles ?? 0)));
  const [actions, setActions] = useState<SnakeDirection[]>([]);

  function move(direction: SnakeDirection) {
    if (disabled || state.over) return;
    const next = moveSnake(state, direction);
    const nextActions = [...actions, direction];
    setState(next);
    setActions(nextActions);
    if (next.score >= target || next.over) {
      onComplete({
        challengeToken: challenge.challengeToken,
        achieved: next.score,
        actions: nextActions,
      });
    }
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
  });

  return (
    <div className="grid gap-4 text-center">
      <p className="text-2xl font-black">
        Food {state.score} / {target}
      </p>
      <div className="mx-auto grid aspect-square w-full max-w-sm grid-cols-8 gap-1 rounded-2xl bg-slate-950 p-3">
        {Array.from({ length: 64 }, (_, index) => {
          const snakeIndex = state.snake.indexOf(index);
          return (
            <span
              key={index}
              className={`rounded-sm ${index === state.food ? 'animate-pulse bg-rose-400' : state.obstacles.includes(index) ? 'bg-slate-600' : snakeIndex === 0 ? 'bg-cyan-200' : snakeIndex > 0 ? 'bg-emerald-400' : 'bg-slate-900'}`}
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
            disabled={disabled || state.over}
            onClick={() => move(direction)}
          >
            <Icon />
          </Button>
        ))}
      </div>
      <p className="text-sm text-slate-400">
        Use the arrows. Avoid the walls, your tail, and gray obstacles.
      </p>
    </div>
  );
}
