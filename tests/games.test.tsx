import { render, screen } from '@testing-library/react';
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
