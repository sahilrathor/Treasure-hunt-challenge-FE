import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChangeAdminPasswordModal } from '@/features/admin/ChangeAdminPasswordModal';
import { huntApi } from '@/services/hunt-api';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    updateAdminCredentials: vi.fn(),
  },
}));

describe('admin credentials modal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the admin username and password together', async () => {
    vi.mocked(huntApi.updateAdminCredentials).mockResolvedValueOnce({
      updated: true,
      username: 'quest-admin',
    });
    const onUpdated = vi.fn();

    render(
      <ChangeAdminPasswordModal
        open
        currentUsername="admin@local.test"
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'quest-admin' },
    });
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), {
      target: { value: 'NewSecret123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update Credentials' }));

    await waitFor(() => {
      expect(huntApi.updateAdminCredentials).toHaveBeenCalledWith(
        'quest-admin',
        'NewSecret123!',
      );
    });
    expect(onUpdated).toHaveBeenCalledWith('quest-admin');
    expect(screen.getByText('Admin credentials updated!')).toBeInTheDocument();
  });
});
