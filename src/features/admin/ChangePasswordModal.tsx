import { useEffect, useState } from 'react';
import { Check, Clipboard, Eye, EyeOff, KeyRound, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { Field } from '@/components/atoms/Field';
import { huntApi } from '@/services/hunt-api';
import { ApiError } from '@/services/api-client';

export interface ParticipantTarget {
  id: string;
  displayName: string;
  memberCode: string;
  teamName?: string;
}

interface Props {
  member: ParticipantTarget | null;
  onClose(): void;
  onSuccess?(newPassword: string): void;
}

export function ChangePasswordModal({ member, onClose, onSuccess }: Props) {
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successPassword, setSuccessPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCustomPassword('');
    setShowPassword(false);
    setBusy(false);
    setError('');
    setSuccessPassword(null);
    setCopied(false);
  }, [member?.id]);

  function handleClose() {
    setCustomPassword('');
    setShowPassword(false);
    setBusy(false);
    setError('');
    setSuccessPassword(null);
    setCopied(false);
    onClose();
  }

  if (!member) return null;

  async function handleGenerateRandom() {
    setBusy(true);
    setError('');
    try {
      const res = await huntApi.resetParticipantPassword(member!.id);
      setSuccessPassword(res.password);
      onSuccess?.(res.password);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not reset password.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customPassword.trim()) {
      setError('Please enter a password.');
      return;
    }
    if (customPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await huntApi.resetParticipantPassword(member!.id, customPassword.trim());
      setSuccessPassword(res.password);
      onSuccess?.(res.password);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!successPassword) return;
    await navigator.clipboard.writeText(successPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/40">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 rounded-xl border border-slate-700/60 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30">
            <KeyRound size={22} />
          </div>
          <div>
            <h2 id="change-password-title" className="text-xl font-black text-slate-100">
              Change User Password
            </h2>
            <p className="text-xs text-slate-400">
              Update login credentials for this participant.
            </p>
          </div>
        </div>

        {/* Target User Info Card */}
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Participant
              </p>
              <p className="font-black text-slate-100">{member.displayName}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Login ID
              </p>
              <p className="font-mono font-bold text-cyan-300">{member.memberCode}</p>
            </div>
            {member.teamName ? (
              <div className="col-span-2 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Team
                </p>
                <p className="text-xs font-semibold text-slate-300">{member.teamName}</p>
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
            {error}
          </p>
        ) : null}

        {successPassword ? (
          <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <Check size={18} />
              <span className="text-sm font-bold">Password updated successfully!</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Provide this new password to the participant. Any active sessions were revoked.
            </p>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3">
              <span className="font-mono text-base font-black tracking-wider text-amber-200">
                {successPassword}
              </span>
              <Button
                type="button"
                variant="secondary"
                className="min-h-9 px-3 text-xs"
                onClick={() => void handleCopy()}
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 text-emerald-400" size={14} /> Copied!
                  </>
                ) : (
                  <>
                    <Clipboard className="mr-1.5" size={14} /> Copy
                  </>
                )}
              </Button>
            </div>

            <Button
              type="button"
              className="mt-4 w-full"
              onClick={handleClose}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {/* Quick Action: Auto-generate */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-200">Auto-generate password</p>
                  <p className="text-xs text-slate-500">
                    Instantly creates a secure random code (e.g. Hunt-492810!)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  className="shrink-0 text-xs"
                  onClick={() => void handleGenerateRandom()}
                >
                  <Sparkles className="mr-1.5 text-cyan-300" size={15} />
                  {busy ? 'Generating…' : 'Generate'}
                </Button>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-slate-900 px-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                or set custom
              </span>
            </div>

            {/* Custom password form */}
            <form onSubmit={handleCustomSubmit} className="grid gap-3">
              <div className="relative">
                <Field
                  label="Custom password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  disabled={busy}
                  required
                  hint="Enter a new password for the user."
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

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button disabled={busy || !customPassword.trim()}>
                  {busy ? 'Saving…' : 'Save Password'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
