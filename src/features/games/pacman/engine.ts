export const COLS = 19;
export const ROWS = 15;
export const CELL_SIZE = 18;

// 1 = Wall, 0 = Dot, 2 = Power Pellet, 3 = Empty / Ghost House
export const MAZE_TEMPLATE: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
  [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 3, 3, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1],
  [1, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

export interface Ghost {
  id: number;
  x: number;
  y: number;
  dir: Direction;
  color: string;
  isFrightened: boolean;
}

export interface PacmanState {
  pacman: {
    x: number;
    y: number;
    dir: Direction;
    nextDir: Direction;
  };
  ghosts: Ghost[];
  grid: number[][];
  pelletsEaten: number;
  target: number;
  score: number;
  lives: number;
  maxLives: number;
  frightenedTimer: number;
  mouthAngle: number;
  speed: number;
  status: 'playing' | 'crashed' | 'won';
  actions: string[];
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
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio unsupported
  }
}

let wakaToggle = false;
export function playWakaSound() {
  wakaToggle = !wakaToggle;
  playTone(wakaToggle ? 320 : 240, 'triangle', 0.05);
}

export function playPowerSound() {
  playTone(600, 'sine', 0.2);
}

export function playGhostSound() {
  playTone(750, 'sawtooth', 0.15);
}

export function playDeathSound() {
  playTone(180, 'sawtooth', 0.25);
}

export function playWinSound() {
  playTone(523.25, 'triangle', 0.1);
  setTimeout(() => playTone(659.25, 'triangle', 0.1), 100);
  setTimeout(() => playTone(783.99, 'triangle', 0.25), 200);
}

export function createPacmanState(
  target = 25,
  ghostCount = 1,
  speed = 1.8,
  lives = 3,
): PacmanState {
  const grid = MAZE_TEMPLATE.map((row) => [...row]);

  const ghostColors = ['#f43f5e', '#ec4899', '#06b6d4', '#f97316'];
  const ghosts: Ghost[] = [];

  for (let i = 0; i < Math.min(ghostCount, 4); i++) {
    ghosts.push({
      id: i,
      x: 9 * CELL_SIZE,
      y: 7 * CELL_SIZE,
      dir: (['up', 'left', 'right', 'down'] as Direction[])[i % 4]!,
      color: ghostColors[i]!,
      isFrightened: false,
    });
  }

  return {
    pacman: {
      x: 9 * CELL_SIZE,
      y: 10 * CELL_SIZE,
      dir: 'left',
      nextDir: 'left',
    },
    ghosts,
    grid,
    pelletsEaten: 0,
    target,
    score: 0,
    lives,
    maxLives: lives,
    frightenedTimer: 0,
    mouthAngle: 0.2,
    speed,
    status: 'playing',
    actions: [],
  };
}

function canMove(grid: number[][], x: number, y: number, dir: Direction): boolean {
  if (dir === 'none') return false;

  let nextX = x;
  let nextY = y;
  const step = 4;

  if (dir === 'left') nextX -= step;
  if (dir === 'right') nextX += step;
  if (dir === 'up') nextY -= step;
  if (dir === 'down') nextY += step;

  // Check 4 bounding box points of character (radius approx CELL_SIZE / 2 - 2)
  const padding = 2;
  const corners = [
    { cx: nextX + padding, cy: nextY + padding },
    { cx: nextX + CELL_SIZE - padding, cy: nextY + padding },
    { cx: nextX + padding, cy: nextY + CELL_SIZE - padding },
    { cx: nextX + CELL_SIZE - padding, cy: nextY + CELL_SIZE - padding },
  ];

  for (const pt of corners) {
    const col = Math.floor(pt.cx / CELL_SIZE);
    const row = Math.floor(pt.cy / CELL_SIZE);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
    if (grid[row]![col] === 1) return false;
  }

  return true;
}

export function setPacmanDirection(state: PacmanState, dir: Direction): PacmanState {
  if (state.status !== 'playing') return state;
  return {
    ...state,
    pacman: {
      ...state.pacman,
      nextDir: dir,
    },
  };
}

