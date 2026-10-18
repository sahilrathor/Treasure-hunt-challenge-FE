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
import { createBoard, moveBoard, peakTile } from '@/features/games/number-merge';
import { patternStepIsCorrect, revealSpeed } from '@/features/games/pattern-recall';
import { createSnakeState, moveSnake } from '@/features/games/snake';
import { createInvaderState, fireShot, moveShip } from '@/features/games/space-invaders';
import {
  createTetrisBoard,
  createRealtimeTetrisState,
  dropBlock,
  getGhostRow,
  lockAndDrop,
  moveFallingCol,
  restartTetrisGame,
  tickFallingBlock,
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

  it('runs real-time Tetris with falling blocks, steering, ghost row, and line clear', () => {
    let state = createRealtimeTetrisState(1, 400);
    expect(state.status).toBe('playing');
    expect(state.fallingCol).toBe(2);

    // Steer left and right
    state = moveFallingCol(state, -1);
    expect(state.fallingCol).toBe(1);
    state = moveFallingCol(state, 1);
    expect(state.fallingCol).toBe(2);

    // Ghost row on empty column is bottom row 9
    expect(getGhostRow(state.board, 2)).toBe(9);

    // Tick down
    state = tickFallingBlock(state);
    expect(state.fallingRow).toBe(1);

    // Drop into all columns to clear a line
    for (let col = 0; col < 6; col += 1) {
      state = lockAndDrop(state, col);
    }
    expect(state.lines).toBe(1);
    expect(state.status).toBe('won');
    expect(state.actions).toHaveLength(6);

    // Restart resets lines and status
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

  it('performs a real Number Merge', () => {
    const moved = moveBoard(createBoard(), 'left', 1);
    expect(moved.changed).toBe(true);
    expect(peakTile(moved.board)).toBe(4);
  });

  it('checks Pattern Recall steps and difficulty speed', () => {
    expect(patternStepIsCorrect([2, 1], [], 2)).toBe(true);
    expect(patternStepIsCorrect([2, 1], [2], 0)).toBe(false);
    expect(revealSpeed('hard')).toBeLessThan(revealSpeed('easy'));
  });

  it('fires Space Invader shots from the selected ship column', () => {
    let state = moveShip(createInvaderState(), -1);
    state = fireShot(state, 8).state;
    expect(state.destroyed).toEqual([4]);
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
