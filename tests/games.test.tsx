import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { gameRegistry } from '@/features/games/game-registry';
import { TetrisGame } from '@/features/games/tetris/TetrisGame';
import type { GameCode } from '@/types/api';

it('registers the eight game modules and handles an unknown code safely', () => {
  expect(Object.keys(gameRegistry)).toHaveLength(8);
  expect(gameRegistry['unknown' as GameCode]).toBeUndefined();
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
