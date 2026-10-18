import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Panel } from '@/components/atoms/Panel';
import { huntApi } from '@/services/hunt-api';

export function CluePage() {
  const [data, setData] = useState<{ status: string; round?: number; clue: string | null } | null>(
    null,
  );
  const [error, setError] = useState('');
  useEffect(() => {
    void huntApi
      .clue()
      .then(setData)
      .catch((cause: Error) => setError(cause.message));
  }, []);
  return (
    <Panel className="mx-auto max-w-xl border-cyan-400/20">
      <MapPin className="text-cyan-300" size={32} />
      <p className="mt-5 text-xs font-black uppercase tracking-[.25em] text-cyan-300">
        {data?.round ? `Round ${data.round}` : 'Current clue'}
      </p>
      <h1 className="mt-3 text-3xl font-black">
        {data?.status === 'COMPLETED'
          ? 'You found them all.'
          : (data?.clue ?? (error || 'Decrypting clue…'))}
      </h1>
      <p className="mt-5 text-slate-400">Only your team’s currently unlocked clue is shown here.</p>
    </Panel>
  );
}
