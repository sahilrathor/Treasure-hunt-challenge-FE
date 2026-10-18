import { useState } from 'react';
import { Check, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { Field } from '@/components/atoms/Field';
import { huntApi } from '@/services/hunt-api';
import { ApiError } from '@/services/api-client';

interface Props {
  open: boolean;
  onClose(): void;
}

export function ChangeAdminPasswordModal({ open, onClose }: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await huntApi.changeAdminPassword(password);
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not change admin password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-password-title"
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
          <div className="grid size-11 place-items-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 id="admin-password-title" className="text-xl font-black text-slate-100">
              Admin Password
            </h2>
            <p className="text-xs text-slate-400">Update your administrator account password.</p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
            {error}
          </p>
        ) : null}

        {success ? (
          <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-center">
            <Check className="mx-auto text-emerald-400" size={32} />
            <p className="mt-2 font-bold text-slate-100">Admin password changed!</p>
            <p className="mt-1 text-xs text-slate-400">
              Your new password is now active for future logins.
            </p>
            <Button type="button" className="mt-4 w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <div className="relative">
              <Field
                label="New admin password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                required
                hint="Make sure to remember this password."
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 rounded-lg p-1.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={busy || password.length < 6}>
                {busy ? 'Updating…' : 'Update Password'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
