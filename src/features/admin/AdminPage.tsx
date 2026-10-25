import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  Clock,
  Compass,
  Dices,
  ExternalLink,
  Gamepad2,
  Gauge,
  Key,
  LogOut,
  Pencil,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Shuffle,
  Square,
  Trash2,
  Trophy,
  TimerReset,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';

import {
  CheckpointQrCard,
  type CheckpointSummary,
  type GeneratedCheckpointQr,
} from './CheckpointQrCard';
import {
  ChangePasswordModal,
  type ParticipantTarget,
} from './ChangePasswordModal';
import { ChangeAdminPasswordModal } from './ChangeAdminPasswordModal';
import { TeamRoundsModal } from './TeamRoundsModal';
import { AdminGameSandboxModal } from './AdminGameSandboxModal';
import { RoundGameMappingModal } from './RoundGameMappingModal';
import { CheckpointCluesModal } from './CheckpointCluesModal';
import { RoundDifficultiesModal } from './RoundDifficultiesModal';
import { CooldownSettingsModal } from './CooldownSettingsModal';
import { EditLocationModal, type LocationData } from './EditLocationModal';
import { TeamLocationRoutesModal } from './TeamLocationRoutesModal';
import { ResetHuntModal } from './ResetHuntModal';
import { Button } from '@/components/atoms/Button';
import { Field } from '@/components/atoms/Field';
import { Panel } from '@/components/atoms/Panel';
import { api, ApiError } from '@/services/api-client';
import { huntApi } from '@/services/hunt-api';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiEnvelope } from '@/types/api';
import { cn } from '@/lib/utils';

export interface ActiveSession {
  sessionId: string;
  loggedInAt: string;
  participantId: string;
  displayName: string;
  memberCode: string;
  teamId: string;
  teamName: string;
  teamCode: string;
}

interface Member {
  memberCode: string;
  displayName: string;
  isLoggedIn?: boolean;
  loggedInAt?: string | null;
  sessionId?: string | null;
}

interface Team {
  id: string;
  code: string;
  name: string;
  status: string;
  current_sequence: number;
  participants: Array<Member & { id: string }>;
  roundLocations?: Record<number, string>;
}

interface SimpleSetup {
  event: {
    id: string;
    name: string;
    slug: string;
    status: string;
    checkpoint_count: number;
    round_count?: number;
    location_count?: number;
  } | null;
  teams: Team[];
  checkpoints: CheckpointSummary[];
  rounds?: Array<{
    id: string;
    sequence: number;
    difficulty: 'easy' | 'medium' | 'hard';
    clue: string;
    checkpoint_id: string;
    game_id: string | null;
    game_name: string | null;
    game_code: string | null;
  }>;
  activeSessions?: ActiveSession[];
}

interface Credential extends Member {
  password: string;
}

interface TeamEdit {
  id: string;
  code: string;
  name: string;
}

const blankMember = (): Member => ({ memberCode: '', displayName: '' });

