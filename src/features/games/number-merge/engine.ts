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
