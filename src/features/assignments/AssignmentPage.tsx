import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Panel } from '@/components/atoms/Panel';
import { ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';
import type { Assignment } from '@/types/api';
import { gameRegistry } from '../games/game-registry';
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
    if (!attempt) return;
    setBusy(true);
    try {
      setOutcome(await huntApi.submitAttempt(attempt.id, result));
      setAttempt(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Result was rejected.');
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

  if (!attempt)
    return (
      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">
              Round {assignment.round} · {assignment.difficulty}
            </p>
            <h1 className="mt-2 text-4xl font-black">{assignment.gameName}</h1>
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
        <p className="mt-3 text-slate-400">Checkpoint: {assignment.checkpointLabel}</p>
        <p className="mt-1 text-slate-400">
          Attempts used: {assignment.attemptCount} / {assignment.maxAttempts}
        </p>
        {error ? (
          <p role="alert" className="mt-4 text-rose-300">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            className="w-full"
            disabled={busy || reloading || assignment.status !== 'ASSIGNED'}
            onClick={() => void start()}
          >
            {busy ? 'Starting…' : 'Start official attempt'}
          </Button>
          {/* <Button
            type="button"
            variant="secondary"
            className="w-full text-xs"
            disabled={reloading || busy}
            onClick={() => void reloadGame()}
          >
            <RotateCw className={`mr-1.5 ${reloading ? 'animate-spin' : ''}`} size={14} />
            {reloading ? 'Reloading latest game…' : 'Reload latest game for this round'}
          </Button> */}
        </div>
      </Panel>
    );

  return (
    <GameShell
      title={assignment.gameName}
      instructions={`Complete the ${assignment.difficulty} target. The server owns the official timer.`}
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
