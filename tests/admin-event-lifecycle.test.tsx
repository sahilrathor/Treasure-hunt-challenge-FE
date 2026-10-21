import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminPage } from '@/features/admin/AdminPage';
import { api } from '@/services/api-client';

vi.mock('@/services/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const finishedSetup = {
  event: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'College Fest Hunt',
    slug: 'college-fest-hunt',
    status: 'FINISHED',
    checkpoint_count: 8,
  },
  teams: [],
  checkpoints: [],
};

describe('finished hunt actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.get).mockResolvedValue({ data: { data: finishedSetup } });
    vi.mocked(api.post).mockResolvedValue({ data: { data: {} } });
  });

  it('restarts the same hunt after destructive confirmation', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Restart Hunt' }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('permanently cleared'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/admin/events/11111111-1111-4111-8111-111111111111/control',
        { action: 'RESTART' },
      );
    });
  });

  it('creates a separate draft while preserving the finished hunt', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Start New Hunt' }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('results will be preserved'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/admin/events/11111111-1111-4111-8111-111111111111/new-hunt',
      );
    });
  });
});
