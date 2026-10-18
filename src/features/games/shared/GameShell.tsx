import { useEffect, useState, type ReactNode } from 'react';

import { Panel } from '@/components/atoms/Panel';

export function GameTimer({ startedAt }: { startedAt: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return (
    <span className="rounded-full bg-slate-950 px-3 py-1 font-mono text-sm text-cyan-300">
      {Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0')}
      :{(seconds % 60).toString().padStart(2, '0')}
    </span>
  );
}

export function GameShell({
  title,
  instructions,
  startedAt,
  children,
}: {
  title: string;
  instructions: string;
  startedAt?: string;
  children: ReactNode;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="flex items-start justify-between border-b border-slate-800 p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">
            Active challenge
          </p>
          <h1 className="mt-1 text-2xl font-black">{title}</h1>
        </div>
        {startedAt ? <GameTimer startedAt={startedAt} /> : null}
      </div>
      <div className="p-5">
        <p className="mb-5 rounded-xl bg-slate-950 p-3 text-sm text-slate-300">{instructions}</p>
        {children}
      </div>
    </Panel>
  );
}
