export { TetrisGame } from './TetrisGame';
export {
  createTetrisBoard,
  dropBlock,
  TETRIS_HEIGHT,
  TETRIS_WIDTH,
  getGhostRow,
  createRealtimeTetrisState,
  moveFallingCol,
  setFallingCol,
  lockAndDrop,
  tickFallingBlock,
  restartTetrisGame,
} from './engine';
export type { TetrisBoard, RealtimeTetrisState, TetrisStatus } from './engine';
