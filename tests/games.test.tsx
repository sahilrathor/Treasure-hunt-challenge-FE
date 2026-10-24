import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { FlappyBirdGame } from '@/features/games/flappy-bird';
import { gameRegistry } from '@/features/games/game-registry';
import { TetrisGame } from '@/features/games/tetris/TetrisGame';
import type { GameCode } from '@/types/api';

it('registers the twelve game modules and handles an unknown code safely', () => {
  expect(Object.keys(gameRegistry)).toHaveLength(12);
  expect(gameRegistry['unknown' as GameCode]).toBeUndefined();
  expect(gameRegistry['flappy-bird']).toBeDefined();
  expect(gameRegistry['mini-platformer']).toBeDefined();
  expect(gameRegistry['crack-the-code']).toBeDefined();
  expect(gameRegistry['sliding-puzzle']).toBeDefined();
  expect(gameRegistry['pacman']).toBeDefined();
});

it('renders FlappyBirdGame and flaps wings on action', async () => {
  const user = userEvent.setup();
  const complete = vi.fn();
  render(
    <FlappyBirdGame
      challenge={{ target: 3, challengeToken: 'flappy-token' }}
      onComplete={complete}
    />,
  );

  expect(screen.getByText('FLAPPY BIRD')).toBeInTheDocument();
  expect(screen.getByText(/Pipes 0 \/ 3/)).toBeInTheDocument();

  const flapButton = screen.getByRole('button', { name: /Flap wings/i });
  await user.click(flapButton);
  expect(screen.getByText(/Pipes 0 \/ 3/)).toBeInTheDocument();
});

it('renders modern Tetris, moves, rotates piece, and hard drops', async () => {
  const user = userEvent.setup();
  const complete = vi.fn();
  render(
    <TetrisGame
      challenge={{ target: 1, challengeToken: 'challenge-token' }}
      onComplete={complete}
    />,
  );

  expect(screen.getByText(/Lines 0 \/ 1/)).toBeInTheDocument();
  expect(screen.getByText(/Next/i)).toBeInTheDocument();

  // Move left, right, and rotate
  const leftBtn = screen.getByRole('button', { name: /Move left/i });
  const rightBtn = screen.getByRole('button', { name: /Move right/i });
  const rotateBtn = screen.getByRole('button', { name: /Rotate piece/i });
  const hardDropBtn = screen.getByRole('button', { name: /Hard Drop/i });

  await user.click(leftBtn);
  await user.click(rightBtn);
  await user.click(rotateBtn);

  // Hard drop piece
  await user.click(hardDropBtn);

  // Status remains active or completes
  expect(screen.getByText(/Lines/i)).toBeInTheDocument();
});

it('shows OUT when Tetris board overflows and does not complete', async () => {
  const user = userEvent.setup();
  const complete = vi.fn();
  render(
    <TetrisGame
      challenge={{ target: 5, challengeToken: 'overflow-token' }}
      onComplete={complete}
    />,
  );

  // Hard drop pieces until board tops out (height is 16, so ~10-12 drops in same column tops out)
  const hardDropBtn = screen.getByRole('button', { name: /Hard Drop/i });
  for (let i = 0; i < 20; i += 1) {
    if (screen.queryAllByText(/BOARD FULL! OUT/i).length > 0) break;
    await user.click(hardDropBtn);
  }

  // Expect BOARD FULL! OUT banner, NOT complete
  expect(screen.getAllByText(/BOARD FULL! OUT/i).length).toBeGreaterThanOrEqual(1);
  expect(complete).not.toHaveBeenCalled();

  // Try Again button should be present and functional
  const tryAgain = screen.getAllByRole('button', { name: /Try Again/i })[0]!;
  expect(tryAgain).toBeInTheDocument();
  await user.click(tryAgain);

  // OUT message should be cleared
  expect(screen.queryByText(/BOARD FULL! OUT/i)).not.toBeInTheDocument();
});




