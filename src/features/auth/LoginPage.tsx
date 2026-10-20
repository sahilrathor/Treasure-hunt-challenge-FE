import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { Field } from '@/components/atoms/Field';
import { Panel } from '@/components/atoms/Panel';
import { ApiError } from '@/services/api-client';
import { useAuthStore } from '@/stores/auth.store';

export function LoginPage() {
  const identity = useAuthStore((state) => state.identity);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const [adminMode, setAdminMode] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  if (identity) return <Navigate to={identity.role === 'PARTICIPANT' ? '/' : '/admin'} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const current = await login({
        identifier: String(form.get('identifier')),
        password: String(form.get('password')),
      });
      navigate(current.role === 'PARTICIPANT' ? '/' : '/admin');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Login failed.');
    }
  }

  return (
    <div className="mx-auto grid min-h-[75dvh] max-w-md place-items-center">
      <Panel className="w-full p-7">
        <p className="text-xs font-black uppercase tracking-[.28em] text-cyan-300">
          Enter the hunt
        </p>
        <h1 className="mt-3 text-4xl font-black">Welcome, player.</h1>
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-950 p-1 text-sm font-bold">
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
    </div>
  );
}
