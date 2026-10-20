import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, TimerReset, X } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { Field } from '@/components/atoms/Field';
import { ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';
import type { AdminGame } from '@/types/api';

interface Props {
  open: boolean;
  onClose(): void;
}

export function CooldownSettingsModal({ open, onClose }: Props) {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [seconds, setSeconds] = useState(10);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mixed, setMixed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const levelCount = useMemo(
    () => games.reduce((total, game) => total + game.levels.length, 0),
    [games],
  );

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    setSuccess(false);
    void huntApi
      .listGames()
      .then((result) => {
        setGames(result);
        const cooldowns = result.flatMap((game) =>
          game.levels.map((level) => level.cooldownSeconds),
        );
        if (cooldowns.length) {
          setSeconds(cooldowns[0]!);
          setMixed(cooldowns.some((value) => value !== cooldowns[0]));
        }
      })
      .catch((cause) => {
        setError(cause instanceof ApiError ? cause.message : 'Could not load cooldown settings.');
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 3600) {
      setError('Cooldown must be a whole number from 0 to 3600 seconds.');
      return;
    }
    if (!levelCount) {
      setError('No game difficulty levels are available.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await Promise.all(
        games.flatMap((game) =>
          game.levels.map((level) =>
            huntApi.updateGameLevel(game.id, {
              difficulty: level.difficulty,
              config: level.config,
              maxAttempts: level.maxAttempts,
              cooldownSeconds: seconds,
            }),
          ),
        ),
      );
      setMixed(false);
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not save cooldown time.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cooldown-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 rounded-xl border border-slate-700/60 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30">
            <TimerReset size={22} />
          </div>
          <div>
            <h2 id="cooldown-title" className="text-xl font-black text-slate-100">
              Retry Cooldown
            </h2>
            <p className="text-xs text-slate-400">Set the wait after a failed game attempt.</p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">
            <Check size={17} /> Cooldown set to {seconds} seconds.
          </p>
        ) : null}

        <form className="mt-5 grid gap-4" onSubmit={(event) => void save(event)}>
          <Field
            label="Cooldown time (seconds)"
            type="number"
            min={0}
            max={3600}
            step={1}
            value={seconds}
            onChange={(event) => setSeconds(Number(event.target.value))}
            disabled={loading || saving}
            required
            hint={
              mixed
                ? 'Current games have different cooldowns. Saving will apply this value to all.'
                : `Applies to all ${levelCount} game difficulty levels.`
            }
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={loading || saving || !levelCount}>
              {saving ? 'Saving…' : 'Save Cooldown'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
