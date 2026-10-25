import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';
import { getPendingSubmissions, syncAllPendingSubmissions } from '@/services/offline-sync';
import { useAuthStore } from '@/stores/auth.store';

const INACTIVITY_TIMEOUT_MS = 60 * 1000; // 1 minute of continuous inactivity
const WARNING_THRESHOLD_MS = 20 * 1000;  // Show countdown warning during the last 20 seconds

function InactivityWatcher() {
  const identity = useAuthStore((state) => state.identity);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const lastActivityRef = useRef(Date.now());
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    // 1-minute inactivity timeout and single-active-session enforcement are strictly for players (participants), not admins
    if (!identity || identity.role !== 'PARTICIPANT') {
      setCountdown(null);
      return;
    }

    lastActivityRef.current = Date.now();

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      setCountdown((prev) => (prev !== null ? null : prev));
    };

    const events: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
    ];

    events.forEach((ev) => window.addEventListener(ev, resetActivity, { passive: true }));

    const checkInactivity = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remainingMs = INACTIVITY_TIMEOUT_MS - elapsed;

      if (remainingMs <= 0) {
        setCountdown(null);
        void logout().then(() => {
          navigate('/login?reason=inactivity', { replace: true });
        });
        return;
      }

      if (remainingMs <= WARNING_THRESHOLD_MS) {
        const remainingSec = Math.ceil(remainingMs / 1000);
        setCountdown(remainingSec);
      } else {
        setCountdown((prev) => (prev !== null ? null : prev));
      }
    };

    const interval = setInterval(checkInactivity, 500);

    // Heartbeat check every 10 seconds to detect if another teammate logged in
    const sessionCheckInterval = setInterval(() => {
      if (identity.role === 'PARTICIPANT' && document.visibilityState === 'visible') {
        huntApi.me().catch((err) => {
          if (
            err instanceof ApiError &&
            (err.status === 401 || err.code === 'SESSION_EXPIRED' || err.code === 'UNAUTHENTICATED')
          ) {
            void logout().then(() => {
              navigate('/login?reason=teammate_logged_in', { replace: true });
            });
          }
        });
      }
    }, 10_000);

    const onSessionExpired = () => {
      void logout().then(() => {
        navigate('/login?reason=teammate_logged_in', { replace: true });
      });
    };

    window.addEventListener('hunt:session_expired', onSessionExpired);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetActivity));
      clearInterval(interval);
      clearInterval(sessionCheckInterval);
      window.removeEventListener('hunt:session_expired', onSessionExpired);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [identity, logout, navigate]);

  if (countdown === null || !identity || identity.role !== 'PARTICIPANT') {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Inactivity warning"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={() => {
        lastActivityRef.current = Date.now();
        setCountdown(null);
      }}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/20 p-6 text-center shadow-2xl shadow-amber-950/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mx-auto flex size-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping opacity-50" />
          <div className="relative grid size-20 place-items-center rounded-full border-2 border-amber-400/80 bg-slate-950 font-black text-2xl font-mono text-amber-300 shadow-inner">
            {countdown}s
          </div>
        </div>

        <h3 className="mt-4 text-xl font-black text-slate-100 flex items-center justify-center gap-2">
          <Clock className="text-amber-400" size={20} />
          Inactivity Warning
        </h3>

        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          You will be logged out in{' '}
          <strong className="font-mono text-amber-300 font-bold text-sm">
            {countdown} second{countdown === 1 ? '' : 's'}
          </strong>{' '}
          due to 1 minute of inactivity.
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          Tap anywhere or click below to continue playing.
        </p>

        <Button
          type="button"
          variant="primary"
          className="mt-5 w-full bg-amber-400 text-slate-950 hover:bg-amber-300 font-black text-sm"
          onClick={() => {
            lastActivityRef.current = Date.now();
            setCountdown(null);
          }}
        >
          Keep Playing (Stay Logged In)
        </Button>
      </div>
    </div>
  );
}

function OfflineSyncWatcher() {
  const identity = useAuthStore((state) => state.identity);
  const [syncedNotice, setSyncedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) return;

    const checkAndSync = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const pending = getPendingSubmissions();
      if (!pending.length) return;

      const res = await syncAllPendingSubmissions();
      if (res.synced > 0) {
        setSyncedNotice(
          `Synced ${res.synced} offline game completion${res.synced === 1 ? '' : 's'} with server!`,
        );
        setTimeout(() => setSyncedNotice(null), 5000);
      }
    };

    void checkAndSync();
    window.addEventListener('online', checkAndSync);
    return () => window.removeEventListener('online', checkAndSync);
  }, [identity]);

  if (!syncedNotice) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-950/90 px-4 py-3 text-xs font-bold text-emerald-200 shadow-xl backdrop-blur animate-in fade-in slide-in-from-bottom-2">
      <CheckCircle2 size={16} className="text-emerald-400" />
      <span>{syncedNotice}</span>
    </div>
  );
}

export function SessionProvider() {
  const restore = useAuthStore((state) => state.restore);
  const initialized = useAuthStore((state) => state.initialized);
  useEffect(() => {
    if (!initialized) void restore();
  }, [initialized, restore]);

  if (!initialized)
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 text-cyan-300">
        <p className="animate-pulse font-black tracking-[.3em]">LOADING QUEST</p>
      </div>
    );

  return (
    <>
      <InactivityWatcher />
      <OfflineSyncWatcher />
      <Outlet />
    </>
  );
}
