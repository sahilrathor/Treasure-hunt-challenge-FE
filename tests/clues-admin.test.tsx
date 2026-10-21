import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CheckpointCluesModal } from '@/features/admin/CheckpointCluesModal';
import { huntApi } from '@/services/hunt-api';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    updateCheckpointClues: vi.fn(),
  },
}));

describe('CheckpointCluesModal', () => {
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
      clue: 'Start at the entrance arches.',
    },
    {
      id: 'cp-2',
      round_id: 'round-2',
      label: 'Library',
      sequence: 2,
      difficulty: 'medium' as const,
      clue: 'Seek the oldest volumes on level two.',
    },
  ];
  const mockTeams = [
    { id: 'team-1', code: 'TEAM-01', name: 'Alpha' },
    { id: 'team-2', code: 'TEAM-02', name: 'Beta' },
  ];

  it('renders checkpoint clues and saves updated clues via huntApi', async () => {
    const user = userEvent.setup();
    const handleSaved = vi.fn();
    const handleClose = vi.fn();

    vi.mocked(huntApi.updateCheckpointClues).mockResolvedValueOnce({ updated: true });

    render(
      <CheckpointCluesModal
        isOpen={true}
        onClose={handleClose}
        eventId="event-123"
        teams={mockTeams}
        checkpoints={mockCheckpoints}
        onSaved={handleSaved}
      />,
    );

    expect(screen.getByText('Team Clues')).toBeInTheDocument();
    expect(screen.getByText('Main Gate')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();

    // Check textarea values
    const textareas = screen.getAllByRole('textbox');
    expect(textareas).toHaveLength(2);
    expect(textareas[0]).toHaveValue('Start at the entrance arches.');
    expect(textareas[1]).toHaveValue('Seek the oldest volumes on level two.');

    // Edit the second clue
    fireEvent.change(textareas[1]!, {
      target: { value: 'Near the reading room skylight.' },
    });
    expect(textareas[1]).toHaveValue('Near the reading room skylight.');

    const saveButton = screen.getByRole('button', { name: /Save Team Clues/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(huntApi.updateCheckpointClues).toHaveBeenCalledWith(
        'event-123',
        'team-1',
        [
          { roundId: 'round-1', clue: 'Start at the entrance arches.' },
          { roundId: 'round-2', clue: 'Near the reading room skylight.' },
        ],
      );
      expect(handleSaved).toHaveBeenCalledOnce();
    });
  });

  it('resets a clue to default placeholder when Reset is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CheckpointCluesModal
        isOpen={true}
        onClose={() => undefined}
        eventId="event-123"
        teams={mockTeams}
        checkpoints={mockCheckpoints}
        onSaved={() => undefined}
      />,
    );

    const resetButtons = screen.getAllByRole('button', { name: /Reset/i });
    await user.click(resetButtons[0]!);

    const textareas = screen.getAllByRole('textbox');
    expect(textareas[0]).toHaveValue('Start at the entrance arches.');
  });

  it('shows a different saved clue when another team is selected', async () => {
    const user = userEvent.setup();
    const checkpoints = mockCheckpoints.map((checkpoint, index) => ({
      ...checkpoint,
      team_clues:
        index === 0 ? { 'team-2': 'Beta enters beside the auditorium.' } : undefined,
    }));

    render(
      <CheckpointCluesModal
        isOpen={true}
        onClose={() => undefined}
        eventId="event-123"
        teams={mockTeams}
        checkpoints={checkpoints}
        onSaved={() => undefined}
      />,
    );

    expect(screen.getAllByRole('textbox')[0]).toHaveValue('Start at the entrance arches.');
    await user.selectOptions(screen.getByRole('combobox'), 'team-2');
    expect(screen.getAllByRole('textbox')[0]).toHaveValue('Beta enters beside the auditorium.');
  });
});
