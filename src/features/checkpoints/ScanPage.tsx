import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Panel } from '@/components/atoms/Panel';
import { ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';
import { useAuthStore } from '@/stores/auth.store';

export function ScanPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const identity = useAuthStore((state) => state.identity);

  useEffect(() => {
    if (!token) return;
    let active = true;

    // A scanned checkpoint still requires a participant session, but an already signed-in
    // player must keep that session. Logging them out here forced an unnecessary second login
    // and could leave the player facing an "Authentication is required" response.
    if (identity?.role !== 'PARTICIPANT') {
      navigate(`/login?scanToken=${encodeURIComponent(token)}`, { replace: true });
      return;
    }
    void huntApi
      .scan(token)
      .then((assignment) => {
        if (active) navigate(`/assignments/${assignment.id}`, { replace: true });
      })
      .catch((cause) => {
        if (active) setError(cause instanceof ApiError ? cause.message : 'QR scan failed.');
      });
    return () => {
      active = false;
    };
  }, [identity, navigate, token]);

  return (
    <Panel className="mx-auto max-w-lg text-center">
      <QrCode className="mx-auto text-cyan-300" size={48} />
      {token ? (
        <>
          <h1 className="mt-4 text-3xl font-black">Checking checkpoint…</h1>
          <p className="mt-2 text-slate-400">
            Your current game will open after the QR is verified.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-3xl font-black">Scan the checkpoint QR</h1>
          <p className="mt-2 text-slate-400">
            Open your phone camera and scan the printed QR at your current checkpoint. Games cannot
            be selected manually.
          </p>
        </>
      )}
      {error ? (
        <p role="alert" className="mt-5 rounded-xl bg-rose-500/10 p-3 text-rose-300">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
