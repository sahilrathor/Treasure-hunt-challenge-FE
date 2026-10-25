import { Clock3, MapPin, Play, QrCode, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { Panel } from '@/components/atoms/Panel';
import { ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';
import { useAuthStore } from '@/stores/auth.store';
import type { Progress } from '@/types/api';

export function DashboardPage() {
  const identity = useAuthStore((state) => state.identity)!;
  const [progress, setProgress] = useState<Progress | null>(null);
  const [team, setTeam] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [nextTeam, nextProgress] = await Promise.all([huntApi.team(), huntApi.progress()]);
      setTeam(nextTeam);
      setProgress(nextProgress);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not load progress.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function start() {
    if (!identity.eventId) return;
    setBusy(true);
    try {
      await huntApi.startHunt(identity.eventId);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not start.');
    } finally {
      setBusy(false);
    }
  }
  if (!progress || !team)
    return (
      <Panel>
        <p className="animate-pulse">{error || 'Syncing team progress…'}</p>
      </Panel>
    );
  const totalRounds = progress.total_rounds ?? 8;
  const completed =
    progress.status === 'COMPLETED'
      ? totalRounds
      : Math.min(Math.max(0, progress.current_sequence - 1), totalRounds);
  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan-300">
          Team {String(team.code)}
        </p>
        <h1 className="mt-2 text-4xl font-black">
          {progress.status === 'COMPLETED' ? 'Quest complete!' : 'Ready for the next checkpoint?'}
        </h1>
      </div>
      {error ? (
        <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-rose-300">
          {error}
        </p>
      ) : null}
      <Panel>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-400">Route progress</p>
            <p className="mt-1 text-3xl font-black">
              {completed}
              <span className="text-slate-600"> / {totalRounds}</span>
            </p>
          </div>
          <MapPin className="text-cyan-300" />
        </div>
        <div
          className="mt-5 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${totalRounds}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: totalRounds }, (_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full ${index < completed ? 'bg-cyan-300' : index === completed && progress.status === 'IN_PROGRESS' ? 'bg-amber-300' : 'bg-slate-800'}`}
            />
          ))}
        </div>
      </Panel>
      {progress.status === 'NOT_STARTED' ? (
        <Panel className="border-cyan-400/30">
          <Play className="text-cyan-300" />
          <h2 className="mt-4 text-2xl font-black">Start the official clock</h2>
          <p className="mt-2 text-slate-400">
            Travel, clues, retries, and cooldowns count once you begin.
          </p>
          <Button className="mt-5 w-full" disabled={busy} onClick={() => void start()}>
            {busy ? 'Starting…' : 'Start hunt'}
          </Button>
        </Panel>
      ) : null}
      {progress.status === 'IN_PROGRESS' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel>
            <Sparkles className="text-amber-300" />
            <h2 className="mt-4 text-xl font-black">Round {progress.current_sequence}</h2>
            <Button asChild className="mt-4 w-full">
              <Link to="/clue">View current clue</Link>
            </Button>
          </Panel>
          <Panel>
            <QrCode className="text-cyan-300" />
            <h2 className="mt-4 text-xl font-black">Scan checkpoint QR</h2>
            <Button asChild variant="secondary" className="mt-4 w-full">
              <Link to="/scan">How to scan</Link>
            </Button>
          </Panel>
        </div>
      ) : null}
      {progress.assignment_id && progress.assignment_status === 'ASSIGNED' ? (
        <Panel className="border-amber-400/30">
          <Clock3 className="text-amber-300" />
          <h2 className="mt-3 text-xl font-black">{progress.game_name} is waiting</h2>
          <p className="mt-1 text-sm text-slate-400">
            Attempt {Number(progress.attempt_count) + 1} of {progress.max_attempts}
          </p>
          <Button asChild className="mt-4">
            <Link to={`/assignments/${progress.assignment_id}`}>Resume assignment</Link>
          </Button>
        </Panel>
      ) : null}
    </div>
  );
}
