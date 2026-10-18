import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RoundGameMappingModal } from '@/features/admin/RoundGameMappingModal';
import { huntApi } from '@/services/hunt-api';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    listGames: vi.fn(),
    mapRoundGames: vi.fn(),
  },
}));

describe('RoundGameMappingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCheckpoints = [
    {
      id: 'cp-1',
      round_id: 'round-1',
      label: 'Main Gate',
      sequence: 1,
      difficulty: 'easy' as const,
      game_id: null,
      game_name: null,
    },
    {
      id: 'cp-2',
      round_id: 'round-2',
      label: 'Library',
      sequence: 2,
      difficulty: 'medium' as const,
      game_id: 'game-snake',
      game_name: 'Snake',
    },
  ];

  it('renders checkpoint rounds, loads games, and saves mappings', async () => {
    const user = userEvent.setup();
    const handleSaved = vi.fn();
    const handleClose = vi.fn();

    vi.mocked(huntApi.listGames).mockResolvedValueOnce([
      {
        id: 'game-flappy',
        code: 'flappy-bird',
        name: 'Flappy Bird',
        enabled: true,
        levels: [],
      },
      {
        id: 'game-snake',
        code: 'snake',
        name: 'Snake',
        enabled: true,
        levels: [],
      },
    ]);

    vi.mocked(huntApi.mapRoundGames).mockResolvedValueOnce({ updated: true });

    render(
      <RoundGameMappingModal
        isOpen={true}
        onClose={handleClose}
        eventId="event-1"
        checkpoints={mockCheckpoints}
        onSaved={handleSaved}
      />,
    );

    expect(screen.getByText('Round-to-Game Mapping')).toBeInTheDocument();
    expect(screen.getByText('Main Gate')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();

    await waitFor(() => {
      expect(huntApi.listGames).toHaveBeenCalledOnce();
    });

    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);

    // Change round 1 to Flappy Bird
    await user.selectOptions(selects[0]!, 'game-flappy');

    // Click Save Mappings
    await user.click(screen.getByRole('button', { name: /save mappings/i }));

    await waitFor(() => {
      expect(huntApi.mapRoundGames).toHaveBeenCalledWith('event-1', {
        mappings: [
          { roundId: 'round-1', gameId: 'game-flappy' },
          { roundId: 'round-2', gameId: 'game-snake' },
        ],
      });
      expect(handleSaved).toHaveBeenCalledOnce();
    });
  });

  it('sets all rounds to random on button click', async () => {
    const user = userEvent.setup();
    vi.mocked(huntApi.listGames).mockResolvedValueOnce([]);

    render(
      <RoundGameMappingModal
        isOpen={true}
        onClose={vi.fn()}
        eventId="event-1"
        checkpoints={mockCheckpoints}
        onSaved={vi.fn()}
      />,
    );

    const randomBtn = screen.getByRole('button', { name: /set all to random/i });
    await user.click(randomBtn);

    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selects[0]?.value).toBe('');
    expect(selects[1]?.value).toBe('');
  });
});