export function AdminPage() {
  const adminUsername = useAuthStore((state) => state.identity?.username ?? '');
  const [setup, setSetup] = useState<SimpleSetup>({ event: null, teams: [], checkpoints: [] });
  const [roundCount, setRoundCount] = useState(5);
  const [locationCount, setLocationCount] = useState(5);
  const [selectedRouteTeamId, setSelectedRouteTeamId] = useState<string>('');
  const [inlineRoutes, setInlineRoutes] = useState<Record<string, string>>({});
  const [savingInlineRoutes, setSavingInlineRoutes] = useState(false);
  const [routeNotice, setRouteNotice] = useState('');
  const [members, setMembers] = useState<Member[]>([blankMember(), blankMember(), blankMember()]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [checkpointQrs, setCheckpointQrs] = useState<Record<string, GeneratedCheckpointQr>>({});
  const [editingTeam, setEditingTeam] = useState<TeamEdit | null>(null);
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null);
  const [teamRoutesModalOpen, setTeamRoutesModalOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [passwordTarget, setPasswordTarget] = useState<ParticipantTarget | null>(null);
  const [adminPasswordOpen, setAdminPasswordOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedTeamRounds, setSelectedTeamRounds] = useState<string | null>(null);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [roundMappingOpen, setRoundMappingOpen] = useState(false);
  const [cluesModalOpen, setCluesModalOpen] = useState(false);
  const [selectedCheckpointForClue, setSelectedCheckpointForClue] = useState<string | null>(null);
  const [roundDifficultiesOpen, setRoundDifficultiesOpen] = useState(false);
  const [cooldownOpen, setCooldownOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedCheckpointForDifficulty, setSelectedCheckpointForDifficulty] = useState<string | null>(null);
  const [unlockedLogoutIds, setUnlockedLogoutIds] = useState<Record<string, boolean>>({});
  const clickTrackerRef = useRef<Record<string, { count: number; timer: ReturnType<typeof setTimeout> }>>({});
  const hasInitializedStructure = useRef(false);

  function handleTripleClickUnlock(id: string, e?: React.MouseEvent) {
    if (unlockedLogoutIds[id]) return;

    if (e && e.detail >= 3) {
      setUnlockedLogoutIds((prev) => ({ ...prev, [id]: true }));
      return;
    }

    const current = clickTrackerRef.current[id] || { count: 0, timer: null as any };
    if (current.timer) clearTimeout(current.timer);

    const newCount = current.count + 1;
    if (newCount >= 3) {
      setUnlockedLogoutIds((prev) => ({ ...prev, [id]: true }));
      delete clickTrackerRef.current[id];
    } else {
      const timer = setTimeout(() => {
        delete clickTrackerRef.current[id];
      }, 700);
      clickTrackerRef.current[id] = { count: newCount, timer };
    }
  }

  const allParticipants = useMemo(() => {
    return setup.teams.flatMap((team) =>
      team.participants.map((p) => ({
        ...p,
        teamName: team.name,
        teamCode: team.code,
      })),
    );
  }, [setup.teams]);

  const filteredParticipants = useMemo(() => {
    if (!participantSearch.trim()) return [];
    const q = participantSearch.toLowerCase();
    return allParticipants.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.memberCode.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q) ||
        p.teamCode.toLowerCase().includes(q),
    );
  }, [allParticipants, participantSearch]);

  const roundsForConfig = useMemo(() => {
    if (setup.rounds && setup.rounds.length) {
      return setup.rounds.map((r) => ({
        id: r.id,
        sequence: r.sequence,
        difficulty: r.difficulty,
        clue: r.clue,
        round_id: r.id,
        label: `Round ${r.sequence}`,
        game_id: r.game_id,
        game_name: r.game_name,
        game_code: r.game_code,
      }));
    }
    return setup.checkpoints.slice(0, roundCount);
  }, [setup.rounds, setup.checkpoints, roundCount]);

  async function load(isBackground = false) {
    try {
      const response = await api.get<ApiEnvelope<SimpleSetup>>('/admin/simple');
      setSetup(response.data.data);
      if (response.data.data.event && (!hasInitializedStructure.current || !isBackground)) {
        hasInitializedStructure.current = true;
        const rc =
          response.data.data.event.round_count ??
          response.data.data.event.checkpoint_count ??
          5;
        const lc =
          response.data.data.event.location_count ??
          response.data.data.checkpoints.length ??
          5;
        setRoundCount(rc);
        setLocationCount(lc);
      }
      if (response.data.data.teams.length && !selectedRouteTeamId) {
        setSelectedRouteTeamId(response.data.data.teams[0]?.id ?? '');
      }
    } catch (cause) {
      if (!isBackground) {
        setError(cause instanceof ApiError ? cause.message : 'Could not load setup.');
      }
    }
  }

  // Synchronize route assignments for all teams and rounds without wiping unsaved edits
  useEffect(() => {
    if (!setup.teams.length || !setup.checkpoints.length) return;
    const effectiveRounds = Array.from({ length: roundCount }, (_, i) => i + 1);
    setInlineRoutes((prev) => {
      const next = { ...prev };
      for (const team of setup.teams) {
        for (const seq of effectiveRounds) {
          const key = `${team.id}:${seq}`;
          if (next[key] === undefined) {
            if (team.roundLocations && team.roundLocations[seq]) {
              next[key] = team.roundLocations[seq]!;
            } else {
              const defaultCp = setup.checkpoints[(seq - 1) % setup.checkpoints.length];
              if (defaultCp) next[key] = defaultCp.id;
            }
          }
        }
      }
      return next;
    });
    if (!selectedRouteTeamId && setup.teams[0]) {
      setSelectedRouteTeamId(setup.teams[0].id);
    }
  }, [setup.teams, setup.checkpoints, roundCount]);

  function updateInlineRoute(teamId: string, roundSeq: number, checkpointId: string) {
    setInlineRoutes((prev) => ({
      ...prev,
      [`${teamId}:${roundSeq}`]: checkpointId,
    }));
  }

  function applySequentialInline(teamId: string) {
    const effectiveRounds = Array.from({ length: roundCount }, (_, i) => i + 1);
    setInlineRoutes((prev) => {
      const next = { ...prev };
      for (let i = 0; i < effectiveRounds.length; i += 1) {
        const seq = effectiveRounds[i]!;
        const cp = setup.checkpoints[i % setup.checkpoints.length]!;
        next[`${teamId}:${seq}`] = cp.id;
      }
      return next;
    });
  }

  function applyStaggerInline(teamId: string) {
    const tIdx = setup.teams.findIndex((t) => t.id === teamId);
    const offset = tIdx >= 0 ? tIdx : 0;
    const effectiveRounds = Array.from({ length: roundCount }, (_, i) => i + 1);
    setInlineRoutes((prev) => {
      const next = { ...prev };
      for (let i = 0; i < effectiveRounds.length; i += 1) {
        const seq = effectiveRounds[i]!;
        const cp = setup.checkpoints[(offset + i) % setup.checkpoints.length]!;
        next[`${teamId}:${seq}`] = cp.id;
      }
      return next;
    });
  }

  function applyRandomInline(teamId: string) {
    const effectiveRounds = Array.from({ length: roundCount }, (_, i) => i + 1);
    setInlineRoutes((prev) => {
      const next = { ...prev };
      for (const seq of effectiveRounds) {
        const randomCp = setup.checkpoints[Math.floor(Math.random() * setup.checkpoints.length)]!;
        next[`${teamId}:${seq}`] = randomCp.id;
      }
      return next;
    });
  }

  function copyRouteInline(targetTeamId: string, sourceTeamId: string) {
    if (!sourceTeamId || targetTeamId === sourceTeamId) return;
    const effectiveRounds = Array.from({ length: roundCount }, (_, i) => i + 1);
    setInlineRoutes((prev) => {
      const next = { ...prev };
      for (const seq of effectiveRounds) {
        const srcKey = `${sourceTeamId}:${seq}`;
        if (prev[srcKey]) {
          next[`${targetTeamId}:${seq}`] = prev[srcKey]!;
        }
      }
      return next;
    });
  }

  async function saveAllInlineRoutes() {
    if (!setup.event) return;
    setSavingInlineRoutes(true);
    setRouteNotice('');
    setError('');
    try {
      const effectiveRounds = Array.from({ length: roundCount }, (_, i) => i + 1);
      const mappings: Array<{ teamId: string; roundSequence: number; checkpointId: string }> = [];
      for (const team of setup.teams) {
        for (const seq of effectiveRounds) {
          const cpId = inlineRoutes[`${team.id}:${seq}`];
          if (cpId) {
            mappings.push({
              teamId: team.id,
              roundSequence: seq,
              checkpointId: cpId,
            });
          }
        }
      }
      await huntApi.updateTeamRoundLocations(setup.event.id, mappings);
      setRouteNotice('Team routes saved successfully!');
      setTimeout(() => setRouteNotice(''), 4000);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not save team routes.');
    } finally {
      setSavingInlineRoutes(false);
    }
  }

  async function logoutParticipant(participantId: string, displayName: string) {
    if (
      !window.confirm(
        `Log out ${displayName}? Their active session will be terminated immediately.`,
      )
    ) {
      return;
    }
    setBusy(`logout-${participantId}`);
    try {
      await api.post(`/admin/participants/${participantId}/logout`);
      setNotice(`Logged out ${displayName}.`);
      setUnlockedLogoutIds((prev) => {
        const next = { ...prev };
        delete next[participantId];
        return next;
      });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to log out participant.');
    } finally {
      setBusy('');
    }
  }

  useEffect(() => {
    void load(false);
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;

      // Do not poll if the user is actively focused on an input element
      const activeEl = document.activeElement;
      const isUserTyping =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      if (isUserTyping) return;

      void load(true);
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  async function saveStructure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      setup.event &&
      ((roundCount < (setup.event.round_count ?? setup.event.checkpoint_count)) ||
        (locationCount < (setup.event.location_count ?? setup.checkpoints.length))) &&
      !window.confirm(
        `Reduce the hunt configuration? Make sure no active teams are affected.`,
      )
    ) {
      return;
    }
    setBusy('structure');
    setError('');
    setNotice('');
    try {
      const response = setup.event
        ? await huntApi.updateHuntStructure(setup.event.id, { roundCount, locationCount })
        : await huntApi.setupHuntStructure({ roundCount, locationCount });
      setNotice(
        `Configured ${response.roundCount} competition rounds and ${response.locationCount} physical locations/QRs.`,
      );
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not update hunt structure.');
    } finally {
      setBusy('');
    }
  }

  async function generateQr(checkpoint: CheckpointSummary) {
    setBusy(`qr-${checkpoint.id}`);
    setError('');
    try {
      let scanUrl = checkpoint.scanUrl;
      if (!scanUrl) {
        const response = await api.patch<ApiEnvelope<{ scanUrl: string }>>(
          `/admin/checkpoints/${checkpoint.id}`,
          { rotateToken: true },
        );
        scanUrl = response.data.data.scanUrl;
      }
      const imageUrl = await QRCode.toDataURL(scanUrl, {
        width: 420,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      setCheckpointQrs((current) => ({
        ...current,
        [checkpoint.id]: {
          ...checkpoint,
          scanUrl,
          imageUrl,
        },
      }));
      setNotice(`${checkpoint.label} QR is ready.`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not generate the QR code.');
    } finally {
      setBusy('');
    }
  }

  async function generateAllQrs() {
    setBusy('all-qrs');
    setError('');
    try {
      const nextQrs: Record<string, GeneratedCheckpointQr> = {};
      for (const checkpoint of setup.checkpoints) {
        let scanUrl = checkpoint.scanUrl;
        if (!scanUrl) {
          const response = await api.patch<ApiEnvelope<{ scanUrl: string }>>(
            `/admin/checkpoints/${checkpoint.id}`,
            { rotateToken: true },
          );
          scanUrl = response.data.data.scanUrl;
        }
        const imageUrl = await QRCode.toDataURL(scanUrl, {
          width: 420,
          margin: 2,
          errorCorrectionLevel: 'M',
        });
        nextQrs[checkpoint.id] = {
          ...checkpoint,
          scanUrl,
          imageUrl,
        };
      }
      setCheckpointQrs(nextQrs);
      setNotice('All location QR codes are ready to download.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not generate all QR codes.');
    } finally {
      setBusy('');
    }
  }

  async function addTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setup.event) return;
    const form = new FormData(event.currentTarget);
    setBusy('team');
    setError('');
    setNotice('');
    try {
      const response = await api.post<ApiEnvelope<{ credentials: Credential[] }>>(
        '/admin/simple/teams',
        {
          eventId: setup.event.id,
          code: form.get('code'),
          name: form.get('name'),
          members,
        },
      );
      setCredentials(response.data.data.credentials);
      setMembers([blankMember(), blankMember(), blankMember()]);
      event.currentTarget.reset();
      setNotice('Team added. Save the login details shown below.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not add the team.');
    } finally {
      setBusy('');
    }
  }

  async function saveTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTeam) return;
    setBusy(`edit-team-${editingTeam.id}`);
    setError('');
    setNotice('');
    try {
      await api.patch(`/admin/teams/${editingTeam.id}`, {
        code: editingTeam.code,
        name: editingTeam.name,
      });
      setEditingTeam(null);
      setNotice('Team details updated.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not update the team.');
    } finally {
      setBusy('');
    }
  }

  async function deleteTeam(team: Team) {
    if (
      !window.confirm(
        `Delete ${team.name} (${team.code}) and all ${team.participants.length} member accounts?`,
      )
    ) {
      return;
    }
    setBusy(`delete-team-${team.id}`);
    setError('');
    setNotice('');
    try {
      await api.delete(`/admin/teams/${team.id}`);
      if (editingTeam?.id === team.id) setEditingTeam(null);
      setNotice(`${team.name} was deleted.`);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not delete the team.');
    } finally {
      setBusy('');
    }
  }

  async function startHunt() {
    if (!setup.event) return;
    setBusy('start');
    setError('');
    try {
      await api.post(`/admin/events/${setup.event.id}/control`, { action: 'START' });
      setNotice('The hunt has started.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not start the hunt.');
    } finally {
      setBusy('');
    }
  }

  async function endHunt() {
    if (!setup.event) return;
    if (!window.confirm('End the hunt now? Participants will not be able to continue.')) return;
    setBusy('finish');
    setError('');
    setNotice('');
    try {
      await api.post(`/admin/events/${setup.event.id}/control`, { action: 'FINISH' });
      setNotice('The hunt has ended. Final results are now locked.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not end the hunt.');
    } finally {
      setBusy('');
    }
  }

  async function restartHunt() {
    if (!setup.event) return;
    if (
      !window.confirm(
        'Restart this hunt with the same teams and checkpoints? All attempts, rankings, assignments, and team progress will be permanently cleared.',
      )
    )
      return;
    setBusy('restart');
    setError('');
    setNotice('');
    try {
      await api.post(`/admin/events/${setup.event.id}/control`, { action: 'RESTART' });
      setNotice('The hunt was reset to draft. Review the setup, then start it again.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not restart the hunt.');
    } finally {
      setBusy('');
    }
  }

  async function startNewHunt() {
    if (!setup.event) return;
    if (
      !window.confirm(
        'Create a new blank hunt? The finished hunt and its final results will be preserved.',
      )
    )
      return;
    setBusy('new-hunt');
    setError('');
    setNotice('');
    try {
      await api.post(`/admin/events/${setup.event.id}/new-hunt`);
      setCheckpointQrs({});
      setCredentials([]);
      setNotice('A new draft hunt is ready. Configure its checkpoints and teams.');
      hasInitializedStructure.current = false;
      await load(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not create a new hunt.');
    } finally {
      setBusy('');
    }
  }

  function updateMember(index: number, field: keyof Member, value: string) {
    setMembers((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member,
      ),
    );
  }

  const editable = !setup.event || setup.event.status === 'DRAFT';
  const checkpointEditable = !setup.event || setup.event.status !== 'FINISHED';
  const qrEditable = setup.event?.status !== 'FINISHED';

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.25em] text-cyan-300">
            Organizer setup
          </p>
          <h1 className="mt-2 text-4xl font-black">Set up your hunt</h1>
          <p className="mt-2 text-slate-400">Choose the checkpoints, then add each team.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {setup.event ? (
            <span className="rounded-full border border-slate-700 px-4 py-2 text-sm font-bold text-cyan-300">
              {setup.event.status}
            </span>
          ) : null}
          {setup.event && ['RUNNING', 'PAUSED'].includes(setup.event.status) ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-10 border-rose-500/40 text-xs text-rose-300 hover:border-rose-400"
              disabled={busy === 'finish'}
              onClick={() => void endHunt()}
            >
              <Square className="mr-1.5" size={14} />
              {busy === 'finish' ? 'Ending…' : 'End Hunt'}
            </Button>
          ) : null}
          {setup.event?.status === 'FINISHED' ? (
            <>
              <Button
                type="button"
                variant="secondary"
                className="min-h-9 px-3 text-xs border-amber-500/40 text-amber-300 hover:border-amber-400"
                disabled={busy === 'restart' || busy === 'new-hunt'}
                onClick={() => void restartHunt()}
              >
                <RotateCcw className="mr-1.5" size={14} />
                {busy === 'restart' ? 'Restarting…' : 'Restart Hunt'}
              </Button>
              <Button
                type="button"
                className="min-h-9 px-3 text-xs"
                disabled={busy === 'restart' || busy === 'new-hunt'}
                onClick={() => void startNewHunt()}
              >
                <Plus className="mr-1.5" size={14} />
                {busy === 'new-hunt' ? 'Creating…' : 'Start New Hunt'}
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 text-xs bg-slate-800/80 hover:bg-slate-700"
            onClick={() => setSandboxOpen(true)}
          >
            <Gamepad2 className="mr-1.5 text-cyan-300" size={16} /> Game Sandbox
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 text-xs bg-slate-800/80 hover:bg-slate-700"
            onClick={() => setCooldownOpen(true)}
          >
            <TimerReset className="mr-1.5 text-amber-300" size={16} /> Retry Cooldown
          </Button>
          {setup.event ? (
            <>
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 text-xs bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border-cyan-500/30"
                onClick={() => setTeamRoutesModalOpen(true)}
              >
                <Compass className="mr-1.5" size={16} /> Assign Routes
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 text-xs bg-slate-800/80 hover:bg-slate-700"
                onClick={() => {
                  setSelectedCheckpointForClue(null);
                  setCluesModalOpen(true);
                }}
              >
                <Compass className="mr-1.5 text-amber-300" size={16} /> Team Clues
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 text-xs bg-slate-800/80 hover:bg-slate-700"
                onClick={() => setRoundMappingOpen(true)}
              >
                <Shuffle className="mr-1.5 text-cyan-300" size={16} /> Round Games
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 text-xs bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-400"
                onClick={() => setResetModalOpen(true)}
              >
                <Trash2 className="mr-1.5 text-rose-400" size={16} /> Reset Data
              </Button>
            </>
          ) : null}
          <Button asChild variant="secondary" className="min-h-10 text-xs">
            <Link to={setup.event ? `/leaderboard?eventId=${setup.event.id}` : '/leaderboard'}>
              <Trophy className="mr-1.5 text-amber-300" size={16} /> Leaderboard
            </Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 text-xs"
            onClick={() => setAdminPasswordOpen(true)}
          >
            <Key className="mr-1.5 text-cyan-300" size={16} /> Admin Credentials
          </Button>
        </div>
      </div>

      {setup.event ? (
        <Panel className="border-cyan-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30">
                <Trophy size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-100">Live Event Leaderboard</h2>
                <p className="text-xs text-slate-400">
                  Track team completion times, penalty attempts, and live rankings.
                </p>
              </div>
            </div>
            <Button asChild className="text-xs">
              <Link to={`/leaderboard?eventId=${setup.event.id}`}>
                <ExternalLink className="mr-1.5" size={15} /> Open Leaderboard
              </Link>
            </Button>
          </div>
        </Panel>
      ) : null}

      <Panel className="border-emerald-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative grid size-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
              <Users size={22} />
              {(setup.activeSessions?.length ?? 0) > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
              ) : null}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-100">Live Team Sessions</h2>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  {setup.activeSessions?.length ?? 0} Online
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Track currently logged-in team members across all teams. Only one active player per team allowed.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 px-3 text-xs"
            onClick={() => void load()}
          >
            <RotateCcw className="mr-1.5" size={13} /> Refresh Logins
          </Button>
        </div>

        {setup.activeSessions && setup.activeSessions.length > 0 ? (
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {setup.activeSessions.map((session) => {
              const isUnlocked = Boolean(
                unlockedLogoutIds[session.sessionId] ||
                unlockedLogoutIds[session.participantId],
              );
              return (
                <div
                  key={session.sessionId}
                  onClick={(e) => handleTripleClickUnlock(session.sessionId, e)}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border bg-slate-950/80 p-3 transition select-none',
                    isUnlocked
                      ? 'border-rose-500/50 bg-rose-950/20 ring-1 ring-rose-500/30'
                      : 'border-slate-800 hover:border-slate-700 cursor-pointer',
                  )}
                  title={isUnlocked ? undefined : 'Triple-click to reveal force logout button'}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      <p className="truncate font-bold text-slate-100 text-sm">{session.displayName}</p>
                      <span className="font-mono text-xs text-cyan-300">({session.memberCode})</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 truncate">
                      Team: <strong className="text-slate-300">{session.teamName}</strong> ({session.teamCode})
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Logged in:{' '}
                      {new Date(session.loggedInAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </p>
                  </div>
                  {isUnlocked ? (
                    <Button
                      type="button"
                      variant="danger"
                      className="min-h-8 px-2.5 text-xs shrink-0 animate-in fade-in zoom-in-95 duration-150"
                      disabled={busy === `logout-${session.participantId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void logoutParticipant(session.participantId, session.displayName);
                      }}
                    >
                      <LogOut className="mr-1" size={12} />
                      {busy === `logout-${session.participantId}` ? '…' : 'Log Out'}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">No participants are currently logged in.</p>
        )}
      </Panel>

      {error ? (
        <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-rose-300">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl bg-emerald-500/10 p-3 text-emerald-300">{notice}</p>
      ) : null}

      <Panel>
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-cyan-300 font-black text-slate-950">
            1
          </span>
          <div>
            <h2 className="text-xl font-black">Hunt Structure: Rounds & Locations</h2>
            <p className="text-sm text-slate-400">
              Set total rounds and total physical venue locations / QRs independently. Both are separate configurations.
            </p>
          </div>
        </div>
        <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={saveStructure}>
          <Field
            label="Total Rounds"
            type="number"
            min={1}
            max={16}
            required
            disabled={!checkpointEditable}
            value={roundCount}
            onChange={(event) => setRoundCount(Number(event.target.value))}
            className="w-36"
          />
          <Field
            label="Total Locations / QRs"
            type="number"
            min={1}
            max={20}
            required
            disabled={!checkpointEditable}
            value={locationCount}
            onChange={(event) => setLocationCount(Number(event.target.value))}
            className="w-44"
          />
          <Button disabled={!checkpointEditable || busy === 'structure'}>
            {busy === 'structure'
              ? 'Saving…'
              : setup.event
                ? 'Update Structure'
                : 'Save Structure'}
          </Button>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-lg bg-cyan-400/10 px-2.5 py-1 font-bold text-cyan-300 border border-cyan-400/30">
              {roundCount} Rounds
            </span>
            <span className="rounded-lg bg-amber-400/10 px-2.5 py-1 font-bold text-amber-300 border border-amber-400/30">
              {locationCount} Physical Locations / QRs
            </span>
          </div>
        </form>

        {setup.checkpoints.length ? (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-base text-slate-100">Physical Location QRs & Clues</p>
                <p className="mt-1 text-sm text-slate-400">
                  Print and place each QR code at its physical venue location. You can assign any location to any team for any round.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs text-amber-300 border-amber-500/30 hover:border-amber-400"
                  onClick={() => setTeamRoutesModalOpen(true)}
                >
                  <Compass className="mr-1.5" size={15} /> Assign Routes to Teams
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => {
                    setSelectedCheckpointForDifficulty(null);
                    setRoundDifficultiesOpen(true);
                  }}
                >
                  <Gauge className="mr-1.5 text-rose-400" size={15} /> Round Difficulties
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => setRoundMappingOpen(true)}
                >
                  <Shuffle className="mr-1.5 text-cyan-300" size={15} /> Map Round Games
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!qrEditable || !setup.checkpoints.length || busy === 'all-qrs'}
                  onClick={() => void generateAllQrs()}
                >
                  <QrCode className="mr-2" size={18} />
                  {busy === 'all-qrs' ? 'Generating…' : 'Generate all QRs'}
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {setup.checkpoints.map((checkpoint) => (
                <CheckpointQrCard
                  key={checkpoint.id}
                  checkpoint={checkpoint}
                  generated={checkpointQrs[checkpoint.id]}
                  busy={busy === `qr-${checkpoint.id}`}
                  disabled={!qrEditable || busy === 'all-qrs'}
                  onGenerate={() => void generateQr(checkpoint)}
                  onEditLocation={() => setEditingLocation(checkpoint as LocationData)}
                  onEditDifficulty={() => {
                    setSelectedCheckpointForDifficulty(checkpoint.id);
                    setRoundDifficultiesOpen(true);
                  }}
                />
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Tip: Click <strong className="text-cyan-300">Edit</strong> on any location card to customize its name, unique clue, and optional player note.
            </p>
          </div>
        ) : null}
      </Panel>

      {setup.event ? (
        <Panel className="border-cyan-500/30 bg-slate-900/90">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-cyan-300 font-black text-slate-950">
                2
              </span>
              <div>
                <h2 className="text-xl font-black">Assign Locations to Teams (Team Route Tabs)</h2>
                <p className="text-sm text-slate-400">
                  Select a team tab below to assign which location / QR they visit in each round. Locations can be repeated.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={() => setTeamRoutesModalOpen(true)}
              >
                <Compass className="mr-1.5" size={14} /> Full Route Modal
              </Button>
              <Button
                type="button"
                onClick={() => void saveAllInlineRoutes()}
                disabled={savingInlineRoutes || !setup.teams.length}
                className="text-xs"
              >
                <Check className="mr-1.5" size={14} />
                {savingInlineRoutes ? 'Saving…' : 'Save Team Routes'}
              </Button>
            </div>
          </div>

          {routeNotice ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{routeNotice}</span>
            </div>
          ) : null}

          {setup.teams.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-950/60 p-4 text-sm text-slate-400">
              No teams added yet. Add teams in the section below, then assign their route locations here.
            </p>
          ) : (
            <div className="mt-5">
              {/* Team Tabs Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
                {setup.teams.map((team) => {
                  const isSelected = selectedRouteTeamId === team.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedRouteTeamId(team.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-950'
                          : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <span className="font-mono text-[11px] font-black text-cyan-400">{team.code}</span>
                      <span className="truncate max-w-36">{team.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Team Route Configuration */}
              {(() => {
                const activeTeam = setup.teams.find((t) => t.id === selectedRouteTeamId) ?? setup.teams[0];
                if (!activeTeam) return null;
                const effectiveRounds = Array.from({ length: roundCount }, (_, i) => i + 1);

                return (
                  <div className="mt-4">
                    {/* Quick presets & action bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black uppercase text-cyan-300">
                            {activeTeam.code}
                          </span>
                          <h3 className="font-bold text-slate-100 text-sm">{activeTeam.name}</h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Assigned physical locations for {roundCount} rounds.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs px-2.5 py-1"
                          onClick={() => applySequentialInline(activeTeam.id)}
                          disabled={savingInlineRoutes}
                          title="Assign Location 1 to Round 1, Location 2 to Round 2, etc."
                        >
                          <RotateCcw className="mr-1" size={12} /> Sequential
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs px-2.5 py-1 text-cyan-300 border-cyan-500/30 hover:border-cyan-400"
                          onClick={() => applyStaggerInline(activeTeam.id)}
                          disabled={savingInlineRoutes}
                          title="Stagger this team to avoid crowd collisions"
                        >
                          <Shuffle className="mr-1" size={12} /> Stagger Start
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs px-2.5 py-1"
                          onClick={() => applyRandomInline(activeTeam.id)}
                          disabled={savingInlineRoutes}
                          title="Randomize locations for this team"
                        >
                          <Dices className="mr-1" size={12} /> Randomize
                        </Button>

                        {setup.teams.length > 1 ? (
                          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                            <span className="text-[11px] text-slate-400">Copy route:</span>
                            <select
                              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 cursor-pointer"
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  copyRouteInline(activeTeam.id, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                            >
                              <option value="" disabled>
                                Select team…
                              </option>
                              {setup.teams
                                .filter((t) => t.id !== activeTeam.id)
                                .map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.code} - {t.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Visual Journey Path Breadcrumbs */}
                    <div className="mt-3 flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
                      <span className="text-xs font-bold text-slate-400 shrink-0">Route Flow:</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {effectiveRounds.map((seq, idx) => {
                          const cpId = inlineRoutes[`${activeTeam.id}:${seq}`];
                          const cp = setup.checkpoints.find((c) => c.id === cpId);
                          return (
                            <div key={seq} className="flex items-center gap-1.5 shrink-0">
                              <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs">
                                <span className="font-bold text-slate-400">R{seq}:</span>
                                <span className="font-black text-cyan-300">{cp?.code ?? '—'}</span>
                                <span className="text-slate-300 text-[11px] max-w-24 truncate">
                                  {cp?.label ?? ''}
                                </span>
                              </div>
                              {idx < effectiveRounds.length - 1 ? (
                                <ArrowRight size={13} className="text-slate-600 shrink-0" />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Rounds Location Cards Grid */}
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {effectiveRounds.map((seq) => {
                        const key = `${activeTeam.id}:${seq}`;
                        const currentCpId = inlineRoutes[key] ?? '';
                        const selectedCp = setup.checkpoints.find((c) => c.id === currentCpId);

                        // Find repetition
                        const repeatedIn: number[] = [];
                        for (const otherSeq of effectiveRounds) {
                          if (otherSeq !== seq && inlineRoutes[`${activeTeam.id}:${otherSeq}`] === currentCpId) {
                            repeatedIn.push(otherSeq);
                          }
                        }

                        return (
                          <div
                            key={seq}
                            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 hover:border-slate-700 transition"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-xs font-black text-cyan-300 border border-cyan-500/30">
                                  Round {seq}
                                </span>
                                {repeatedIn.length > 0 ? (
                                  <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                                    Repeated in R{repeatedIn.join(', R')}
                                  </span>
                                ) : null}
                              </div>

                              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                Assigned Location:
                              </label>
                              <select
                                value={currentCpId}
                                onChange={(e) => updateInlineRoute(activeTeam.id, seq, e.target.value)}
                                disabled={savingInlineRoutes}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
                              >
                                {setup.checkpoints.map((cp) => (
                                  <option key={cp.id} value={cp.id}>
                                    {cp.code}: {cp.label}
                                  </option>
                                ))}
                              </select>

                              {selectedCp ? (
                                <div className="mt-2.5 rounded-lg border border-slate-800/80 bg-slate-900/60 p-2 text-xs">
                                  <p className="text-[11px] text-slate-300 line-clamp-2">
                                    <span className="font-bold text-slate-400">Clue: </span>
                                    {selectedCp.clue || 'No clue provided.'}
                                  </p>
                                  {selectedCp.note ? (
                                    <p className="mt-1 text-[11px] text-amber-300/90 line-clamp-1">
                                      <span className="font-bold">Note: </span>
                                      {selectedCp.note}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </Panel>
      ) : null}

      <Panel>
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-cyan-300 font-black text-slate-950">
            3
          </span>
          <div>
            <h2 className="text-xl font-black">Add team and members</h2>
            <p className="text-sm text-slate-400">Each team needs 3 to 5 members.</p>
          </div>
        </div>

        {!setup.event ? (
          <p className="mt-5 rounded-xl bg-amber-400/10 p-3 text-amber-200">
            Configure the hunt structure first.
          </p>
        ) : (
          <form className="mt-5 grid gap-5" onSubmit={addTeam}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Team name"
                name="name"
                placeholder="Code Crusaders"
                required
                disabled={!editable}
              />
              <Field
                label="Team code"
                name="code"
                placeholder="TEAM-01"
                required
                disabled={!editable}
              />
            </div>

            <div className="grid gap-3">
              {members.map((member, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border border-slate-800 p-4 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <Field
                    label={`Member ${index + 1} name`}
                    value={member.displayName}
                    onChange={(event) => updateMember(index, 'displayName', event.target.value)}
                    required
                    disabled={!editable}
                  />
                  <Field
                    label="Login ID"
                    placeholder={`MEMBER-${index + 1}`}
                    value={member.memberCode}
                    onChange={(event) => updateMember(index, 'memberCode', event.target.value)}
                    required
                    disabled={!editable}
                  />
                  {members.length > 3 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="self-end px-4"
                      aria-label={`Remove member ${index + 1}`}
                      onClick={() =>
                        setMembers((current) => current.filter((_, item) => item !== index))
                      }
                    >
                      <Trash2 size={18} />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {members.length < 5 ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!editable}
                  onClick={() => setMembers((current) => [...current, blankMember()])}
                >
                  <Plus className="mr-2" size={18} /> Add member
                </Button>
              ) : null}
              <Button disabled={!editable || busy === 'team'}>
                <Users className="mr-2" size={18} />
                {busy === 'team' ? 'Adding…' : 'Add team'}
              </Button>
            </div>
          </form>
        )}
      </Panel>

      {credentials.length ? (
        <Panel className="border-emerald-500/40">
          <div className="flex items-center gap-3">
            <Check className="text-emerald-300" />
            <div>
              <h2 className="text-xl font-black">Team login details</h2>
              <p className="text-sm text-slate-400">
                Save these now. Passwords are only shown once.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {credentials.map((credential) => (
              <div
                key={credential.memberCode}
                className="grid gap-1 rounded-xl bg-slate-950 p-3 sm:grid-cols-3"
              >
                <span>{credential.displayName}</span>
                <span className="font-mono text-cyan-300">{credential.memberCode}</span>
                <span className="font-mono text-amber-200">{credential.password}</span>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() =>
              void navigator.clipboard.writeText(
                credentials
                  .map((item) => `${item.displayName}: ${item.memberCode} / ${item.password}`)
                  .join('\n'),
              )
            }
          >
            <Clipboard className="mr-2" size={18} /> Copy all
          </Button>
        </Panel>
      ) : null}

      {setup.teams.length ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Teams ({setup.teams.length})</h2>
              <p className="text-sm text-slate-400">
                Manage teams and change or reset participant passwords.
              </p>
            </div>
            {allParticipants.length > 0 ? (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="search"
                  placeholder="Find user to change password…"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                />
              </div>
            ) : null}
          </div>

          {participantSearch.trim() ? (
            <Panel className="border-cyan-500/30 bg-slate-950/80 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                Search Results ({filteredParticipants.length})
              </p>
              {filteredParticipants.length ? (
                <div className="mt-3 grid gap-2">
                  {filteredParticipants.map((p) => {
                    const isUnlocked = Boolean(unlockedLogoutIds[p.id]);
                    return (
                      <div
                        key={p.id}
                        onClick={(e) => handleTripleClickUnlock(p.id, e)}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-xl border bg-slate-900/60 p-3 transition select-none',
                          isUnlocked ? 'border-rose-500/50 bg-rose-950/20' : 'border-slate-800 cursor-pointer',
                        )}
                        title={p.isLoggedIn && !isUnlocked ? 'Triple-click to reveal force logout' : undefined}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{p.displayName}</span>
                            <span className="font-mono text-xs text-cyan-300">{p.memberCode}</span>
                            {p.isLoggedIn ? (
                              <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Online
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-400">
                            Team: {p.teamName} ({p.teamCode})
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {p.isLoggedIn && isUnlocked ? (
                            <Button
                              type="button"
                              variant="danger"
                              className="min-h-9 px-3 text-xs animate-in fade-in zoom-in-95 duration-150"
                              disabled={busy === `logout-${p.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                void logoutParticipant(p.id, p.displayName);
                              }}
                            >
                              <LogOut className="mr-1.5" size={13} />
                              {busy === `logout-${p.id}` ? '…' : 'Log Out'}
                            </Button>
                          ) : null}
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-3 text-xs"
                          onClick={() =>
                            setPasswordTarget({
                              id: p.id,
                              displayName: p.displayName,
                              memberCode: p.memberCode,
                              teamName: p.teamName,
                            })
                          }
                        >
                          <Key className="mr-1.5 text-cyan-300" size={14} />
                          Change Password
                        </Button>
                      </div>
                    </div>
                  );
                })}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  No participants matched "{participantSearch}".
                </p>
              )}
            </Panel>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {setup.teams.map((team) => (
              <Panel key={team.id} className="flex flex-col justify-between">
                <div>
                  {editingTeam?.id === team.id ? (
                    <form className="grid gap-3" onSubmit={(event) => void saveTeam(event)}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Team name"
                          required
                          value={editingTeam.name}
                          onChange={(event) =>
                            setEditingTeam((current) =>
                              current ? { ...current, name: event.target.value } : current,
                            )
                          }
                        />
                        <Field
                          label="Team code"
                          required
                          value={editingTeam.code}
                          onChange={(event) =>
                            setEditingTeam((current) =>
                              current ? { ...current, code: event.target.value } : current,
                            )
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="min-h-9 px-3 text-xs"
                          disabled={busy === `edit-team-${team.id}`}
                        >
                          {busy === `edit-team-${team.id}` ? 'Savingâ€¦' : 'Save team'}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-3 text-xs"
                          onClick={() => setEditingTeam(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-lg font-black text-slate-100">{team.name}</p>
                          {team.participants.some((p) => p.isLoggedIn) ? (
                            <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active:{' '}
                              {team.participants.find((p) => p.isLoggedIn)?.displayName}
                            </span>
                          ) : null}
                        </div>
                        <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300">
                          {team.code}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-8 px-2.5 text-xs text-cyan-300 hover:text-cyan-200 border-cyan-500/30"
                          onClick={() => setSelectedTeamRounds(team.id)}
                          title="View round breakdown, player attempts, and exact game timings"
                        >
                          <Clock className="mr-1" size={13} /> Rounds & Timings
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-8 px-2.5 text-xs"
                          disabled={!editable}
                          onClick={() =>
                            setEditingTeam({ id: team.id, code: team.code, name: team.name })
                          }
                        >
                          <Pencil className="mr-1" size={13} /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="min-h-8 px-2.5 text-xs"
                          disabled={!editable || busy === `delete-team-${team.id}`}
                          onClick={() => void deleteTeam(team)}
                        >
                          <Trash2 className="mr-1" size={13} />
                          {busy === `delete-team-${team.id}` ? 'Deleting…' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  )}
                  <ul className="mt-3 grid gap-1.5 text-sm text-slate-400">
                    {team.participants.map((member) => {
                      const isUnlocked = Boolean(unlockedLogoutIds[member.id]);
                      return (
                        <li
                          key={member.id}
                          onClick={(e) => handleTripleClickUnlock(member.id, e)}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-xl border bg-slate-950/40 px-3 py-2 transition select-none',
                            isUnlocked ? 'border-rose-500/40 bg-rose-950/20' : 'border-slate-800/80 cursor-pointer',
                          )}
                          title={member.isLoggedIn && !isUnlocked ? 'Triple-click to reveal force logout' : undefined}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-semibold text-slate-200">
                                {member.displayName}
                              </p>
                              {member.isLoggedIn ? (
                                <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Online
                                </span>
                              ) : null}
                            </div>
                            <p className="font-mono text-xs text-cyan-300">{member.memberCode}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {member.isLoggedIn && isUnlocked ? (
                              <button
                                type="button"
                                className="flex shrink-0 items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 animate-in fade-in zoom-in-95 duration-150"
                                disabled={busy === `logout-${member.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void logoutParticipant(member.id, member.displayName);
                                }}
                                title={`Log out ${member.displayName}`}
                              >
                                <LogOut size={12} />
                                <span>{busy === `logout-${member.id}` ? '…' : 'Log Out'}</span>
                              </button>
                            ) : null}
                          <button
                            type="button"
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300 transition hover:border-cyan-300 hover:text-cyan-300"
                            onClick={() =>
                              setPasswordTarget({
                                id: member.id,
                                displayName: member.displayName,
                                memberCode: member.memberCode,
                                teamName: team.name,
                              })
                            }
                            title={`Change password for ${member.displayName}`}
                          >
                            <Key size={13} />
                            <span>Change Password</span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  </ul>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      {setup.event?.status === 'DRAFT' ? (
        <Button
          className="w-full sm:w-auto"
          disabled={!setup.checkpoints.length || !setup.teams.length || busy === 'start'}
          onClick={() => void startHunt()}
        >
          {busy === 'start' ? 'Starting…' : 'Start hunt'}
        </Button>
      ) : null}

      {/* Password Management Modals */}
      <ChangePasswordModal
        member={passwordTarget}
        onClose={() => setPasswordTarget(null)}
        onSuccess={(pwd) => {
          setNotice(`Password updated for ${passwordTarget?.displayName} (${passwordTarget?.memberCode}): ${pwd}`);
        }}
      />

      <ChangeAdminPasswordModal
        open={adminPasswordOpen}
        currentUsername={adminUsername}
        onClose={() => setAdminPasswordOpen(false)}
        onUpdated={(username) =>
          useAuthStore.setState((state) => ({
            identity: state.identity ? { ...state.identity, username } : null,
          }))
        }
      />

      <TeamRoundsModal
        teamId={selectedTeamRounds}
        onClose={() => setSelectedTeamRounds(null)}
      />

      <AdminGameSandboxModal
        isOpen={sandboxOpen}
        onClose={() => setSandboxOpen(false)}
      />

      <CooldownSettingsModal open={cooldownOpen} onClose={() => setCooldownOpen(false)} />

      {setup.event && (
        <RoundGameMappingModal
          isOpen={roundMappingOpen}
          onClose={() => setRoundMappingOpen(false)}
          eventId={setup.event.id}
          checkpoints={roundsForConfig}
          onSaved={() => void load()}
        />
      )}

      {setup.event && (
        <CheckpointCluesModal
          isOpen={cluesModalOpen}
          onClose={() => {
            setCluesModalOpen(false);
            setSelectedCheckpointForClue(null);
          }}
          eventId={setup.event.id}
          teams={setup.teams}
          checkpoints={setup.checkpoints}
          initialCheckpointId={selectedCheckpointForClue}
          onSaved={() => void load()}
        />
      )}

      {setup.event && (
        <RoundDifficultiesModal
          isOpen={roundDifficultiesOpen}
          onClose={() => {
            setRoundDifficultiesOpen(false);
            setSelectedCheckpointForDifficulty(null);
          }}
          eventId={setup.event.id}
          checkpoints={roundsForConfig}
          initialCheckpointId={selectedCheckpointForDifficulty}
          onSaved={() => void load()}
        />
      )}

      <EditLocationModal
        isOpen={Boolean(editingLocation)}
        location={editingLocation}
        onClose={() => setEditingLocation(null)}
        onSaved={() => void load()}
      />

      {setup.event && (
        <TeamLocationRoutesModal
          isOpen={teamRoutesModalOpen}
          onClose={() => setTeamRoutesModalOpen(false)}
          eventId={setup.event.id}
          teams={setup.teams}
          checkpoints={setup.checkpoints}
          roundCount={roundCount}
          onSaved={() => void load()}
        />
      )}

      {setup.event && (
        <ResetHuntModal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          eventId={setup.event.id}
          onSuccess={(msg) => {
            hasInitializedStructure.current = false;
            setNotice(msg);
            void load(false);
          }}
        />
      )}
    </div>
  );
}
