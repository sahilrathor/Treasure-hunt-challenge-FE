export const PLAYFIELD_WIDTH = 320;
export const PLAYFIELD_HEIGHT = 440;
export const BIRD_X = 64;
export const BIRD_RADIUS = 13;
export const GRAVITY = 0.42;
export const FLAP_IMPULSE = -6.6;
export const GROUND_HEIGHT = 28;
export const PIPE_WIDTH = 46;
export const PIPE_SPACING = 170;

export interface Pipe {
  id: number;
  x: number;
  topHeight: number;
  gap: number;
  width: number;
  passed: boolean;
}

export type FlappyStatus = 'idle' | 'playing' | 'crashed' | 'won';

export interface FlappyState {
  birdY: number;
  velocity: number;
  pipes: Pipe[];
  score: number;
  target: number;
  gap: number;
  speed: number;
  status: FlappyStatus;
  crashes: number;
  actions: string[];
}

export function generatePipes(target: number, gap: number): Pipe[] {
  const maxAvailable = Math.max(50, PLAYFIELD_HEIGHT - GROUND_HEIGHT - gap - 70);
  return Array.from({ length: target + 2 }, (_, index) => {
    const pseudoVariation = (index * 67 + 41) % maxAvailable;
    const topHeight = 60 + pseudoVariation;
    return {
      id: index,
      x: PLAYFIELD_WIDTH + 40 + index * PIPE_SPACING,
      topHeight,
      gap,
      width: PIPE_WIDTH,
      passed: false,
    };
  });
}

export function createFlappyState(
  target = 3,
  gap = 125,
  speed = 2.4,
): FlappyState {
  return {
    birdY: 190,
    velocity: 0,
    pipes: generatePipes(target, gap),
    score: 0,
    target,
    gap,
    speed,
    status: 'idle',
    crashes: 0,
    actions: [],
  };
}

export function flap(state: FlappyState): FlappyState {
  if (state.status === 'won' || state.status === 'crashed') return state;
  return {
    ...state,
    velocity: FLAP_IMPULSE,
    status: 'playing',
    actions: [...state.actions, 'flap'],
  };
}

export function stepFlappy(state: FlappyState): FlappyState {
  if (state.status !== 'playing') return state;

  const nextVelocity = state.velocity + GRAVITY;
  let nextBirdY = state.birdY + nextVelocity;

  // Ceiling bounce/cap
  if (nextBirdY - BIRD_RADIUS <= 0) {
    nextBirdY = BIRD_RADIUS;
  }

  // Ground collision check
  const maxGroundY = PLAYFIELD_HEIGHT - GROUND_HEIGHT - BIRD_RADIUS;
  if (nextBirdY >= maxGroundY) {
    return {
      ...state,
      birdY: maxGroundY,
      velocity: 0,
      status: 'crashed',
      crashes: state.crashes + 1,
      actions: [...state.actions, 'crash:ground'],
    };
  }

  const updatedPipes = state.pipes.map((pipe) => ({
    ...pipe,
    x: pipe.x - state.speed,
  }));

  const nextActions = [...state.actions];
  let nextScore = state.score;

  for (const pipe of updatedPipes) {
    // Check horizontal overlap
    const overlapX =
      BIRD_X + BIRD_RADIUS > pipe.x && BIRD_X - BIRD_RADIUS < pipe.x + pipe.width;

    if (overlapX) {
      const hitTop = nextBirdY - BIRD_RADIUS < pipe.topHeight;
      const hitBottom = nextBirdY + BIRD_RADIUS > pipe.topHeight + pipe.gap;

      if (hitTop || hitBottom) {
        return {
          ...state,
          birdY: nextBirdY,
          velocity: nextVelocity,
          pipes: updatedPipes,
          status: 'crashed',
          crashes: state.crashes + 1,
          actions: [...nextActions, `crash:pipe:${pipe.id}`],
        };
      }
    }

    // Check pipe passed
    if (!pipe.passed && pipe.x + pipe.width < BIRD_X - BIRD_RADIUS) {
      pipe.passed = true;
      nextScore += 1;
      nextActions.push(`pass:${pipe.id}`);
    }
  }

  const nextStatus: FlappyStatus = nextScore >= state.target ? 'won' : 'playing';

  return {
    ...state,
    birdY: nextBirdY,
    velocity: nextVelocity,
    pipes: updatedPipes,
    score: nextScore,
    status: nextStatus,
    actions: nextActions,
  };
}

export function restartAttempt(state: FlappyState): FlappyState {
  return {
    ...state,
    birdY: 190,
    velocity: 0,
    pipes: generatePipes(state.target, state.gap),
    score: 0,
    status: 'idle',
    // Keep previous crash log in actions for full server audit trail
  };
}
