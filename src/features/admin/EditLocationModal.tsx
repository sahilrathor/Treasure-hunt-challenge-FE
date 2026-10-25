import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, MapPin, Save, X } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { Field } from '@/components/atoms/Field';
import { ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';

export interface LocationData {
  id: string;
  code: string;
  label: string;
  clue: string;
  note: string;
  show_note_to_player: boolean;
  qr_token?: string | null;
  scanUrl?: string;
}

interface EditLocationModalProps {
  isOpen: boolean;
  onClose(): void;
  location: LocationData | null;
  onSaved(): void;
}

export function EditLocationModal({
  isOpen,
  onClose,
  location,
  onSaved,
}: EditLocationModalProps) {
  const [label, setLabel] = useState('');
  const [clue, setClue] = useState('');
  const [note, setNote] = useState('');
  const [showNoteToPlayer, setShowNoteToPlayer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!location || !isOpen) return;
    setLabel(location.label);
    setClue(location.clue || '');
    setNote(location.note || '');
    setShowNoteToPlayer(Boolean(location.show_note_to_player));
    setError('');
    setSuccess('');
  }, [location, isOpen]);

  if (!isOpen || !location) return null;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location) return;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      await huntApi.updateLocation(location.id, {
        label: label.trim(),
        clue: clue.trim(),
        note: note.trim(),
        showNoteToPlayer,
      });
      setSuccess('Location updated successfully!');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not update location.');
    } finally {
      setBusy(false);
    }
  }

  /* handleRotateQr commented out to avoid invalidating printed location QRs:
  async function handleRotateQr() {
    if (
      !window.confirm(
        'Generate a new QR code for this location? Any physical printed copies with the old code will stop working immediately.',
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      await huntApi.updateLocation(location!.id, {
        rotateToken: true,
      });
      setSuccess('New QR code generated!');
      onSaved();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not regenerate QR code.');
    } finally {
      setBusy(false);
    }
  }
  */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30">
            <MapPin size={20} />
          </div>
          <div>
            <span className="font-mono text-xs text-cyan-300 uppercase font-black">{location.code}</span>
            <h2 className="text-xl font-black text-slate-100">Edit Location Details</h2>
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

        <form onSubmit={handleSave} className="mt-5 grid gap-4">
          <Field
            label="Location Name / Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Science Block Room 102"
            required
            disabled={busy}
          />

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Unique Clue for this Location / QR
            </label>
            <textarea
              value={clue}
              onChange={(e) => setClue(e.target.value)}
              placeholder="e.g. Look behind the portrait of the founder on the second floor…"
              rows={3}
              required
              disabled={busy}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              This clue is shown to whichever team is currently routed to this location.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Admin Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bring a flashlight; beware of construction nearby; volunteer at desk can assist."
              rows={2}
              disabled={busy}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 cursor-pointer hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={showNoteToPlayer}
              onChange={(e) => setShowNoteToPlayer(e.target.checked)}
              disabled={busy}
              className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                {showNoteToPlayer ? (
                  <>
                    <Eye size={14} className="text-emerald-400" />
                    <span className="text-emerald-300">Show note to player</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={14} className="text-slate-400" />
                    <span>Keep note admin-only (hidden from players)</span>
                  </>
                )}
              </span>
              <p className="mt-0.5 text-slate-400">
                {showNoteToPlayer
                  ? 'Players will see this note on their clue screen when assigned to this location.'
                  : 'Only organizers and admins can see this note.'}
              </p>
            </div>
          </label>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
            {/* Regenerate/replace QR code button commented out to prevent invalidating printed QR codes:
            <Button
              type="button"
              variant="secondary"
              className="text-xs text-amber-300 hover:text-amber-200"
              disabled={busy}
              onClick={() => void handleRotateQr()}
            >
              <RefreshCw className="mr-1.5" size={14} /> Replace QR Code
            </Button>
            */}
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                <Save className="mr-1.5" size={15} /> {busy ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
