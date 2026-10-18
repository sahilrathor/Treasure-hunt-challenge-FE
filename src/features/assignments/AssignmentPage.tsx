import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  const [retryReady, setRetryReady] = useState(false);
  useEffect(() => {
    if (id)
      void huntApi
        .assignment(id)
        .then(setAssignment)
        .catch((cause: Error) => setError(cause.message));
  }, [id]);
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
      <Panel>
        <h1 className="text-2xl font-black">Game unavailable</h1>
        <p className="mt-2 text-slate-400">Unknown game code: {assignment.gameCode}</p>
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
        <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">
          Round {assignment.round} · {assignment.difficulty}
        </p>
        <h1 className="mt-2 text-4xl font-black">{assignment.gameName}</h1>
        <p className="mt-3 text-slate-400">Checkpoint: {assignment.checkpointLabel}</p>
        <p className="mt-1 text-slate-400">
          Attempts used: {assignment.attemptCount} / {assignment.maxAttempts}
        </p>
        {error ? (
          <p role="alert" className="mt-4 text-rose-300">
            {error}
          </p>
        ) : null}
        <Button
          className="mt-6 w-full"
          disabled={busy || assignment.status !== 'ASSIGNED'}
          onClick={() => void start()}
        >
          {busy ? 'Starting…' : 'Start official attempt'}
        </Button>
      </Panel>
    );
  return (
    <GameShell
      title={assignment.gameName}
      instructions={`Complete the ${assignment.difficulty} target. The server owns the official timer.`}
      startedAt={attempt.started_at}
    >
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
