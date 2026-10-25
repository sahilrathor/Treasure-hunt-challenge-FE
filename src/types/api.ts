export type Role = 'PARTICIPANT' | 'ADMIN' | 'SUPER_ADMIN';

export interface Identity {
  sessionId: string;
  userId: string;
  role: Role;
  displayName: string;
  username: string | null;
  eventId: string | null;
  teamId: string | null;
  memberCode: string | null;
}

export interface Assignment {
  id: string;
  status: 'ASSIGNED' | 'PASSED' | 'CANCELLED';
  gameCode: GameCode;
  gameName: string;
  gameDescription?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  challenge: Record<string, unknown>;
  maxAttempts: number;
  attemptCount: number;
  cooldownSeconds: number;
  round: number;
  checkpointLabel: string;
  activeAttempt?: { id: string; started_at: string } | null;
}

export interface GameLevelConfig {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  config: Record<string, unknown>;
  maxAttempts: number;
  cooldownSeconds: number;
}

export interface AdminGame {
  id: string;
  code: GameCode;
  name: string;
  description?: string;
  enabled: boolean;
  levels: GameLevelConfig[];
}

export type GameCode =
  | 'tetris'
  | 'snake'
  | 'brick-breaker'
  | 'memory-match'
  | 'flappy-bird'
  // | 'chess-puzzle' // commented out per request - replaced by Flappy Bird
  | 'number-merge'
  | 'space-invaders'
  | 'pattern-recall'
  | 'mini-platformer'
  | 'crack-the-code'
  | 'sliding-puzzle'
  | 'pacman';

export interface Progress {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISQUALIFIED';
  current_sequence: number;
  total_rounds?: number | null;
  started_at: string | null;
  completed_at: string | null;
  assignment_id?: string | null;
  assignment_status?: string | null;
  game_code?: GameCode | null;
  game_name?: string | null;
  attempt_count?: number | null;
  max_attempts?: number | null;
  cooldown_seconds?: number | null;
  last_failed_at?: string | null;
  checkpoint_label?: string | null;
  checkpoint_clue?: string | null;
  checkpoint_note?: string | null;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}
