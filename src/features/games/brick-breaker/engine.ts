// -------------------------------------------------------------
// Legacy turn-based simulation (preserved for backwards-compatibility)
// -------------------------------------------------------------
export interface BrickState {
  paddle: number;
  broken: number[];
  lives: number;
  volleys: number;
}

export const createBrickState = (lives: number): BrickState => ({
  paddle: 2,
  broken: [],
  lives,
  volleys: 0,
});

export function movePaddle(state: BrickState, amount: -1 | 1): BrickState {
  return { ...state, paddle: Math.max(0, Math.min(4, state.paddle + amount)) };
}

export function launchBall(state: BrickState, target: number) {
  const remaining = Array.from({ length: target }, (_, index) => index).filter(
    (index) => !state.broken.includes(index),
  );
  if (!remaining.length || state.lives === 0) return { state, action: 'miss' };
  const misses = (state.volleys + state.paddle) % 7 === 6;
  if (misses) {
    return {
      state: { ...state, lives: state.lives - 1, volleys: state.volleys + 1 },
      action: 'miss',
    };
  }
  const brick = remaining[(state.paddle * 3 + state.volleys) % remaining.length]!;
  return {
    state: { ...state, broken: [...state.broken, brick], volleys: state.volleys + 1 },
    action: `hit:${brick}`,
  };
}

// -------------------------------------------------------------
// Real-time 60fps Arcade Physics Engine
// -------------------------------------------------------------
export const PLAYFIELD_WIDTH = 320;
export const PLAYFIELD_HEIGHT = 400;
export const PADDLE_WIDTH = 68;
export const PADDLE_HEIGHT = 10;
export const PADDLE_Y = 360;
export const BALL_RADIUS = 6;
export const BALL_SPEED = 4.2;
export const BRICK_COLS = 5;
export const BRICK_WIDTH = 54;
export const BRICK_HEIGHT = 16;
export const BRICK_GAP_X = 5;
export const BRICK_GAP_Y = 6;
export const BRICK_START_Y = 38;

export interface BrickColor {
  fill: string;
  border: string;
  topHighlight: string;
}

export const ROW_COLORS: BrickColor[] = [
  { fill: '#f43f5e', border: '#be123c', topHighlight: '#fda4af' }, // Rose / Ruby
  { fill: '#f97316', border: '#c2410c', topHighlight: '#fed7aa' }, // Amber / Orange
  { fill: '#10b981', border: '#047857', topHighlight: '#a7f3d0' }, // Emerald / Green
  { fill: '#06b6d4', border: '#0e7490', topHighlight: '#a5f3fc' }, // Cyan / Sky
  { fill: '#a855f7', border: '#7e22ce', topHighlight: '#e9d5ff' }, // Violet / Purple
  { fill: '#eab308', border: '#a16207', topHighlight: '#fef08a' }, // Gold / Yellow
];

export interface Brick {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  border: string;
  topHighlight: string;
}

export type BrickGameStatus = 'ready' | 'playing' | 'gameover' | 'won';

export interface RealtimeBrickState {
  target: number;
  lives: number;
  maxLives: number;
  status: BrickGameStatus;
  paddleX: number;
  ballX: number;
  ballY: number;
  vx: number;
  vy: number;
  broken: number[];
  bricks: Brick[];
  actions: string[];
}

export function generateBricks(target: number): Brick[] {
  const bricks: Brick[] = [];
  const totalGridWidth = BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_GAP_X;
  const leftMargin = (PLAYFIELD_WIDTH - totalGridWidth) / 2;

  for (let i = 0; i < target; i += 1) {
    const row = Math.floor(i / BRICK_COLS);
    const col = i % BRICK_COLS;
    const x = leftMargin + col * (BRICK_WIDTH + BRICK_GAP_X);
    const y = BRICK_START_Y + row * (BRICK_HEIGHT + BRICK_GAP_Y);
    const color = ROW_COLORS[row % ROW_COLORS.length]!;

    bricks.push({
      id: i,
      x,
      y,
      width: BRICK_WIDTH,
      height: BRICK_HEIGHT,
      fill: color.fill,
      border: color.border,
      topHighlight: color.topHighlight,
    });
  }
  return bricks;
}

export function createRealtimeBrickState(target = 10, lives = 3): RealtimeBrickState {
  const initialPaddleX = (PLAYFIELD_WIDTH - PADDLE_WIDTH) / 2;
  return {
    target,
    lives,
    maxLives: lives,
    status: 'ready',
    paddleX: initialPaddleX,
    ballX: initialPaddleX + PADDLE_WIDTH / 2,
    ballY: PADDLE_Y - BALL_RADIUS - 1,
    vx: 0,
    vy: 0,
    broken: [],
    bricks: generateBricks(target),
    actions: [],
  };
}

export function launchRealtimeBall(state: RealtimeBrickState): RealtimeBrickState {
  if (state.status !== 'ready' || state.lives <= 0) return state;

  const paddleCenter = state.paddleX + PADDLE_WIDTH / 2;
  // Deflect towards center of playfield on launch
  const dir = paddleCenter < PLAYFIELD_WIDTH / 2 ? 1 : -1;
  const launchVx = dir * 2.1;
  const launchVy = -Math.sqrt(Math.max(1, BALL_SPEED * BALL_SPEED - launchVx * launchVx));

  return {
    ...state,
    status: 'playing',
    vx: launchVx,
    vy: launchVy,
  };
}

