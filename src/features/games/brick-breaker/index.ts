export { BrickBreakerGame } from './BrickBreakerGame';
export {
  createBrickState,
  launchBall,
  movePaddle,
  createRealtimeBrickState,
  launchRealtimeBall,
  moveRealtimePaddle,
  stepRealtimeBrickGame,
  restartRealtimeBrickGame,
  PLAYFIELD_WIDTH,
  PLAYFIELD_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_Y,
  BALL_RADIUS,
} from './engine';
export type { BrickState, RealtimeBrickState, BrickGameStatus, Brick } from './engine';
