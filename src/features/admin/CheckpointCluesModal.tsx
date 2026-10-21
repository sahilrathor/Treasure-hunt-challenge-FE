import { useEffect, useState } from 'react';
import { CheckCircle2, Compass, HelpCircle, RotateCcw, Save, X } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';
import type { CheckpointSummary } from './CheckpointQrCard';

interface CheckpointCluesModalProps {
  isOpen: boolean;
  onClose(): void;
  checkpoints: CheckpointSummary[];
  teams: Array<{ id: string; code: string; name: string }>;
  eventId?: string;
  onSaved(): void;
  initialCheckpointId?: string | null;
}

export function CheckpointCluesModal({
  isOpen,
  onClose,
  checkpoints,
  teams,
  eventId,
  onSaved,
  initialCheckpointId,
}: CheckpointCluesModalProps) {
  const [clues, setClues] = useState<Record<string, string>>({});
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync state when modal opens or checkpoints change
  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, string> = {};
    for (const team of teams) {
      for (const cp of checkpoints) {
        const roundId = cp.round_id || cp.id;
        initial[`${team.id}:${roundId}`] =
          cp.team_clues?.[team.id] || cp.clue || `Proceed to Checkpoint ${cp.sequence}.`;
      }
    }
    setClues(initial);
    setSelectedTeamId((current) =>
      teams.some((team) => team.id === current) ? current : (teams[0]?.id ?? ''),
    );
    setError('');
    setSuccess('');
  }, [isOpen, checkpoints, teams]);

  if (!isOpen) return null;

  function updateClue(key: string, value: string) {
    setClues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetToDefault(cp: CheckpointSummary) {
    const roundId = cp.round_id || cp.id;
    updateClue(
      `${selectedTeamId}:${roundId}`,
      cp.clue || `Proceed to Checkpoint ${cp.sequence}.`,
    );
  }

  async function handleSaveAll() {
    if (!eventId) {
      setError('Event ID is missing.');
      return;
    }
    if (!selectedTeamId) {
      setError('Select a team before saving clues.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      // Build payload for batch save
      const payload = checkpoints
        .filter((cp) => Boolean(cp.round_id))
        .map((cp) => ({
          roundId: cp.round_id!,
          clue:
            clues[`${selectedTeamId}:${cp.round_id!}`]?.trim() ||
            cp.clue ||
            `Proceed to Checkpoint ${cp.sequence}.`,
        }));

      await huntApi.updateCheckpointClues(eventId, selectedTeamId, payload);

      const team = teams.find((item) => item.id === selectedTeamId);
      setSuccess(`Clues saved for ${team?.name ?? 'the selected team'}!`);
      onSaved();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not save checkpoint clues.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5 sm:p-6 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30">
              <Compass size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                Team Clues
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
                  {checkpoints.length} Rounds
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Give each team its own route hints for every checkpoint.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close clues modal"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notices */}
        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* Body list of checkpoints */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <label className="block rounded-2xl border border-cyan-400/20 bg-cyan-950/20 p-4">
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-cyan-300">
              Editing clues for
            </span>
            <select
              value={selectedTeamId}
              onChange={(event) => {
                setSelectedTeamId(event.target.value);
                setError('');
                setSuccess('');
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-bold text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.code} — {team.name}
                </option>
              ))}
            </select>
          </label>

          {!teams.length && (
            <p className="rounded-xl border border-amber-400/30 bg-amber-950/30 p-3 text-sm text-amber-200">
              Add a team before creating team-specific clues.
            </p>
          )}

          {checkpoints.map((cp) => {
            const roundId = cp.round_id || cp.id;
            const key = `${selectedTeamId}:${roundId}`;
            const currentClue = clues[key] ?? cp.clue ?? '';
            const isHighlighted = initialCheckpointId === cp.id || initialCheckpointId === cp.round_id;

            return (
              <div
                key={cp.id}
                className={`rounded-2xl border p-4 transition-all ${
                  isHighlighted
                    ? 'border-amber-400/60 bg-amber-950/20 shadow-lg shadow-amber-950/30'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full bg-cyan-300/20 text-cyan-300 text-xs font-black">
                      {cp.sequence}
                    </span>
                    <h3 className="font-bold text-slate-200 text-sm">{cp.label}</h3>
                    {cp.difficulty && (
                      <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                        {cp.difficulty}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => resetToDefault(cp)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition"
                    title="Reset to default clue"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={currentClue}
                    onChange={(e) => updateClue(key, e.target.value)}
                    maxLength={1000}
                    placeholder={`Enter clue or riddle to reach ${cp.label}...`}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none font-medium"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <HelpCircle size={12} /> Shown only to this team in Round {cp.sequence}
                    </span>
                    <span className="font-mono">{currentClue.length} / 1000</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 p-4 sm:p-6 bg-slate-950/60">
          <p className="text-xs text-slate-500">
            Save each team separately. Unsaved team changes remain while this window is open.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAll}
              disabled={busy || !selectedTeamId}
              className="min-w-32"
            >
              <Save className="mr-1.5" size={16} />
              {busy ? 'Saving…' : 'Save Team Clues'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
