import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RoundDifficultiesModal } from '@/features/admin/RoundDifficultiesModal';
import { huntApi } from '@/services/hunt-api';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    updateRoundDifficulties: vi.fn(),
  },
}));

describe('RoundDifficultiesModal', () => {
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
      game_name: 'Snake',
    },
    {
      id: 'cp-2',
      round_id: 'round-2',
      label: 'Library',
      sequence: 2,
      difficulty: 'medium' as const,
      game_name: 'Tetris',
    },
    {
      id: 'cp-3',
      round_id: 'round-3',
      label: 'Cafeteria',
      sequence: 3,
      difficulty: 'hard' as const,
      game_name: null,
    },
  ];

  it('renders checkpoints and their current difficulty options', () => {
    render(
      <RoundDifficultiesModal
        isOpen={true}
        onClose={vi.fn()}
        eventId="event-1"
        checkpoints={mockCheckpoints}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByText('Round Difficulties')).toBeInTheDocument();
    expect(screen.getByText('Main Gate')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Cafeteria')).toBeInTheDocument();
    expect(screen.getByText('3 Rounds Configured')).toBeInTheDocument();
  });

  it('allows selecting difficulty per round and saving', async () => {
    const user = userEvent.setup();
    const handleSaved = vi.fn();
    const handleClose = vi.fn();

    vi.mocked(huntApi.updateRoundDifficulties).mockResolvedValueOnce({ updated: true });

    render(
      <RoundDifficultiesModal
        isOpen={true}
        onClose={handleClose}
        eventId="event-1"
        checkpoints={mockCheckpoints}
        onSaved={handleSaved}
      />,
    );

    // Change round 1 (Main Gate) from easy to hard
    const mainGateGroup = screen.getByRole('group', { name: /difficulty for main gate/i });
    const hardBtn = withinGroup(mainGateGroup, 'HARD');
    await user.click(hardBtn);

    // Save Difficulties
    const saveBtn = screen.getByRole('button', { name: /save difficulties/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(huntApi.updateRoundDifficulties).toHaveBeenCalledWith('event-1', [
        { roundId: 'round-1', difficulty: 'hard' },
        { roundId: 'round-2', difficulty: 'medium' },
        { roundId: 'round-3', difficulty: 'hard' },
      ]);
      expect(handleSaved).toHaveBeenCalledOnce();
    });
  });

  it('applies "All Easy" preset to all checkpoints', async () => {
    const user = userEvent.setup();
    vi.mocked(huntApi.updateRoundDifficulties).mockResolvedValueOnce({ updated: true });

    render(
      <RoundDifficultiesModal
        isOpen={true}
        onClose={vi.fn()}
        eventId="event-1"
        checkpoints={mockCheckpoints}
        onSaved={vi.fn()}
      />,
    );

    const allEasyBtn = screen.getByRole('button', { name: /all easy/i });
    await user.click(allEasyBtn);

    const saveBtn = screen.getByRole('button', { name: /save difficulties/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(huntApi.updateRoundDifficulties).toHaveBeenCalledWith('event-1', [
        { roundId: 'round-1', difficulty: 'easy' },
        { roundId: 'round-2', difficulty: 'easy' },
        { roundId: 'round-3', difficulty: 'easy' },
      ]);
    });
  });

  it('applies "Progressive" preset', async () => {
    const user = userEvent.setup();
    vi.mocked(huntApi.updateRoundDifficulties).mockResolvedValueOnce({ updated: true });

    render(
      <RoundDifficultiesModal
        isOpen={true}
        onClose={vi.fn()}
        eventId="event-1"
        checkpoints={mockCheckpoints}
        onSaved={vi.fn()}
      />,
    );

    const progressiveBtn = screen.getByRole('button', { name: /progressive/i });
    await user.click(progressiveBtn);

    const saveBtn = screen.getByRole('button', { name: /save difficulties/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(huntApi.updateRoundDifficulties).toHaveBeenCalledWith('event-1', [
        { roundId: 'round-1', difficulty: 'easy' },
        { roundId: 'round-2', difficulty: 'medium' },
        { roundId: 'round-3', difficulty: 'hard' },
      ]);
    });
  });
});

function withinGroup(container: HTMLElement, text: string) {
  const buttons = container.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent?.trim().toUpperCase() === text.toUpperCase()) {
      return btn;
    }
  }
  throw new Error(`Button with text "${text}" not found in group`);
}
