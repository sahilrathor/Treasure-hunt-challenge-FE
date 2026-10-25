import { useEffect, useState, useCallback } from 'react';
import { huntApi } from './hunt-api';

export interface OfflineSubmission {
  attemptId: string;
  assignmentId: string;
  result: unknown;
  clientDurationMs: number;
  completedAt: string;
  idempotencyKey: string;
  roundSequence?: number;
  gameName?: string;
  savedAt: number;
}

export interface SubmitOutcome {
  status: string;
  durationMs: number;
  metadata: Record<string, unknown>;
  clueUnlocked: boolean;
  retryAt?: string | null;
}

const STORAGE_KEY = 'hunt_pending_offline_submissions';
const SYNC_EVENT = 'hunt:offline-sync';

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  }
}

export function getPendingSubmissions(): OfflineSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineSubmission(submission: OfflineSubmission): void {
  if (typeof window === 'undefined') return;
  const current = getPendingSubmissions().filter((s) => s.attemptId !== submission.attemptId);
  current.push(submission);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  notifyChange();
}

export function removeOfflineSubmission(attemptId: string): void {
  if (typeof window === 'undefined') return;
  const current = getPendingSubmissions().filter((s) => s.attemptId !== attemptId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  notifyChange();
}

export function getOfflineSubmission(attemptId: string): OfflineSubmission | null {
  const all = getPendingSubmissions();
  return all.find((s) => s.attemptId === attemptId) ?? null;
}

export function getOfflineSubmissionForAssignment(assignmentId: string): OfflineSubmission | null {
  const all = getPendingSubmissions();
  return all.find((s) => s.assignmentId === assignmentId) ?? null;
}

export async function syncSubmission(submission: OfflineSubmission): Promise<SubmitOutcome> {
  const outcome = await huntApi.submitAttempt(submission.attemptId, submission.result, {
    clientDurationMs: submission.clientDurationMs,
    completedAt: submission.completedAt,
    idempotencyKey: submission.idempotencyKey,
  });
  removeOfflineSubmission(submission.attemptId);
  return outcome;
}

let isGlobalSyncing = false;

export async function syncAllPendingSubmissions(): Promise<{ synced: number; failed: number }> {
  if (isGlobalSyncing) return { synced: 0, failed: 0 };
  const pending = getPendingSubmissions();
  if (!pending.length) return { synced: 0, failed: 0 };

  isGlobalSyncing = true;
  let synced = 0;
  let failed = 0;

  try {
    for (const item of pending) {
      try {
        await syncSubmission(item);
        synced += 1;
      } catch (err) {
        failed += 1;
        // Keep in queue to retry next time
      }
    }
  } finally {
    isGlobalSyncing = false;
    notifyChange();
  }

  return { synced, failed };
}

// Set up automatic sync when network comes online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void syncAllPendingSubmissions();
  });
}

export function useOfflineQueue(assignmentId?: string, attemptId?: string) {
  const [pending, setPending] = useState<OfflineSubmission | null>(() => {
    if (attemptId) return getOfflineSubmission(attemptId);
    if (assignmentId) return getOfflineSubmissionForAssignment(assignmentId);
    return null;
  });
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  const refresh = useCallback(() => {
    if (attemptId) {
      setPending(getOfflineSubmission(attemptId));
    } else if (assignmentId) {
      setPending(getOfflineSubmissionForAssignment(assignmentId));
    } else {
      setPending(null);
    }
  }, [attemptId, assignmentId]);

  useEffect(() => {
    refresh();

    const handleSyncEvent = () => refresh();
    const handleOnline = () => {
      setIsOnline(true);
      refresh();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener(SYNC_EVENT, handleSyncEvent);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener(SYNC_EVENT, handleSyncEvent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh]);

  const syncNow = useCallback(async (): Promise<SubmitOutcome | null> => {
    const item = pending ?? (attemptId ? getOfflineSubmission(attemptId) : null);
    if (!item) return null;
    setSyncing(true);
    setSyncError('');
    try {
      const outcome = await syncSubmission(item);
      refresh();
      return outcome;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network sync failed. Please check connection.';
      setSyncError(msg);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [pending, attemptId, refresh]);

  return {
    pendingSubmission: pending,
    isOnline,
    isSyncing: syncing,
    syncError,
    syncNow,
    refresh,
  };
}
