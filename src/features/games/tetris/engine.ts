// -------------------------------------------------------------
// Legacy 6x10 block drop simulation (preserved for backwards-compatibility)
// -------------------------------------------------------------
export const LEGACY_WIDTH = 6;
export const LEGACY_HEIGHT = 10;
export type TetrisBoard = boolean[];

export const createTetrisBoard = (): TetrisBoard =>
  Array<boolean>(LEGACY_WIDTH * LEGACY_HEIGHT).fill(false);

export function dropBlock(board: TetrisBoard, column: number) {
  const next = [...board];
  let placed = false;
  for (let row = LEGACY_HEIGHT - 1; row >= 0; row -= 1) {
    const index = row * LEGACY_WIDTH + column;
    if (!next[index]) {
      next[index] = true;
      placed = true;
      break;
    }
  }
  if (!placed) return { board, cleared: 0, overflow: true };
  const keptRows: boolean[][] = [];
  let cleared = 0;
  for (let row = 0; row < LEGACY_HEIGHT; row += 1) {
    const values = next.slice(row * LEGACY_WIDTH, (row + 1) * LEGACY_WIDTH);
    if (values.every(Boolean)) cleared += 1;
    else keptRows.push(values);
  }
  while (keptRows.length < LEGACY_HEIGHT) {
    keptRows.unshift(Array<boolean>(LEGACY_WIDTH).fill(false));
  }
  return { board: keptRows.flat(), cleared, overflow: false };
}

// -------------------------------------------------------------
// Modern 10x16 Tetromino Engine (7 Polyomino Pieces & Rotation)
// -------------------------------------------------------------
export const TETRIS_WIDTH = 10;
export const TETRIS_HEIGHT = 16;

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export const TETROMINO_ROTATIONS: Record<TetrominoType, number[][][]> = {
  I: [
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
  ],
  O: [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
  ],
  T: [
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1], [1, 1], [0, 1]],
  ],
  S: [
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0], [1, 1], [0, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0], [1, 1], [0, 1]],
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1], [1, 1], [1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1], [1, 1], [1, 0]],
  ],
  J: [
    [[1, 0, 0], [1, 1, 1]],
    [[1, 1], [1, 0], [1, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[0, 1], [0, 1], [1, 1]],
  ],
  L: [
    [[0, 0, 1], [1, 1, 1]],
    [[1, 0], [1, 0], [1, 1]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1], [0, 1], [0, 1]],
  ],
};

export const TETROMINO_COLORS: Record<
  TetrominoType,
  { fill: string; border: string; glow: string; text: string }
> = {
  I: { fill: 'bg-cyan-400', border: 'border-cyan-200', glow: 'shadow-[0_0_12px_rgba(34,211,238,0.5)]', text: 'text-cyan-300' },
  O: { fill: 'bg-yellow-400', border: 'border-yellow-200', glow: 'shadow-[0_0_12px_rgba(250,204,21,0.5)]', text: 'text-yellow-300' },
  T: { fill: 'bg-purple-500', border: 'border-purple-300', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.5)]', text: 'text-purple-300' },
  S: { fill: 'bg-emerald-500', border: 'border-emerald-300', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.5)]', text: 'text-emerald-300' },
  Z: { fill: 'bg-rose-500', border: 'border-rose-300', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.5)]', text: 'text-rose-300' },
  J: { fill: 'bg-blue-500', border: 'border-blue-300', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.5)]', text: 'text-blue-300' },
  L: { fill: 'bg-orange-500', border: 'border-orange-300', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.5)]', text: 'text-orange-300' },
};

export type TetrisCell = TetrominoType | null;

export interface ActivePiece {
  type: TetrominoType;
  rot: number;
  row: number;
  col: number;
}

export type TetrisStatus = 'playing' | 'gameover' | 'won';

export interface RealtimeTetrisState {
  board: TetrisCell[];
  target: number;
  speed: number;
  lines: number;
  status: TetrisStatus;
  currentPiece: ActivePiece;
  nextPiece: TetrominoType;
  bag: TetrominoType[];
  actions: string[];
}

const ALL_PIECES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

