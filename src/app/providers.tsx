import { useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';
import { useAuthStore } from '@/stores/auth.store';

const INACTIVITY_TIMEOUT_MS = 60 * 1000; // 1 minute of continuous inactivity

function InactivityWatcher() {
  const identity = useAuthStore((state) => state.identity);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    // 1-minute inactivity timeout and single-active-session enforcement are strictly for players (participants), not admins
    if (!identity || identity.role !== 'PARTICIPANT') return;

    lastActivityRef.current = Date.now();

    const onActivity = () => {
      lastActivityRef.current = Date.now();
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

    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    const checkInactivity = () => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        void logout().then(() => {
          navigate('/login?reason=inactivity', { replace: true });
        });
      }
    };

    const interval = setInterval(checkInactivity, 1000);

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
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearInterval(interval);
      clearInterval(sessionCheckInterval);
      window.removeEventListener('hunt:session_expired', onSessionExpired);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [identity, logout, navigate]);

  return null;
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
      <Outlet />
    </>
  );
}