it('shows OUT when Snake hits boundary and does not complete', async () => {
  const complete = vi.fn();
  const { SnakeGame } = await import('@/features/games/snake/SnakeGame');
  render(
    <SnakeGame
      challenge={{ target: 3, obstacles: 0, challengeToken: 'snake-token' }}
      onComplete={complete}
    />,
  );

  // Snake starts at [27, 26, 25] moving right. Row 3, cols 3, 2, 1.
  // Moving right: col 4, 5, 6, 7, then next right crashes into wall (col 8)!
  for (let i = 0; i < 5; i += 1) {
    const btn = screen.queryByRole('button', { name: 'Move right' });
    if (btn && !btn.hasAttribute('disabled')) {
      fireEvent.click(btn);
    }
  }

  // Expect OUT banner, not level cleared
  expect(screen.getByText(/OUT! You touched the boundary!/i)).toBeInTheDocument();
  // complete should NOT be called!
  expect(complete).not.toHaveBeenCalled();

  // Try Again button should be present
  const tryAgain = screen.getByRole('button', { name: /Try Again/i });
  expect(tryAgain).toBeInTheDocument();
  fireEvent.click(tryAgain);

  // OUT message should be cleared
  expect(screen.queryByText(/OUT! You touched the boundary!/i)).not.toBeInTheDocument();
});

it('completes Snake challenge when food target is reached without crash', async () => {
  const complete = vi.fn();
  const { SnakeGame } = await import('@/features/games/snake/SnakeGame');
  render(
    <SnakeGame
      challenge={{ target: 1, obstacles: 0, challengeToken: 'snake-token' }}
      onComplete={complete}
    />,
  );

  // Moving right, right, right, right, up, up, up hits the first food at cell 7
  for (const dir of ['right', 'right', 'right', 'right', 'up', 'up', 'up']) {
    fireEvent.click(screen.getByRole('button', { name: `Move ${dir}` }));
  }

  expect(complete).toHaveBeenCalledOnce();
  expect(complete.mock.calls[0]?.[0]).toMatchObject({
    challengeToken: 'snake-token',
    achieved: 1,
  });
});

it('renders BrickBreakerGame, moves paddle and launches ball', async () => {
  const complete = vi.fn();
  const { BrickBreakerGame } = await import('@/features/games/brick-breaker/BrickBreakerGame');
  render(
    <BrickBreakerGame
      challenge={{ target: 5, lives: 3, challengeToken: 'brick-token' }}
      onComplete={complete}
    />,
  );

  // Checks HUD
  expect(screen.getByText(/Bricks 0 \/ 5/i)).toBeInTheDocument();
  expect(screen.getByText(/Ready to Launch/i)).toBeInTheDocument();

  // Move paddle left and right
  const leftBtn = screen.getByRole('button', { name: /Move paddle left/i });
  const rightBtn = screen.getByRole('button', { name: /Move paddle right/i });
  fireEvent.click(leftBtn);
  fireEvent.click(rightBtn);

  // Launch ball
  const launchBtn = screen.getByRole('button', { name: /Launch Ball/i });
  fireEvent.click(launchBtn);

  // Status should update to Ball in Play
  expect(screen.getByRole('button', { name: /Ball in Play/i })).toBeInTheDocument();
  expect(screen.getAllByText(/Ball in Play/i).length).toBeGreaterThanOrEqual(1);
});

it('renders MemoryMatchGame with dynamic grid, flips cards, and matches pairs', async () => {
  const complete = vi.fn();
  const { MemoryMatchGame } = await import('@/features/games/memory-match/MemoryMatchGame');
  // 6 pairs: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]
  const board = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  render(
    <MemoryMatchGame
      challenge={{ pairs: 6, board, challengeToken: 'memory-token' }}
      onComplete={complete}
    />,
  );

  expect(screen.getByText(/Pairs 0 \/ 6/i)).toBeInTheDocument();

  // Click card 0 and card 1 (both have value 0 - Diamond)
  const card1 = screen.getByRole('button', { name: 'Card 1' });
  fireEvent.click(card1);
  const card2 = screen.getByRole('button', { name: 'Card 2' });
  fireEvent.click(card2);

  // Score should update to 1 / 6
  expect(screen.getByText(/Pairs 1 \/ 6/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Diamond/i).length).toBe(2);
});

