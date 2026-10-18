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
