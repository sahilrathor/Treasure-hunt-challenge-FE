import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { TeamRoundsModal } from '@/features/admin/TeamRoundsModal';
import { huntApi } from '@/services/hunt-api';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    teamRounds: vi.fn(),
    resetAssignmentAttempts: vi.fn(),
  },
}));

describe('TeamRoundsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders team rounds and how rounds were played', async () => {
    vi.mocked(huntApi.teamRounds).mockResolvedValueOnce({
      team: {
        id: 'team-1',
        code: 'TEAM-01',
        name: 'Cyber Crusaders',
        status: 'IN_PROGRESS',
        current_sequence: 3,
        started_at: '2026-10-18T10:00:00Z',
        completed_at: null,
      },
      rounds: [
        {
          round: 1,
          checkpoint_label: 'Main Gate',
          game_name: 'Snake',
          game_code: 'snake',
          assignment_id: 'a-1',
          assignment_status: 'PASSED',
          passed_at: '2026-10-18T10:05:00Z',
          attempts: [
            {
              id: 'att-1',
              attempt_number: 1,
              status: 'passed',
              started_at: '2026-10-18T10:04:45Z',
              ended_at: '2026-10-18T10:05:00Z',
              duration_ms: 15000,
              member_code: 'MEMBER-1',
              display_name: 'Alice Cooper',
            },
          ],
        },
        {
          round: 2,
          checkpoint_label: 'Library',
          game_name: 'Tetris',
          game_code: 'tetris',
          assignment_id: 'a-2',
          assignment_status: 'ASSIGNED',
          passed_at: null,
          attempts: [
            {
              id: 'att-2',
              attempt_number: 1,
              status: 'failed',
              started_at: '2026-10-18T10:10:00Z',
              ended_at: '2026-10-18T10:10:20Z',
              duration_ms: 20000,
              member_code: 'MEMBER-2',
              display_name: 'Bob Ross',
            },
          ],
        },
      ],
    });

    render(<TeamRoundsModal teamId="team-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Cyber Crusaders')).toBeInTheDocument();
      expect(screen.getByText('TEAM-01')).toBeInTheDocument();
      expect(screen.getByText('Main Gate')).toBeInTheDocument();
      expect(screen.getByText('Game: Snake')).toBeInTheDocument();
      expect(screen.getAllByText(/Alice Cooper/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText('15.0s')[0]).toBeInTheDocument();
      expect(screen.getByText('Bob Ross')).toBeInTheDocument();
    });
  });

  it('lets an admin reset attempts for the active round', async () => {
    const teamData = {
      team: {
        id: 'team-1',
        code: 'TEAM-01',
        name: 'Cyber Crusaders',
        status: 'IN_PROGRESS',
        current_sequence: 2,
        started_at: '2026-10-18T10:00:00Z',
        completed_at: null,
      },
      rounds: [
        {
          round: 2,
          checkpoint_label: 'Library',
          game_name: 'Tetris',
          game_code: 'tetris',
          assignment_id: 'a-2',
          assignment_status: 'ASSIGNED',
          passed_at: null,
          attempts: [],
        },
      ],
    };
    vi.mocked(huntApi.teamRounds)
      .mockResolvedValueOnce(teamData)
      .mockResolvedValueOnce(teamData);
    vi.mocked(huntApi.resetAssignmentAttempts).mockResolvedValueOnce({
      assignmentId: 'a-2',
      resetCount: 5,
    });
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    render(<TeamRoundsModal teamId="team-1" onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reset Attempts' }));

    await waitFor(() => {
      expect(huntApi.resetAssignmentAttempts).toHaveBeenCalledWith('a-2');
      expect(screen.getByText('5 attempts reset. The team can retry now.')).toBeInTheDocument();
    });
  });
});
