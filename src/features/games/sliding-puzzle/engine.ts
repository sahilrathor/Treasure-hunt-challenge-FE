export interface SlidingPuzzleState {
  size: number;
  tiles: number[];
  initialTiles: number[];
  moves: number[];
  moveCount: number;
  status: 'playing' | 'won';
}

function playTone(freq: number, type: OscillatorType = 'sine', duration = 0.08) {
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
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio unsupported
  }
}

export function playSlideSound() {
  playTone(420, 'triangle', 0.07);
}

export function playWinSound() {
  playTone(523.25, 'triangle', 0.1);
  setTimeout(() => playTone(659.25, 'triangle', 0.1), 100);
  setTimeout(() => playTone(783.99, 'triangle', 0.25), 200);
}

export function generateSolvableScramble(size = 3, movesCount = 15): number[] {
  const total = size * size;
  const tiles = Array.from({ length: total }, (_, i) => (i + 1) % total);
  let emptyIdx = total - 1;

  let lastMove = -1;
  for (let m = 0; m < movesCount; m++) {
    const row = Math.floor(emptyIdx / size);
    const col = emptyIdx % size;
    const validMoves: number[] = [];

    if (row > 0) validMoves.push(emptyIdx - size);
    if (row < size - 1) validMoves.push(emptyIdx + size);
    if (col > 0) validMoves.push(emptyIdx - 1);
    if (col < size - 1) validMoves.push(emptyIdx + 1);

    const candidates = validMoves.filter((idx) => idx !== lastMove);
    const chosenIdx =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]!
        : validMoves[0]!;

    tiles[emptyIdx] = tiles[chosenIdx]!;
    tiles[chosenIdx] = 0;
    lastMove = emptyIdx;
    emptyIdx = chosenIdx;
  }

  return tiles;
}

export function createSlidingPuzzleState(
  size = 3,
  scrambleMoves = 15,
  presetTiles?: number[],
): SlidingPuzzleState {
  const initial =
    presetTiles && presetTiles.length === size * size
      ? [...presetTiles]
      : generateSolvableScramble(size, scrambleMoves);

  return {
    size,
    tiles: [...initial],
    initialTiles: [...initial],
    moves: [],
    moveCount: 0,
    status: 'playing',
  };
}

export function canSlideTile(tileIdx: number, emptyIdx: number, size: number): boolean {
  const tileRow = Math.floor(tileIdx / size);
  const tileCol = tileIdx % size;
  const emptyRow = Math.floor(emptyIdx / size);
  const emptyCol = emptyIdx % size;
  return Math.abs(tileRow - emptyRow) + Math.abs(tileCol - emptyCol) === 1;
}

export function slideTile(state: SlidingPuzzleState, tileIdx: number): SlidingPuzzleState {
  if (state.status !== 'playing') return state;

  const emptyIdx = state.tiles.indexOf(0);
  if (!canSlideTile(tileIdx, emptyIdx, state.size)) return state;

  playSlideSound();

  const nextTiles = [...state.tiles];
  nextTiles[emptyIdx] = nextTiles[tileIdx]!;
  nextTiles[tileIdx] = 0;

  const nextMoves = [...state.moves, tileIdx];
  const total = state.size * state.size;
  const isWon = nextTiles.every((val, idx) => val === (idx + 1) % total);

  if (isWon) {
    playWinSound();
  }

  return {
    ...state,
    tiles: nextTiles,
    moves: nextMoves,
    moveCount: state.moveCount + 1,
    status: isWon ? 'won' : 'playing',
  };
}

export function isPuzzleSolved(tiles: number[], size: number): boolean {
  const total = size * size;
  return tiles.every((val, idx) => val === (idx + 1) % total);
}

