import { ClipboardList, Gamepad2, LogOut, Shield, Sparkles, Trophy } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const identity = useAuthStore((state) => state.identity);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const links =
    identity?.role === 'PARTICIPANT'
      ? [
          { to: '/', label: 'Game', icon: Gamepad2 },
          { to: '/clue', label: 'Clue', icon: Sparkles },
        ]
      : identity
        ? [
            { to: '/admin', label: 'Admin', icon: Shield },
            { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
            { to: '/admin/results', label: 'Reports', icon: ClipboardList },
          ]
        : [];

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              to={identity?.role === 'PARTICIPANT' ? '/' : '/admin'}
              className="font-black tracking-tight text-lg"
            >
              <span className="text-cyan-300">QR</span> QUEST
            </Link>
            {links.length ? (
              <nav className="hidden sm:flex items-center gap-1">
                {links.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/' || to === '/admin'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition text-slate-400 hover:text-slate-100 hover:bg-slate-900',
                        isActive && 'bg-cyan-300/10 text-cyan-300',
                      )
                    }
                  >
                    <Icon size={16} />
                    {label}
                  </NavLink>
                ))}
              </nav>
            ) : null}
          </div>
          {identity ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-400 sm:block">{identity.displayName}</span>
              <Button
                variant="secondary"
                className="min-h-10 px-3"
                aria-label="Log out"
                onClick={() => void logout().then(() => navigate('/login'))}
              >
                <LogOut size={18} />
              </Button>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">
        <Outlet />
      </main>
      {links.length ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
          <div className="mx-auto flex max-w-md justify-around">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/' || to === '/admin'}
                className={({ isActive }) =>
                  cn(
                    'flex min-w-20 flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-slate-500',
                    isActive && 'bg-cyan-300/10 text-cyan-300',
                  )
                }
              >
                <Icon size={20} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
