export type Role = 'PARTICIPANT' | 'ADMIN' | 'SUPER_ADMIN';

export interface Identity {
  sessionId: string;
  userId: string;
  role: Role;
  displayName: string;
  eventId: string | null;
  teamId: string | null;
  memberCode: string | null;
}

export interface Assignment {
  id: string;
  status: 'ASSIGNED' | 'PASSED' | 'CANCELLED';
  gameCode: GameCode;
  gameName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  challenge: Record<string, unknown>;
  maxAttempts: number;
  attemptCount: number;
  cooldownSeconds: number;
  round: number;
  checkpointLabel: string;
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
  | 'pattern-recall';

export interface Progress {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISQUALIFIED';
  current_sequence: number;
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
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}
