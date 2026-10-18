export function patternStepIsCorrect(sequence: number[], input: number[], next: number) {
  return sequence[input.length] === next;
}

export function revealSpeed(difficulty: unknown) {
  if (difficulty === 'hard') return 260;
  if (difficulty === 'medium') return 360;
  return 480;
}

export const PAD_FREQUENCIES = [261.63, 329.63, 392.0, 523.25, 587.33, 659.25, 783.99, 880.0];

export interface PadDefinition {
  color: string;
  activeColor: string;
  glow: string;
  border: string;
  label: string;
  icon: string;
}

export const PAD_DEFINITIONS: PadDefinition[] = [
  {
    color: 'bg-cyan-500/20 text-cyan-300',
    activeColor: 'bg-cyan-400 text-slate-950 font-black',
    glow: 'shadow-lg shadow-cyan-400/80 ring-4 ring-cyan-200',
    border: 'border-cyan-400/50 hover:border-cyan-300',
    label: 'Cyan',
    icon: '💎',
  },
  {
    color: 'bg-fuchsia-500/20 text-fuchsia-300',
    activeColor: 'bg-fuchsia-400 text-slate-950 font-black',
    glow: 'shadow-lg shadow-fuchsia-400/80 ring-4 ring-fuchsia-200',
    border: 'border-fuchsia-400/50 hover:border-fuchsia-300',
    label: 'Fuchsia',
    icon: '🎵',
  },
  {
    color: 'bg-amber-500/20 text-amber-300',
    activeColor: 'bg-amber-400 text-slate-950 font-black',
    glow: 'shadow-lg shadow-amber-400/80 ring-4 ring-amber-200',
    border: 'border-amber-400/50 hover:border-amber-300',
    label: 'Amber',
    icon: '⭐',
  },
  {
    color: 'bg-emerald-500/20 text-emerald-300',
    activeColor: 'bg-emerald-400 text-slate-950 font-black',
    glow: 'shadow-lg shadow-emerald-400/80 ring-4 ring-emerald-200',
    border: 'border-emerald-400/50 hover:border-emerald-300',
    label: 'Emerald',
    icon: '🍀',
  },
  {
    color: 'bg-rose-500/20 text-rose-300',
    activeColor: 'bg-rose-400 text-slate-950 font-black',
    glow: 'shadow-lg shadow-rose-400/80 ring-4 ring-rose-200',
    border: 'border-rose-400/50 hover:border-rose-300',
    label: 'Ruby',
    icon: '❤️',
  },
  {
    color: 'bg-purple-500/20 text-purple-300',
    activeColor: 'bg-purple-400 text-slate-950 font-black',
    glow: 'shadow-lg shadow-purple-400/80 ring-4 ring-purple-200',
    border: 'border-purple-400/50 hover:border-purple-300',
    label: 'Violet',
    icon: '🔮',
  },
  {
    color: 'bg-sky-500/20 text-sky-300',
    activeColor: 'bg-sky-400 text-slate-950 font-black',
    glow: 'shadow-lg shadow-sky-400/80 ring-4 ring-sky-200',
    border: 'border-sky-400/50 hover:border-sky-300',
    label: 'Sky',
    icon: '🌊',
  },
  {
    color: 'bg-orange-500/20 text-orange-300',
    activeColor: 'bg-orange-400 text-slate-950 font-black',
    glow: 'shadow-lg shadow-orange-400/80 ring-4 ring-orange-200',
    border: 'border-orange-400/50 hover:border-orange-300',
    label: 'Flame',
    icon: '🔥',
  },
];

export function playPadTone(padIndex: number, durationMs = 220) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = PAD_FREQUENCIES[padIndex % PAD_FREQUENCIES.length] ?? 440;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Audio context may be restricted in non-interactive tests or muted browsers
  }
}

