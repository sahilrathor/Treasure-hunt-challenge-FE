import { Compass, Download, Edit3, QrCode, RefreshCw } from 'lucide-react';

import { Button } from '@/components/atoms/Button';

export interface CheckpointSummary {
  id: string;
  label: string;
  sequence: number;
  round_id?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  clue?: string;
  team_clues?: Record<string, string>;
  game_id?: string | null;
  game_name?: string | null;
  game_code?: string | null;
}

export interface GeneratedCheckpointQr extends CheckpointSummary {
  scanUrl: string;
  imageUrl: string;
}

export function CheckpointQrCard({
  checkpoint,
  generated,
  busy,
  disabled,
  onGenerate,
  onEditClue,
  onEditDifficulty,
}: {
  checkpoint: CheckpointSummary;
  generated?: GeneratedCheckpointQr;
  busy: boolean;
  disabled: boolean;
  onGenerate(): void;
  onEditClue?(): void;
  onEditDifficulty?(): void;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Checkpoint {checkpoint.sequence}
            </p>
            <h3 className="font-black text-slate-100">{checkpoint.label}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <div>
                <span>Game: </span>
                <span className="font-bold text-amber-300">
                  {checkpoint.game_name ? checkpoint.game_name : '🎲 Random (Unplayed)'}
                </span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5">
                <span>Difficulty: </span>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    checkpoint.difficulty === 'easy'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : checkpoint.difficulty === 'medium'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {checkpoint.difficulty ?? 'easy'}
                </span>
                {onEditDifficulty && (
                  <button
                    type="button"
                    onClick={onEditDifficulty}
                    className="text-slate-400 hover:text-cyan-300 transition p-0.5"
                    title={`Change difficulty for ${checkpoint.label}`}
                    aria-label={`Change difficulty for ${checkpoint.label}`}
                  >
                    <Edit3 size={11} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <QrCode className="text-slate-500" />
        </div>

        {/* Clue section */}
        <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-bold mb-1">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Compass size={14} /> Round {checkpoint.sequence} Default Clue
            </span>
            {onEditClue && (
              <button
                type="button"
                onClick={onEditClue}
                className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-semibold text-[11px] transition"
              >
                <Edit3 size={12} /> Team Clues
              </button>
            )}
          </div>
          <p className="text-slate-300 italic line-clamp-2 mt-0.5">
            {checkpoint.clue ? `"${checkpoint.clue}"` : `Proceed to Checkpoint ${checkpoint.sequence}.`}
          </p>
        </div>
      </div>

      {generated ? (
        <div className="mt-4">
          <div className="rounded-xl bg-white p-3">
            <img
              src={generated.imageUrl}
              alt={`QR code for ${checkpoint.label}`}
              className="mx-auto aspect-square w-full max-w-64"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild>
              <a href={generated.imageUrl} download={`checkpoint-${checkpoint.sequence}-qr.png`}>
                <Download className="mr-2" size={17} /> Download
              </a>
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || busy}
              onClick={onGenerate}
            >
              <RefreshCw className="mr-2" size={17} /> Replace
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          className="mt-4 w-full"
          disabled={disabled || busy}
          onClick={onGenerate}
        >
          <QrCode className="mr-2" size={18} /> {busy ? 'Generating…' : 'Generate QR'}
        </Button>
      )}
    </article>
  );
}
