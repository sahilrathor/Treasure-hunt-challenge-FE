import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TeamLocationRoutesModal } from '@/features/admin/TeamLocationRoutesModal';
import { huntApi } from '@/services/hunt-api';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    updateTeamRoundLocations: vi.fn(),
  },
}));

describe('TeamLocationRoutesModal with Team Tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTeams = [
    {
      id: 'team-1',
      code: 'TEAM-01',
      name: 'Alpha Squad',
      roundLocations: { 1: 'loc-1', 2: 'loc-2', 3: 'loc-1' },
    },
    {
      id: 'team-2',
      code: 'TEAM-02',
      name: 'Beta Force',
      roundLocations: { 1: 'loc-2', 2: 'loc-1', 3: 'loc-3' },
    },
  ];

  const mockCheckpoints = [
    { id: 'loc-1', code: 'LOC-1', label: 'Main Entrance', clue: 'Look near the gate' },
    { id: 'loc-2', code: 'LOC-2', label: 'Library Floor 2', clue: 'Quiet reading desk' },
    { id: 'loc-3', code: 'LOC-3', label: 'Auditorium Hall', clue: 'Under stage light' },
  ];

  it('renders team tabs and allows switching between teams', async () => {
    render(
      <TeamLocationRoutesModal
        isOpen={true}
        onClose={() => undefined}
        eventId="event-1"
        teams={mockTeams}
        checkpoints={mockCheckpoints}
        roundCount={3}
        onSaved={() => undefined}
      />,
    );

    // Both team tab buttons exist
    expect(screen.getByRole('button', { name: /TEAM-01/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /TEAM-02/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All Teams Overview/i })).toBeInTheDocument();

    // Default active tab is Team 1
    expect(screen.getByRole('heading', { name: 'Alpha Squad' })).toBeInTheDocument();
    expect(screen.getByText('Round 1')).toBeInTheDocument();
    expect(screen.getByText('Round 2')).toBeInTheDocument();
    expect(screen.getByText('Round 3')).toBeInTheDocument();

    // Switch to Team 2
    fireEvent.click(screen.getByRole('button', { name: /TEAM-02/i }));
    expect(screen.getByRole('heading', { name: 'Beta Force' })).toBeInTheDocument();
  });

  it('saves updated location assignments via huntApi', async () => {
    const handleSaved = vi.fn();
    vi.mocked(huntApi.updateTeamRoundLocations).mockResolvedValueOnce({ updated: true, count: 6 });

    render(
      <TeamLocationRoutesModal
        isOpen={true}
        onClose={() => undefined}
        eventId="event-1"
        teams={mockTeams}
        checkpoints={mockCheckpoints}
        roundCount={3}
        onSaved={handleSaved}
      />,
    );

    // Save Routes button
    const saveButton = screen.getByRole('button', { name: /Save Routes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(huntApi.updateTeamRoundLocations).toHaveBeenCalledWith(
        'event-1',
        expect.arrayContaining([
          expect.objectContaining({ teamId: 'team-1', roundSequence: 1, checkpointId: 'loc-1' }),
          expect.objectContaining({ teamId: 'team-1', roundSequence: 3, checkpointId: 'loc-1' }),
        ]),
      );
    });
  });
});
