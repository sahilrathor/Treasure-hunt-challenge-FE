import { createBrickState, launchBall, movePaddle } from '@/features/games/brick-breaker';
import { parseFen, squareName } from '@/features/games/chess-puzzle';
import { isValidMatch } from '@/features/games/memory-match';
import { createBoard, moveBoard, peakTile } from '@/features/games/number-merge';
import { patternStepIsCorrect, revealSpeed } from '@/features/games/pattern-recall';
import { createSnakeState, moveSnake } from '@/features/games/snake';
import { createInvaderState, fireShot, moveShip } from '@/features/games/space-invaders';
import { createTetrisBoard, dropBlock } from '@/features/games/tetris';

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
});
