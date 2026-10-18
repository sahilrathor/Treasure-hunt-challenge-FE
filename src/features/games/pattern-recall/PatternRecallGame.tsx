import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, RotateCcw, Sparkles, Volume2 } from 'lucide-react';

import {
  PAD_DEFINITIONS,
  patternStepIsCorrect,
  playPadTone,
  revealSpeed,
} from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function PatternRecallGame({ challenge, disabled, onComplete }: GameProps) {
  const sequence = (challenge.sequence as number[]) || [];
  const paletteCount = Math.min(8, Math.max(2, Number(challenge.palette) || 4));
  const pads = PAD_DEFINITIONS.slice(0, paletteCount);
  const speed = revealSpeed(challenge.difficulty);

  const [phase, setPhase] = useState<'watching' | 'waiting' | 'out' | 'won'>('watching');
  const [activeLitPad, setActiveLitPad] = useState<number | null>(null);
  const [userTappedPad, setUserTappedPad] = useState<number | null>(null);
  const [input, setInput] = useState<number[]>([]);
  const [playCount, setPlayCount] = useState(0);

  // Playback timer ref to cancel on unmount or retry
  const playbackTimersRef = useRef<number[]>([]);

  const clearAllTimers = () => {
    playbackTimersRef.current.forEach((t) => window.clearTimeout(t));
    playbackTimersRef.current = [];
  };

  useEffect(() => {
    clearAllTimers();
    setPhase('watching');
    setActiveLitPad(null);
    setInput([]);

    const onDuration = Math.max(160, Math.round(speed * 0.7));
    const offDuration = Math.max(80, Math.round(speed * 0.3));
    const stepDuration = onDuration + offDuration;

    // Small delay before starting playback
    const startDelay = 500;

    sequence.forEach((padValue, stepIdx) => {
      const onTime = startDelay + stepIdx * stepDuration;
      const offTime = onTime + onDuration;

      const onTimer = window.setTimeout(() => {
        setActiveLitPad(padValue);
        playPadTone(padValue, onDuration);
      }, onTime);

      const offTimer = window.setTimeout(() => {
        setActiveLitPad(null);
      }, offTime);

      playbackTimersRef.current.push(onTimer, offTimer);
    });

    // End of playback
    const finalTimer = window.setTimeout(() => {
      setActiveLitPad(null);
      setPhase('waiting');
    }, startDelay + sequence.length * stepDuration + 100);

    playbackTimersRef.current.push(finalTimer);

    return clearAllTimers;
  }, [challenge.challengeToken, playCount, sequence, speed]);

  function handlePadClick(value: number) {
    if (disabled || phase !== 'waiting' || input.length >= sequence.length) return;

    // Flash user tap
    setUserTappedPad(value);
    playPadTone(value, 180);
    window.setTimeout(() => setUserTappedPad(null), 180);

    // Validate step
    const isCorrect = patternStepIsCorrect(sequence, input, value);
    const nextInput = [...input, value];

    if (!isCorrect) {
      // OUT! Do NOT call onComplete on wrong sequence
      setPhase('out');
      setInput(nextInput);
      return;
    }

    setInput(nextInput);

    if (nextInput.length === sequence.length) {
      setPhase('won');
      onComplete({
        challengeToken: challenge.challengeToken,
        sequence: nextInput,
      });
    }
  }

  function handleTryAgain() {
    clearAllTimers();
    setInput([]);
    setPlayCount((c) => c + 1);
  }

  function handleWatchAgain() {
    if (phase !== 'waiting') return;
    clearAllTimers();
    setInput([]);
    setPlayCount((c) => c + 1);
  }

  return (
    <div className="grid gap-4 text-center select-none max-w-sm mx-auto">
      {/* Header status bar */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-bold px-1 text-slate-300">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Sparkles size={16} />
          <span>Pattern Recall</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Steps:</span>
          <span className="text-amber-300 font-mono font-bold">
            {input.length} / {sequence.length}
          </span>
        </div>
      </div>

      {/* State banner */}
      <div className="min-h-[44px] flex items-center justify-center">
        {phase === 'watching' && (
          <div className="flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/60 px-4 py-1.5 text-xs sm:text-sm font-semibold text-cyan-300 animate-pulse">
            <Eye size={16} />
            <span>Watch the flashing pattern...</span>
          </div>
        )}

        {phase === 'waiting' && (
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-300">
            <Volume2 size={16} />
            <span>Your turn! Repeat the pattern</span>
          </div>
        )}

        {phase === 'out' && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/80 px-4 py-2 text-xs sm:text-sm font-bold text-rose-300 animate-in shake">
            <AlertTriangle size={18} className="text-rose-400 shrink-0" />
            <span>OUT! Wrong button pressed!</span>
          </div>
        )}

        {phase === 'won' && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/80 px-4 py-2 text-xs sm:text-sm font-bold text-emerald-300">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>Pattern Cleared! Excellent Memory!</span>
          </div>
        )}
      </div>

      {/* Step progress dots */}
      <div className="flex justify-center items-center gap-1.5 py-1">
        {sequence.map((_, idx) => {
          const isDone = idx < input.length;
          const isCurrent = idx === input.length && phase === 'waiting';
          return (
            <div
              key={idx}
              className={`transition-all duration-200 rounded-full ${
                isDone
                  ? 'size-2.5 bg-emerald-400 shadow-sm shadow-emerald-400'
                  : isCurrent
                  ? 'size-3 bg-amber-400 ring-2 ring-amber-300/50 animate-pulse'
                  : 'size-2 bg-slate-800'
              }`}
            />
          );
        })}
      </div>

      {/* Interactive Pads Grid */}
      <div
        className={`mx-auto grid gap-3 p-4 rounded-3xl bg-slate-950/90 border-2 border-slate-800/80 shadow-2xl backdrop-blur-sm ${
          paletteCount <= 4
            ? 'grid-cols-2 max-w-[260px]'
            : paletteCount <= 6
            ? 'grid-cols-3 max-w-[320px]'
            : 'grid-cols-4 max-w-[340px]'
        }`}
      >
        {pads.map((pad, value) => {
          const isLitDuringPlayback = phase === 'watching' && activeLitPad === value;
          const isUserTapped = userTappedPad === value;
          const isLit = isLitDuringPlayback || isUserTapped;

          return (
            <button
              key={value}
              type="button"
              aria-label={`Pattern ${value + 1}`}
              disabled={disabled || phase !== 'waiting'}
              onClick={() => handlePadClick(value)}
              className={`relative aspect-square rounded-2xl border-2 transition-all duration-150 flex flex-col items-center justify-center gap-1 font-black cursor-pointer active:scale-95 disabled:cursor-not-allowed ${
                isLit
                  ? `${pad.activeColor} ${pad.glow} scale-105 border-white z-10`
                  : phase === 'watching'
                  ? `${pad.color} opacity-35 ${pad.border}`
                  : `${pad.color} hover:scale-102 ${pad.border}`
              }`}
            >
              <span className="text-xl sm:text-2xl drop-shadow">{pad.icon}</span>
              <span className="text-[10px] tracking-wider uppercase opacity-90">{pad.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-center gap-3 pt-2">
        {phase === 'out' ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleTryAgain}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold px-6 py-2 rounded-xl shadow-lg shadow-rose-950/50"
          >
            <RotateCcw size={16} />
            <span>Try Again</span>
          </Button>
        ) : phase === 'waiting' && (
          <button
            type="button"
            onClick={handleWatchAgain}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors py-1 px-3 rounded-lg border border-slate-800 bg-slate-900/60"
          >
            <RotateCcw size={13} />
            <span>Watch Pattern Again</span>
          </button>
        )}
      </div>
    </div>
  );
}
