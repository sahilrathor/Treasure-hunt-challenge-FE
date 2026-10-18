import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { Field } from '@/components/atoms/Field';
import { Panel } from '@/components/atoms/Panel';
import { api } from '@/services/api-client';
import type { ApiEnvelope } from '@/types/api';

export function AdminResultsPage() {
  const [eventId, setEventId] = useState(() => localStorage.getItem('adminEventId') ?? '');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  async function load() {
    if (!eventId) return;
    const response = await api.get<ApiEnvelope<Array<Record<string, unknown>>>>('/admin/results', {
      params: { eventId },
    });
    setRows(response.data.data);
    localStorage.setItem('adminEventId', eventId);
  }
  useEffect(() => {
    void load();
  }, []);
  async function download() {
    const response = await api.get('/admin/results/export', {
      params: { eventId },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data as Blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'hunt-results.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Attempt reports</h1>
          <p className="mt-2 text-slate-400">Immutable member-level timing history.</p>
        </div>
        <Button onClick={() => void download()}>
          <Download className="mr-2" size={18} />
          CSV export
        </Button>
      </div>
      <div className="mt-6 flex gap-3">
        <div className="flex-1">
          <Field
            label="Event UUID"
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
          />
        </div>
        <Button variant="secondary" className="mt-7" onClick={() => void load()}>
          Load
        </Button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              {['Team', 'Member', 'Game', 'Round', 'Attempt', 'Status', 'Duration'].map(
                (header) => (
                  <th key={header} className="p-3">
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)} className="border-t border-slate-800">
                <td className="p-3">{String(row.team_code)}</td>
                <td className="p-3">{String(row.display_name)}</td>
                <td className="p-3">{String(row.game_code)}</td>
                <td className="p-3">{String(row.round)}</td>
                <td className="p-3">{String(row.attempt_number)}</td>
                <td className="p-3 font-bold">{String(row.status)}</td>
                <td className="p-3">
                  {row.duration_ms === null
                    ? '—'
                    : `${(Number(row.duration_ms) / 1000).toFixed(1)}s`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <Panel className="m-4">No attempts found.</Panel> : null}
      </div>
    </div>
  );
}