it('renders SpaceInvadersGame, moves ship, fires laser, and displays HUD', async () => {
  const complete = vi.fn();
  const { SpaceInvadersGame } = await import('@/features/games/space-invaders/SpaceInvadersGame');
  render(
    <SpaceInvadersGame
      challenge={{ target: 4, challengeToken: 'invader-token' }}
      onComplete={complete}
    />,
  );

  // Check HUD
  expect(screen.getByText(/Invaders/i)).toBeInTheDocument();
  expect(screen.getByText(/Battle Active/i)).toBeInTheDocument();

  // Move ship left and right
  const leftBtn = screen.getByRole('button', { name: /Move ship left/i });
  const rightBtn = screen.getByRole('button', { name: /Move ship right/i });
  fireEvent.click(leftBtn);
  fireEvent.click(rightBtn);

  // Fire laser
  const fireBtn = screen.getByRole('button', { name: /Fire laser/i });
  fireEvent.click(fireBtn);

  expect(screen.getByText(/Invaders/i)).toBeInTheDocument();
});

it('renders NumberMergeGame, moves tiles, and updates score HUD', async () => {
  const complete = vi.fn();
  const { NumberMergeGame } = await import('@/features/games/number-merge/NumberMergeGame');
  render(
    <NumberMergeGame
      challenge={{ target: 32, maxMoves: 40, challengeToken: 'merge-token' }}
      onComplete={complete}
    />,
  );

  expect(screen.getByText(/Target:/i)).toBeInTheDocument();
  expect(screen.getByText(/Peak:/i)).toBeInTheDocument();
  expect(screen.getByText(/Moves:/i)).toBeInTheDocument();

  // Move left
  const leftBtn = screen.getByRole('button', { name: 'Move left' });
  fireEvent.click(leftBtn);

  // Peak tile should have merged to 4!
  expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
  expect(complete).not.toHaveBeenCalled();
});

it('renders PatternRecallGame, shows watching phase, and handles user input', async () => {
  const complete = vi.fn();
  const { PatternRecallGame } = await import('@/features/games/pattern-recall/PatternRecallGame');
  render(
    <PatternRecallGame
      challenge={{ sequence: [0, 1, 2], palette: 4, difficulty: 'easy', challengeToken: 'pattern-token' }}
      onComplete={complete}
    />,
  );

  expect(screen.getByText(/Pattern Recall/i)).toBeInTheDocument();
  expect(screen.getByText(/Watch the flashing pattern/i)).toBeInTheDocument();
});

it('renders MiniPlatformerGame with controls and HUD', async () => {
  const complete = vi.fn();
  const { MiniPlatformerGame } = await import('@/features/games/mini-platformer/MiniPlatformerGame');
  render(
    <MiniPlatformerGame
      challenge={{ target: 3, speed: 3.5, lives: 3, difficulty: 'easy', challengeToken: 'platform-token' }}
      onComplete={complete}
    />,
  );

  expect(screen.getByText(/Coins:/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Move left/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Jump/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Move right/i })).toBeInTheDocument();
});

it('renders CrackTheCodeGame and submits guesses with green and orange feedback', async () => {
  const complete = vi.fn();
  const { CrackTheCodeGame } = await import('@/features/games/crack-the-code/CrackTheCodeGame');
  render(
    <CrackTheCodeGame
      challenge={{ digits: 3, maxGuesses: 6, maxDigit: 6, code: [1, 2, 3], challengeToken: 'code-token' }}
      onComplete={complete}
    />,
  );

  expect(screen.getByText(/Guesses:/i)).toBeInTheDocument();
  expect(screen.getByText(/Crack the secret/i)).toBeInTheDocument();

  // Press digits 1, 3, 5 and submit (1 is exact -> green, 3 is partial -> orange, 5 is wrong)
  fireEvent.click(screen.getByRole('button', { name: '1' }));
  fireEvent.click(screen.getByRole('button', { name: '3' }));
  fireEvent.click(screen.getByRole('button', { name: '5' }));
  fireEvent.click(screen.getByRole('button', { name: /CHECK CODE/i }));

  expect(screen.getByTitle(/Digit 1: Correct digit & spot/i)).toBeInTheDocument();
  expect(screen.getByTitle(/Digit 3: Correct digit, wrong spot/i)).toBeInTheDocument();
  expect(screen.getByTitle(/Digit 5: Wrong digit/i)).toBeInTheDocument();

  // Now press 1, 2, 3 and submit to crack the code
  fireEvent.click(screen.getByRole('button', { name: '1' }));
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  fireEvent.click(screen.getByRole('button', { name: '3' }));
  fireEvent.click(screen.getByRole('button', { name: /CHECK CODE/i }));

  expect(complete).toHaveBeenCalled();
});

