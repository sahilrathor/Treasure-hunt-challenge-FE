import type { ComponentType } from 'react';
import { BrickBreakerGame } from './brick-breaker';
// Chess puzzle commented out per request - replaced by Flappy Bird
// import { ChessPuzzleGame } from './chess-puzzle';
import { CrackTheCodeGame } from './crack-the-code';
import { FlappyBirdGame } from './flappy-bird';
import { MemoryMatchGame } from './memory-match';
import { MiniPlatformerGame } from './mini-platformer';
import { NumberMergeGame } from './number-merge';
import { PacmanGame } from './pacman';
import { PatternRecallGame } from './pattern-recall';
import { SlidingPuzzleGame } from './sliding-puzzle';
import { SnakeGame } from './snake';
import { SpaceInvadersGame } from './space-invaders';
import { TetrisGame } from './tetris';
import type { GameProps } from './shared/types';
import type { GameCode } from '@/types/api';

export const gameRegistry: Record<GameCode, ComponentType<GameProps>> = {
  tetris: TetrisGame,
  snake: SnakeGame,
  'brick-breaker': BrickBreakerGame,
  'memory-match': MemoryMatchGame,
  'flappy-bird': FlappyBirdGame,
  // 'chess-puzzle': ChessPuzzleGame,
  'number-merge': NumberMergeGame,
  'space-invaders': SpaceInvadersGame,
  'pattern-recall': PatternRecallGame,
  'mini-platformer': MiniPlatformerGame,
  'crack-the-code': CrackTheCodeGame,
  'sliding-puzzle': SlidingPuzzleGame,
  pacman: PacmanGame,
};

export { GAME_METADATA, getGameInfo, type GameInfo } from './game-metadata';
