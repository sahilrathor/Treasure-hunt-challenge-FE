import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ResetHuntModal } from '@/features/admin/ResetHuntModal';
import { huntApi } from '@/services/hunt-api';
import { ApiError } from '@/services/api-client';

vi.mock('@/services/hunt-api', () => ({
  huntApi: {
    resetEventData: vi.fn(),
  },
}));

describe('ResetHuntModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all options and disables confirm button until exact phrase is typed', async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <ResetHuntModal
        isOpen={true}
        onClose={handleClose}
        eventId="event-123"
        onSuccess={handleSuccess}
      />,
    );

    expect(screen.getByText('Secure Data Reset')).toBeInTheDocument();
    expect(screen.getByText('Everything (Full Hunt Reset)')).toBeInTheDocument();
    expect(screen.getByText('Teams & Participants Only')).toBeInTheDocument();
    expect(screen.getByText('Competition Rounds Only')).toBeInTheDocument();
    expect(screen.getByText('Physical Locations & QRs Only')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /confirm reset/i });
    expect(confirmBtn).toBeDisabled();

    // Type incorrect phrase
    const input = screen.getByPlaceholderText('Enter "RESET ALL"');
    await user.type(input, 'reset');
    expect(confirmBtn).toBeDisabled();

    // Type correct phrase
    await user.clear(input);
    await user.type(input, 'RESET ALL');
    expect(confirmBtn).toBeEnabled();

    // Mock API success
    vi.mocked(huntApi.resetEventData).mockResolvedValueOnce({
      eventId: 'event-123',
      target: 'all',
      deleted: true,
      message: 'The entire hunt has been reset.',
    });

    await user.click(confirmBtn);

    await waitFor(() => {
      expect(huntApi.resetEventData).toHaveBeenCalledWith('event-123', {
        target: 'all',
        confirmationText: 'RESET ALL',
      });
      expect(handleSuccess).toHaveBeenCalledWith('The entire hunt has been reset.');
      expect(handleClose).toHaveBeenCalledOnce();
    });
  });

  it('switches targets and updates the required confirmation phrase', async () => {
    const user = userEvent.setup();
    render(
      <ResetHuntModal
        isOpen={true}
        onClose={vi.fn()}
        eventId="event-123"
        onSuccess={vi.fn()}
      />,
    );

    // Switch to Teams Only
    const teamsOption = screen.getByText('Teams & Participants Only');
    await user.click(teamsOption);

    const input = screen.getByPlaceholderText('Enter "RESET TEAMS"');
    expect(input).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /confirm reset \(teams & participants only\)/i });
    expect(confirmBtn).toBeDisabled();

    await user.type(input, 'RESET TEAMS');
    expect(confirmBtn).toBeEnabled();
  });

  it('displays error if reset fails', async () => {
    const user = userEvent.setup();
    vi.mocked(huntApi.resetEventData).mockRejectedValueOnce(
      new ApiError(400, 'INVALID_CONFIRMATION', 'Type the exact confirmation phrase'),
    );

    render(
      <ResetHuntModal
        isOpen={true}
        onClose={vi.fn()}
        eventId="event-123"
        onSuccess={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Enter "RESET ALL"');
    await user.type(input, 'RESET ALL');

    const confirmBtn = screen.getByRole('button', { name: /confirm reset/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('Type the exact confirmation phrase')).toBeInTheDocument();
    });
  });
});
