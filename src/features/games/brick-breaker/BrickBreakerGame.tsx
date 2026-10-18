import { useState } from 'react';
import { ArrowLeft, ArrowRight, Circle } from 'lucide-react';

import { createBrickState, launchBall, movePaddle } from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function BrickBreakerGame({ challenge, disabled, onComplete }: GameProps) {
  const target = Number(challenge.target);
  const [state, setState] = useState(() => createBrickState(Number(challenge.lives ?? 3)));
  const [actions, setActions] = useState<string[]>([]);

  function launch() {
    if (disabled || state.lives === 0) return;
    const result = launchBall(state, target);
    const nextActions = [...actions, result.action];
    setState(result.state);
    setActions(nextActions);
    if (result.state.broken.length === target) {
      onComplete({
        challengeToken: challenge.challengeToken,
        achieved: result.state.broken.length,
        actions: nextActions,
        livesRemaining: result.state.lives,
      });
    }
  }

  return (
    <div className="grid gap-5 text-center">
      <div className="flex justify-between text-sm font-bold">
        <span>
          Bricks {state.broken.length}/{target}
        </span>
        <span>Lives {'♥'.repeat(state.lives)}</span>
      </div>
      <div className="relative mx-auto h-72 w-full max-w-md overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-slate-950 p-4">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: target }, (_, index) => (
            <span
              key={index}
              className={`h-7 rounded border-b-4 transition ${state.broken.includes(index) ? 'scale-0 border-transparent' : 'border-fuchsia-700 bg-fuchsia-400'}`}
            />
          ))}
        </div>
        <Circle
          className="absolute bottom-16 left-1/2 -translate-x-1/2 fill-cyan-200 text-cyan-200"
          size={16}
        />
        <span
          className="absolute bottom-6 h-3 w-1/5 rounded-full bg-cyan-300 transition-all"
          style={{ left: `${state.paddle * 20}%` }}
        />
      </div>
      <div className="mx-auto flex gap-2">
        <Button
          type="button"
          variant="secondary"
          aria-label="Move paddle left"
          onClick={() => setState((current) => movePaddle(current, -1))}
        >
          <ArrowLeft />
        </Button>
        {state.lives === 0 && state.broken.length < target ? (
          <Button
            type="button"
            variant="secondary"
            className="border-rose-500/40 text-rose-300"
            onClick={() => {
              setState(createBrickState(Number(challenge.lives ?? 3)));
              setActions([]);
            }}
          >
            Out of lives! Try Again
          </Button>
        ) : (
          <Button type="button" disabled={disabled || state.broken.length === target} onClick={launch}>
            Launch ball
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          aria-label="Move paddle right"
          onClick={() => setState((current) => movePaddle(current, 1))}
        >
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