function generateBag(): TetrominoType[] {
  return [...ALL_PIECES].sort(() => Math.random() - 0.5);
}

function pullFromBag(bag: TetrominoType[]): { piece: TetrominoType; nextBag: TetrominoType[] } {
  let currentBag = bag;
  if (currentBag.length === 0) {
    currentBag = generateBag();
  }
  const [piece, ...rest] = currentBag;
  return { piece: piece ?? 'T', nextBag: rest };
}

export function canPlacePiece(
  board: TetrisCell[],
  matrix: number[][],
  row: number,
  col: number,
  width = TETRIS_WIDTH,
  height = TETRIS_HEIGHT,
): boolean {
  for (let r = 0; r < matrix.length; r += 1) {
    for (let c = 0; c < matrix[r]!.length; c += 1) {
      if (matrix[r]![c]) {
        const targetR = row + r;
        const targetC = col + c;
        if (targetC < 0 || targetC >= width || targetR >= height) {
          return false;
        }
        if (targetR >= 0 && board[targetR * width + targetC] !== null) {
          return false;
        }
      }
    }
  }
  return true;
}

export function getGhostPieceRow(
  board: TetrisCell[],
  matrix: number[][],
  startRow: number,
  col: number,
  width = TETRIS_WIDTH,
  height = TETRIS_HEIGHT,
): number {
  let ghostR = startRow;
  while (canPlacePiece(board, matrix, ghostR + 1, col, width, height)) {
    ghostR += 1;
  }
  return ghostR;
}

export function createRealtimeTetrisState(
  target = 3,
  speed = 550,
): RealtimeTetrisState {
  const bag1 = generateBag();
  const { piece: firstPiece, nextBag: bag2 } = pullFromBag(bag1);
  const { piece: secondPiece, nextBag: bag3 } = pullFromBag(bag2);

  const matrix = TETROMINO_ROTATIONS[firstPiece][0]!;
  const spawnCol = Math.floor((TETRIS_WIDTH - matrix[0]!.length) / 2);

  return {
    board: Array<TetrisCell>(TETRIS_WIDTH * TETRIS_HEIGHT).fill(null),
    target,
    speed,
    lines: 0,
    status: 'playing',
    currentPiece: {
      type: firstPiece,
      rot: 0,
      row: 0,
      col: spawnCol,
    },
    nextPiece: secondPiece,
    bag: bag3,
    actions: [],
  };
}

export function moveCurrentPiece(
  state: RealtimeTetrisState,
  deltaCol: -1 | 1,
): RealtimeTetrisState {
  if (state.status !== 'playing') return state;

  const matrix = TETROMINO_ROTATIONS[state.currentPiece.type][state.currentPiece.rot]!;
  const nextCol = state.currentPiece.col + deltaCol;

  if (canPlacePiece(state.board, matrix, state.currentPiece.row, nextCol)) {
    return {
      ...state,
      currentPiece: {
        ...state.currentPiece,
        col: nextCol,
      },
    };
  }

  return state;
}

export function rotateCurrentPiece(state: RealtimeTetrisState): RealtimeTetrisState {
  if (state.status !== 'playing') return state;

  const nextRot = (state.currentPiece.rot + 1) % 4;
  const nextMatrix = TETROMINO_ROTATIONS[state.currentPiece.type][nextRot]!;

  // Wall kicks: try current col, col - 1, col + 1, col - 2, col + 2
  const offsets = [0, -1, 1, -2, 2];
  for (const offset of offsets) {
    const testCol = state.currentPiece.col + offset;
    if (canPlacePiece(state.board, nextMatrix, state.currentPiece.row, testCol)) {
      return {
        ...state,
        currentPiece: {
          ...state.currentPiece,
          rot: nextRot,
          col: testCol,
        },
      };
    }
  }

  return state;
}

