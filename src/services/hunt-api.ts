import { api, idempotencyHeaders } from './api-client';
import type { AdminGame, ApiEnvelope, Assignment, Identity, Progress } from '@/types/api';

export const huntApi = {
  async login(input: { identifier: string; password: string; qrToken?: string; force?: boolean }) {
    await api.post('/auth/login', input);
    return this.me();
  },
  async logout() {
    await api.post('/auth/logout');
  },
  async me() {
    return (await api.get<ApiEnvelope<Identity>>('/me')).data.data;
  },
  async team() {
    return (await api.get<ApiEnvelope<Record<string, unknown>>>('/teams/me')).data.data;
  },
  async progress() {
    return (await api.get<ApiEnvelope<Progress>>('/teams/me/progress')).data.data;
  },
  async startHunt(eventId: string) {
    return (
      await api.post<ApiEnvelope<Progress>>(
        `/events/${eventId}/start`,
        {},
        { headers: idempotencyHeaders() },
      )
    ).data.data;
  },
  async scan(token: string) {
    return (
      await api.post<ApiEnvelope<Assignment>>(
        '/checkpoints/scan',
        { token },
        { headers: idempotencyHeaders() },
      )
    ).data.data;
  },
  async assignment(id: string) {
    return (await api.get<ApiEnvelope<Assignment>>(`/assignments/${id}`)).data.data;
  },
  async startAttempt(assignmentId: string) {
    return (
      await api.post<ApiEnvelope<{ id: string; started_at: string; attempt_number: number }>>(
        `/assignments/${assignmentId}/attempts`,
        {},
        { headers: idempotencyHeaders() },
      )
    ).data.data;
  },
  async submitAttempt(
    attemptId: string,
    result: unknown,
    options?: {
      clientDurationMs?: number;
      completedAt?: string;
      idempotencyKey?: string;
    },
  ) {
    const headers = options?.idempotencyKey
      ? { 'Idempotency-Key': options.idempotencyKey }
      : idempotencyHeaders();
    return (
      await api.post<
        ApiEnvelope<{
          status: string;
          durationMs: number;
          metadata: Record<string, unknown>;
          clueUnlocked: boolean;
          retryAt?: string | null;
        }>
      >(
        `/attempts/${attemptId}/submit`,
        {
          result,
          clientDurationMs: options?.clientDurationMs,
          completedAt: options?.completedAt,
        },
        { headers },
      )
    ).data.data;
  },
  async clue() {
    return (
      await api.get<
        ApiEnvelope<{
          status: string;
          round?: number;
          clue: string | null;
          note?: string | null;
          locationLabel?: string | null;
        }>
      >('/teams/me/clue')
    ).data.data;
  },
  async history() {
    return (await api.get<ApiEnvelope<Array<Record<string, unknown>>>>('/participants/me/history'))
      .data.data;
  },
  async leaderboard(eventId?: string) {
    return (
      await api.get<
        ApiEnvelope<{
          event?: { id: string; name: string; slug: string; status: string } | null;
          completed: Array<Record<string, unknown>>;
          incomplete: Array<Record<string, unknown>>;
        }>
      >('/leaderboard', { params: eventId ? { eventId } : undefined })
    ).data.data;
  },
  async resetParticipantPassword(participantId: string, password?: string) {
    return (
      await api.post<
        ApiEnvelope<{
          id: string;
          memberCode: string;
          displayName: string;
          password: string;
        }>
      >(`/admin/participants/${participantId}/password`, password ? { password } : {})
    ).data.data;
  },
  async resetAssignmentAttempts(assignmentId: string) {
    return (
      await api.post<ApiEnvelope<{ assignmentId: string; resetCount: number }>>(
        `/admin/assignments/${assignmentId}/attempts/reset`,
      )
    ).data.data;
  },
  async changeAdminPassword(password: string) {
    return (
      await api.patch<ApiEnvelope<{ updated: boolean }>>('/admin/account/password', { password })
    ).data.data;
  },
  async updateAdminCredentials(username: string, password: string) {
    return (
      await api.patch<ApiEnvelope<{ updated: boolean; username: string }>>(
        '/admin/account/credentials',
        { username, password },
      )
    ).data.data;
  },
  async teamRounds(teamId: string) {
    return (
      await api.get<
        ApiEnvelope<{
          team: {
            id: string;
            code: string;
            name: string;
            status: string;
            current_sequence: number;
            started_at: string | null;
            completed_at: string | null;
          };
          rounds: Array<{
            round: number;
            checkpoint_label: string;
            game_name: string | null;
            game_code: string | null;
            assignment_id: string | null;
            assignment_status: string | null;
            passed_at: string | null;
            attempts: Array<{
              id: string;
              attempt_number: number;
              status: string;
              started_at: string;
              ended_at: string | null;
              duration_ms: number | null;
              member_code: string;
              display_name: string;
            }>;
          }>;
        }>
      >(`/admin/teams/${teamId}/rounds`)
    ).data.data;
  },
  async listGames() {
    return (await api.get<ApiEnvelope<AdminGame[]>>('/admin/games')).data.data;
  },
  async updateGameLevel(
    gameId: string,
    level: {
      difficulty: 'easy' | 'medium' | 'hard';
      config: Record<string, unknown>;
      maxAttempts: number;
      cooldownSeconds: number;
    },
  ) {
    return (
      await api.post<ApiEnvelope<{ id: string }>>(`/admin/games/${gameId}/levels`, level)
    ).data.data;
  },
  async updateRoundGame(roundId: string, gameId: string | null) {
    return (
      await api.patch<ApiEnvelope<{ id: string }>>(`/admin/rounds/${roundId}`, { gameId })
    ).data.data;
  },
  async updateRoundDifficulty(roundId: string, difficulty: 'easy' | 'medium' | 'hard') {
    return (
      await api.patch<ApiEnvelope<{ id: string; difficulty: string }>>(
        `/admin/rounds/${roundId}`,
        { difficulty },
      )
    ).data.data;
  },
  async updateRoundDifficulties(
    eventId: string,
    difficulties: Array<{ roundId: string; difficulty: 'easy' | 'medium' | 'hard' }>,
  ) {
    return (
      await api.post<ApiEnvelope<{ updated: boolean }>>(
        `/admin/events/${eventId}/round-difficulties`,
        { difficulties },
      )
    ).data.data;
  },
  async mapRoundGames(
    eventId: string,
    payload: {
      setAllRandom?: boolean;
      mappings?: Array<{
        roundId: string;
        gameId: string | null;
        difficulty?: 'easy' | 'medium' | 'hard';
      }>;
    },
  ) {
    return (
      await api.post<ApiEnvelope<{ updated: boolean }>>(
        `/admin/events/${eventId}/round-games`,
        payload,
      )
    ).data.data;
  },
  async listTeamRoundGames(eventId: string, teamId: string) {
    return (
      await api.get<
        ApiEnvelope<Array<{ round_id: string; sequence: number; game_id: string | null }>>
      >(`/admin/events/${eventId}/team-round-games`, { params: { teamId } })
    ).data.data;
  },
  async mapTeamRoundGames(
    eventId: string,
    payload: {
      teamId: string;
      mappings: Array<{ roundId: string; gameId?: string | null }>;
    },
  ) {
    return (
      await api.post<ApiEnvelope<{ updated: boolean; count: number }>>(
        `/admin/events/${eventId}/team-round-games`,
        payload,
      )
    ).data.data;
  },
  async updateCheckpointClues(
    eventId: string,
    teamId: string,
    clues: Array<{ roundId: string; clue: string }>,
  ) {
    return (
      await api.post<ApiEnvelope<{ updated: boolean }>>(
        `/admin/events/${eventId}/clues`,
        { teamId, clues },
      )
    ).data.data;
  },
  async updateRoundClue(roundId: string, clue: string) {
    return (
      await api.patch<ApiEnvelope<{ id: string; clue: string }>>(
        `/admin/rounds/${roundId}`,
        { clue },
      )
    ).data.data;
  },
  async reloadAssignment(assignmentId: string) {
    return (
      await api.post<ApiEnvelope<Assignment>>(`/assignments/${assignmentId}/reload`)
    ).data.data;
  },
  async updateLocation(
    checkpointId: string,
    payload: {
      label?: string;
      clue?: string;
      note?: string;
      showNoteToPlayer?: boolean;
      rotateToken?: boolean;
      active?: boolean;
    },
  ) {
    return (
      await api.patch<
        ApiEnvelope<{
          id: string;
          code: string;
          label: string;
          clue: string;
          note: string;
          showNoteToPlayer: boolean;
          qrToken?: string;
          scanUrl?: string;
        }>
      >(`/admin/checkpoints/${checkpointId}`, payload)
    ).data.data;
  },
  async updateTeamRoundLocations(
    eventId: string,
    mappings: Array<{ teamId: string; roundSequence: number; checkpointId: string }>,
  ) {
    return (
      await api.post<ApiEnvelope<{ updated: boolean; count: number }>>(
        `/admin/events/${eventId}/team-round-locations`,
        { mappings },
      )
    ).data.data;
  },
  async updateHuntStructure(
    eventId: string,
    payload: { roundCount?: number; locationCount?: number },
  ) {
    return (
      await api.patch<
        ApiEnvelope<{
          roundCount: number;
          locationCount: number;
          checkpointCount: number;
          checkpoints: Array<{ id: string; label: string; code: string }>;
        }>
      >(`/admin/events/${eventId}/structure`, payload)
    ).data.data;
  },
  async setupHuntStructure(payload: { roundCount?: number; locationCount?: number }) {
    return (
      await api.post<
        ApiEnvelope<{
          eventId: string;
          roundCount: number;
          locationCount: number;
          checkpoints: Array<{ id: string; label: string; code: string }>;
        }>
      >('/admin/simple/setup', payload)
    ).data.data;
  },
  async resetEventData(
    eventId: string,
    payload: {
      target: 'locations' | 'teams' | 'rounds' | 'all';
      confirmationText: string;
    },
  ) {
    return (
      await api.post<
        ApiEnvelope<{
          eventId: string;
          target: string;
          deleted: boolean;
          message: string;
        }>
      >(`/admin/events/${eventId}/reset`, payload)
    ).data.data;
  },
};

