import { useEffect, useState } from 'react';

import { Panel } from '@/components/atoms/Panel';
import { huntApi } from '@/services/hunt-api';

export function HistoryPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    void huntApi.history().then(setItems);
  }, []);
  return (
    <div>
      <h1 className="text-3xl font-black">Your attempts</h1>
      <p className="mt-2 text-slate-400">Official server timing for games you personally played.</p>
      <div className="mt-6 grid gap-3">
        {items.length ? (
          items.map((item) => (
            <Panel key={String(item.id)} className="flex items-center justify-between">
              <div>
                <p className="font-bold">
                  {String(item.game_name)} · Round {String(item.round)}
                </p>
                <p className="text-sm text-slate-500">Attempt {String(item.attempt_number)}</p>
              </div>
              <div className="text-right">
                <p
                  className={
                    item.status === 'passed'
                      ? 'font-bold text-emerald-300'
                      : 'font-bold text-amber-300'
                  }
                >
                  {String(item.status).toUpperCase()}
                </p>
                <p className="text-sm text-slate-400">
                  {item.duration_ms === null
                    ? '—'
                    : `${(Number(item.duration_ms) / 1000).toFixed(1)}s`}
                </p>
              </div>
            </Panel>
          ))
        ) : (
          <Panel>
            <p className="text-slate-400">No attempts played yet.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}