export function lockAndDropCurrentPiece(
  state: RealtimeTetrisState,
  dropRow?: number,
): RealtimeTetrisState {
  if (state.status !== 'playing') return state;

  const matrix = TETROMINO_ROTATIONS[state.currentPiece.type][state.currentPiece.rot]!;
  const finalRow =
    dropRow !== undefined
      ? dropRow
      : getGhostPieceRow(
          state.board,
          matrix,
          state.currentPiece.row,
          state.currentPiece.col,
        );

  const nextBoard = [...state.board];

  // Stamp the active piece onto the board
  for (let r = 0; r < matrix.length; r += 1) {
    for (let c = 0; c < matrix[r]!.length; c += 1) {
      if (matrix[r]![c]) {
        const boardR = finalRow + r;
        const boardC = state.currentPiece.col + c;
        if (boardR >= 0 && boardR < TETRIS_HEIGHT && boardC >= 0 && boardC < TETRIS_WIDTH) {
          nextBoard[boardR * TETRIS_WIDTH + boardC] = state.currentPiece.type;
        }
      }
    }
  }

  const action = `place:${state.currentPiece.type}:${state.currentPiece.rot}:${state.currentPiece.col}`;
  const nextActions = [...state.actions, action];

  // Check full horizontal row line clears
  const keptRows: TetrisCell[][] = [];
  let clearedCount = 0;

  for (let row = 0; row < TETRIS_HEIGHT; row += 1) {
    const rowSlice = nextBoard.slice(row * TETRIS_WIDTH, (row + 1) * TETRIS_WIDTH);
    if (rowSlice.every((cell) => cell !== null)) {
      clearedCount += 1;
    } else {
      keptRows.push(rowSlice);
    }
  }

  while (keptRows.length < TETRIS_HEIGHT) {
    keptRows.unshift(Array<TetrisCell>(TETRIS_WIDTH).fill(null));
  }

  const resolvedBoard = keptRows.flat();
  const nextLines = state.lines + clearedCount;

  // Check victory
  if (nextLines >= state.target) {
    return {
      ...state,
      board: resolvedBoard,
      lines: nextLines,
      status: 'won',
      actions: nextActions,
    };
  }

  // Spawn next piece
  const { piece: nextSpawnPiece, nextBag } = pullFromBag(state.bag);
  const nextSpawnMatrix = TETROMINO_ROTATIONS[state.nextPiece][0]!;
  const nextSpawnCol = Math.floor((TETRIS_WIDTH - nextSpawnMatrix[0]!.length) / 2);

  // Check if board is topped out / cannot place next piece
  if (!canPlacePiece(resolvedBoard, nextSpawnMatrix, 0, nextSpawnCol)) {
    return {
      ...state,
      board: resolvedBoard,
      lines: nextLines,
      status: 'gameover',
      actions: nextActions,
    };
  }

  return {
    ...state,
    board: resolvedBoard,
    lines: nextLines,
    status: 'playing',
    actions: nextActions,
    currentPiece: {
      type: state.nextPiece,
      rot: 0,
      row: 0,
      col: nextSpawnCol,
    },
    nextPiece: nextSpawnPiece,
    bag: nextBag,
  };
}

export function tickCurrentPiece(state: RealtimeTetrisState): RealtimeTetrisState {
  if (state.status !== 'playing') return state;

  const matrix = TETROMINO_ROTATIONS[state.currentPiece.type][state.currentPiece.rot]!;
  const nextRow = state.currentPiece.row + 1;

  if (canPlacePiece(state.board, matrix, nextRow, state.currentPiece.col)) {
    return {
      ...state,
      currentPiece: {
        ...state.currentPiece,
        row: nextRow,
      },
    };
  }

  return lockAndDropCurrentPiece(state, state.currentPiece.row);
}

export function hardDropCurrentPiece(state: RealtimeTetrisState): RealtimeTetrisState {
  if (state.status !== 'playing') return state;

  const matrix = TETROMINO_ROTATIONS[state.currentPiece.type][state.currentPiece.rot]!;
  const ghostRow = getGhostPieceRow(
    state.board,
    matrix,
    state.currentPiece.row,
    state.currentPiece.col,
  );

  return lockAndDropCurrentPiece(state, ghostRow);
}

export function restartTetrisGame(state: RealtimeTetrisState): RealtimeTetrisState {
  return createRealtimeTetrisState(state.target, state.speed);
}
