export type MatchPair = [number, number];

export interface CardTheme {
  icon: string;
  label: string;
  gradient: string;
  border: string;
  glow: string;
}

export const CARD_THEMES: CardTheme[] = [
  { icon: '💎', label: 'Diamond', gradient: 'from-cyan-500 to-blue-600', border: 'border-cyan-300', glow: 'shadow-cyan-500/40' },
  { icon: '⚡', label: 'Lightning', gradient: 'from-amber-400 to-yellow-600', border: 'border-amber-300', glow: 'shadow-amber-500/40' },
  { icon: '🚀', label: 'Rocket', gradient: 'from-violet-500 to-purple-700', border: 'border-purple-300', glow: 'shadow-purple-500/40' },
  { icon: '🔥', label: 'Flame', gradient: 'from-rose-500 to-red-700', border: 'border-rose-300', glow: 'shadow-rose-500/40' },
  { icon: '🍀', label: 'Clover', gradient: 'from-emerald-400 to-green-600', border: 'border-emerald-300', glow: 'shadow-emerald-500/40' },
  { icon: '👑', label: 'Crown', gradient: 'from-yellow-400 to-amber-600', border: 'border-yellow-200', glow: 'shadow-yellow-500/40' },
  { icon: '🪐', label: 'Planet', gradient: 'from-indigo-500 to-purple-800', border: 'border-indigo-300', glow: 'shadow-indigo-500/40' },
  { icon: '🎯', label: 'Target', gradient: 'from-red-500 to-pink-600', border: 'border-pink-300', glow: 'shadow-pink-500/40' },
  { icon: '🔮', label: 'Crystal', gradient: 'from-fuchsia-500 to-pink-700', border: 'border-fuchsia-300', glow: 'shadow-fuchsia-500/40' },
  { icon: '🌟', label: 'Star', gradient: 'from-amber-300 to-orange-500', border: 'border-amber-200', glow: 'shadow-amber-400/40' },
  { icon: '🕹️', label: 'Arcade', gradient: 'from-teal-400 to-cyan-600', border: 'border-teal-300', glow: 'shadow-teal-500/40' },
  { icon: '🏆', label: 'Trophy', gradient: 'from-yellow-500 to-amber-700', border: 'border-yellow-300', glow: 'shadow-yellow-500/40' },
];

export function getCardTheme(value: number): CardTheme {
  const normalized = Math.abs(value) % CARD_THEMES.length;
  return CARD_THEMES[normalized]!;
}

export function isValidMatch(board: number[], left: number, right: number) {
  return left !== right && board[left] !== undefined && board[left] === board[right];
}

export function isCardMatched(matches: MatchPair[], index: number) {
  return matches.some(([left, right]) => left === index || right === index);
}
