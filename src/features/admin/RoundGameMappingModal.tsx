import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Dices, Shuffle, X } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { huntApi } from '@/services/hunt-api';
import type { AdminGame } from '@/types/api';

export interface CheckpointRound {
  id: string; // checkpoint id
  label: string;
  round_id?: string;
  sequence: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  clue?: string;
  game_id?: string | null;
  game_name?: string | null;
  game_code?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  checkpoints: CheckpointRound[];
  onSaved: () => void;
}

export function RoundGameMappingModal({
  isOpen,
  onClose,
  eventId,
  checkpoints,
  onSaved,
}: Props) {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Initialize mappings from existing checkpoint data
  useEffect(() => {
    const initial: Record<string, string | null> = {};
    for (const cp of checkpoints) {
      if (cp.round_id) {
        initial[cp.round_id] = cp.game_id ?? null;
      }
    }
    setMappings(initial);
  }, [checkpoints]);

  // Load available games
  useEffect(() => {
    if (!isOpen) return;
    void huntApi
      .listGames()
      .then(setGames)
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSelect(roundId: string, gameId: string | null) {
    setMappings((prev) => ({
      ...prev,
      [roundId]: gameId,
    }));
    setSuccess(false);
  }

  function handleSetAllRandom() {
    const updated: Record<string, string | null> = {};
    for (const cp of checkpoints) {
      if (cp.round_id) {
        updated[cp.round_id] = null;
      }
    }
    setMappings(updated);
    setSuccess(false);
  }

  async function handleSave() {
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      const payload = Object.entries(mappings).map(([roundId, gameId]) => ({
        roundId,
        gameId,
      }));
      await huntApi.mapRoundGames(eventId, { mappings: payload });
      setSuccess(true);
      onSaved();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save round game mappings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-xl max-h-[90vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <Shuffle className="text-cyan-400" size={20} />
            <div>
              <h2 className="text-base font-black text-slate-100">
                Round-to-Game Mapping
              </h2>
              <p className="text-xs text-slate-400">
                Configure specific games per round or enable dynamic random rotation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Explainer Alert */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/40 text-xs text-slate-300 flex items-start gap-2.5">
          <AlertCircle className="text-cyan-400 shrink-0 mt-0.5" size={16} />
          <p>
            <strong>Fair Play Guarantee:</strong> If a round is mapped to a specific game, teams play that game (unless already completed in a prior round). If set to <em>Random</em>, the server assigns an unplayed game dynamically. Refreshing or re-scanning QR codes keeps the exact same game for the team.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800 bg-slate-900 text-xs">
          <span className="font-bold text-slate-400">
            {checkpoints.length} Rounds Configured
          </span>
          <Button
            type="button"
            variant="secondary"
            className="text-xs py-1 px-2.5 h-7"
            onClick={handleSetAllRandom}
          >
            <Dices className="mr-1.5" size={13} />
            Set All to Random
          </Button>
        </div>

        {/* Rounds List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-950/60">
          {checkpoints.map((cp) => {
            const roundId = cp.round_id ?? cp.id;
            const currentSelected = mappings[roundId] ?? null;

            return (
              <div
                key={roundId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 text-xs font-black">
                      {cp.sequence}
                    </span>
                    <span className="font-bold text-sm text-slate-200">
                      {cp.label}
                    </span>
                    {cp.difficulty && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                          cp.difficulty === 'easy'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : cp.difficulty === 'medium'
                              ? 'bg-amber-400/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {cp.difficulty}
                      </span>
                    )}
                  </div>
                </div>

                {/* Game Dropdown */}
                <select
                  aria-label={`Select game for ${cp.label}`}
                  value={currentSelected ?? ''}
                  onChange={(e) => handleSelect(roundId, e.target.value || null)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-100 focus:border-cyan-400 focus:outline-none sm:w-56"
                >
                  <option value="">🎲 Random (Unplayed by Team)</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 p-4 bg-slate-900/90">
          <div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            {success && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <CheckCircle2 size={15} />
                <span>Round game mappings saved successfully!</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={handleSave}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black"
            >
              {busy ? 'Saving…' : 'Save Mappings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
