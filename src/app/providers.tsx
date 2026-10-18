import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { useAuthStore } from '@/stores/auth.store';

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
  return <Outlet />;
}
