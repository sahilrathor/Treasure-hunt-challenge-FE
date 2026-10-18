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

// -------------------------------------------------------------
// Real-time Tetris Mechanics
// -------------------------------------------------------------
export type TetrisStatus = 'playing' | 'gameover' | 'won';

export interface RealtimeTetrisState {
  board: TetrisBoard;
  target: number;
  speed: number;
  lines: number;
  status: TetrisStatus;
  fallingCol: number;
  fallingRow: number;
  actions: string[];
}

export function getGhostRow(board: TetrisBoard, column: number): number | null {
  for (let row = TETRIS_HEIGHT - 1; row >= 0; row -= 1) {
    const index = row * TETRIS_WIDTH + column;
    if (!board[index]) {
      return row;
    }
  }
  return null;
}

export function createRealtimeTetrisState(
  target = 2,
  speed = 600,
): RealtimeTetrisState {
  return {
    board: createTetrisBoard(),
    target,
    speed,
    lines: 0,
    status: 'playing',
    fallingCol: Math.floor(TETRIS_WIDTH / 2) - 1,
    fallingRow: 0,
    actions: [],
  };
}

export function moveFallingCol(
  state: RealtimeTetrisState,
  delta: -1 | 1,
): RealtimeTetrisState {
  if (state.status !== 'playing') return state;
  const nextCol = Math.max(0, Math.min(TETRIS_WIDTH - 1, state.fallingCol + delta));
  return {
    ...state,
    fallingCol: nextCol,
  };
}

export function setFallingCol(
  state: RealtimeTetrisState,
  col: number,
): RealtimeTetrisState {
  if (state.status !== 'playing') return state;
  const nextCol = Math.max(0, Math.min(TETRIS_WIDTH - 1, col));
  return {
    ...state,
    fallingCol: nextCol,
  };
}

export function lockAndDrop(
  state: RealtimeTetrisState,
  column: number,
): RealtimeTetrisState {
  if (state.status !== 'playing') return state;

  const result = dropBlock(state.board, column);
  const nextActions = [...state.actions, `drop:${column}`];

  if (result.overflow) {
    return {
      ...state,
      actions: nextActions,
      status: 'gameover',
    };
  }

  const nextLines = state.lines + result.cleared;
  const nextStatus: TetrisStatus = nextLines >= state.target ? 'won' : 'playing';

  return {
    ...state,
    board: result.board,
    lines: nextLines,
    status: nextStatus,
    actions: nextActions,
    fallingRow: 0,
    fallingCol: Math.floor(TETRIS_WIDTH / 2) - 1,
  };
}

export function tickFallingBlock(state: RealtimeTetrisState): RealtimeTetrisState {
  if (state.status !== 'playing') return state;

  const ghost = getGhostRow(state.board, state.fallingCol);

  // If the column is full already
  if (ghost === null) {
    return lockAndDrop(state, state.fallingCol);
  }

  // If falling block reached the ghost row landing spot
  if (state.fallingRow >= ghost) {
    return lockAndDrop(state, state.fallingCol);
  }

  return {
    ...state,
    fallingRow: state.fallingRow + 1,
  };
}

export function restartTetrisGame(state: RealtimeTetrisState): RealtimeTetrisState {
  return {
    ...state,
    board: createTetrisBoard(),
    lines: 0,
    status: 'playing',
    fallingCol: Math.floor(TETRIS_WIDTH / 2) - 1,
    fallingRow: 0,
    actions: [],
  };
}
