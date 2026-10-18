import {
  createBrickState,
  createRealtimeBrickState,
  launchBall,
  launchRealtimeBall,
  movePaddle,
  moveRealtimePaddle,
  restartRealtimeBrickGame,
  stepRealtimeBrickGame,
} from '@/features/games/brick-breaker';
import { parseFen, squareName } from '@/features/games/chess-puzzle';
import { createFlappyState, flap, stepFlappy } from '@/features/games/flappy-bird';
import { isValidMatch } from '@/features/games/memory-match';
import {
  canMove,
  createBoard,
  getTileStyle,
  moveBoard,
  peakTile,
} from '@/features/games/number-merge';
import {
  PAD_DEFINITIONS,
  patternStepIsCorrect,
  revealSpeed,
} from '@/features/games/pattern-recall';
import { createSnakeState, moveSnake } from '@/features/games/snake';
import {
  createInvaderState,
  createRealtimeInvaderState,
  firePlayerLaser,
  fireShot,
  moveRealtimeShip,
  moveShip,
  restartRealtimeInvaders,
  stepRealtimeInvaders,
} from '@/features/games/space-invaders';
import {
  createTetrisBoard,
  createRealtimeTetrisState,
  dropBlock,
  getGhostPieceRow,
  hardDropCurrentPiece,
  lockAndDropCurrentPiece,
  moveCurrentPiece,
  restartTetrisGame,
  rotateCurrentPiece,
  TETRIS_WIDTH,
  TETROMINO_ROTATIONS,
} from '@/features/games/tetris';