export function moveRealtimePaddle(
  state: RealtimeBrickState,
  newPaddleX: number,
): RealtimeBrickState {
  const minX = 6;
  const maxX = PLAYFIELD_WIDTH - PADDLE_WIDTH - 6;
  const clampedX = Math.max(minX, Math.min(maxX, newPaddleX));

  if (state.status === 'ready') {
    return {
      ...state,
      paddleX: clampedX,
      ballX: clampedX + PADDLE_WIDTH / 2,
      ballY: PADDLE_Y - BALL_RADIUS - 1,
    };
  }

  return {
    ...state,
    paddleX: clampedX,
  };
}

export function stepRealtimeBrickGame(state: RealtimeBrickState): RealtimeBrickState {
  if (state.status !== 'playing') return state;

  const prevX = state.ballX;
  const prevY = state.ballY;
  let nextX = prevX + state.vx;
  let nextY = prevY + state.vy;
  let nextVx = state.vx;
  let nextVy = state.vy;

  // 1. Boundary collisions: Left & Right walls
  if (nextX - BALL_RADIUS <= 0) {
    nextX = BALL_RADIUS;
    nextVx = Math.abs(nextVx);
  } else if (nextX + BALL_RADIUS >= PLAYFIELD_WIDTH) {
    nextX = PLAYFIELD_WIDTH - BALL_RADIUS;
    nextVx = -Math.abs(nextVx);
  }

  // 2. Ceiling collision
  if (nextY - BALL_RADIUS <= 0) {
    nextY = BALL_RADIUS;
    nextVy = Math.abs(nextVy);
  }

  // 3. Bottom loss collision
  if (nextY - BALL_RADIUS >= PLAYFIELD_HEIGHT) {
    const nextLives = state.lives - 1;
    const nextActions = [...state.actions, 'miss'];

    if (nextLives <= 0) {
      return {
        ...state,
        lives: 0,
        status: 'gameover',
        actions: nextActions,
      };
    }

    return {
      ...state,
      lives: nextLives,
      status: 'ready',
      ballX: state.paddleX + PADDLE_WIDTH / 2,
      ballY: PADDLE_Y - BALL_RADIUS - 1,
      vx: 0,
      vy: 0,
      actions: nextActions,
    };
  }

  // 4. Paddle collision (when moving downward)
  const paddleTop = PADDLE_Y;
  const paddleBottom = PADDLE_Y + PADDLE_HEIGHT;
  const paddleLeft = state.paddleX;
  const paddleRight = state.paddleX + PADDLE_WIDTH;

  if (
    nextVy > 0 &&
    nextY + BALL_RADIUS >= paddleTop &&
    prevY + BALL_RADIUS <= paddleBottom + 2 &&
    nextX + BALL_RADIUS >= paddleLeft &&
    nextX - BALL_RADIUS <= paddleRight
  ) {
    nextY = paddleTop - BALL_RADIUS;
    const paddleCenter = paddleLeft + PADDLE_WIDTH / 2;
    const rawOffset = (nextX - paddleCenter) / (PADDLE_WIDTH / 2);
    const clampedOffset = Math.max(-0.85, Math.min(0.85, rawOffset));
    const maxAngleRad = (60 * Math.PI) / 180;
    const bounceAngle = clampedOffset * maxAngleRad;

    const speed = Math.max(4.2, Math.min(6.5, Math.sqrt(nextVx * nextVx + nextVy * nextVy)));
    nextVx = speed * Math.sin(bounceAngle);
    nextVy = -Math.abs(speed * Math.cos(bounceAngle));
    if (Math.abs(nextVy) < 1.6) {
      nextVy = -1.6;
    }
  }

  // 5. Brick collisions
  let hitBrickId: number | null = null;
  for (const brick of state.bricks) {
    if (state.broken.includes(brick.id)) continue;

    const clampX = Math.max(brick.x, Math.min(nextX, brick.x + brick.width));
    const clampY = Math.max(brick.y, Math.min(nextY, brick.y + brick.height));
    const distX = nextX - clampX;
    const distY = nextY - clampY;

    if (distX * distX + distY * distY <= BALL_RADIUS * BALL_RADIUS) {
      hitBrickId = brick.id;

      const fromLeft = prevX + BALL_RADIUS <= brick.x;
      const fromRight = prevX - BALL_RADIUS >= brick.x + brick.width;
      const fromTop = prevY + BALL_RADIUS <= brick.y;
      const fromBottom = prevY - BALL_RADIUS >= brick.y + brick.height;

      if (fromLeft || fromRight) {
        nextVx = -nextVx;
      } else if (fromTop || fromBottom) {
        nextVy = -nextVy;
      } else {
        nextVy = -nextVy;
      }
      break; // One brick collision per frame
    }
  }

  let nextBroken = state.broken;
  let nextActions = state.actions;
  let nextStatus: BrickGameStatus = 'playing';

  if (hitBrickId !== null) {
    nextBroken = [...state.broken, hitBrickId];
    nextActions = [...state.actions, `hit:${hitBrickId}`];
    if (nextBroken.length >= state.target) {
      nextStatus = 'won';
      nextVx = 0;
      nextVy = 0;
    }
  }

  return {
    ...state,
    ballX: nextX,
    ballY: nextY,
    vx: nextVx,
    vy: nextVy,
    broken: nextBroken,
    actions: nextActions,
    status: nextStatus,
  };
}

export function restartRealtimeBrickGame(state: RealtimeBrickState): RealtimeBrickState {
  const initialPaddleX = (PLAYFIELD_WIDTH - PADDLE_WIDTH) / 2;
  return {
    ...state,
    lives: state.maxLives,
    status: 'ready',
    paddleX: initialPaddleX,
    ballX: initialPaddleX + PADDLE_WIDTH / 2,
    ballY: PADDLE_Y - BALL_RADIUS - 1,
    vx: 0,
    vy: 0,
    broken: [],
    actions: [],
  };
}
