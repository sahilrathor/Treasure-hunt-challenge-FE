export const TETRIS_WIDTH = 6;
export const TETRIS_HEIGHT = 10;
export type TetrisBoard = boolean[];

export const createTetrisBoard = (): TetrisBoard =>
  Array<boolean>(TETRIS_WIDTH * TETRIS_HEIGHT).fill(false);

export function dropBlock(board: TetrisBoard, column: number) {
  const next = [...board];
  let placed = false;
  for (let row = TETRIS_HEIGHT - 1; row >= 0; row -= 1) {
    const index = row * TETRIS_WIDTH + column;
    if (!next[index]) {
      next[index] = true;
      placed = true;
      break;
    }
  }
  if (!placed) return { board, cleared: 0, overflow: true };
  const keptRows: boolean[][] = [];
  let cleared = 0;
  for (let row = 0; row < TETRIS_HEIGHT; row += 1) {
    const values = next.slice(row * TETRIS_WIDTH, (row + 1) * TETRIS_WIDTH);
    if (values.every(Boolean)) cleared += 1;
    else keptRows.push(values);
  }
  while (keptRows.length < TETRIS_HEIGHT) {
    keptRows.unshift(Array<boolean>(TETRIS_WIDTH).fill(false));
  }
  return { board: keptRows.flat(), cleared, overflow: false };
}