describe('isolated game engines', () => {
  it('clears a complete Tetris row', () => {
    let board = createTetrisBoard();
    let lines = 0;
    for (let column = 0; column < 6; column += 1) {
      const result = dropBlock(board, column);
      board = result.board;
      lines += result.cleared;
    }
    expect(lines).toBe(1);
  });

  it('runs modern 10x16 Tetromino engine with shapes, rotations, and line clears', () => {
    let state = createRealtimeTetrisState(1, 400);
    expect(state.status).toBe('playing');
    expect(state.board).toHaveLength(10 * 16);
    expect(state.currentPiece).toBeDefined();

    // Steer active piece
    const startCol = state.currentPiece.col;
    state = moveCurrentPiece(state, -1);
    expect(state.currentPiece.col).toBe(startCol - 1);
    state = moveCurrentPiece(state, 1);
    expect(state.currentPiece.col).toBe(startCol);

    // Rotate active piece
    const startRot = state.currentPiece.rot;
    state = rotateCurrentPiece(state);
    expect(state.currentPiece.rot).toBe((startRot + 1) % 4);

    // Ghost row calculation
    const currentMatrix = TETROMINO_ROTATIONS[state.currentPiece.type][state.currentPiece.rot]!;
    const ghostRow = getGhostPieceRow(
      state.board,
      currentMatrix,
      state.currentPiece.row,
      state.currentPiece.col,
    );
    expect(ghostRow).toBeGreaterThanOrEqual(0);

    // Hard drop stamps the piece
    state = hardDropCurrentPiece(state);
    expect(state.actions).toHaveLength(1);
    expect(state.actions[0]).toMatch(/^place:[IOTZSJL]:[0-3]:-?\d+$/);

    // Simulate clearing a complete row across 10 columns
    const bottomRow = 15;
    for (let c = 0; c < TETRIS_WIDTH; c += 1) {
      state.board[bottomRow * TETRIS_WIDTH + c] = 'I';
    }
    // Stamping a piece on a board with a full bottom row will clear it
    state = lockAndDropCurrentPiece(state);
    expect(state.lines).toBeGreaterThanOrEqual(1);
    expect(state.status).toBe('won');

    // Restart resets lines and state
    state = restartTetrisGame(state);
    expect(state.status).toBe('playing');
    expect(state.lines).toBe(0);
  });

  it('moves Snake and detects food using deterministic state', () => {
    let state = createSnakeState(0);
    for (const direction of ['right', 'right', 'right', 'right', 'up', 'up', 'up'] as const) {
      state = moveSnake(state, direction);
    }
    expect(state.score).toBe(1);
  });

  it('runs Brick Breaker volleys with paddle movement', () => {
    let state = movePaddle(createBrickState(5), 1);
    const result = launchBall(state, 4);
    state = result.state;
    expect(state.volleys).toBe(1);
    expect(result.action).toMatch(/^(hit:\d+|miss)$/);
  });

  it('simulates 60fps real-time Brick Breaker physics, bounces, brick hits and misses', () => {
    let state = createRealtimeBrickState(5, 3);
    expect(state.status).toBe('ready');
    expect(state.bricks).toHaveLength(5);
    expect(state.lives).toBe(3);

    // Moving paddle while ready keeps ball on paddle
    state = moveRealtimePaddle(state, 100);
    expect(state.paddleX).toBe(100);
    expect(state.ballX).toBe(100 + 34); // center of paddle

    // Launch ball
    state = launchRealtimeBall(state);
    expect(state.status).toBe('playing');
    expect(state.vy).toBeLessThan(0); // moving upwards!

    // Step physics: ball must move
    const prevBallY = state.ballY;
    state = stepRealtimeBrickGame(state);
    expect(state.ballY).not.toBe(prevBallY);

    // Simulate ceiling bounce
    state.ballY = 5;
    state.vy = -3;
    state = stepRealtimeBrickGame(state);
    expect(state.vy).toBeGreaterThan(0); // bounced down!

    // Simulate brick collision
    const targetBrick = state.bricks[0]!;
    state.ballX = targetBrick.x + targetBrick.width / 2;
    state.ballY = targetBrick.y + targetBrick.height + 4;
    state.vy = -3;
    state = stepRealtimeBrickGame(state);
    expect(state.broken).toContain(targetBrick.id);
    expect(state.actions).toContain(`hit:${targetBrick.id}`);

    // Simulate paddle bounce
    state.ballX = state.paddleX + 34;
    state.ballY = 356;
    state.vy = 4;
    state = stepRealtimeBrickGame(state);
    expect(state.vy).toBeLessThan(0); // bounced upwards!

    // Simulate miss (ball drops past bottom)
    state.ballY = 410;
    state.vy = 4;
    state = stepRealtimeBrickGame(state);
    expect(state.lives).toBe(2);
    expect(state.actions).toContain('miss');
    expect(state.status).toBe('ready'); // resets ball on paddle for next life

    // Restart resets lives and state
    state = restartRealtimeBrickGame(state);
    expect(state.lives).toBe(3);
    expect(state.broken).toEqual([]);
    expect(state.status).toBe('ready');
  });

  it('matches Memory cards only when their values agree', () => {
    expect(isValidMatch([1, 2, 1, 2], 0, 2)).toBe(true);
    expect(isValidMatch([1, 2, 1, 2], 0, 1)).toBe(false);
  });

  it('parses a Chess position into addressable squares', () => {
    const board = parseFen('8/8/8/8/8/8/8/4K3 w - - 0 1');
    expect(board).toHaveLength(64);
    expect(board[60]).toBe('K');
    expect(squareName(60)).toBe('e1');
  });

  it('performs a real Number Merge and validates board movement & tile styling', () => {
    const moved = moveBoard(createBoard(), 'left', 1);
    expect(moved.changed).toBe(true);
    expect(peakTile(moved.board)).toBe(4);
    expect(canMove(moved.board)).toBe(true);

    // Full board with no adjacent matches cannot move
    const jammedBoard = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      4, 2, 4, 2,
    ];
    expect(canMove(jammedBoard)).toBe(false);

    // Solvable board
    const solvableBoard = [
      2, 2, 4, 8,
      16, 32, 64, 128,
      256, 512, 1024, 2048,
      2, 4, 8, 16,
    ];
    expect(canMove(solvableBoard)).toBe(true);

    const style = getTileStyle(2048);
    expect(style.text).toBe('text-white');
  });

  it('checks Pattern Recall steps, difficulty speed, and pad definitions', () => {
    expect(patternStepIsCorrect([2, 1], [], 2)).toBe(true);
    expect(patternStepIsCorrect([2, 1], [2], 0)).toBe(false);
    expect(revealSpeed('hard')).toBeLessThan(revealSpeed('easy'));
    expect(PAD_DEFINITIONS.length).toBeGreaterThanOrEqual(8);
  });

  it('fires Space Invader shots from the selected ship column', () => {
    let state = moveShip(createInvaderState(), -1);
    state = fireShot(state, 8).state;
    expect(state.destroyed).toEqual([4]);
  });

  it('runs real-time Space Invader arcade engine with marching fleet, lasers, and collisions', () => {
    let state = createRealtimeInvaderState(4, 3);
    expect(state.status).toBe('playing');
    expect(state.invaders.length).toBe(4);
    expect(state.lives).toBe(3);

    // Steer ship left and right
    state = moveRealtimeShip(state, 100);
    expect(state.shipX).toBe(100);
    state = moveRealtimeShip(state, 200);
    expect(state.shipX).toBe(200);

    // Fire laser
    state = firePlayerLaser(state);
    expect(state.bullets.length).toBe(1);
    expect(state.bullets[0]!.fromPlayer).toBe(true);
    const bulletY = state.bullets[0]!.y;

    // Step physics moves laser upwards
    state = stepRealtimeInvaders(state);
    expect(state.bullets[0]!.y).toBeLessThan(bulletY);

    // Position a laser directly on an enemy to verify hit collision & particle burst
    const targetEnemy = state.invaders[0]!;
    state.bullets = [
      {
        id: 999,
        x: targetEnemy.x + targetEnemy.width / 2,
        y: targetEnemy.y + targetEnemy.height / 2,
        vy: -7,
        fromPlayer: true,
      },
    ];
    state = stepRealtimeInvaders(state);
    expect(state.destroyed).toContain(targetEnemy.id);
    expect(state.actions).toContain(`fire:${targetEnemy.id}`);
    expect(state.particles.length).toBeGreaterThan(0);

    // Test enemy bomb vs ship collision
    state.bullets = [
      { id: 888, x: state.shipX + 10, y: 360, vy: 3, fromPlayer: false },
    ];
    state = stepRealtimeInvaders(state);
    expect(state.lives).toBe(2);
    expect(state.invulnerableTicks).toBeGreaterThan(0);

    // Restart resets fleet and lives
    state = restartRealtimeInvaders(state);
    expect(state.lives).toBe(3);
    expect(state.destroyed).toEqual([]);
    expect(state.status).toBe('playing');
  });

  it('flaps bird wings and steps pipes through Flappy Bird physics', () => {
    let state = createFlappyState(2, 120, 5);
    expect(state.status).toBe('idle');
    state = flap(state);
    expect(state.status).toBe('playing');
    expect(state.velocity).toBeLessThan(0);

    // Simulate stepping until pipe 0 passes the bird
    for (let tick = 0; tick < 70 && state.status === 'playing'; tick += 1) {
      // Keep bird in the safe zone
      if (state.birdY > 200) {
        state = flap(state);
      }
      state = stepFlappy(state);
    }
    expect(state.actions.some((a) => a === 'flap')).toBe(true);
  });
});