export function stepPacman(state: PacmanState): PacmanState {
  if (state.status !== 'playing') return state;

  const pacman = { ...state.pacman };
  const grid = state.grid.map((r) => [...r]);
  const actions = [...state.actions];
  let pelletsEaten = state.pelletsEaten;
  let score = state.score;
  let frightenedTimer = Math.max(0, state.frightenedTimer - 1);
  let lives = state.lives;
  let status: 'playing' | 'crashed' | 'won' = 'playing';

  // 1. Update Pac-Man direction if nextDir is valid
  if (canMove(grid, pacman.x, pacman.y, pacman.nextDir)) {
    pacman.dir = pacman.nextDir;
  }

  // 2. Move Pac-Man
  if (canMove(grid, pacman.x, pacman.y, pacman.dir)) {
    const moveDist = state.speed;
    if (pacman.dir === 'left') pacman.x -= moveDist;
    if (pacman.dir === 'right') pacman.x += moveDist;
    if (pacman.dir === 'up') pacman.y -= moveDist;
    if (pacman.dir === 'down') pacman.y += moveDist;
  }

  // Mouth chomp animation
  const mouthAngle = 0.15 + 0.15 * Math.sin(Date.now() / 80);

  // 3. Collect dots / power pellets
  const centerCol = Math.floor((pacman.x + CELL_SIZE / 2) / CELL_SIZE);
  const centerRow = Math.floor((pacman.y + CELL_SIZE / 2) / CELL_SIZE);

  if (centerRow >= 0 && centerRow < ROWS && centerCol >= 0 && centerCol < COLS) {
    const cell = grid[centerRow]![centerCol]!;
    if (cell === 0) {
      grid[centerRow]![centerCol] = 3;
      pelletsEaten += 1;
      score += 10;
      actions.push(`pellet:${pelletsEaten}`);
      playWakaSound();
    } else if (cell === 2) {
      grid[centerRow]![centerCol] = 3;
      pelletsEaten += 1;
      score += 50;
      frightenedTimer = 320; // ~5-6 seconds of frightened time
      actions.push(`pellet:${pelletsEaten}`);
      playPowerSound();
    }
  }

  // 4. Update Ghosts
  const ghostDirs: Direction[] = ['up', 'down', 'left', 'right'];
  const ghosts = state.ghosts.map((ghost) => {
    let gx = ghost.x;
    let gy = ghost.y;
    let dir = ghost.dir;
    const isFrightened = frightenedTimer > 0;
    const gSpeed = isFrightened ? state.speed * 0.65 : state.speed * 0.85;

    // Check if ghost can continue in current direction
    if (!canMove(grid, gx, gy, dir) || Math.random() < 0.05) {
      const valid = ghostDirs.filter((d) => canMove(grid, gx, gy, d));
      if (valid.length > 0) {
        dir = valid[Math.floor(Math.random() * valid.length)]!;
      }
    }

    if (canMove(grid, gx, gy, dir)) {
      if (dir === 'left') gx -= gSpeed;
      if (dir === 'right') gx += gSpeed;
      if (dir === 'up') gy -= gSpeed;
      if (dir === 'down') gy += gSpeed;
    }

    return {
      ...ghost,
      x: gx,
      y: gy,
      dir,
      isFrightened,
    };
  });

  // 5. Ghost collisions
  for (let i = 0; i < ghosts.length; i++) {
    const g = ghosts[i]!;
    const dist = Math.hypot(pacman.x - g.x, pacman.y - g.y);
    if (dist < CELL_SIZE - 4) {
      if (g.isFrightened) {
        // Eat ghost
        playGhostSound();
        score += 200;
        actions.push('ghost:eaten');
        ghosts[i] = {
          ...g,
          x: 9 * CELL_SIZE,
          y: 7 * CELL_SIZE,
          isFrightened: false,
        };
      } else {
        // Pacman hit by ghost
        playDeathSound();
        lives -= 1;
        if (lives <= 0) {
          status = 'crashed';
        } else {
          // Reset Pacman to start position
          pacman.x = 9 * CELL_SIZE;
          pacman.y = 10 * CELL_SIZE;
          pacman.dir = 'left';
          pacman.nextDir = 'left';
        }
        break;
      }
    }
  }

  // 6. Win check
  if (status === 'playing' && pelletsEaten >= state.target) {
    playWinSound();
    status = 'won';
  }

  return {
    ...state,
    pacman,
    ghosts,
    grid,
    pelletsEaten,
    score,
    lives,
    frightenedTimer,
    mouthAngle,
    status,
    actions,
  };
}

export function restartAttempt(state: PacmanState): PacmanState {
  return createPacmanState(state.target, state.ghosts.length, state.speed, state.maxLives);
}
