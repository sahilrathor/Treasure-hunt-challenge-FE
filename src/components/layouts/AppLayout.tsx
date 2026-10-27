import { useState, useRef } from 'react';
import { ClipboardList, Gamepad2, LogOut, QrCode, Shield, Sparkles, Terminal, Trophy, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const identity = useAuthStore((state) => state.identity);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const logoClickRef = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null }>({
    count: 0,
    timer: null,
  });
  const [isCommandPromptOpen, setIsCommandPromptOpen] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [commandError, setCommandError] = useState('');

  function handleLogoClick(e: React.MouseEvent) {
    if (!identity || identity.role === 'PARTICIPANT') return;

    if (e.detail >= 3) {
      e.preventDefault();
      setIsCommandPromptOpen(true);
      setCommandText('');
      setCommandError('');
      logoClickRef.current.count = 0;
      return;
    }

    if (logoClickRef.current.timer) clearTimeout(logoClickRef.current.timer);
    const nextCount = logoClickRef.current.count + 1;
    if (nextCount >= 3) {
      e.preventDefault();
      logoClickRef.current.count = 0;
      setIsCommandPromptOpen(true);
      setCommandText('');
      setCommandError('');
    } else {
      logoClickRef.current.count = nextCount;
      logoClickRef.current.timer = setTimeout(() => {
        logoClickRef.current.count = 0;
      }, 1000);
    }
  }

  function handleCommandSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cmd = commandText.trim().toLowerCase();
    if (cmd === 'reset') {
      setIsCommandPromptOpen(false);
      setCommandText('');
      setCommandError('');
      if (location.pathname !== '/admin') {
        navigate('/admin', { state: { openResetModal: true } });
      } else {
        window.dispatchEvent(new CustomEvent('open-reset-hunt-modal'));
      }
    } else {
      setCommandError('Unknown command.');
    }
  }

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
              onClick={handleLogoClick}
              className="flex items-center gap-2 font-black tracking-tight text-lg select-none cursor-pointer"
            >
              <QrCode size={20} className="text-cyan-300 shrink-0" />
              <span>
                <span className="text-cyan-300">QR</span> QUEST
              </span>
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
      <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-clip px-4 py-6 pb-24">
        <div className="min-w-0">
          <Outlet />
        </div>
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
      {/* Secret Admin Command Prompt */}
      {isCommandPromptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Admin Console</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCommandPromptOpen(false)}
                className="text-slate-400 hover:text-slate-200"
                aria-label="Close command prompt"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCommandSubmit} className="mt-4 space-y-3">
              <p className="text-xs text-slate-400">
                Type command and press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] font-mono border border-slate-700 text-slate-300">Enter</kbd>:
              </p>
              <input
                type="text"
                autoFocus
                value={commandText}
                onChange={(e) => {
                  setCommandText(e.target.value);
                  setCommandError('');
                }}
                placeholder="type command and enter"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
              {commandError && (
                <p className="text-xs text-rose-400 font-semibold">{commandError}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs h-8 px-3"
                  onClick={() => setIsCommandPromptOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="text-xs h-8 px-3 font-bold">
                  Enter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
