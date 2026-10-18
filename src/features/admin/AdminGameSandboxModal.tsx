import { useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, X, Zap } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { gameRegistry } from '../games/game-registry';
import type { GameCode } from '@/types/api';

const gamesList: Array<{ code: GameCode; name: string; emoji: string }> = [
  { code: 'flappy-bird', name: 'Flappy Bird', emoji: '🐦' },
  { code: 'snake', name: 'Snake', emoji: '🐍' },
  { code: 'brick-breaker', name: 'Brick Breaker', emoji: '🧱' },
  { code: 'space-invaders', name: 'Space Invaders', emoji: '👾' },
  { code: 'tetris', name: 'Tetris', emoji: '🕹️' },
  { code: 'memory-match', name: 'Memory Match', emoji: '🎴' },
  { code: 'number-merge', name: 'Number Merge (2048)', emoji: '🔢' },
  { code: 'pattern-recall', name: 'Pattern Recall', emoji: '🎨' },
];

type Difficulty = 'easy' | 'medium' | 'hard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialGame?: GameCode;
  initialDifficulty?: Difficulty;
}

export function AdminGameSandboxModal({
  isOpen,
  onClose,
  initialGame = 'flappy-bird',
  initialDifficulty = 'easy',
}: Props) {
  const [selectedGame, setSelectedGame] = useState<GameCode>(initialGame);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [sessionKey, setSessionKey] = useState(0);
  const [testResult, setTestResult] = useState<any>(null);

  const challenge = useMemo(() => {
    const token = `sandbox-${Date.now()}`;
    switch (selectedGame) {
      case 'flappy-bird':
        return {
          target: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 8,
          gap: difficulty === 'easy' ? 135 : difficulty === 'medium' ? 120 : 105,
          speed: difficulty === 'easy' ? 2.2 : difficulty === 'medium' ? 2.6 : 3.0,
          difficulty,
          challengeToken: token,
        };
      case 'snake':
        return {
          target: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15,
          obstacles: difficulty === 'easy' ? 0 : difficulty === 'medium' ? 2 : 5,
          difficulty,
          challengeToken: token,
        };
      case 'brick-breaker':
        return {
          target: difficulty === 'easy' ? 8 : difficulty === 'medium' ? 14 : 20,
          lives: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 4 : 3,
          difficulty,
          challengeToken: token,
        };
      case 'space-invaders':
        return {
          target: difficulty === 'easy' ? 8 : difficulty === 'medium' ? 16 : 24,
          lives: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 4 : 3,
          difficulty,
          challengeToken: token,
        };
      case 'tetris':
        return {
          target: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6,
          speed: difficulty === 'easy' ? 700 : difficulty === 'medium' ? 550 : 400,
          difficulty,
          challengeToken: token,
        };
      case 'memory-match': {
        const pairs = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
        const cards = Array.from({ length: pairs }, (_, i) => [i + 1, i + 1]).flat();
        // deterministic shuffle for testing
        const board = [...cards].sort(() => 0.5 - Math.random());
        return {
          pairs,
          board,
          difficulty,
          challengeToken: token,
        };
      }
      case 'number-merge':
        return {
          target: difficulty === 'easy' ? 32 : difficulty === 'medium' ? 64 : 128,
          maxMoves: difficulty === 'easy' ? 40 : difficulty === 'medium' ? 65 : 90,
          difficulty,
          challengeToken: token,
        };
      case 'pattern-recall': {
        const length = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
        const palette = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
        const sequence = Array.from({ length }, () => Math.floor(Math.random() * palette));
        return {
          length,
          palette,
          sequence,
          difficulty,
          challengeToken: token,
        };
      }
      default:
        return { target: 3, difficulty, challengeToken: token };
    }
  }, [selectedGame, difficulty, sessionKey]);

  if (!isOpen) return null;

  const GameComponent = gameRegistry[selectedGame];

  function resetSandbox() {
    setTestResult(null);
    setSessionKey((prev) => prev + 1);
  }

  function handleGameChange(code: GameCode) {
    setSelectedGame(code);
    setTestResult(null);
    setSessionKey((prev) => prev + 1);
  }

  function handleDifficultyChange(diff: Difficulty) {
    setDifficulty(diff);
    setTestResult(null);
    setSessionKey((prev) => prev + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Zap className="text-amber-400" size={20} />
            <h2 className="text-base font-black text-slate-100">
              Admin Game & Difficulty Sandbox
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close sandbox"
          >
            <X size={20} />
          </button>
        </div>

        {/* Controls Toolbar */}
        <div className="border-b border-slate-800/80 bg-slate-950/60 p-4 space-y-3">
          {/* Game selector pills */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Select Game
            </label>
            <div className="flex flex-wrap gap-1.5">
              {gamesList.map((g) => (
                <button
                  key={g.code}
                  type="button"
                  onClick={() => handleGameChange(g.code)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    selectedGame === g.code
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{g.emoji}</span>
                  <span>{g.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty and Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Difficulty:
              </span>
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => handleDifficultyChange(diff)}
                  className={`rounded-md px-3 py-1 text-xs font-black uppercase transition ${
                    difficulty === diff
                      ? diff === 'easy'
                        ? 'bg-emerald-500 text-slate-950'
                        : diff === 'medium'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              className="text-xs py-1 px-3 h-8"
              onClick={resetSandbox}
            >
              <RotateCcw className="mr-1.5" size={14} />
              Reset Test
            </Button>
          </div>

          {/* Difficulty Info */}
          <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-300 flex items-center justify-between">
            <div>
              <span className="font-bold text-cyan-300">Target Config: </span>
              {selectedGame === 'flappy-bird' && (
                <span>
                  Pass <span className="font-bold text-amber-300">{challenge.target}</span> pipes (Gap: {challenge.gap}px, Speed: {challenge.speed})
                </span>
              )}
              {selectedGame === 'snake' && (
                <span>
                  Eat <span className="font-bold text-amber-300">{challenge.target}</span> food ({challenge.obstacles} obstacles)
                </span>
              )}
              {selectedGame === 'brick-breaker' && (
                <span>
                  Break <span className="font-bold text-amber-300">{challenge.target}</span> bricks ({challenge.lives} lives)
                </span>
              )}
              {selectedGame === 'space-invaders' && (
                <span>
                  Destroy <span className="font-bold text-amber-300">{challenge.target}</span> invaders ({challenge.lives} lives)
                </span>
              )}
              {selectedGame === 'tetris' && (
                <span>
                  Clear <span className="font-bold text-amber-300">{challenge.target}</span> lines (Speed: {challenge.speed}ms)
                </span>
              )}
              {selectedGame === 'memory-match' && (
                <span>
                  Match <span className="font-bold text-amber-300">{challenge.pairs}</span> card pairs
                </span>
              )}
              {selectedGame === 'number-merge' && (
                <span>
                  Reach tile <span className="font-bold text-amber-300">{challenge.target}</span> in max {challenge.maxMoves} moves
                </span>
              )}
              {selectedGame === 'pattern-recall' && (
                <span>
                  Memorize sequence of <span className="font-bold text-amber-300">{challenge.length}</span> colors
                </span>
              )}
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
              Live Test Mode
            </span>
          </div>
        </div>

        {/* Game Arena Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex flex-col items-center justify-center min-h-[380px]">
          {Boolean(testResult) && (
            <div className="w-full max-w-sm mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-center animate-in slide-in-from-top-2">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-sm">
                <CheckCircle2 size={18} />
                <span>Goal Cleared! Test Successful!</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-300">
                Completed on <span className="font-bold uppercase text-emerald-300">{difficulty}</span> mode.
              </p>
            </div>
          )}

          {GameComponent ? (
            <div key={`${selectedGame}-${difficulty}-${sessionKey}`} className="w-full max-w-md">
              <GameComponent
                challenge={challenge}
                disabled={false}
                onComplete={(result) => setTestResult(result)}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-400">Game component not found in registry.</p>
          )}
        </div>
      </div>
    </div>
  );
}
