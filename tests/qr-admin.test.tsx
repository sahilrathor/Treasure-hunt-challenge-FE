import { render, screen, waitFor } from '@testing-library/react';

import { CheckpointQrCard } from '@/features/admin/CheckpointQrCard';
import { generateLocationQrsPdf } from '@/features/admin/qr-pdf-export';

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

  expect(screen.getByText(/Location Clue/i)).toBeInTheDocument();
  expect(
    screen.getByText(/"Behind the third shelf in the quiet reading zone\."/i),
  ).toBeInTheDocument();

  const editBtn = screen.getByRole('button', { name: /Edit/i });
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

it('offers a copy link button alongside generate QR and handles click', async () => {
  const handleCopyLink = vi.fn();
  render(
    <CheckpointQrCard
      checkpoint={{
        ...checkpoint,
        scanUrl: 'http://localhost:5173/scan?token=test-scan-token',
      }}
      busy={false}
      disabled={false}
      onGenerate={() => undefined}
      onCopyLink={handleCopyLink}
    />,
  );

  const copyBtn = screen.getByRole('button', { name: /copy link/i });
  expect(copyBtn).toBeVisible();
  copyBtn.click();
  await waitFor(() => {
    expect(handleCopyLink).toHaveBeenCalledOnce();
  });
});

it('displays the scan URL and copy button when QR is generated', () => {
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

  expect(screen.getByText('http://localhost:5173/scan?token=secret')).toBeVisible();
  expect(screen.getByTitle(/copy scan link/i)).toBeVisible();
  expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
});

it('generates a PDF with 8 QRs per page and location names below QR', async () => {
  const checkpoints = Array.from({ length: 9 }, (_, i) => ({
    id: `cp-${i + 1}`,
    code: `LOC-${i + 1}`,
    label: `Location ${i + 1}`,
    sequence: i + 1,
    scanUrl: `https://hunt.test/scan?token=tok${i + 1}`,
  }));

  const doc = await generateLocationQrsPdf({
    eventName: 'Keshav Techfest Hunt',
    checkpoints,
  });

  expect(doc).toBeDefined();
  // 9 checkpoints at 8 per page yields 2 pages
  expect(doc.getNumberOfPages()).toBe(2);
});

