import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Dices,
  RotateCcw,
  Save,
  Shuffle,
  Users,
  X,
} from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';

interface TeamRoute {
  id: string;
  code: string;
  name: string;
  roundLocations?: Record<number, string>;
}

interface LocationOption {
  id: string;
  code?: string;
  label: string;
  clue?: string;
  note?: string;
}

interface TeamLocationRoutesModalProps {
  isOpen: boolean;
  onClose(): void;
  eventId: string;
  teams: TeamRoute[];
  checkpoints: LocationOption[];
  roundCount: number;
  onSaved(): void;
}

export function TeamLocationRoutesModal({
  isOpen,
  onClose,
  eventId,
  teams,
  checkpoints,
  roundCount,
  onSaved,
}: TeamLocationRoutesModalProps) {
  // routes state: key is `${teamId}:${roundSequence}`, value is checkpointId
  const [routes, setRoutes] = useState<Record<string, string>>({});
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const rounds = Array.from({ length: roundCount }, (_, i) => i + 1);

  // Initialize routes from team roundLocations or default to sequential
  useEffect(() => {
    if (!isOpen || !teams.length || !checkpoints.length) return;
    const initial: Record<string, string> = {};

    for (let tIdx = 0; tIdx < teams.length; tIdx += 1) {
      const team = teams[tIdx]!;
      for (const seq of rounds) {
        const key = `${team.id}:${seq}`;
        if (team.roundLocations && team.roundLocations[seq]) {
          initial[key] = team.roundLocations[seq]!;
        } else {
          const cp = checkpoints[(seq - 1) % checkpoints.length]!;
          initial[key] = cp.id;
        }
      }
    }

    setRoutes(initial);
    setSelectedTeamId(teams[0]?.id ?? '');
    setError('');
    setSuccess('');
  }, [isOpen, teams, checkpoints, roundCount]);

  if (!isOpen) return null;

  const currentTeam = teams.find((t) => t.id === selectedTeamId) ?? teams[0];

  function updateRoute(teamId: string, roundSeq: number, checkpointId: string) {
    setRoutes((prev) => ({
      ...prev,
      [`${teamId}:${roundSeq}`]: checkpointId,
    }));
  }

  // Presets for the selected team
  function applySequentialForTeam(teamId: string) {
    setRoutes((prev) => {
      const updated = { ...prev };
      for (let i = 0; i < rounds.length; i += 1) {
        const seq = rounds[i]!;
        const cp = checkpoints[i % checkpoints.length]!;
        updated[`${teamId}:${seq}`] = cp.id;
      }
      return updated;
    });
  }

  function applyRandomForTeam(teamId: string) {
    setRoutes((prev) => {
      const updated = { ...prev };
      for (const seq of rounds) {
        const randomCp = checkpoints[Math.floor(Math.random() * checkpoints.length)]!;
        updated[`${teamId}:${seq}`] = randomCp.id;
      }
      return updated;
    });
  }

  function applyStaggerForTeam(teamId: string) {
    const tIdx = teams.findIndex((t) => t.id === teamId);
    const offset = tIdx >= 0 ? tIdx : 0;
    setRoutes((prev) => {
      const updated = { ...prev };
      for (let rIdx = 0; rIdx < rounds.length; rIdx += 1) {
        const seq = rounds[rIdx]!;
        const cp = checkpoints[(offset + rIdx) % checkpoints.length]!;
        updated[`${teamId}:${seq}`] = cp.id;
      }
      return updated;
    });
  }

  function copyRouteFromTeam(targetTeamId: string, sourceTeamId: string) {
    if (!sourceTeamId || targetTeamId === sourceTeamId) return;
    setRoutes((prev) => {
      const updated = { ...prev };
      for (const seq of rounds) {
        const srcKey = `${sourceTeamId}:${seq}`;
        if (prev[srcKey]) {
          updated[`${targetTeamId}:${seq}`] = prev[srcKey]!;
        }
      }
      return updated;
    });
  }

  // Global presets for all teams
  function applySequentialAll() {
    const updated: Record<string, string> = {};
    for (const team of teams) {
      for (let i = 0; i < rounds.length; i += 1) {
        const seq = rounds[i]!;
        const cp = checkpoints[i % checkpoints.length]!;
        updated[`${team.id}:${seq}`] = cp.id;
      }
    }
    setRoutes(updated);
  }

  function applyStaggeredAll() {
    const updated: Record<string, string> = {};
    for (let tIdx = 0; tIdx < teams.length; tIdx += 1) {
      const team = teams[tIdx]!;
      for (let rIdx = 0; rIdx < rounds.length; rIdx += 1) {
        const seq = rounds[rIdx]!;
        const cp = checkpoints[(tIdx + rIdx) % checkpoints.length]!;
        updated[`${team.id}:${seq}`] = cp.id;
      }
    }
    setRoutes(updated);
  }

  function applyRandomAll() {
    const updated: Record<string, string> = {};
    for (const team of teams) {
      for (const seq of rounds) {
        const randomCp = checkpoints[Math.floor(Math.random() * checkpoints.length)]!;
        updated[`${team.id}:${seq}`] = randomCp.id;
      }
    }
    setRoutes(updated);
  }

  async function handleSave() {
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const mappings: Array<{ teamId: string; roundSequence: number; checkpointId: string }> = [];
      for (const team of teams) {
        for (const seq of rounds) {
          const cpId = routes[`${team.id}:${seq}`];
          if (cpId) {
            mappings.push({
              teamId: team.id,
              roundSequence: seq,
              checkpointId: cpId,
            });
          }
        }
      }

      await huntApi.updateTeamRoundLocations(eventId, mappings);
      setSuccess('All team routes saved successfully!');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not save routes.');
    } finally {
      setBusy(false);
    }
  }

  // Find other rounds where the same location is visited by a team
  function getRepeatedRounds(teamId: string, currentRoundSeq: number, cpId: string): number[] {
    if (!cpId) return [];
    const repeated: number[] = [];
    for (const seq of rounds) {
      if (seq !== currentRoundSeq && routes[`${teamId}:${seq}`] === cpId) {
        repeated.push(seq);
      }
    }
    return repeated;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pr-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30">
              <Compass size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100">Team Route Assignment</h2>
              <p className="text-xs text-slate-400">
                Select a team tab below to assign which physical location / QR they visit in each round. Locations can be repeated.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={applySequentialAll}
              disabled={busy}
              title="Apply sequential routes to all teams"
            >
              <RotateCcw className="mr-1.5" size={13} /> Sequential All
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-xs text-cyan-300 border-cyan-500/30 hover:border-cyan-400"
              onClick={applyStaggeredAll}
              disabled={busy}
              title="Stagger routes across all teams to avoid bottlenecks"
            >
              <Shuffle className="mr-1.5" size={13} /> Stagger All Teams
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={applyRandomAll}
              disabled={busy}
              title="Randomize routes for all teams"
            >
              <Dices className="mr-1.5" size={13} /> Randomize All
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
        ) : null}

        {/* Team Tabs Navigation Bar */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
          {teams.map((team) => {
            const isSelected = selectedTeamId === team.id;
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => setSelectedTeamId(team.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-950'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span className="font-mono text-[11px] font-black text-cyan-400">{team.code}</span>
                <span className="truncate max-w-32">{team.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedTeamId('all')}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              selectedTeamId === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Users size={14} />
            <span>All Teams Overview</span>
          </button>
        </div>

        {/* Tab Content: Single Team Tab View */}
        {selectedTeamId !== 'all' && currentTeam ? (
          <div className="mt-4 flex flex-1 flex-col overflow-hidden">
            {/* Team Actions Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black uppercase text-cyan-300">
                    {currentTeam.code}
                  </span>
                  <h3 className="font-bold text-slate-100 text-sm">{currentTeam.name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure location assignments for each of the {roundCount} rounds.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs px-2.5 py-1"
                  onClick={() => applySequentialForTeam(currentTeam.id)}
                  disabled={busy}
                  title="Sequential for this team"
                >
                  <RotateCcw className="mr-1" size={12} /> Sequential
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs px-2.5 py-1 text-cyan-300"
                  onClick={() => applyStaggerForTeam(currentTeam.id)}
                  disabled={busy}
                  title="Stagger this team"
                >
                  <Shuffle className="mr-1" size={12} /> Stagger
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs px-2.5 py-1"
                  onClick={() => applyRandomForTeam(currentTeam.id)}
                  disabled={busy}
                  title="Randomize for this team"
                >
                  <Dices className="mr-1" size={12} /> Randomize
                </Button>

                {teams.length > 1 ? (
                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                    <span className="text-[11px] text-slate-400">Copy from:</span>
                    <select
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 cursor-pointer"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          copyRouteFromTeam(currentTeam.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="" disabled>
                        Select team…
                      </option>
                      {teams
                        .filter((t) => t.id !== currentTeam.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.code} - {t.name}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Visual Route Flow Breadcrumb */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
              <span className="text-xs font-bold text-slate-400 shrink-0">Route Path:</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {rounds.map((seq, idx) => {
                  const cpId = routes[`${currentTeam.id}:${seq}`];
                  const cp = checkpoints.find((c) => c.id === cpId);
                  return (
                    <div key={seq} className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs">
                        <span className="font-bold text-slate-400">R{seq}:</span>
                        <span className="font-black text-cyan-300">{cp?.code ?? '—'}</span>
                        <span className="text-slate-300 text-[11px] max-w-24 truncate">
                          {cp?.label ?? ''}
                        </span>
                      </div>
                      {idx < rounds.length - 1 ? (
                        <ArrowRight size={13} className="text-slate-600 shrink-0" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rounds Assignment Cards Grid */}
            <div className="mt-3 flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rounds.map((seq) => {
                  const key = `${currentTeam.id}:${seq}`;
                  const currentCpId = routes[key] ?? '';
                  const selectedCp = checkpoints.find((c) => c.id === currentCpId);
                  const repeatedIn = getRepeatedRounds(currentTeam.id, seq, currentCpId);

                  return (
                    <div
                      key={seq}
                      className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-xs font-black text-cyan-300 border border-cyan-500/30">
                            Round {seq}
                          </span>
                          {repeatedIn.length > 0 ? (
                            <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                              Also in Round {repeatedIn.join(', ')}
                            </span>
                          ) : null}
                        </div>

                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Assigned Location / QR:
                        </label>
                        <select
                          value={currentCpId}
                          onChange={(e) => updateRoute(currentTeam.id, seq, e.target.value)}
                          disabled={busy}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
                        >
                          {checkpoints.map((cp) => (
                            <option key={cp.id} value={cp.id}>
                              {cp.code}: {cp.label}
                            </option>
                          ))}
                        </select>

                        {selectedCp ? (
                          <div className="mt-2.5 rounded-lg border border-slate-800/80 bg-slate-950/80 p-2 text-xs">
                            <p className="text-[11px] text-slate-300 line-clamp-2">
                              <span className="font-bold text-slate-400">Clue: </span>
                              {selectedCp.clue || 'No clue provided.'}
                            </p>
                            {selectedCp.note ? (
                              <p className="mt-1 text-[11px] text-amber-300/90 line-clamp-1">
                                <span className="font-bold">Note: </span>
                                {selectedCp.note}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Tab Content: All Teams Overview Matrix */
          <div className="mt-4 flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 sticky top-0 z-10">
                  <th className="p-3 font-black text-slate-200 min-w-44 sticky left-0 bg-slate-900/95 z-20">
                    Team
                  </th>
                  {rounds.map((seq) => (
                    <th key={seq} className="p-3 font-bold text-center min-w-44 text-cyan-300">
                      Round {seq}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-3 font-medium text-slate-200 sticky left-0 bg-slate-950/95 z-10 border-r border-slate-800/80">
                      <span className="font-mono text-[11px] font-black uppercase text-cyan-300 block">
                        {team.code}
                      </span>
                      <span className="truncate max-w-40 block text-slate-300">{team.name}</span>
                    </td>
                    {rounds.map((seq) => {
                      const key = `${team.id}:${seq}`;
                      const currentCpId = routes[key] ?? '';
                      return (
                        <td key={seq} className="p-2 text-center">
                          <select
                            value={currentCpId}
                            onChange={(e) => updateRoute(team.id, seq, e.target.value)}
                            disabled={busy}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
                          >
                            {checkpoints.map((cp) => (
                              <option key={cp.id} value={cp.id}>
                                {cp.code}: {cp.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Tip: You can assign any location to any round. Locations can be repeated across rounds for any team.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={busy}>
              <Save className="mr-1.5" size={15} /> {busy ? 'Saving…' : 'Save Routes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
