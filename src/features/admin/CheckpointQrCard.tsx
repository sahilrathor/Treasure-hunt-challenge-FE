import { useState } from 'react';
import {
  Check,
  Compass,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  QrCode,
} from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { copyToClipboard } from '@/lib/utils';

export interface CheckpointSummary {
  id: string;
  code?: string;
  label: string;
  sequence: number;
  round_id?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  clue?: string;
  note?: string;
  show_note_to_player?: boolean;
  qr_token?: string | null;
  scanUrl?: string;
  team_clues?: Record<string, string>;
  game_id?: string | null;
  game_name?: string | null;
  game_code?: string | null;
}

export interface GeneratedCheckpointQr extends CheckpointSummary {
  scanUrl: string;
  imageUrl: string;
  teamId?: string;
  teamCode?: string;
}

export function CheckpointQrCard({
  checkpoint,
  generated,
  busy,
  disabled,
  onGenerate,
  onCopyLink,
  onEditLocation,
  onEditClue,
  onEditDifficulty,
}: {
  checkpoint: CheckpointSummary;
  generated?: GeneratedCheckpointQr;
  busy: boolean;
  disabled: boolean;
  onGenerate(): void;
  onCopyLink?(): void;
  onEditLocation?(): void;
  onEditClue?(): void;
  onEditDifficulty?(): void;
}) {
  const [copied, setCopied] = useState(false);
  const code = checkpoint.code || (checkpoint.sequence ? `LOC-${checkpoint.sequence}` : 'LOC');
  const handleEdit = onEditLocation || onEditClue;
  const effectiveScanUrl = generated?.scanUrl || checkpoint.scanUrl;

  async function handleCopy() {
    if (effectiveScanUrl) {
      const ok = await copyToClipboard(effectiveScanUrl);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      onCopyLink?.();
      return;
    }

    if (onCopyLink) {
      onCopyLink();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      onGenerate();
    }
  }

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col justify-between hover:border-slate-700/80 transition shadow-lg">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black uppercase tracking-wider text-cyan-300">
                {code}
              </span>
              <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                Location QR
              </span>
            </div>
            <h3 className="mt-1 text-base font-black text-slate-100">{checkpoint.label}</h3>
            {checkpoint.difficulty ? (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
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
                  {checkpoint.difficulty}
                </span>
                {onEditDifficulty && (
                  <button
                    type="button"
                    onClick={onEditDifficulty}
                    className="text-slate-400 hover:text-cyan-300 transition p-0.5"
                    title={`Change difficulty for ${checkpoint.label}`}
                  >
                    <Edit3 size={11} />
                  </button>
                )}
              </div>
            ) : null}
          </div>
          {handleEdit && (
            <Button
              type="button"
              variant="secondary"
              className="min-h-8 px-2.5 text-xs shrink-0"
              onClick={handleEdit}
              title="Edit Location, Clue & Notes"
            >
              <Edit3 size={13} className="mr-1 text-cyan-300" /> Edit
            </Button>
          )}
        </div>

        {/* Unique Location Clue */}
        <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-bold mb-1">
            <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Compass size={14} /> Location Clue
            </span>
          </div>
          <p className="text-slate-300 italic line-clamp-2 mt-0.5">
            {checkpoint.clue ? `"${checkpoint.clue}"` : 'No clue configured for this location.'}
          </p>
        </div>

        {/* Note field with visibility badge */}
        <div className="mt-2.5 rounded-xl border border-slate-800/60 bg-slate-900/40 p-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
              <FileText size={13} /> Admin Note
            </span>
            {checkpoint.note ? (
              checkpoint.show_note_to_player ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  <Eye size={10} /> Player Visible
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-700">
                  <EyeOff size={10} /> Admin Only
                </span>
              )
            ) : null}
          </div>
          <p className="text-slate-400 text-[11px] line-clamp-2">
            {checkpoint.note ? checkpoint.note : <span className="italic text-slate-500">Empty (no notes added)</span>}
          </p>
        </div>
      </div>

      {generated ? (
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="rounded-xl bg-white p-3 shadow-inner">
            <img
              src={generated.imageUrl}
              alt={`QR code for ${checkpoint.label}`}
              className="mx-auto aspect-square w-full max-w-56"
            />
          </div>
          <p className="mt-1.5 text-center font-mono text-[11px] text-slate-400 truncate">
            {checkpoint.code || 'LOC'} · {checkpoint.label}
          </p>

          {/* Direct Scan Link Preview & Copy */}
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs">
            <span
              className="font-mono text-[11px] text-slate-300 truncate select-all flex-1"
              title={generated.scanUrl}
            >
              {generated.scanUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded bg-cyan-950/70 border border-cyan-500/40 hover:bg-cyan-900/60 px-2 py-0.5 text-[11px] font-bold text-cyan-300 transition shrink-0"
              title="Copy scan link to clipboard"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-2.5">
            <Button asChild className="w-full">
              <a
                href={generated.imageUrl}
                download={
                  checkpoint.code
                    ? `${checkpoint.code.toLowerCase()}-qr.png`
                    : `checkpoint-${checkpoint.sequence}-qr.png`
                }
              >
                <Download className="mr-1.5" size={15} /> Download QR Image
              </a>
            </Button>
            {/* Regenerate QR button commented out to prevent invalidating printed QR codes:
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || busy}
              onClick={onGenerate}
            >
              <RefreshCw className="mr-1.5" size={15} /> Refresh
            </Button>
            */}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            className="w-full text-xs font-semibold"
            disabled={disabled || busy}
            onClick={onGenerate}
          >
            <QrCode className="mr-1.5" size={15} /> {busy ? 'Generating…' : 'Generate QR'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full text-xs font-semibold border-slate-700 hover:border-cyan-500/40"
            disabled={disabled || busy}
            onClick={handleCopy}
            title={effectiveScanUrl ? 'Copy scan link to clipboard' : 'Generate and copy scan link'}
          >
            {copied ? (
              <>
                <Check className="mr-1.5 text-emerald-400" size={14} /> Copied!
              </>
            ) : (
              <>
                <Copy className="mr-1.5 text-cyan-300" size={14} /> Copy Link
              </>
            )}
          </Button>
        </div>
      )}
    </article>
  );
}