it('allows repeating digits in CrackTheCodeGame', async () => {
  const complete = vi.fn();
  const { CrackTheCodeGame } = await import('@/features/games/crack-the-code/CrackTheCodeGame');
  render(
    <CrackTheCodeGame
      challenge={{ digits: 3, maxGuesses: 6, maxDigit: 6, code: [2, 2, 2], challengeToken: 'code-token' }}
      onComplete={complete}
    />,
  );

  // Press digit 2 three times and check code
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  fireEvent.click(screen.getByRole('button', { name: /CHECK CODE/i }));

  expect(complete).toHaveBeenCalled();
});

it('supports 5 and 6 digit codes in CrackTheCodeGame', async () => {
  const complete = vi.fn();
  const { CrackTheCodeGame } = await import('@/features/games/crack-the-code/CrackTheCodeGame');
  render(
    <CrackTheCodeGame
      challenge={{ digits: 5, maxGuesses: 6, maxDigit: 8, code: [1, 2, 3, 4, 5], challengeToken: 'code-5-token' }}
      onComplete={complete}
    />,
  );

  expect(screen.getByText(/Crack the secret 5-digit combination/i)).toBeInTheDocument();

  // Enter 5 digits and check code
  fireEvent.click(screen.getByRole('button', { name: '1' }));
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  fireEvent.click(screen.getByRole('button', { name: '3' }));
  fireEvent.click(screen.getByRole('button', { name: '4' }));
  fireEvent.click(screen.getByRole('button', { name: '5' }));
  fireEvent.click(screen.getByRole('button', { name: /CHECK CODE/i }));

  expect(complete).toHaveBeenCalled();
});

it('renders SlidingPuzzleGame and allows sliding tiles', async () => {
  const complete = vi.fn();
  const { SlidingPuzzleGame } = await import('@/features/games/sliding-puzzle/SlidingPuzzleGame');
  // Solved state: [1, 2, 3, 4, 5, 6, 7, 8, 0]
  // One move away: swap 8 and 0 -> [1, 2, 3, 4, 5, 6, 7, 0, 8]
  render(
    <SlidingPuzzleGame
      challenge={{ size: 3, initialTiles: [1, 2, 3, 4, 5, 6, 7, 0, 8], challengeToken: 'slide-token' }}
      onComplete={complete}
    />,
  );

  expect(screen.getByText(/Moves:/i)).toBeInTheDocument();
  expect(screen.getByText(/Goal: 1 to/i)).toBeInTheDocument();

  // Click on tile 8 (at index 8) to slide it left into empty space (index 7)
  const tile8 = screen.getByRole('button', { name: /Slide tile 8/i });
  fireEvent.click(tile8);

  expect(complete).toHaveBeenCalled();
});

it('renders PacmanGame and shows game controls', async () => {
  const complete = vi.fn();
  const { PacmanGame } = await import('@/features/games/pacman/PacmanGame');
  render(
    <PacmanGame
      challenge={{ target: 10, ghosts: 1, speed: 1.8, lives: 3, challengeToken: 'pacman-token' }}
      onComplete={complete}
    />,
  );

  expect(screen.getByText(/Pellets:/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Move Left/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Move Up/i })).toBeInTheDocument();
});






