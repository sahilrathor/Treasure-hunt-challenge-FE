import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, RotateCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Panel } from '@/components/atoms/Panel';
import { ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';
import {
  saveOfflineSubmission,
  removeOfflineSubmission,
  useOfflineQueue,
} from '@/services/offline-sync';
import type { Assignment } from '@/types/api';
import { cn } from '@/lib/utils';
import { gameRegistry, getGameInfo } from '../games/game-registry';
import { GameShell } from '../games/shared/GameShell';
import { CooldownCountdown } from '../games/shared/CooldownCountdown';

export function AssignmentPage() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [attempt, setAttempt] = useState<{ id: string; started_at: string } | null>(null);
  const [outcome, setOutcome] = useState<{
    status: string;
    durationMs: number;
    clueUnlocked: boolean;
    retryAt?: string | null;
  } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [retryReady, setRetryReady] = useState(false);

  const { pendingSubmission, isOnline, isSyncing, syncError, syncNow } = useOfflineQueue(
    assignment?.id,
    attempt?.id,
  );

  // If a pending submission is ready and connection comes online, auto-sync and record with server
  useEffect(() => {
    if (pendingSubmission && isOnline && !isSyncing && !busy && !outcome) {
      void syncNow()
        .then((res) => {
          if (res) {
            setOutcome(res);
            setAttempt(null);
          }
        })
        .catch(() => {
          // Kept safely in local storage for retry
        });
    }
  }, [pendingSubmission, isOnline, isSyncing, busy, outcome, syncNow]);

  useEffect(() => {
    if (id)
      void huntApi
        .assignment(id)
        .then((data) => {
          setAssignment(data);
          if (data.activeAttempt) {
            setAttempt(data.activeAttempt);
          }
        })
        .catch((cause: Error) => setError(cause.message));
  }, [id]);

  async function reloadGame() {
    if (!assignment) return;
    setReloading(true);
    setError('');
    try {
      const refreshed = await huntApi.reloadAssignment(assignment.id);
      setAssignment(refreshed);
      setAttempt(refreshed.activeAttempt ?? null);
      setOutcome(null);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not reload latest game for this round.',
      );
    } finally {
      setReloading(false);
    }
  }

  // Auto-heal if the assigned game is not available in registry
  useEffect(() => {
    if (assignment && !gameRegistry[assignment.gameCode] && !reloading) {
      void reloadGame();
    }
  }, [assignment?.gameCode]);

  async function start() {
    if (!assignment) return;
    setBusy(true);
    setError('');
    try {
      setAttempt(await huntApi.startAttempt(assignment.id));
      setOutcome(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not start attempt.');
    } finally {
      setBusy(false);
    }
  }

  async function complete(result: unknown) {
    if (!attempt || !assignment) return;
    const completedAt = new Date().toISOString();
    const clientDurationMs = Math.max(0, Date.now() - new Date(attempt.started_at).getTime());
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Store in localStorage immediately so duration & round completion are never lost even if offline
    saveOfflineSubmission({
      attemptId: attempt.id,
      assignmentId: assignment.id,
      result,
      clientDurationMs,
      completedAt,
      idempotencyKey,
      roundSequence: assignment.round,
      gameName: assignment.gameName,
      savedAt: Date.now(),
    });

    // If currently offline, skip network attempt and display offline pending sync card
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setAttempt(null);
      return;
    }

    setBusy(true);
    setError('');
    try {
      const res = await huntApi.submitAttempt(attempt.id, result, {
        clientDurationMs,
        completedAt,
        idempotencyKey,
      });
      removeOfflineSubmission(attempt.id);
      setOutcome(res);
      setAttempt(null);
    } catch (cause) {
      const isNetworkErr =
        !navigator.onLine ||
        (cause instanceof Error &&
          (cause.message.toLowerCase().includes('network') ||
            cause.message.toLowerCase().includes('fetch') ||
            cause.message.toLowerCase().includes('offline')));

      if (isNetworkErr) {
        // Kept in localStorage; user will see the offline pending card and auto-sync on reconnect
        setAttempt(null);
      } else {
        removeOfflineSubmission(attempt.id);
        setError(cause instanceof ApiError ? cause.message : 'Result was rejected.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (error && !assignment)
    return (
      <Panel>
        <p role="alert" className="text-rose-300">
          {error}
        </p>
      </Panel>
    );

  if (!assignment)
    return (
      <Panel>
        <p className="animate-pulse">Restoring assignment…</p>
      </Panel>
    );

  const Game = gameRegistry[assignment.gameCode];
  if (!Game)
    return (
      <Panel className="border-amber-500/30">
        <div className="flex items-center gap-3 text-amber-400">
          <AlertTriangle size={28} />
          <h1 className="text-2xl font-black">Game Unavailable / Updated</h1>
        </div>
        <p className="mt-3 text-slate-300">
          The assigned game{' '}
          <span className="font-mono text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded text-sm">
            {assignment.gameCode}
          </span>{' '}
          is no longer available or was updated by event organizers for Round {assignment.round}.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Click below to load the latest valid game configured for this round.
        </p>
        {error ? (
          <p role="alert" className="mt-4 text-rose-300">
            {error}
          </p>
        ) : null}
        <Button
          className="mt-6 w-full"
          disabled={reloading || busy}
          onClick={() => void reloadGame()}
        >
          <RotateCw className={`mr-2 ${reloading ? 'animate-spin' : ''}`} size={18} />
          {reloading ? 'Reloading latest game…' : `Reload latest game for Round ${assignment.round}`}
        </Button>
      </Panel>
    );

  if (pendingSubmission && !outcome)
    return (
      <Panel className="border-cyan-500/40 bg-slate-900/90 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
            <WifiOff size={14} /> Offline Mode · Saved Locally
          </span>
          <span className="font-mono text-xs text-slate-400">
            Round {assignment.round} · {assignment.gameName}
          </span>
        </div>

        <h1 className="mt-4 text-3xl sm:text-4xl font-black text-slate-100">
          Round Completed!
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Your game completion time has been securely saved in your browser storage. It will be recorded with the server automatically as soon as internet connection is restored.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recorded Game Time
            </span>
            <span className="font-mono text-2xl font-black text-cyan-300">
              {(pendingSubmission.clientDurationMs / 1000).toFixed(1)}s
            </span>
          </div>
          <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Completed at</span>
            <span className="font-mono text-slate-300">
              {new Date(pendingSubmission.completedAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Exact game duration is locked in and will not be inflated by time spent offline.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs">
          {isOnline ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <Wifi size={14} /> Back online! Syncing result with server…
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-medium text-amber-300">
              <WifiOff size={14} /> Waiting for internet connection to record time…
            </span>
          )}
        </div>

        {syncError ? (
          <p role="alert" className="mt-3 text-xs text-rose-300">
            {syncError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            className="flex-1"
            disabled={isSyncing}
            onClick={async () => {
              try {
                const res = await syncNow();
                if (res) {
                  setOutcome(res);
                  setAttempt(null);
                }
              } catch {
                // error captured in syncError
              }
            }}
          >
            <RotateCw className={cn('mr-2', isSyncing && 'animate-spin')} size={16} />
            {isSyncing ? 'Recording time with server…' : 'Sync & Record Now'}
          </Button>
        </div>
      </Panel>
    );

  if (outcome)
    return (
      <Panel
        className={outcome.status === 'passed' ? 'border-emerald-400/30' : 'border-amber-400/30'}
      >
        <p className="text-xs font-black uppercase tracking-[.2em] text-slate-400">
          Server accepted result
        </p>
        <h1 className="mt-3 text-4xl font-black">
          {outcome.status === 'passed'
            ? 'Challenge cleared!'
            : outcome.status === 'expired'
              ? 'Time expired'
              : 'Try again'}
        </h1>
        <p className="mt-3 text-slate-400">
          Official time: {(outcome.durationMs / 1000).toFixed(1)} seconds
        </p>
        {outcome.status === 'passed' ? (
          <Button asChild className="mt-6">
            <Link to={outcome.clueUnlocked ? '/clue' : '/'}>
              {outcome.clueUnlocked ? 'Reveal next clue' : 'View result'}
            </Link>
          </Button>
        ) : (
          <>
            {outcome.retryAt ? (
              <CooldownCountdown retryAt={outcome.retryAt} onReady={() => setRetryReady(true)} />
            ) : null}
            <Button
              className="mt-6"
              disabled={!retryReady && Boolean(outcome.retryAt)}
              onClick={() => void start()}
            >
              Retry challenge
            </Button>
          </>
        )}
      </Panel>
    );

  const gameInfo = getGameInfo(assignment.gameCode);

  if (!attempt)
    return (
      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">
              Round {assignment.round} · {assignment.difficulty}
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="text-3xl">{gameInfo.emoji}</span>
              <h1 className="text-3xl sm:text-4xl font-black">{assignment.gameName}</h1>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="text-xs shrink-0"
            aria-label="Reload latest game for this round"
            disabled={reloading || busy}
            title="Reload latest game mapped by admin for this round"
            onClick={() => void reloadGame()}
          >
            <RotateCw className={`mr-1.5 ${reloading ? 'animate-spin' : ''}`} size={14} />
            {reloading ? 'Reloading…' : 'Reload game'}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
          <p>Checkpoint: <span className="text-slate-200 font-semibold">{assignment.checkpointLabel}</span></p>
          <span>·</span>
          <p>
            Attempts used: <span className="text-cyan-300 font-bold">{assignment.attemptCount}</span> / {assignment.maxAttempts}
          </p>
        </div>

        {/* Game Description & Rules Card */}
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3.5">
          <div>
            <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">{gameInfo.tagline}</p>
            <p className="mt-1 text-sm text-slate-300 leading-relaxed">
              {assignment.gameDescription || gameInfo.description}
            </p>
          </div>

          <div className="border-t border-slate-800/80 pt-3 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">How to Play:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 leading-relaxed">
              {gameInfo.howToPlay.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="border-t border-slate-800/80 pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            <div>
              <span className="text-slate-500 font-semibold">Controls: </span>
              <span className="text-slate-200 font-medium">{gameInfo.controls}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold">Round Goal: </span>
              <span className="text-amber-300 font-bold">{gameInfo.objective}</span>
            </div>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-rose-300">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            className="w-full text-base py-3"
            disabled={busy || reloading || assignment.status !== 'ASSIGNED'}
            onClick={() => void start()}
          >
            {busy ? 'Starting…' : 'Start official attempt'}
          </Button>
        </div>
      </Panel>
    );

  return (
    <GameShell
      title={assignment.gameName}
      instructions={`${assignment.gameDescription || gameInfo.description} | Goal: ${gameInfo.objective} | Controls: ${gameInfo.controls}`}
      startedAt={attempt.started_at}
    >
      <div className="mb-2 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          className="text-[11px] py-1 h-7 text-slate-400 hover:text-slate-200"
          disabled={reloading || busy}
          onClick={() => void reloadGame()}
        >
          <RotateCw className={`mr-1.5 ${reloading ? 'animate-spin' : ''}`} size={12} />
          {reloading ? 'Reloading…' : 'Reload round game'}
        </Button>
      </div>
      <Game
        challenge={assignment.challenge}
        disabled={busy}
        onComplete={(result) => void complete(result)}
      />
      {error ? (
        <p role="alert" className="mt-4 text-rose-300">
          {error}
        </p>
      ) : null}
    </GameShell>
  );
}
