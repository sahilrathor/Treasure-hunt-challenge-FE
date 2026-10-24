import { useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/auth.store';

const INACTIVITY_TIMEOUT_MS = 60 * 1000; // 1 minute of continuous inactivity

function InactivityWatcher() {
  const identity = useAuthStore((state) => state.identity);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!identity) return;

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

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearInterval(interval);
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
