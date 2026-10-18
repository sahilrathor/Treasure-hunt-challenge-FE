import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  Clock,
  Flame,
  Medal,
  RefreshCw,
  Search,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { Panel } from '@/components/atoms/Panel';
import { TeamRoundsModal } from '@/features/admin/TeamRoundsModal';
import { huntApi } from '@/services/hunt-api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

function formatTime(value: unknown) {
  if (value === null || value === undefined) return 'In progress';
  const ms = Number(value);
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

interface TeamEntry extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  status: string;
  current_sequence: number;
  failed_attempts: number;
  adjusted_time_ms: number | null;
}

interface LeaderboardData {
  event?: { id: string; name: string; slug: string; status: string } | null;
  completed: TeamEntry[];
  incomplete: TeamEntry[];
}

export function LeaderboardPage() {
  const [params] = useSearchParams();
  const identity = useAuthStore((state) => state.identity);
  const eventIdParam = params.get('eventId') || identity?.eventId || undefined;

  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  async function loadData(showLoading = false) {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const res = await huntApi.leaderboard(eventIdParam);
      setData(res as LeaderboardData);
    } catch {
      setError('Unable to load leaderboard. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData(true);
  }, [eventIdParam]);

  // Auto-refresh every 10 seconds if event is RUNNING and autoRefresh is enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void loadData(false);
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, eventIdParam]);

  const filteredCompleted = useMemo(() => {
    if (!data?.completed) return [];
    if (!search.trim()) return data.completed;
    const q = search.toLowerCase();
    return data.completed.filter(
      (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q),
    );
  }, [data?.completed, search]);

  const filteredIncomplete = useMemo(() => {
    if (!data?.incomplete) return [];
    if (!search.trim()) return data.incomplete;
    const q = search.toLowerCase();
    return data.incomplete.filter(
      (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q),
    );
  }, [data?.incomplete, search]);

  const event = data?.event;
  const isRunning = event?.status === 'RUNNING';
  const totalTeams = (data?.completed.length ?? 0) + (data?.incomplete.length ?? 0);

  return (
    <div className="grid gap-6">
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30">
              <Trophy size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[.25em] text-cyan-300">
                {event ? event.name : 'College Fest Hunt'}
              </p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Leaderboard</h1>
            </div>
          </div>
          {event ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase',
                  event.status === 'RUNNING' && 'bg-emerald-500/15 text-emerald-400',
                  event.status === 'PAUSED' && 'bg-amber-500/15 text-amber-300',
                  event.status === 'FINISHED' && 'bg-cyan-500/15 text-cyan-300',
                  event.status === 'DRAFT' && 'bg-slate-700/50 text-slate-300',
                )}
              >
                {event.status === 'RUNNING' ? (
                  <span className="size-2 animate-ping rounded-full bg-emerald-400" />
                ) : null}
                {event.status}
              </span>
              <span>• Ranked by official adjusted completion time</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {identity?.role === 'ADMIN' || identity?.role === 'SUPER_ADMIN' ? (
            <Button asChild variant="secondary" className="min-h-10 text-xs">
              <Link to="/admin">
                <Shield className="mr-1.5" size={16} /> Admin Setup
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 text-xs"
            disabled={loading}
            onClick={() => void loadData(true)}
            aria-label="Refresh leaderboard"
          >
            <RefreshCw className={cn('mr-1.5', loading && 'animate-spin')} size={16} />
            Refresh
          </Button>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-cyan-400"
            />
            Live update
          </label>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-500/10 p-4 text-rose-300 ring-1 ring-rose-500/20">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Stats Summary Cards */}
      {data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Panel className="p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Users size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Total Teams</span>
            </div>
            <p className="mt-2 text-3xl font-black text-slate-100">{totalTeams}</p>
          </Panel>
          <Panel className="p-4 border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400">
              <Award size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
            </div>
            <p className="mt-2 text-3xl font-black text-emerald-300">{data.completed.length}</p>
          </Panel>
          <Panel className="col-span-2 p-4 sm:col-span-1 border-cyan-500/30">
            <div className="flex items-center gap-2 text-cyan-300">
              <Flame size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
            </div>
            <p className="mt-2 text-3xl font-black text-cyan-300">{data.incomplete.length}</p>
          </Panel>
        </div>
      ) : null}

      {/* Search Bar */}
      {totalTeams > 0 ? (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="search"
            placeholder="Search teams by name or team code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300"
          />
        </div>
      ) : null}

      {/* Completed Teams (Ranked) */}
      <div>
        <div className="flex items-center justify-between pb-2">
          <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-wider text-slate-300">
            <Medal size={20} className="text-amber-400" /> Finished Teams ({filteredCompleted.length})
          </h2>
          {filteredCompleted.length > 0 ? (
            <span className="text-xs text-slate-500">Fastest official times</span>
          ) : null}
        </div>

        <div className="mt-2 grid gap-3">
          {filteredCompleted.map((team, index) => {
            const isFirst = index === 0;
            const isSecond = index === 1;
            const isThird = index === 2;

            return (
              <Panel
                key={String(team.id)}
                className={cn(
                  'flex items-center gap-4 transition hover:border-slate-700',
                  isFirst && 'border-amber-400/50 bg-amber-950/15 shadow-amber-900/20 shadow-lg',
                  isSecond && 'border-slate-400/40 bg-slate-800/20',
                  isThird && 'border-amber-700/40 bg-amber-950/10',
                )}
              >
                <div
                  className={cn(
                    'grid size-12 shrink-0 place-items-center rounded-2xl font-black text-slate-950 shadow',
                    isFirst && 'bg-amber-300 text-slate-950 ring-2 ring-amber-200',
                    isSecond && 'bg-slate-300 text-slate-950',
                    isThird && 'bg-amber-600 text-white',
                    index > 2 && 'bg-slate-800 font-bold text-slate-300',
                  )}
                >
                  <span className="text-lg">#{index + 1}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-black text-slate-100 sm:text-lg">{team.name}</p>
                    <span className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs font-mono font-bold text-cyan-300">
                      {team.code}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span>
                      {team.failed_attempts} failed attempt{team.failed_attempts === 1 ? '' : 's'}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 font-mono font-black text-cyan-300 sm:text-lg">
                      <Clock size={16} className="text-slate-500" />
                      <span>{formatTime(team.adjusted_time_ms)}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                      Completed
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-9 px-3 text-xs"
                    onClick={() => setSelectedTeamId(team.id)}
                  >
                    View Rounds
                  </Button>
                </div>
              </Panel>
            );
          })}

          {!filteredCompleted.length && data?.completed.length ? (
            <Panel className="text-center py-8">
              <p className="text-slate-400">No completed teams matched "{search}".</p>
            </Panel>
          ) : null}

          {!data?.completed.length && !loading ? (
            <Panel className="text-center py-8 border-dashed border-slate-800 bg-slate-950/40">
              <Trophy className="mx-auto mb-2 text-slate-600" size={32} />
              <p className="font-bold text-slate-300">No teams have completed the hunt yet</p>
              <p className="mt-1 text-xs text-slate-500">
                {isRunning
                  ? 'Rankings will appear as teams clear the final checkpoint.'
                  : 'The hunt has not started or completed any rounds yet.'}
              </p>
            </Panel>
          ) : null}
        </div>
      </div>

      {/* Incomplete Teams (Still Hunting) */}
      {data?.incomplete.length ? (
        <div className="mt-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-wider text-slate-400">
              <Flame size={20} className="text-cyan-400" /> Still Hunting ({filteredIncomplete.length})
            </h2>
            <span className="text-xs text-slate-500">Live progress</span>
          </div>

          <div className="mt-2 grid gap-3">
            {filteredIncomplete.map((team) => (
              <Panel key={String(team.id)} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-black text-slate-200">{team.name}</span>
                    <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-xs text-cyan-300">
                      {team.code}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {team.failed_attempts} failed attempt{team.failed_attempts === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-block rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 font-mono text-xs font-bold text-cyan-300">
                    Round {team.current_sequence}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-8 px-2.5 text-xs"
                    onClick={() => setSelectedTeamId(team.id)}
                  >
                    View Rounds
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      {/* Initial Loading Skeleton */}
      {loading && !data ? (
        <Panel className="text-center py-12">
          <div className="mx-auto size-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="mt-4 font-bold text-slate-300">Loading rankings…</p>
        </Panel>
      ) : null}

      {/* Team Round Play History Modal */}
      <TeamRoundsModal
        teamId={selectedTeamId}
        onClose={() => setSelectedTeamId(null)}
      />
    </div>
  );
}
