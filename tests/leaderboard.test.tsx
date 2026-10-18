import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { LeaderboardPage } from '@/features/leaderboard/LeaderboardPage';
import { huntApi } from '@/services/hunt-api';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    leaderboard: vi.fn(),
  },
}));

describe('LeaderboardPage', () => {
  const sampleLeaderboard = {
    event: {
      id: 'event-1',
      name: 'Techfest Grand Hunt 2026',
      slug: 'techfest-2026',
      status: 'RUNNING',
    },
    completed: [
      {
        id: 'team-1',
        code: 'TEAM-01',
        name: 'Cyber Wizards',
        status: 'COMPLETED',
        current_sequence: 9,
        failed_attempts: 1,
        adjusted_time_ms: 125000,
      },
      {
        id: 'team-2',
        code: 'TEAM-02',
        name: 'Binary Beasts',
        status: 'COMPLETED',
        current_sequence: 9,
        failed_attempts: 3,
        adjusted_time_ms: 180000,
      },
    ],
    incomplete: [
      {
        id: 'team-3',
        code: 'TEAM-03',
        name: 'Quantum Questers',
        status: 'IN_PROGRESS',
        current_sequence: 4,
        failed_attempts: 2,
        adjusted_time_ms: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders event details, rankings, and incomplete teams', async () => {
    vi.mocked(huntApi.leaderboard).mockResolvedValueOnce(sampleLeaderboard);

    render(
      <MemoryRouter>
        <LeaderboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Techfest Grand Hunt 2026')).toBeInTheDocument();
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      expect(screen.getByText('Cyber Wizards')).toBeInTheDocument();
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('Binary Beasts')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('Quantum Questers')).toBeInTheDocument();
      expect(screen.getByText('Round 4')).toBeInTheDocument();
    });
  });

  it('filters teams by search query', async () => {
    vi.mocked(huntApi.leaderboard).mockResolvedValueOnce(sampleLeaderboard);

    render(
      <MemoryRouter>
        <LeaderboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Cyber Wizards')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search teams/i);
    fireEvent.change(searchInput, { target: { value: 'Binary' } });

    expect(screen.getByText('Binary Beasts')).toBeInTheDocument();
    expect(screen.queryByText('Cyber Wizards')).not.toBeInTheDocument();
  });
});
