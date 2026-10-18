export type Direction = 'up' | 'down' | 'left' | 'right';
export type MergeBoard = number[];

export const createBoard = (): MergeBoard => [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function collapse(line: number[]) {
  const values = line.filter(Boolean);
  const merged: number[] = [];
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === values[index + 1]) {
      merged.push(values[index]! * 2);
      index += 1;
    } else {
      merged.push(values[index]!);
    }
  }
  return [...merged, ...Array<number>(4 - merged.length).fill(0)];
}

function readLine(board: MergeBoard, direction: Direction, line: number) {
  const indexes = Array.from({ length: 4 }, (_, offset) => {
    if (direction === 'left') return line * 4 + offset;
    if (direction === 'right') return line * 4 + (3 - offset);
    if (direction === 'up') return offset * 4 + line;
    return (3 - offset) * 4 + line;
  });
  return { indexes, values: indexes.map((index) => board[index]!) };
}

export function moveBoard(board: MergeBoard, direction: Direction, moveNumber: number) {
  const next = [...board];
  for (let line = 0; line < 4; line += 1) {
    const { indexes, values } = readLine(board, direction, line);
    const collapsed = collapse(values);
    indexes.forEach((index, offset) => {
      next[index] = collapsed[offset]!;
    });
  }
  const changed = next.some((value, index) => value !== board[index]);
  if (!changed) return { board, changed: false };
  const empty = next
    .map((value, index) => (value === 0 ? index : -1))
    .filter((index) => index >= 0);
  if (empty.length) {
    const position = empty[(moveNumber * 7 + 3) % empty.length]!;
    next[position] = moveNumber % 7 === 0 ? 4 : 2;
  }
  return { board: next, changed: true };
}

export const peakTile = (board: MergeBoard) => Math.max(...board);

export function canMove(board: MergeBoard): boolean {
  // If any cell is empty, a move is possible
  if (board.some((v) => v === 0)) return true;

  // Check horizontally and vertically adjacent matching pairs
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      const val = board[r * 4 + c]!;
      if (c < 3 && val === board[r * 4 + (c + 1)]) return true;
      if (r < 3 && val === board[(r + 1) * 4 + c]) return true;
    }
  }
  return false;
}

export interface TileStyle {
  bg: string;
  text: string;
  border: string;
  glow?: string;
  fontSize: string;
}

export function getTileStyle(value: number): TileStyle {
  switch (value) {
    case 2:
      return {
        bg: 'bg-slate-800 text-slate-100',
        text: 'text-slate-100',
        border: 'border-slate-700/60',
        fontSize: 'text-2xl',
      };
    case 4:
      return {
        bg: 'bg-amber-950/70 text-amber-200',
        text: 'text-amber-200',
        border: 'border-amber-700/60',
        fontSize: 'text-2xl',
      };
    case 8:
      return {
        bg: 'bg-orange-600 text-white',
        text: 'text-white',
        border: 'border-orange-400',
        glow: 'shadow-md shadow-orange-600/40',
        fontSize: 'text-2xl',
      };
    case 16:
      return {
        bg: 'bg-orange-500 text-white',
        text: 'text-white',
        border: 'border-orange-300',
        glow: 'shadow-md shadow-orange-500/50',
        fontSize: 'text-2xl',
      };
    case 32:
      return {
        bg: 'bg-rose-600 text-white',
        text: 'text-white',
        border: 'border-rose-400',
        glow: 'shadow-md shadow-rose-600/50',
        fontSize: 'text-2xl',
      };
    case 64:
      return {
        bg: 'bg-red-600 text-white',
        text: 'text-white',
        border: 'border-red-400',
        glow: 'shadow-lg shadow-red-600/60',
        fontSize: 'text-2xl',
      };
    case 128:
      return {
        bg: 'bg-amber-500 text-slate-950 font-black',
        text: 'text-slate-950',
        border: 'border-amber-300 ring-2 ring-amber-300/80',
        glow: 'shadow-lg shadow-amber-500/70',
        fontSize: 'text-xl',
      };
    case 256:
      return {
        bg: 'bg-amber-400 text-slate-950 font-black',
        text: 'text-slate-950',
        border: 'border-yellow-200 ring-2 ring-yellow-300',
        glow: 'shadow-lg shadow-amber-400/80',
        fontSize: 'text-xl',
      };
    case 512:
      return {
        bg: 'bg-emerald-500 text-white font-black',
        text: 'text-white',
        border: 'border-emerald-300 ring-2 ring-emerald-300',
        glow: 'shadow-xl shadow-emerald-500/80',
        fontSize: 'text-xl',
      };
    case 1024:
      return {
        bg: 'bg-cyan-500 text-slate-950 font-black',
        text: 'text-slate-950',
        border: 'border-cyan-200 ring-2 ring-cyan-200',
        glow: 'shadow-xl shadow-cyan-400/90',
        fontSize: 'text-lg',
      };
    case 2048:
      return {
        bg: 'bg-purple-600 text-white font-black',
        text: 'text-white',
        border: 'border-purple-300 ring-4 ring-purple-400',
        glow: 'shadow-2xl shadow-purple-500/90 animate-pulse',
        fontSize: 'text-lg',
      };
    default:
      return value > 2048
        ? {
            bg: 'bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white font-black',
            text: 'text-white',
            border: 'border-fuchsia-300 ring-4 ring-fuchsia-400',
            glow: 'shadow-2xl shadow-fuchsia-500/90 animate-pulse',
            fontSize: 'text-base',
          }
        : {
            bg: 'bg-slate-900/60 text-transparent',
            text: 'text-transparent',
            border: 'border-slate-800/40',
            fontSize: 'text-xl',
          };
  }
}

export function restartNumberMergeGame(): MergeBoard {
  return createBoard();
}

