import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ScanPage } from '@/features/checkpoints/ScanPage';
import { huntApi } from '@/services/hunt-api';
import { useAuthStore } from '@/stores/auth.store';
import type { Assignment, Identity } from '@/types/api';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    scan: vi.fn(),
  },
}));

const player: Identity = {
  sessionId: 'session-1',
  userId: 'player-1',
  role: 'PARTICIPANT',
  displayName: 'Player One',
  username: null,
  eventId: 'event-1',
  teamId: 'team-1',
  memberCode: 'P-001',
};

const assignment: Assignment = {
  id: 'assignment-1',
  status: 'ASSIGNED',
  gameCode: 'snake',
  gameName: 'Snake',
  difficulty: 'easy',
  challenge: {},
  maxAttempts: 3,
  attemptCount: 0,
  cooldownSeconds: 0,
  round: 1,
  checkpointLabel: 'Main Gate',
};

describe('ScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ identity: player, initialized: true, loading: false });
  });

  it('keeps an authenticated player session and scans a directly opened QR link', async () => {
    vi.mocked(huntApi.scan).mockResolvedValue(assignment);

    render(
      <MemoryRouter initialEntries={['/scan?token=checkpoint-token']}>
        <Routes>
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/assignments/:id" element={<p>Assignment opened</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(huntApi.scan).toHaveBeenCalledWith('checkpoint-token'));
    expect(useAuthStore.getState().identity).toEqual(player);
  });
});
