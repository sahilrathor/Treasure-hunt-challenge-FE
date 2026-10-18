import { useEffect, useState } from 'react';

import { patternStepIsCorrect, revealSpeed } from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

const colors = ['bg-cyan-300', 'bg-fuchsia-400', 'bg-amber-300', 'bg-emerald-400', 'bg-rose-400'];

export function PatternRecallGame({ challenge, disabled, onComplete }: GameProps) {
  const sequence = challenge.sequence as number[];
  const [showing, setShowing] = useState(true);
  const [activeStep, setActiveStep] = useState(-1);
  const [input, setInput] = useState<number[]>([]);

  useEffect(() => {
    const speed = revealSpeed(challenge.difficulty);
    let step = -1;
    const timer = setInterval(() => {
      step += 1;
      if (step >= sequence.length) {
        clearInterval(timer);
        setActiveStep(-1);
        setTimeout(() => setShowing(false), speed);
      } else {
        setActiveStep(step);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [challenge.difficulty, sequence.length]);

  function choose(value: number) {
    if (disabled || showing) return;
    const next = [...input, value];
    setInput(next);
    if (!patternStepIsCorrect(sequence, input, value) || next.length === sequence.length) {
      onComplete({ challengeToken: challenge.challengeToken, sequence: next });
    }
  }

  return (
    <div className="grid gap-6 text-center">
      <p className="font-bold text-amber-300">
        {showing ? 'Watch the flashing pattern' : `Repeat it · ${input.length}/${sequence.length}`}
      </p>
      <div className="mx-auto flex max-w-md flex-wrap justify-center gap-3">
        {Array.from({ length: Number(challenge.palette) }, (_, value) => {
          const lit = showing && activeStep >= 0 && sequence[activeStep] === value;
          return (
            <Button
              key={value}
              aria-label={`Pattern ${value + 1}`}
              disabled={disabled || showing || input.length >= sequence.length}
              onClick={() => choose(value)}
              className={`size-20 p-0 transition ${colors[value]} ${lit ? 'scale-110 ring-4 ring-white' : showing ? 'opacity-30' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}
