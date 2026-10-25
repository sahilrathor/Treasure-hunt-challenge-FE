import { useState } from 'react';
import { AlertTriangle, ShieldAlert, Trash2, X } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';

export type ResetTarget = 'all' | 'teams' | 'rounds' | 'locations';

interface ResetOption {
  id: ResetTarget;
  title: string;
  badge: string;
  description: string;
  requiredPhrase: string;
}

const RESET_OPTIONS: ResetOption[] = [
  {
    id: 'all',
    title: 'Everything (Full Hunt Reset)',
    badge: 'Full Database Wipe',
    description:
      'Permanently clears all teams, participant accounts, competition rounds, physical locations/QRs, and attempt records. Resets the hunt back to a fresh draft.',
    requiredPhrase: 'RESET ALL',
  },
  {
    id: 'teams',
    title: 'Teams & Participants Only',
    badge: 'Accounts & Progress',
    description:
      'Deletes all registered teams, participant credentials, active logins, and attempt records. Rounds and physical locations will remain intact.',
    requiredPhrase: 'RESET TEAMS',
  },
  {
    id: 'rounds',
    title: 'Competition Rounds Only',
    badge: 'Rounds & Game Mappings',
    description:
      'Clears all competition rounds, round game mappings, and team round route assignments. Teams and physical checkpoints will remain intact.',
    requiredPhrase: 'RESET ROUNDS',
  },
  {
    id: 'locations',
    title: 'Physical Locations & QRs Only',
    badge: 'Checkpoints & QRs',
    description:
      'Deletes all physical checkpoints, QR tokens, and assigned routes. Teams and rounds will remain intact.',
    requiredPhrase: 'RESET LOCATIONS',
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess: (message: string) => void;
}

export function ResetHuntModal({ isOpen, onClose, eventId, onSuccess }: Props) {
  const [target, setTarget] = useState<ResetTarget>('all');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentOption = RESET_OPTIONS.find((opt) => opt.id === target)!;
  const isConfirmed =
    confirmationInput.trim().toUpperCase() === currentOption.requiredPhrase;

  function handleTargetChange(newTarget: ResetTarget) {
    setTarget(newTarget);
    setConfirmationInput('');
    setError('');
  }

  async function handleReset() {
    if (!isConfirmed) return;
    setBusy(true);
    setError('');
    try {
      const response = await huntApi.resetEventData(eventId, {
        target,
        confirmationText: confirmationInput.trim(),
      });
      onSuccess(response.message);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not reset hunt data. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
    >
      <div className="relative flex flex-col w-full max-w-xl max-h-[92vh] rounded-2xl border border-rose-500/40 bg-slate-900 shadow-2xl shadow-rose-950/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-500/20 px-5 py-4 bg-gradient-to-r from-rose-950/50 via-slate-900 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 id="reset-modal-title" className="text-base font-black text-rose-100">
                Secure Data Reset
              </h2>
              <p className="text-xs text-rose-300/70">
                Selective or full database wipe for organizer administration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close reset modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="px-5 py-3 border-b border-rose-500/20 bg-rose-950/30 text-xs text-rose-200 flex items-start gap-2.5">
          <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={16} />
          <p>
            <strong>Warning:</strong> Data deletion is permanent and cannot be reversed.
            Please ensure you have saved any leaderboards or exported required data before proceeding.
          </p>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/60">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Choose What to Reset
            </label>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              {RESET_OPTIONS.map((opt) => {
                const isSelected = target === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleTargetChange(opt.id)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? 'border-rose-500 bg-rose-950/30 ring-1 ring-rose-500/50'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-100">{opt.title}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirmation Input Box */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-2.5">
            <label
              htmlFor="confirmation-phrase-input"
              className="block text-xs font-bold text-rose-200"
            >
              Type{' '}
              <span className="font-mono px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500/50 text-rose-300 select-all font-black">
                {currentOption.requiredPhrase}
              </span>{' '}
              to confirm:
            </label>
            <input
              id="confirmation-phrase-input"
              type="text"
              autoComplete="off"
              spellCheck="false"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={`Enter "${currentOption.requiredPhrase}"`}
              className="w-full rounded-lg border border-rose-500/40 bg-slate-950 px-3 py-2 font-mono text-sm font-bold text-rose-100 placeholder:text-slate-600 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
            <p className="text-[11px] text-slate-400">
              The reset button will remain disabled until the exact phrase is typed above.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 p-4 bg-slate-900/90">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!isConfirmed || busy}
            onClick={() => void handleReset()}
            className="border-rose-500/50 bg-rose-600 hover:bg-rose-500 text-white font-bold"
          >
            <Trash2 className="mr-1.5" size={15} />
            {busy ? 'Resetting…' : `Confirm Reset (${currentOption.title})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
