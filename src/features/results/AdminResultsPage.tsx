import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Gamepad2,
  RefreshCw,
  Search,
  Timer,
  Trophy,
  User,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { Field } from '@/components/atoms/Field';
import { Panel } from '@/components/atoms/Panel';
import { api } from '@/services/api-client';
import type { ApiEnvelope } from '@/types/api';
import { cn } from '@/lib/utils';

interface AttemptReportRow {
  id: string;
  team_code: string;
  member_code: string;
  display_name: string;
  game_code: string;
  round: number;
  attempt_number: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
}

function formatDuration(ms: number | null) {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  const secs = (ms / 1000).toFixed(1);
  return `${secs}s`;
}

export function AdminResultsPage() {
  const [eventId, setEventId] = useState(() => localStorage.getItem('adminEventId') ?? '');
  const [rows, setRows] = useState<AttemptReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roundFilter, setRoundFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = useCallback(async (targetEventId?: string) => {
    const id = targetEventId || eventId;
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get<ApiEnvelope<AttemptReportRow[]>>('/admin/results', {
        params: { eventId: id, limit: 100 },
      });
      setRows(response.data.data);
      localStorage.setItem('adminEventId', id);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    async function init() {
      let id = eventId;
      if (!id) {
        try {
          const res = await api.get<ApiEnvelope<{ event?: { id: string } }>>('/admin/simple/setup');
          if (res.data.data?.event?.id) {
            id = res.data.data.event.id;
            setEventId(id);
          }
        } catch {
          // ignore
        }
      }
      if (id) {
        void load(id);
      }
    }
    void init();
  }, [load, eventId]);

  async function download() {
    if (!eventId) return;
    const response = await api.get('/admin/results/export', {
      params: { eventId },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data as Blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'hunt-results.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const availableRounds = useMemo(() => {
    const set = new Set<number>();
    rows.forEach((r) => {
      if (typeof r.round === 'number') set.add(r.round);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (roundFilter !== 'all' && String(r.round) !== roundFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = r.display_name?.toLowerCase().includes(q);
        const matchesMember = r.member_code?.toLowerCase().includes(q);
        const matchesTeam = r.team_code?.toLowerCase().includes(q);
        const matchesGame = r.game_code?.toLowerCase().includes(q);
        if (!matchesName && !matchesMember && !matchesTeam && !matchesGame) return false;
      }
      return true;
    });
  }, [rows, roundFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const totalAttempts = rows.length;
    const passedAttempts = rows.filter((r) => r.status === 'passed').length;
    let totalDurationMs = 0;
    let countWithDuration = 0;
    let fastestMs: number | null = null;

    rows.forEach((r) => {
      if (typeof r.duration_ms === 'number' && r.duration_ms > 0) {
        totalDurationMs += r.duration_ms;
        countWithDuration += 1;
        if (r.status === 'passed' && (fastestMs === null || r.duration_ms < fastestMs)) {
          fastestMs = r.duration_ms;
        }
      }
    });

    const avgDurationMs = countWithDuration > 0 ? Math.round(totalDurationMs / countWithDuration) : 0;

    return {
      totalAttempts,
      passedAttempts,
      totalDurationMs,
      avgDurationMs,
      fastestMs,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30">
              <Timer size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-100">Player Round Timings</h1>
              <p className="text-xs text-slate-400">
                Detailed game completion times per player and per round.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={loading || !eventId}
            onClick={() => void load()}
          >
            <RefreshCw className={cn('mr-1.5', loading && 'animate-spin')} size={15} />
            Refresh
          </Button>
          <Button onClick={() => void download()} disabled={!rows.length}>
            <Download className="mr-2" size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel className="p-3.5 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Gamepad2 size={14} className="text-cyan-400" />
            Total Attempts
          </div>
          <p className="mt-2 text-2xl font-black text-slate-100">{stats.totalAttempts}</p>
          <p className="text-[11px] text-slate-500">{stats.passedAttempts} cleared</p>
        </Panel>

        <Panel className="p-3.5 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Clock size={14} className="text-cyan-400" />
            Total Game Time
          </div>
          <p className="mt-2 text-2xl font-black text-cyan-300">
            {formatDuration(stats.totalDurationMs)}
          </p>
          <p className="text-[11px] text-slate-500">across all players</p>
        </Panel>

        <Panel className="p-3.5 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Timer size={14} className="text-amber-400" />
            Average Time
          </div>
          <p className="mt-2 text-2xl font-black text-amber-300">
            {formatDuration(stats.avgDurationMs)}
          </p>
          <p className="text-[11px] text-slate-500">per attempt</p>
        </Panel>

        <Panel className="p-3.5 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Trophy size={14} className="text-emerald-400" />
            Fastest Clear
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-300">
            {formatDuration(stats.fastestMs)}
          </p>
          <p className="text-[11px] text-slate-500">record time</p>
        </Panel>
      </div>

      {/* Filter and Search Bar */}
      <Panel className="p-4 bg-slate-950/80 border-slate-800">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="search"
              placeholder="Filter by player, member code, team code, or game…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              aria-label="Filter by round"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">All Rounds</option>
              {availableRounds.map((rnd) => (
                <option key={rnd} value={String(rnd)}>
                  Round {rnd}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="passed">Passed (Cleared)</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
        </div>

        {!eventId ? (
          <div className="mt-3 flex gap-2">
            <div className="flex-1">
              <Field
                label="Event UUID"
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
              />
            </div>
            <Button variant="secondary" className="mt-7" onClick={() => void load()}>
              Load
            </Button>
          </div>
        ) : null}
      </Panel>

      {/* Table of Attempts */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70 shadow-xl">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Team</th>
              <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Player</th>
              <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Round</th>
              <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Game</th>
              <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Attempt</th>
              <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Status</th>
              <th className="p-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Game Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredRows.map((row) => {
              const isPassed = row.status === 'passed';
              const isFailed = row.status === 'failed';
              const isExpired = row.status === 'expired';

              return (
                <tr
                  key={String(row.id)}
                  className="transition hover:bg-slate-900/40"
                >
                  <td className="p-3.5 font-mono font-bold text-cyan-300">
                    {String(row.team_code)}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-slate-500" />
                      <span className="font-semibold text-slate-100">{String(row.display_name)}</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        ({String(row.member_code)})
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="rounded-lg bg-slate-800 px-2 py-0.5 font-mono font-black text-slate-300">
                      R{String(row.round)}
                    </span>
                  </td>
                  <td className="p-3.5 font-medium text-slate-200">
                    {String(row.game_code)}
                  </td>
                  <td className="p-3.5 font-mono text-slate-400">
                    #{String(row.attempt_number)}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold uppercase text-[10px]',
                        isPassed && 'bg-emerald-500/15 text-emerald-300',
                        isFailed && 'bg-rose-500/15 text-rose-300',
                        isExpired && 'bg-amber-500/15 text-amber-300',
                        !isPassed && !isFailed && !isExpired && 'bg-slate-800 text-slate-400',
                      )}
                    >
                      {isPassed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {String(row.status)}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <span
                      className={cn(
                        'font-mono text-sm font-bold',
                        isPassed ? 'text-cyan-300' : 'text-slate-400',
                      )}
                    >
                      {formatDuration(row.duration_ms)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filteredRows.length && !loading ? (
          <Panel className="m-4 text-center text-xs text-slate-500">
            No round attempts match the selected filters.
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
