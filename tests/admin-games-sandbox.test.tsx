import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { AdminGameSandboxModal } from '@/features/admin/AdminGameSandboxModal';

describe('AdminGameSandboxModal', () => {
  it('renders sandbox controls, game options, and difficulty targets', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <AdminGameSandboxModal
        isOpen={true}
        onClose={handleClose}
        initialGame="flappy-bird"
        initialDifficulty="easy"
      />,
    );

    expect(screen.getByText('Admin Game & Difficulty Sandbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /flappy bird/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /snake/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /brick breaker/i })).toBeInTheDocument();

    // Flappy bird easy config check
    expect(screen.getByText(/Target Config:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/pipes/i).length).toBeGreaterThan(0);

    // Switch to Snake
    await user.click(screen.getByRole('button', { name: /snake/i }));
    expect(screen.getByText(/Eat/i)).toBeInTheDocument();
    expect(screen.getAllByText(/food/i).length).toBeGreaterThan(0);

    // Switch difficulty to Hard
    await user.click(screen.getByRole('button', { name: /hard/i }));
    expect(screen.getAllByText(/15/).length).toBeGreaterThan(0);

    // Click close
    await user.click(screen.getByRole('button', { name: /close sandbox/i }));
    expect(handleClose).toHaveBeenCalledOnce();
  }, 15000);
});
