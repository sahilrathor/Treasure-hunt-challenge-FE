import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { AppLayout } from '@/components/layouts/AppLayout';
import { useAuthStore } from '@/stores/auth.store';

describe('Secret Reset Modal Trigger in Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      identity: {
        userId: 'admin-1',
        role: 'ADMIN',
        displayName: 'Admin User',
        username: 'admin',
        sessionId: 'session-1',
        memberCode: null,
        eventId: null,
        teamId: null,
      },
      initialized: true,
    });
  });

  it('opens admin console on triple click, types reset, and dispatches open-reset-hunt-modal event', async () => {
    const user = userEvent.setup();
    const eventSpy = vi.fn();
    window.addEventListener('open-reset-hunt-modal', eventSpy);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AppLayout />
      </MemoryRouter>,
    );

    const logo = screen.getByRole('link', { name: /qr quest/i });
    expect(logo).toBeInTheDocument();

    // Click 3 times rapidly
    await user.click(logo);
    await user.click(logo);
    await user.click(logo);

    // Secret prompt should appear
    expect(screen.getByText('Admin Console')).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/type command and enter/i);
    expect(input).toBeInTheDocument();

    // Type wrong command
    await user.type(input, 'hello{enter}');
    expect(screen.getByText(/unknown command/i)).toBeInTheDocument();
    expect(eventSpy).not.toHaveBeenCalled();

    // Type 'reset' and press Enter
    await user.clear(input);
    await user.type(input, 'reset{enter}');

    await waitFor(() => {
      expect(eventSpy).toHaveBeenCalledOnce();
      expect(screen.queryByText('Admin Console')).not.toBeInTheDocument();
    });

    window.removeEventListener('open-reset-hunt-modal', eventSpy);
  });
});
