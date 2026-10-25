import { ArrowRight, Compass, Info, MapPin, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/atoms/Button';
import { Panel } from '@/components/atoms/Panel';
import { huntApi } from '@/services/hunt-api';

interface ClueData {
  status: string;
  round?: number;
  clue: string | null;
  note?: string | null;
  locationLabel?: string | null;
}

export function CluePage() {
  const [data, setData] = useState<ClueData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void huntApi
      .clue()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((cause: Error) => {
        setError(cause.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="mx-auto max-w-xl grid gap-5">
      <Panel className="border-cyan-400/20 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30">
              <Compass size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[.25em] text-cyan-300">
                {data?.round ? `Round ${data.round} Clue` : 'Current Clue'}
              </p>
              <h2 className="text-xs text-slate-400">Head to the next location</h2>
            </div>
          </div>
          {data?.round ? (
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
              Round {data.round}
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-8 py-6 text-center">
            <p className="animate-pulse text-slate-400 text-sm">Decrypting your next location clue…</p>
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl bg-rose-500/10 p-4 border border-rose-500/30">
            <p className="text-sm font-semibold text-rose-300">{error}</p>
          </div>
        ) : data?.status === 'COMPLETED' ? (
          <div className="mt-6 py-6 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/30">
              <MapPin size={26} />
            </div>
            <h1 className="mt-4 text-2xl font-black text-slate-100">You found them all!</h1>
            <p className="mt-2 text-sm text-slate-400">
              Your team has completed all checkpoints in the hunt. Check the leaderboard for final standings.
            </p>
            <Button asChild className="mt-6">
              <Link to="/leaderboard">View Leaderboard</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-inner">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-1.5">
                <MapPin size={14} /> Location Clue
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-100 leading-snug">
                {data?.clue || 'Proceed to the next location on your route.'}
              </p>
            </div>

            {/* Note field from admin (shown only if admin enabled show_note_to_player) */}
            {data?.note ? (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <Info size={15} />
                  <span>Note from Organizer</span>
                </div>
                <p className="mt-2 text-sm text-amber-100/90 whitespace-pre-wrap leading-relaxed font-medium">
                  {data.note}
                </p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button asChild className="w-full">
                <Link to="/scan">
                  <QrCode className="mr-2" size={17} /> Scan Location QR
                </Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link to="/dashboard">
                  Dashboard <ArrowRight className="ml-2" size={15} />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
