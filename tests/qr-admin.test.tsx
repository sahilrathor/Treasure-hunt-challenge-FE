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
