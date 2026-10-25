import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  Gamepad2,
  Hourglass,
  RotateCcw,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { huntApi } from '@/services/hunt-api';
import { cn } from '@/lib/utils';

interface Attempt {
  id: string;
  attempt_number: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  member_code: string;
  display_name: string;
}

interface RoundInfo {
  round: number;
  checkpoint_label: string;
  game_name: string | null;
  game_code: string | null;
  assignment_id: string | null;
  assignment_status: string | null;
  passed_at: string | null;
  attempts: Attempt[];
}

interface TeamData {
  id: string;
  code: string;
  name: string;
  status: string;
  current_sequence: number;
  started_at: string | null;
  completed_at: string | null;
}

interface Props {
  teamId: string | null;
  onClose(): void;
}

function formatDuration(ms: number | null) {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function TeamRoundsModal({ teamId, onClose }: Props) {
  const [data, setData] = useState<{ team: TeamData; rounds: RoundInfo[] } | null>(null);
  const [viewMode, setViewMode] = useState<'rounds' | 'players'>('rounds');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resetting, setResetting] = useState<string | null>(null);

  const loadTeam = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      setData(await huntApi.teamRounds(id));
    } catch {
      setError('Could not load round details for this team.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!teamId) {
      setData(null);
      return;
    }
    setNotice('');
    void loadTeam(teamId);
  }, [teamId, loadTeam]);

  const playerStats = useMemo(() => {
    if (!data?.rounds) return [];
    const map = new Map<
      string,
      {
        displayName: string;
        memberCode: string;
        totalDurationMs: number;
        clearedCount: number;
        attemptCount: number;
        rounds: Array<{
          round: number;
          gameName: string;
          checkpointLabel: string;
          status: string;
          durationMs: number | null;
          attemptNumber: number;
        }>;
      }
    >();

    for (const r of data.rounds) {
      for (const att of r.attempts) {
        let entry = map.get(att.member_code);
        if (!entry) {
          entry = {
            displayName: att.display_name,
            memberCode: att.member_code,
            totalDurationMs: 0,
            clearedCount: 0,
            attemptCount: 0,
            rounds: [],
          };
          map.set(att.member_code, entry);
        }
        entry.attemptCount += 1;
        if (att.duration_ms) {
          entry.totalDurationMs += att.duration_ms;
        }
        if (att.status === 'passed') {
          entry.clearedCount += 1;
        }
        entry.rounds.push({
          round: r.round,
          gameName: r.game_name || 'Mini Game',
          checkpointLabel: r.checkpoint_label,
          status: att.status,
          durationMs: att.duration_ms,
          attemptNumber: att.attempt_number,
        });
      }
    }
    return Array.from(map.values());
  }, [data?.rounds]);

  async function resetAttempts(assignmentId: string) {
    if (!teamId) return;
    if (!window.confirm('Reset all attempts for this active round?')) return;
    setResetting(assignmentId);
    setError('');
    setNotice('');
    try {
      const result = await huntApi.resetAssignmentAttempts(assignmentId);
      setNotice(
        result.resetCount
          ? `${result.resetCount} attempt${result.resetCount === 1 ? '' : 's'} reset. The team can retry now.`
          : 'Attempts are already reset. The team can retry now.',
      );
      await loadTeam(teamId);
    } catch {
      setError('Could not reset attempts for this round.');
    } finally {
      setResetting(null);
    }
  }

  if (!teamId) return null;

  const totalAttempts =
    data?.rounds.reduce((sum, r) => sum + (r.attempts?.length ?? 0), 0) ?? 0;
  const passedRounds =
    data?.rounds.filter((r) => r.assignment_status === 'PASSED').length ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-rounds-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 rounded-xl border border-slate-700/60 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30">
            <Gamepad2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="team-rounds-title" className="text-xl font-black text-slate-100">
                {data?.team ? data.team.name : 'Team Rounds'}
              </h2>
              {data?.team ? (
                <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300">
                  {data.team.code}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-400">
              Round-by-round breakdown of mini-games played, members, and timings.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
            {notice}
          </div>
        ) : null}

        {loading ? (
          <div className="my-16 text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-slate-400">Loading round records…</p>
          </div>
        ) : data ? (
          <>
            {/* Summary Bar */}
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-center text-xs">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Status
                </p>
                <p className="mt-0.5 font-black text-cyan-300">{data.team.status}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Rounds Cleared
                </p>
                <p className="mt-0.5 font-black text-emerald-400">
                  {passedRounds} / {data.rounds.length}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Attempts
                </p>
                <p className="mt-0.5 font-black text-amber-300">{totalAttempts}</p>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('rounds')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition',
                    viewMode === 'rounds'
                      ? 'bg-cyan-400 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  <Gamepad2 size={13} />
                  By Round ({data.rounds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('players')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition',
                    viewMode === 'players'
                      ? 'bg-cyan-400 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  <Users size={13} />
                  By Player ({playerStats.length})
                </button>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                {viewMode === 'rounds'
                  ? 'Sequential round progression and attempts'
                  : 'Individual member game timings per round'}
              </span>
            </div>

            {viewMode === 'players' ? (
              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {playerStats.length > 0 ? (
                  playerStats.map((player) => (
                    <div
                      key={player.memberCode}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-9 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20">
                            <User size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-100">{player.displayName}</p>
                              <span className="font-mono text-xs font-bold text-cyan-300">
                                {player.memberCode}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              Cleared {player.clearedCount} round{player.clearedCount === 1 ? '' : 's'} · {player.attemptCount} attempt{player.attemptCount === 1 ? '' : 's'} played
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs">
                          <Clock size={14} className="text-cyan-400" />
                          <span className="text-slate-400 font-medium">Total Game Time:</span>
                          <strong className="font-mono text-cyan-300 font-bold">
                            {formatDuration(player.totalDurationMs)}
                          </strong>
                        </div>
                      </div>

                      {/* Rounds breakdown for this player */}
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Rounds Played ({player.rounds.length})
                        </p>
                        <div className="grid gap-1.5">
                          {player.rounds.map((pr, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 text-xs border border-slate-800/60"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-cyan-300 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                                  R{pr.round}
                                </span>
                                <span className="font-semibold text-slate-200">
                                  {pr.gameName}
                                </span>
                                <span className="text-slate-500 hidden sm:inline">
                                  ({pr.checkpointLabel})
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  att #{pr.attemptNumber}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 font-mono text-slate-300 font-semibold">
                                  <Clock size={12} className="text-slate-500" />
                                  <span>{formatDuration(pr.durationMs)}</span>
                                </div>
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 font-bold uppercase text-[11px]',
                                    pr.status === 'passed' && 'text-emerald-400',
                                    pr.status === 'failed' && 'text-rose-400',
                                    pr.status === 'in_progress' && 'text-amber-400',
                                  )}
                                >
                                  {pr.status === 'passed' ? (
                                    <CheckCircle2 size={12} />
                                  ) : (
                                    <XCircle size={12} />
                                  )}
                                  {pr.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-xs italic text-slate-500">
                    No attempts recorded yet for any player on this team.
                  </p>
                )}
              </div>
            ) : (
              /* Rounds List Scrollable */
              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {data.rounds.map((round) => {
                  const passedAttempt = round.attempts.find((a) => a.status === 'passed');
                  const isPassed = round.assignment_status === 'PASSED';
                  const isAssigned = round.assignment_status === 'ASSIGNED';

                  return (
                    <div
                      key={round.round}
                      className={cn(
                        'rounded-2xl border p-4 transition',
                        isPassed && 'border-emerald-500/30 bg-emerald-950/10',
                        isAssigned && 'border-cyan-500/30 bg-cyan-950/10',
                        !isPassed && !isAssigned && 'border-slate-800/80 bg-slate-950/40 opacity-70',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid size-7 place-items-center rounded-lg bg-slate-800 font-mono text-xs font-black text-slate-200">
                            R{round.round}
                          </span>
                          <div>
                            <p className="font-black text-slate-100">{round.checkpoint_label}</p>
                            <p className="text-xs text-slate-400">
                              {round.game_name ? `Game: ${round.game_name}` : 'Not yet unlocked'}
                            </p>
                          </div>
                        </div>

                        <div>
                          {isPassed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                              <CheckCircle2 size={13} /> Cleared
                            </span>
                          ) : isAssigned ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-bold text-cyan-300">
                              <Hourglass size={13} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                              Locked
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Winning player highlight */}
                      {passedAttempt ? (
                        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-200">
                          <Award size={14} className="text-amber-300 shrink-0" />
                          <span>
                            Cleared by <strong className="font-bold">{passedAttempt.display_name}</strong> (
                            <span className="font-mono text-cyan-300">{passedAttempt.member_code}</span>) in{' '}
                            <strong className="font-mono">{formatDuration(passedAttempt.duration_ms)}</strong> on attempt{' '}
                            {passedAttempt.attempt_number}
                          </span>
                        </div>
                      ) : null}

                      {/* Attempts details list */}
                      {round.attempts.length > 0 ? (
                        <div className="mt-3 space-y-1.5 border-t border-slate-800/80 pt-2.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Attempts played ({round.attempts.length})
                          </p>
                          <div className="grid gap-1.5">
                            {round.attempts.map((att) => (
                              <div
                                key={att.id}
                                className="flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-1.5 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-400">
                                    #{att.attempt_number}
                                  </span>
                                  <User size={13} className="text-slate-500" />
                                  <span className="font-medium text-slate-200">
                                    {att.display_name}
                                  </span>
                                  <span className="font-mono text-[11px] text-cyan-300">
                                    {att.member_code}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 font-mono text-slate-400">
                                    <Clock size={12} className="text-slate-500" />
                                    <span>{formatDuration(att.duration_ms)}</span>
                                  </div>
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1 font-bold uppercase text-[11px]',
                                      att.status === 'passed' && 'text-emerald-400',
                                      att.status === 'failed' && 'text-rose-400',
                                      att.status === 'in_progress' && 'text-amber-400',
                                    )}
                                  >
                                    {att.status === 'passed' ? (
                                      <CheckCircle2 size={12} />
                                    ) : (
                                      <XCircle size={12} />
                                    )}
                                    {att.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : isAssigned ? (
                        <p className="mt-2 text-xs italic text-slate-500">
                          Assigned. No attempts submitted yet.
                        </p>
                      ) : null}

                      {isAssigned && round.assignment_id ? (
                        <div className="mt-3 flex justify-end border-t border-slate-800/80 pt-3">
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-9 px-3 text-xs"
                            disabled={resetting === round.assignment_id}
                            onClick={() => void resetAttempts(round.assignment_id!)}
                          >
                            <RotateCcw
                              size={14}
                              className={`mr-1.5 ${resetting === round.assignment_id ? 'animate-spin' : ''}`}
                            />
                            {resetting === round.assignment_id ? 'Resetting…' : 'Reset Attempts'}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
