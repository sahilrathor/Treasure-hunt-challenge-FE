import { render, screen } from '@testing-library/react';

import { CheckpointQrCard } from '@/features/admin/CheckpointQrCard';

const checkpoint = { id: 'checkpoint-1', label: 'Library', sequence: 1 };

it('offers QR generation for a checkpoint', () => {
  render(
    <CheckpointQrCard
      checkpoint={checkpoint}
      busy={false}
      disabled={false}
      onGenerate={() => undefined}
    />,
  );
  expect(screen.getByRole('button', { name: 'Generate QR' })).toBeVisible();
});

it('shows and downloads a generated checkpoint QR', () => {
  render(
    <CheckpointQrCard
      checkpoint={checkpoint}
      generated={{
        ...checkpoint,
        scanUrl: 'http://localhost:5173/scan?token=secret',
        imageUrl: 'data:image/png;base64,qr-image',
      }}
      busy={false}
      disabled={false}
      onGenerate={() => undefined}
    />,
  );
  expect(screen.getByRole('img', { name: 'QR code for Library' })).toBeVisible();
  expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute(
    'download',
    'checkpoint-1-qr.png',
  );
});

it('displays the assigned clue and fires onEditClue when clicked', () => {
  const handleEditClue = vi.fn();
  render(
    <CheckpointQrCard
      checkpoint={{
        ...checkpoint,
        clue: 'Behind the third shelf in the quiet reading zone.',
      }}
      busy={false}
      disabled={false}
      onGenerate={() => undefined}
      onEditClue={handleEditClue}
    />,
  );

  expect(screen.getByText(/Round 1 Clue/i)).toBeInTheDocument();
  expect(
    screen.getByText(/"Behind the third shelf in the quiet reading zone\."/i),
  ).toBeInTheDocument();

  const editBtn = screen.getByRole('button', { name: /Edit Clue/i });
  editBtn.click();
  expect(handleEditClue).toHaveBeenCalledOnce();
});

it('displays the difficulty badge and fires onEditDifficulty when clicked', () => {
  const handleEditDifficulty = vi.fn();
  render(
    <CheckpointQrCard
      checkpoint={{
        ...checkpoint,
        difficulty: 'medium',
      }}
      busy={false}
      disabled={false}
      onGenerate={() => undefined}
      onEditDifficulty={handleEditDifficulty}
    />,
  );

  expect(screen.getByText('medium')).toBeInTheDocument();
  const editDiffBtn = screen.getByRole('button', { name: /change difficulty for library/i });
  editDiffBtn.click();
  expect(handleEditDifficulty).toHaveBeenCalledOnce();
});

