import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Delete, KeyRound, Lock, RotateCcw, ShieldCheck, Unlock } from 'lucide-react';

import {
  appendDigit,
  backspaceDigit,
  createCrackTheCodeState,
  evaluateGuess,
  playHitSound,
  playSubmitSound,
  playWinSound,
  type CrackTheCodeState,
} from './engine';
import { Button } from '@/components/atoms/Button';
import type { GameProps } from '../shared/types';

export function CrackTheCodeGame({ challenge, disabled, onComplete }: GameProps) {
  const digits = Number(challenge.digits ?? 4);
  const maxGuesses = Number(challenge.maxGuesses ?? 6);
  const maxDigit = Number(challenge.maxDigit ?? 8);
  const allowDuplicates = Boolean(challenge.allowDuplicates ?? false);

  // Fallback secret if not provided (e.g. sandbox without pre-gen)
  const secretCode = useMemo(() => {
    if (Array.isArray(challenge.code) && challenge.code.length === digits) {
      return challenge.code as number[];
    }
    // Generate deterministic/client fallback
    const res: number[] = [];
    const pool = Array.from({ length: maxDigit }, (_, i) => i + 1);
    for (let i = 0; i < digits; i++) {
      if (!allowDuplicates && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        res.push(pool.splice(idx, 1)[0]!);
      } else {
        res.push(Math.floor(Math.random() * maxDigit) + 1);
      }
    }
    return res;
  }, [challenge.code, digits, maxDigit, allowDuplicates]);

  const [state, setState] = useState<CrackTheCodeState>(() =>
    createCrackTheCodeState(digits, maxGuesses, maxDigit, allowDuplicates),
  );

  const completedRef = useRef(false);

  const handleAppend = useCallback(
    (digit: number) => {
      if (disabled) return;
      setState((prev) => appendDigit(prev, digit));
    },
    [disabled],
  );

  const handleBackspace = useCallback(() => {
    if (disabled) return;
    setState((prev) => backspaceDigit(prev));
  }, [disabled]);

  const handleSubmitGuess = useCallback(() => {
    if (disabled || state.status !== 'playing') return;
    if (state.currentInput.length !== state.digits) return;

    const evaluation = evaluateGuess(state.currentInput, secretCode);
    const newGuesses = [
      ...state.guesses,
      {
        guess: state.currentInput,
        exact: evaluation.exact,
        partial: evaluation.partial,
      },
    ];

    const isWon = evaluation.exact === state.digits;
    const isOut = !isWon && newGuesses.length >= state.maxGuesses;

    if (isWon) {
      playWinSound();
      setState((prev) => ({
        ...prev,
        guesses: newGuesses,
        currentInput: [],
        status: 'won',
      }));

      if (!completedRef.current) {
        completedRef.current = true;
        onComplete({
          challengeToken: challenge.challengeToken,
          guesses: newGuesses.map((g) => g.guess),
          solved: true,
        });
      }
    } else if (isOut) {
      playHitSound();
      setState((prev) => ({
        ...prev,
        guesses: newGuesses,
        currentInput: [],
        status: 'crashed',
      }));
    } else {
      playSubmitSound();
      setState((prev) => ({
        ...prev,
        guesses: newGuesses,
        currentInput: [],
      }));
    }
  }, [disabled, state, secretCode, onComplete, challenge.challengeToken]);

  const handleRestart = useCallback(() => {
    if (disabled) return;
    setState(createCrackTheCodeState(digits, maxGuesses, maxDigit, allowDuplicates));
  }, [disabled, digits, maxGuesses, maxDigit, allowDuplicates]);

  // Keyboard events
  useEffect(() => {
    if (disabled || state.status !== 'playing') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        const val = Number(e.key);
        if (val >= 1 && val <= maxDigit) {
          handleAppend(val);
        }
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmitGuess();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, state.status, maxDigit, handleAppend, handleBackspace, handleSubmitGuess]);

  const remainingGuesses = maxGuesses - state.guesses.length;

  return (
    <div className="flex flex-col items-center gap-3.5 w-full max-w-sm mx-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <KeyRound className="text-amber-400" size={17} />
          <span className="text-xs font-bold text-slate-300">
            Guesses: <span className="text-amber-300 font-black">{remainingGuesses}</span> left
          </span>
        </div>

        <div className="flex items-center gap-1">
          {Array.from({ length: maxGuesses }).map((_, i) => (
            <span
              key={i}
              className={`inline-block w-2.5 h-2.5 rounded-full transition ${
                i < state.guesses.length
                  ? 'bg-rose-500/80 shadow-sm'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          className="text-xs py-1 px-2 h-7"
          onClick={handleRestart}
          disabled={disabled}
        >
          <RotateCcw size={12} className="mr-1" /> Reset
        </Button>
      </div>

      {/* Terminal / Safe Display */}
      <div className="relative w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl flex flex-col gap-3 min-h-[220px]">
        {/* Past Guesses List */}
        <div className="flex-1 space-y-2 overflow-y-auto max-h-[170px] pr-1">
          {state.guesses.map((g, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
            >
              <div className="flex items-center gap-1.5 font-mono text-base font-bold">
                <span className="text-slate-500 text-xs w-4">#{idx + 1}</span>
                {g.guess.map((num, i) => (
                  <span
                    key={i}
                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-sm"
                  >
                    {num}
                  </span>
                ))}
              </div>

              {/* Clue indicators */}
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {g.exact}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {g.partial}
                </span>
              </div>
            </div>
          ))}

          {state.guesses.length === 0 && (
            <div className="flex flex-col items-center justify-center h-28 text-center text-slate-500 text-xs gap-1.5">
              <Lock className="text-slate-600" size={24} />
              <p>Crack the secret {digits}-digit combination.</p>
              <p className="text-[11px] text-slate-600">
                🟢 = Right digit & spot · 🟡 = Right digit, wrong spot
              </p>
            </div>
          )}
        </div>

        {/* Current Active Input Slot */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800/80">
          {Array.from({ length: digits }).map((_, i) => {
            const val = state.currentInput[i];
            const isCurrent = i === state.currentInput.length;
            return (
              <div
                key={i}
                className={`flex items-center justify-center w-11 h-12 rounded-xl text-lg font-mono font-black transition ${
                  val !== undefined
                    ? 'border-cyan-400/80 bg-cyan-950/30 text-cyan-200 border-2 shadow-lg shadow-cyan-500/10'
                    : isCurrent
                      ? 'border-slate-500 bg-slate-900 text-slate-400 border-2 animate-pulse'
                      : 'border-slate-800 bg-slate-950 text-slate-600 border'
                }`}
              >
                {val ?? '·'}
              </div>
            );
          })}
        </div>

        {/* OUT / Try Again Overlay */}
        {state.status === 'crashed' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 gap-2.5 animate-in fade-in">
            <Lock className="text-rose-400" size={32} />
            <h3 className="text-lg font-black text-rose-400 tracking-wider uppercase">Out of Guesses!</h3>
            <p className="text-xs text-slate-300 text-center">
              The lock remains sealed. Tap below to try a new combination!
            </p>
            <Button
              type="button"
              onClick={handleRestart}
              className="mt-1 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black px-6"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Victory Overlay */}
        {state.status === 'won' && (
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 gap-2 animate-in fade-in">
            <Unlock className="text-emerald-400" size={32} />
            <h3 className="text-lg font-black text-emerald-300">Code Cracked!</h3>
            <p className="text-xs text-slate-300 text-center">Safe unlocked in {state.guesses.length} attempts.</p>
          </div>
        )}
      </div>

      {/* Number Keypad & Action Bar */}
      <div className="w-full flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: maxDigit }, (_, i) => i + 1).map((num) => {
            const isUsed = !allowDuplicates && state.currentInput.includes(num);
            return (
              <button
                key={num}
                type="button"
                onClick={() => handleAppend(num)}
                disabled={disabled || isUsed || state.currentInput.length >= digits}
                className={`flex items-center justify-center h-11 rounded-xl text-base font-mono font-black border transition select-none ${
                  isUsed
                    ? 'border-slate-800 bg-slate-950 text-slate-600 opacity-40 cursor-not-allowed'
                    : 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 active:bg-cyan-600 active:border-cyan-400 shadow-sm'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleBackspace}
            disabled={disabled || state.currentInput.length === 0}
            className="w-16 h-11 text-xs"
            aria-label="Backspace"
          >
            <Delete size={18} />
          </Button>

          <Button
            type="button"
            onClick={handleSubmitGuess}
            disabled={disabled || state.currentInput.length !== digits || state.status !== 'playing'}
            className="flex-1 h-11 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs"
          >
            <ShieldCheck size={16} className="mr-1.5" /> CHECK CODE
          </Button>
        </div>
      </div>
    </div>
  );
}
