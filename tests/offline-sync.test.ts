import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPendingSubmissions,
  saveOfflineSubmission,
  removeOfflineSubmission,
  syncSubmission,
  type OfflineSubmission,
} from '../src/services/offline-sync';
import { huntApi } from '../src/services/hunt-api';

vi.mock('../src/services/hunt-api', () => ({
  huntApi: {
    submitAttempt: vi.fn(),
  },
}));

describe('offline game completion synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const sampleSubmission: OfflineSubmission = {
    attemptId: 'att-123',
    assignmentId: 'asg-456',
    result: { moves: [1, 2, 3] },
    clientDurationMs: 14250,
    completedAt: '2026-10-25T11:30:00.000Z',
    idempotencyKey: 'idemp-789',
    roundSequence: 2,
    gameName: 'Wire Connect',
    savedAt: 1729855800000,
  };

  it('stores game completion with exact client duration in localStorage when offline', () => {
    expect(getPendingSubmissions()).toEqual([]);

    saveOfflineSubmission(sampleSubmission);

    const pending = getPendingSubmissions();
    expect(pending).toHaveLength(1);
    expect(pending[0].attemptId).toBe('att-123');
    expect(pending[0].clientDurationMs).toBe(14250);
    expect(pending[0].completedAt).toBe('2026-10-25T11:30:00.000Z');
  });

  it('removes offline submission from queue when requested', () => {
    saveOfflineSubmission(sampleSubmission);
    expect(getPendingSubmissions()).toHaveLength(1);

    removeOfflineSubmission('att-123');
    expect(getPendingSubmissions()).toHaveLength(0);
  });

  it('submits offline attempt to huntApi with exact clientDurationMs and clears queue on success', async () => {
    saveOfflineSubmission(sampleSubmission);

    vi.mocked(huntApi.submitAttempt).mockResolvedValueOnce({
      status: 'passed',
      durationMs: 14250,
      metadata: {},
      clueUnlocked: true,
    });

    const outcome = await syncSubmission(sampleSubmission);

    expect(outcome.status).toBe('passed');
    expect(outcome.durationMs).toBe(14250);
    expect(huntApi.submitAttempt).toHaveBeenCalledWith(
      'att-123',
      sampleSubmission.result,
      {
        clientDurationMs: 14250,
        completedAt: '2026-10-25T11:30:00.000Z',
        idempotencyKey: 'idemp-789',
      },
    );

    // Should be automatically removed from localStorage queue
    expect(getPendingSubmissions()).toHaveLength(0);
  });
});
