import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Flame, Gauge, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { huntApi } from '@/services/hunt-api';
import type { CheckpointRound } from './RoundGameMappingModal';

type Difficulty = 'easy' | 'medium' | 'hard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  checkpoints: CheckpointRound[];
  initialCheckpointId?: string | null;
  onSaved: () => void;
}

export function RoundDifficultiesModal({
  isOpen,
  onClose,
  eventId,
  checkpoints,
  initialCheckpointId,
  onSaved,
}: Props) {
  const [difficulties, setDifficulties] = useState<Record<string, Difficulty>>({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Initialize difficulties from checkpoints data
  useEffect(() => {
    const initial: Record<string, Difficulty> = {};
    for (const cp of checkpoints) {
      const id = cp.round_id ?? cp.id;
      initial[id] = cp.difficulty ?? 'easy';
    }
    setDifficulties(initial);
  }, [checkpoints]);

  if (!isOpen) return null;

  function handleSelect(roundId: string, diff: Difficulty) {
    setDifficulties((prev) => ({
      ...prev,
      [roundId]: diff,
    }));
    setSuccess(false);
  }

  function handleSetAll(diff: Difficulty) {
    const updated: Record<string, Difficulty> = {};
    for (const cp of checkpoints) {
      const id = cp.round_id ?? cp.id;
      updated[id] = diff;
    }
    setDifficulties(updated);
    setSuccess(false);
  }

  function handleSetProgressive() {
    const total = checkpoints.length;
    const updated: Record<string, Difficulty> = {};
    checkpoints.forEach((cp, index) => {
      const id = cp.round_id ?? cp.id;
      const sequence = cp.sequence || index + 1;
      const diff: Difficulty =
        sequence <= Math.ceil(total / 3)
          ? 'easy'
          : sequence <= Math.ceil((total * 2) / 3)
            ? 'medium'
            : 'hard';
      updated[id] = diff;
    });
    setDifficulties(updated);
    setSuccess(false);
  }

  async function handleSave() {
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      const payload = Object.entries(difficulties).map(([roundId, difficulty]) => ({
        roundId,
        difficulty,
      }));
      await huntApi.updateRoundDifficulties(eventId, payload);
      setSuccess(true);
      onSaved();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save round difficulties.');
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
            <Gauge className="text-rose-400" size={20} />
            <div>
              <h2 className="text-base font-black text-slate-100">Round Difficulties</h2>
              <p className="text-xs text-slate-400">
                Set target difficulty (Easy, Medium, or Hard) for each round
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
          <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={16} />
          <p>
            <strong>Target Dynamic Challenges:</strong> Round difficulty scales the target
            challenge for teams in that round (e.g., Memory Match grid size 3x3/4x4/5x5, Tetris
            lines & speed, Snake score, Flappy Bird pipes, and 2048 target tile).
          </p>
        </div>

        {/* Toolbar & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-b border-slate-800 bg-slate-900 text-xs">
          <span className="font-bold text-slate-400">
            {checkpoints.length} Rounds Configured
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 text-[11px] font-medium mr-0.5">Presets:</span>
            <button
              type="button"
              onClick={handleSetProgressive}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[11px] font-bold text-slate-200 hover:border-cyan-400 hover:text-cyan-300 transition"
              title="Gradual progression: Early easy, middle medium, later hard"
            >
              <Sparkles size={11} className="text-cyan-400" />
              Progressive
            </button>
            <button
              type="button"
              onClick={() => handleSetAll('easy')}
              className="rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[11px] font-bold text-emerald-300 hover:border-emerald-400 hover:bg-emerald-950/30 transition"
            >
              All Easy
            </button>
            <button
              type="button"
              onClick={() => handleSetAll('medium')}
              className="rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[11px] font-bold text-amber-300 hover:border-amber-400 hover:bg-amber-950/30 transition"
            >
              All Med
            </button>
            <button
              type="button"
              onClick={() => handleSetAll('hard')}
              className="rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[11px] font-bold text-rose-300 hover:border-rose-400 hover:bg-rose-950/30 transition"
            >
              <Flame size={11} className="inline text-rose-400 mr-0.5" />
              All Hard
            </button>
          </div>
        </div>

        {/* Rounds List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-950/60">
          {checkpoints.map((cp) => {
            const roundId = cp.round_id ?? cp.id;
            const currentDiff = difficulties[roundId] ?? cp.difficulty ?? 'easy';
            const isInitialTarget = initialCheckpointId && cp.id === initialCheckpointId;

            return (
              <div
                key={roundId}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition ${
                  isInitialTarget
                    ? 'border-rose-500/80 bg-rose-950/20 shadow-md ring-1 ring-rose-500/50'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 text-xs font-black">
                      {cp.sequence}
                    </span>
                    <span className="font-bold text-sm text-slate-200">{cp.label}</span>
                    {cp.game_name && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-700">
                        {cp.game_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Difficulty Selector Buttons */}
                <div
                  className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1"
                  role="group"
                  aria-label={`Difficulty for ${cp.label}`}
                >
                  {(['easy', 'medium', 'hard'] as const).map((diff) => {
                    const isSelected = currentDiff === diff;
                    return (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => handleSelect(roundId, diff)}
                        aria-pressed={isSelected}
                        className={`rounded-md px-3 py-1 text-xs font-black uppercase tracking-wider transition ${
                          isSelected
                            ? diff === 'easy'
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                              : diff === 'medium'
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                                : 'bg-rose-500 text-slate-100 shadow-md shadow-rose-500/20'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        }`}
                      >
                        {diff}
                      </button>
                    );
                  })}
                </div>
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
                <span>Round difficulties saved successfully!</span>
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
              className="bg-rose-500 hover:bg-rose-400 text-white font-black"
            >
              {busy ? 'Saving…' : 'Save Difficulties'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
