import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Dices, Gamepad2, Users, X } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { huntApi } from '@/services/hunt-api';
import type { AdminGame } from '@/types/api';
import type { CheckpointRound } from './RoundGameMappingModal';

interface TeamOption {
  id: string;
  code: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  teams: TeamOption[];
  rounds: CheckpointRound[];
  onSaved: () => void;
}

const RANDOM = '__random__';
const USE_DEFAULT = '__default__';

export function TeamRoundGameMappingModal({
  isOpen,
  onClose,
  eventId,
  teams,
  rounds,
  onSaved,
}: Props) {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string | null | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedTeamId((current) => current || teams[0]?.id || '');
    void huntApi.listGames().then(setGames).catch(() => setGames([]));
  }, [isOpen, teams]);

  useEffect(() => {
    if (!isOpen || !selectedTeamId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    void huntApi
      .listTeamRoundGames(eventId, selectedTeamId)
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, string | null | undefined> = {};
        for (const round of rounds) next[round.round_id ?? round.id] = undefined;
        for (const row of rows) next[row.round_id] = row.game_id;
        setOverrides(next);
        setSuccess(false);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load team game mappings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, isOpen, rounds, selectedTeamId]);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const roundsHaveIds = rounds.length > 0 && rounds.every((round) => Boolean(round.round_id));
  const overrideCount = useMemo(
    () => Object.values(overrides).filter((value) => value !== undefined).length,
    [overrides],
  );

  if (!isOpen) return null;

  function changeOverride(roundId: string, value: string) {
    setOverrides((current) => ({
      ...current,
      [roundId]: value === USE_DEFAULT ? undefined : value === RANDOM ? null : value,
    }));
    setSuccess(false);
  }

  function clearOverrides() {
    const next: Record<string, string | null | undefined> = {};
    for (const round of rounds) next[round.round_id ?? round.id] = undefined;
    setOverrides(next);
    setSuccess(false);
  }

  async function save() {
    if (!selectedTeamId) return;
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      await huntApi.mapTeamRoundGames(eventId, {
        teamId: selectedTeamId,
        mappings: rounds.map((round) => {
          const roundId = round.round_id ?? round.id;
          const gameId = overrides[roundId];
          return gameId === undefined ? { roundId } : { roundId, gameId };
        }),
      });
      setSuccess(true);
      onSaved();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not save team game mappings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <Gamepad2 className="text-cyan-300" size={21} />
            <div>
              <h2 className="font-black text-slate-100">Team Game Assignments</h2>
              <p className="text-xs text-slate-400">Choose a game for each round for one team.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal" className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-slate-800 bg-slate-950/50 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="grid gap-1.5 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5"><Users size={14} /> Team</span>
              <select
                aria-label="Select team for game assignments"
                value={selectedTeamId}
                onChange={(event) => setSelectedTeamId(event.target.value)}
                className="min-w-64 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                {teams.map((team) => <option key={team.id} value={team.id}>{team.code} - {team.name}</option>)}
              </select>
            </label>
            <Button type="button" variant="secondary" className="text-xs" onClick={clearOverrides} disabled={!selectedTeamId || loading}>
              <Dices className="mr-1.5" size={14} /> Use Round Defaults
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {selectedTeam?.name ?? 'Select a team'}: team choices override the round-wide game. Random keeps the team's games unique; round defaults remain in effect wherever you choose "Use round default."
          </p>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-5">
          {rounds.map((round) => {
            const roundId = round.round_id ?? round.id;
            const value = overrides[roundId];
            const selectValue = value === undefined ? USE_DEFAULT : value === null ? RANDOM : value;
            const defaultGame = games.find((game) => game.id === round.game_id);
            return (
              <div key={roundId} className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-100">Round {round.sequence}</p>
                  <p className="text-xs text-slate-400">Round default: {defaultGame?.name ?? 'Random'}</p>
                </div>
                <select
                  aria-label={`Select game for ${selectedTeam?.name ?? 'team'} Round ${round.sequence}`}
                  value={selectValue}
                  disabled={loading || !selectedTeamId}
                  onChange={(event) => changeOverride(roundId, event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 sm:max-w-sm"
                >
                  <option value={USE_DEFAULT}>Use round default</option>
                  <option value={RANDOM}>Random for this team</option>
                  {games.map((game) => {
                    const hasDifficulty = game.levels.some((level) => level.difficulty === (round.difficulty ?? 'easy'));
                    const usedElsewhere = rounds.some((other) => {
                      const otherId = other.round_id ?? other.id;
                      const otherOverride = overrides[otherId];
                      const otherGameId = otherOverride === undefined ? other.game_id : otherOverride;
                      return otherId !== roundId && otherGameId === game.id;
                    });
                    return <option key={game.id} value={game.id} disabled={!hasDifficulty || usedElsewhere}>{game.name}{!hasDifficulty ? ' (no level)' : usedElsewhere ? ' (selected above)' : ''}</option>;
                  })}
                </select>
              </div>
            );
          })}
          {!rounds.length && <p className="text-sm text-slate-400">Configure rounds before assigning team games.</p>}
          {rounds.length > 0 && !roundsHaveIds && <p className="text-sm text-amber-300">Save the hunt structure first so each round has a database record.</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/90 p-4">
          <div className="min-h-5 text-xs">
            {error && <span className="text-rose-400">{error}</span>}
            {success && <span className="flex items-center gap-1.5 font-bold text-emerald-400"><CheckCircle2 size={15} /> Saved {overrideCount} team overrides for {selectedTeam?.name}.</span>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
            <Button type="button" disabled={busy || loading || !roundsHaveIds || !selectedTeamId} onClick={() => void save()} className="bg-cyan-500 font-black text-slate-950 hover:bg-cyan-400">
              {busy ? 'Saving…' : 'Save Team Games'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
