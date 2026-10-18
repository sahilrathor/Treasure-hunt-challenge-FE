import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { ChangePasswordModal } from '@/features/admin/ChangePasswordModal';
import { huntApi } from '@/services/hunt-api';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    resetParticipantPassword: vi.fn(),
  },
}));

describe('ChangePasswordModal', () => {
  const member = {
    id: 'user-123',
    displayName: 'Rahul Sharma',
    memberCode: 'TEAM-01-A',
    teamName: 'Byte Busters',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders participant details and actions', () => {
    render(<ChangePasswordModal member={member} onClose={vi.fn()} />);

    expect(screen.getByText('Change User Password')).toBeInTheDocument();
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('TEAM-01-A')).toBeInTheDocument();
    expect(screen.getByText('Byte Busters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('generates a random password and displays it', async () => {
    vi.mocked(huntApi.resetParticipantPassword).mockResolvedValueOnce({
      id: 'user-123',
      memberCode: 'TEAM-01-A',
      displayName: 'Rahul Sharma',
      password: 'Hunt-987654!',
    });

    render(<ChangePasswordModal member={member} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText('Hunt-987654!')).toBeInTheDocument();
      expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument();
    });

    expect(huntApi.resetParticipantPassword).toHaveBeenCalledWith('user-123');
  });

  it('submits a custom password', async () => {
    vi.mocked(huntApi.resetParticipantPassword).mockResolvedValueOnce({
      id: 'user-123',
      memberCode: 'TEAM-01-A',
      displayName: 'Rahul Sharma',
      password: 'SecretPass123!',
    });

    render(<ChangePasswordModal member={member} onClose={vi.fn()} />);

    const input = screen.getByLabelText(/custom password/i);
    fireEvent.change(input, { target: { value: 'SecretPass123!' } });

    fireEvent.click(screen.getByRole('button', { name: /save password/i }));

    await waitFor(() => {
      expect(screen.getByText('SecretPass123!')).toBeInTheDocument();
    });

    expect(huntApi.resetParticipantPassword).toHaveBeenCalledWith('user-123', 'SecretPass123!');
  });
});
