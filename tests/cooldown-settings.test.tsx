import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CooldownSettingsModal } from '@/features/admin/CooldownSettingsModal';
import { huntApi } from '@/services/hunt-api';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    listGames: vi.fn(),
    updateGameLevel: vi.fn(),
  },
}));

describe('CooldownSettingsModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies the cooldown to every game difficulty level', async () => {
    vi.mocked(huntApi.listGames).mockResolvedValueOnce([
      {
        id: 'game-1',
        code: 'snake',
        name: 'Snake',
        enabled: true,
        levels: [
          {
            id: 'level-1',
            difficulty: 'easy',
            config: { target: 5 },
            maxAttempts: 4,
            cooldownSeconds: 10,
          },
          {
            id: 'level-2',
            difficulty: 'hard',
            config: { target: 15 },
            maxAttempts: 3,
            cooldownSeconds: 20,
          },
        ],
      },
    ]);
    vi.mocked(huntApi.updateGameLevel).mockResolvedValue({ id: 'level' });

    render(<CooldownSettingsModal open onClose={vi.fn()} />);

    const input = await screen.findByRole('spinbutton');
    fireEvent.change(input, { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Cooldown' }));

    await waitFor(() => expect(huntApi.updateGameLevel).toHaveBeenCalledTimes(2));
    expect(huntApi.updateGameLevel).toHaveBeenCalledWith('game-1', {
      difficulty: 'easy',
      config: { target: 5 },
      maxAttempts: 4,
      cooldownSeconds: 30,
    });
    expect(screen.getByText('Cooldown set to 30 seconds.')).toBeInTheDocument();
  });
});
