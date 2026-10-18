import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { FlappyBirdGame } from '@/features/games/flappy-bird';
import { gameRegistry } from '@/features/games/game-registry';
import { TetrisGame } from '@/features/games/tetris/TetrisGame';
import type { GameCode } from '@/types/api';

it('registers the eight game modules and handles an unknown code safely', () => {
  expect(Object.keys(gameRegistry)).toHaveLength(8);
  expect(gameRegistry['unknown' as GameCode]).toBeUndefined();
  expect(gameRegistry['flappy-bird']).toBeDefined();
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

it('emits evidence only after the arcade target is reached', async () => {
  const user = userEvent.setup();
  const complete = vi.fn();
  render(
    <TetrisGame
      challenge={{ target: 2, challengeToken: 'challenge-token' }}
      onComplete={complete}
    />,
  );
  for (let line = 0; line < 2; line += 1) {
    for (let column = 1; column <= 6; column += 1) {
      await user.click(screen.getByRole('button', { name: `Drop column ${column}` }));
    }
  }
  expect(complete).toHaveBeenCalledOnce();
  expect(complete.mock.calls[0]?.[0]).toMatchObject({
    challengeToken: 'challenge-token',
    achieved: 2,
  });
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
