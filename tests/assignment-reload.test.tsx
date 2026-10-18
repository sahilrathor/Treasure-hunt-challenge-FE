import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AssignmentPage } from '@/features/assignments/AssignmentPage';
import { huntApi } from '@/services/hunt-api';
import type { Assignment } from '@/types/api';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    assignment: vi.fn(),
    reloadAssignment: vi.fn(),
    startAttempt: vi.fn(),
    submitAttempt: vi.fn(),
  },
}));

describe('AssignmentPage reload round game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders unavailable game notice and reloads to the latest round game', async () => {
    const unavailableAssignment: Assignment = {
      id: 'assign-1',
      status: 'ASSIGNED',
      gameCode: 'chess-puzzle' as any,
      gameName: 'Chess Puzzle',
      difficulty: 'easy',
      challenge: {},
      maxAttempts: 5,
      attemptCount: 0,
      cooldownSeconds: 10,
      round: 1,
      checkpointLabel: 'Main Gate',
    };

    const reloadedAssignment: Assignment = {
      id: 'assign-1',
      status: 'ASSIGNED',
      gameCode: 'flappy-bird',
      gameName: 'Flappy Bird',
      difficulty: 'easy',
      challenge: { target: 3, gap: 135, speed: 2.2, challengeToken: 'token-123' },
      maxAttempts: 5,
      attemptCount: 0,
      cooldownSeconds: 10,
      round: 1,
      checkpointLabel: 'Main Gate',
    };

    vi.mocked(huntApi.assignment).mockResolvedValue(unavailableAssignment);
    vi.mocked(huntApi.reloadAssignment).mockResolvedValue(reloadedAssignment);

    render(
      <MemoryRouter initialEntries={['/assignments/assign-1']}>
        <Routes>
          <Route path="/assignments/:id" element={<AssignmentPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Should detect unavailable game and auto-reload or offer reload button
    await waitFor(() => {
      expect(huntApi.reloadAssignment).toHaveBeenCalledWith('assign-1');
    });

    // Once reloaded, Flappy Bird should be displayed
    await waitFor(() => {
      expect(screen.getByText('Flappy Bird')).toBeInTheDocument();
      expect(screen.getByText(/Round 1 · easy/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Start official attempt/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload latest game for this round/i })).toBeInTheDocument();
    });
  });

  it('allows manual reload of round game from the assignment preview', async () => {
    const user = userEvent.setup();

    const initialAssignment: Assignment = {
      id: 'assign-2',
      status: 'ASSIGNED',
      gameCode: 'snake',
      gameName: 'Snake',
      difficulty: 'medium',
      challenge: { target: 10, obstacles: 2, challengeToken: 'token-456' },
      maxAttempts: 5,
      attemptCount: 0,
      cooldownSeconds: 10,
      round: 2,
      checkpointLabel: 'Library Quad',
    };

    const newlyMappedAssignment: Assignment = {
      id: 'assign-2',
      status: 'ASSIGNED',
      gameCode: 'brick-breaker',
      gameName: 'Brick Breaker',
      difficulty: 'medium',
      challenge: { target: 14, lives: 4, challengeToken: 'token-789' },
      maxAttempts: 5,
      attemptCount: 0,
      cooldownSeconds: 10,
      round: 2,
      checkpointLabel: 'Library Quad',
    };

    vi.mocked(huntApi.assignment).mockResolvedValue(initialAssignment);
    vi.mocked(huntApi.reloadAssignment).mockResolvedValue(newlyMappedAssignment);

    render(
      <MemoryRouter initialEntries={['/assignments/assign-2']}>
        <Routes>
          <Route path="/assignments/:id" element={<AssignmentPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Snake')).toBeInTheDocument();
    });

    // Click "Reload latest game for this round"
    const reloadBtn = screen.getByRole('button', { name: /Reload latest game for this round/i });
    await user.click(reloadBtn);

    expect(huntApi.reloadAssignment).toHaveBeenCalledWith('assign-2');

    await waitFor(() => {
      expect(screen.getByText('Brick Breaker')).toBeInTheDocument();
    });
  });
});
