export interface GuessResult {
  guess: number[];
  exact: number;
  partial: number;
}

export interface CrackTheCodeState {
  digits: number;
  maxGuesses: number;
  maxDigit: number;
  allowDuplicates: boolean;
  guesses: GuessResult[];
  currentInput: number[];
  status: 'playing' | 'crashed' | 'won';
}

function playTone(freq: number, type: OscillatorType = 'sine', duration = 0.1) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio unsupported
  }
}

export function playKeySound() {
  playTone(550, 'sine', 0.06);
}

export function playSubmitSound() {
  playTone(680, 'triangle', 0.12);
}

export function playHitSound() {
  playTone(180, 'sawtooth', 0.25);
}

export function playWinSound() {
  playTone(440, 'triangle', 0.1);
  setTimeout(() => playTone(554.37, 'triangle', 0.1), 100);
  setTimeout(() => playTone(659.25, 'triangle', 0.25), 200);
}

export function createCrackTheCodeState(
  digits = 4,
  maxGuesses = 6,
  maxDigit = 8,
  allowDuplicates = false,
): CrackTheCodeState {
  return {
    digits,
    maxGuesses,
    maxDigit,
    allowDuplicates,
    guesses: [],
    currentInput: [],
    status: 'playing',
  };
}

export function evaluateGuess(guess: number[], secret: number[]): { exact: number; partial: number } {
  let exact = 0;
  const secretRemaining: (number | null)[] = [...secret];
  const guessRemaining: (number | null)[] = [...guess];

  // 1. First pass: find exact matches
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) {
      exact++;
      secretRemaining[i] = null;
      guessRemaining[i] = null;
    }
  }

  // 2. Second pass: find partial matches
  let partial = 0;
  for (let i = 0; i < guessRemaining.length; i++) {
    const val = guessRemaining[i];
    if (val !== null) {
      const matchIdx = secretRemaining.indexOf(val);
      if (matchIdx !== -1) {
        partial++;
        secretRemaining[matchIdx] = null;
      }
    }
  }

  return { exact, partial };
}

export function appendDigit(state: CrackTheCodeState, digit: number): CrackTheCodeState {
  if (state.status !== 'playing' || state.currentInput.length >= state.digits) return state;
  if (!state.allowDuplicates && state.currentInput.includes(digit)) return state;
  playKeySound();
  return {
    ...state,
    currentInput: [...state.currentInput, digit],
  };
}

export function backspaceDigit(state: CrackTheCodeState): CrackTheCodeState {
  if (state.status !== 'playing' || state.currentInput.length === 0) return state;
  playKeySound();
  return {
    ...state,
    currentInput: state.currentInput.slice(0, -1),
  };
}

export function clearInput(state: CrackTheCodeState): CrackTheCodeState {
  if (state.status !== 'playing') return state;
  return {
    ...state,
    currentInput: [],
  };
}
