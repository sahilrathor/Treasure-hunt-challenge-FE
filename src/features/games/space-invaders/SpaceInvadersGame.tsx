import { useState } from 'react';
import { ArrowLeft, ArrowRight, Rocket } from 'lucide-react';

import { createInvaderState, fireShot, moveShip } from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function SpaceInvadersGame({ challenge, disabled, onComplete }: GameProps) {
  const target = Number(challenge.target);
  const [state, setState] = useState(createInvaderState);
  const [actions, setActions] = useState<string[]>([]);

  function fire() {
    if (disabled) return;
    const result = fireShot(state, target);
    const nextActions = [...actions, result.action];
    setState(result.state);
    setActions(nextActions);
    if (result.state.destroyed.length === target) {
      onComplete({
        challengeToken: challenge.challengeToken,
        achieved: target,
        actions: nextActions,
        livesRemaining: Number(challenge.lives ?? 3),
      });
    }
  }

  return (
    <div className="grid gap-5 text-center">
      <p className="text-2xl font-black">
        Invaders {state.destroyed.length} / {target}
      </p>
      <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-3 rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle_at_center,rgba(103,232,249,.12),transparent_60%)] p-4">
        {Array.from({ length: target }, (_, index) => (
          <span
            key={index}
            className={`grid aspect-square place-items-center rounded-full text-2xl transition ${state.destroyed.includes(index) ? 'scale-0' : 'bg-cyan-300/20 text-cyan-300'}`}
          >
            ◆
          </span>
        ))}
        {Array.from({ length: 4 }, (_, column) => (
          <span key={`ship-${column}`} className="grid h-12 place-items-center">
            {state.ship === column ? <Rocket className="rotate-[-45deg] text-amber-300" /> : null}
          </span>
        ))}
      </div>
      <div className="mx-auto flex gap-2">
        <Button
          type="button"
          variant="secondary"
          aria-label="Move ship left"
          onClick={() => setState((current) => moveShip(current, -1))}
        >
          <ArrowLeft />
        </Button>
        <Button type="button" disabled={disabled} onClick={fire}>
          Fire
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label="Move ship right"
          onClick={() => setState((current) => moveShip(current, 1))}
        >
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
