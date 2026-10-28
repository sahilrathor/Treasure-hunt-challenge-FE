import { useState, type FormEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { Field } from '@/components/atoms/Field';
import { Panel } from '@/components/atoms/Panel';
import { ApiError } from '@/services/api-client';
import { useAuthStore } from '@/stores/auth.store';

interface ActivePlayerWarning {
  identifier: string;
  password: string;
  qrToken?: string;
  activePlayer: {
    participantId: string;
    displayName: string;
    memberCode: string;
    loggedInAt?: string;
  };
}

export function LoginPage() {
  const identity = useAuthStore((state) => state.identity);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const [adminMode, setAdminMode] = useState(false);
  const [error, setError] = useState('');
  const [warningTarget, setWarningTarget] = useState<ActivePlayerWarning | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scanToken = params.get('scanToken');
  if (identity && !scanToken)
    return <Navigate to={identity.role === 'PARTICIPANT' ? '/' : '/admin'} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get('identifier'));
    const password = String(form.get('password'));
    const qrToken = scanToken ?? undefined;
    try {
      const current = await login({
        identifier,
        password,
        ...(qrToken ? { qrToken } : {}),
      });
      navigate(
        current.role === 'PARTICIPANT' && scanToken
          ? `/scan?token=${encodeURIComponent(scanToken)}`
          : current.role === 'PARTICIPANT'
            ? '/'
            : '/admin',
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'TEAM_ALREADY_LOGGED_IN') {
        const details = cause.details as {
          activePlayer?: {
            participantId: string;
            displayName: string;
            memberCode: string;
            loggedInAt?: string;
          };
        } | undefined;

        if (details?.activePlayer) {
          setWarningTarget({
            identifier,
            password,
            qrToken,
            activePlayer: details.activePlayer,
          });
          return;
        }
      }
      setError(cause instanceof ApiError ? cause.message : 'Login failed.');
    }
  }

  async function confirmTakeover() {
    if (!warningTarget) return;
    setError('');
    try {
      const current = await login({
        identifier: warningTarget.identifier,
        password: warningTarget.password,
        ...(warningTarget.qrToken ? { qrToken: warningTarget.qrToken } : {}),
        force: true,
      });
      setWarningTarget(null);
      navigate(
        current.role === 'PARTICIPANT' && scanToken
          ? `/scan?token=${encodeURIComponent(scanToken)}`
          : current.role === 'PARTICIPANT'
            ? '/'
            : '/admin',
      );
    } catch (cause) {
      setWarningTarget(null);
      setError(cause instanceof ApiError ? cause.message : 'Login failed.');
    }
  }

  return (
    <div className="mx-auto grid min-h-[75dvh] max-w-md place-items-center">
      <Panel className="w-full p-7">
        <p className="text-xs font-black uppercase tracking-[.28em] text-cyan-300">
          {scanToken ? 'Checkpoint verification' : 'Enter the hunt'}
        </p>
        <h1 className="mt-3 text-4xl font-black">
          {scanToken ? 'Log in to unlock this checkpoint.' : 'Welcome, player.'}
        </h1>
        {params.get('reason') === 'inactivity' && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300">
            You were logged out due to 1 minute of continuous inactivity.
          </div>
        )}
        {params.get('reason') === 'teammate_logged_in' && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300">
            Another player from your team logged in, so your session was logged out.
          </div>
        )}
        {params.get('reason') === 'admin_logout' && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
            Your session was ended by an administrator.
          </div>
        )}
        <div
          className={`mt-6 grid grid-cols-2 rounded-xl bg-slate-950 p-1 text-sm font-bold ${scanToken ? 'hidden' : ''}`}
        >
          <button
            className={`rounded-lg p-2 ${!adminMode ? 'bg-cyan-300 text-slate-950' : 'text-slate-400'}`}
            onClick={() => setAdminMode(false)}
          >
            Participant
          </button>
          <button
            className={`rounded-lg p-2 ${adminMode ? 'bg-cyan-300 text-slate-950' : 'text-slate-400'}`}
            onClick={() => setAdminMode(true)}
          >
            Organizer
          </button>
        </div>
        <form className="mt-6 grid gap-4" onSubmit={(event) => void submit(event)}>
          <Field
            label={adminMode ? 'Username' : 'Member ID'}
            name="identifier"
            autoComplete="username"
            required
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          {error ? (
            <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </p>
          ) : null}
          <Button disabled={loading}>{loading ? 'Checking…' : 'Continue'}</Button>
        </form>
      </Panel>

      {warningTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm animate-in fade-in">
          <Panel className="w-full max-w-md border-amber-500/40 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-400 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-100">Teammate Currently Active</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Another player from your team is already logged in.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-200">{warningTarget.activePlayer.displayName}</p>
                  <p className="font-mono text-xs text-cyan-300">{warningTarget.activePlayer.memberCode}</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online now
                </span>
              </div>
              {warningTarget.activePlayer.loggedInAt && (
                <p className="mt-2 text-xs text-slate-500">
                  Logged in at:{' '}
                  {new Date(warningTarget.activePlayer.loggedInAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90 leading-relaxed">
              <strong>Notice:</strong> Only one player per team can participate at a time. Logging in now will{' '}
              <strong>immediately log out</strong> {warningTarget.activePlayer.displayName} on their device.
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-300">
              Do you want to continue and take over the session?
            </p>

            <div className="mt-5 flex gap-2.5">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setWarningTarget(null)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-400 font-bold"
                onClick={() => void confirmTakeover()}
                disabled={loading}
              >
                {loading ? 'Logging in…' : 'Log In & Continue'}
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
