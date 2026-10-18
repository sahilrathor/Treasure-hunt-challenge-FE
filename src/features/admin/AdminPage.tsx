import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  Clipboard,
  ExternalLink,
  Gamepad2,
  Key,
  Plus,
  QrCode,
  Search,
  Shuffle,
  Trash2,
  Trophy,
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
import { Button } from '@/components/atoms/Button';
import { Field } from '@/components/atoms/Field';
import { Panel } from '@/components/atoms/Panel';
import { api, ApiError } from '@/services/api-client';
import type { ApiEnvelope } from '@/types/api';

interface Member {
  memberCode: string;
  displayName: string;
}

interface Team {
  id: string;
  code: string;
  name: string;
  status: string;
  current_sequence: number;
  participants: Array<Member & { id: string }>;
}

interface SimpleSetup {
  event: {
    id: string;
    name: string;
    slug: string;
    status: string;
    checkpoint_count: number;
  } | null;
  teams: Team[];
  checkpoints: CheckpointSummary[];
}

interface Credential extends Member {
  password: string;
}

const blankMember = (): Member => ({ memberCode: '', displayName: '' });

export function AdminPage() {
  const [setup, setSetup] = useState<SimpleSetup>({ event: null, teams: [], checkpoints: [] });
  const [checkpointCount, setCheckpointCount] = useState(8);
  const [members, setMembers] = useState<Member[]>([blankMember(), blankMember(), blankMember()]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [checkpointQrs, setCheckpointQrs] = useState<Record<string, GeneratedCheckpointQr>>({});
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [passwordTarget, setPasswordTarget] = useState<ParticipantTarget | null>(null);
  const [adminPasswordOpen, setAdminPasswordOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedTeamRounds, setSelectedTeamRounds] = useState<string | null>(null);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [roundMappingOpen, setRoundMappingOpen] = useState(false);

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

  async function load() {
    try {
      const response = await api.get<ApiEnvelope<SimpleSetup>>('/admin/simple');
      setSetup(response.data.data);
      if (response.data.data.event) {
        setCheckpointCount(response.data.data.event.checkpoint_count);
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not load setup.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveCheckpoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('checkpoints');
    setError('');
    setNotice('');
    try {
      const response = await api.post<
        ApiEnvelope<{
          checkpoints: Array<CheckpointSummary & { scanUrl: string }>;
        }>
      >('/admin/simple/setup', { checkpointCount });
      const generated = await Promise.all(
        response.data.data.checkpoints.map(async (checkpoint) => ({
          ...checkpoint,
          imageUrl: await QRCode.toDataURL(checkpoint.scanUrl, {
            width: 420,
            margin: 2,
            errorCorrectionLevel: 'M',
          }),
        })),
      );
      setCheckpointQrs(
        Object.fromEntries(generated.map((checkpoint) => [checkpoint.id, checkpoint])),
      );
      setNotice(`${checkpointCount} checkpoints are ready.`);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not create checkpoints.');
    } finally {
      setBusy('');
    }
  }

  async function generateQr(checkpoint: CheckpointSummary) {
    setBusy(`qr-${checkpoint.id}`);
    setError('');
    try {
      const response = await api.patch<ApiEnvelope<{ scanUrl: string }>>(
        `/admin/checkpoints/${checkpoint.id}`,
        { rotateToken: true },
      );
      const imageUrl = await QRCode.toDataURL(response.data.data.scanUrl, {
        width: 420,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      setCheckpointQrs((current) => ({
        ...current,
        [checkpoint.id]: { ...checkpoint, scanUrl: response.data.data.scanUrl, imageUrl },
      }));
      setNotice(`${checkpoint.label} QR is ready. Download it before starting the hunt.`);
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
      for (const checkpoint of setup.checkpoints) {
        const response = await api.patch<ApiEnvelope<{ scanUrl: string }>>(
          `/admin/checkpoints/${checkpoint.id}`,
          { rotateToken: true },
        );
        const generated = {
          ...checkpoint,
          scanUrl: response.data.data.scanUrl,
          imageUrl: await QRCode.toDataURL(response.data.data.scanUrl, {
            width: 420,
            margin: 2,
            errorCorrectionLevel: 'M',
          }),
        };
        setCheckpointQrs((current) => ({ ...current, [checkpoint.id]: generated }));
      }
      setNotice('All checkpoint QR codes are ready to download.');
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

  function updateMember(index: number, field: keyof Member, value: string) {
    setMembers((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member,
      ),
    );
  }

  const editable = !setup.event || setup.event.status === 'DRAFT';
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
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 text-xs bg-slate-800/80 hover:bg-slate-700"
            onClick={() => setSandboxOpen(true)}
          >
            <Gamepad2 className="mr-1.5 text-cyan-300" size={16} /> Game Sandbox
          </Button>
          {setup.event ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-10 text-xs bg-slate-800/80 hover:bg-slate-700"
              onClick={() => setRoundMappingOpen(true)}
            >
              <Shuffle className="mr-1.5 text-cyan-300" size={16} /> Round Games
            </Button>
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
            <Key className="mr-1.5 text-cyan-300" size={16} /> Admin Password
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
            <h2 className="text-xl font-black">Number of checkpoints</h2>
            <p className="text-sm text-slate-400">You can choose between 1 and 8.</p>
          </div>
        </div>
        <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={saveCheckpoints}>
          <Field
            label="Checkpoints"
            type="number"
            min={1}
            max={8}
            required
            disabled={!editable}
            value={checkpointCount}
            onChange={(event) => setCheckpointCount(Number(event.target.value))}
            className="w-36"
          />
          <Button disabled={!editable || busy === 'checkpoints'}>
            {busy === 'checkpoints' ? 'Setting up…' : 'Save checkpoints'}
          </Button>
        </form>

        {setup.checkpoints.length ? (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">Checkpoint QR codes</p>
                <p className="mt-1 text-sm text-slate-500">
                  Download and place the matching QR at each checkpoint.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                  disabled={!qrEditable || busy === 'all-qrs'}
                  onClick={() => void generateAllQrs()}
                >
                  <QrCode className="mr-2" size={18} />
                  {busy === 'all-qrs' ? 'Generating…' : 'Generate all QRs'}
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {setup.checkpoints.map((checkpoint) => (
                <CheckpointQrCard
                  key={checkpoint.id}
                  checkpoint={checkpoint}
                  generated={checkpointQrs[checkpoint.id]}
                  busy={busy === `qr-${checkpoint.id}`}
                  disabled={!qrEditable || busy === 'all-qrs'}
                  onGenerate={() => void generateQr(checkpoint)}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-amber-200">
              Replacing a QR immediately invalidates the previous one, including while the hunt is
              running.
            </p>
          </div>
        ) : null}
      </Panel>

      <Panel>
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-cyan-300 font-black text-slate-950">
            2
          </span>
          <div>
            <h2 className="text-xl font-black">Add team and members</h2>
            <p className="text-sm text-slate-400">Each team needs 3 to 5 members.</p>
          </div>
        </div>

        {!setup.event ? (
          <p className="mt-5 rounded-xl bg-amber-400/10 p-3 text-amber-200">
            Save the number of checkpoints first.
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
                  {filteredParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{p.displayName}</span>
                          <span className="font-mono text-xs text-cyan-300">{p.memberCode}</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Team: {p.teamName} ({p.teamCode})
                        </p>
                      </div>
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
                  ))}
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
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-black text-lg text-slate-100">{team.name}</p>
                      <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300">
                        {team.code}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-8 px-2.5 text-xs"
                      onClick={() => setSelectedTeamRounds(team.id)}
                    >
                      View Rounds
                    </Button>
                  </div>
                  <ul className="mt-3 grid gap-1.5 text-sm text-slate-400">
                    {team.participants.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-200">
                            {member.displayName}
                          </p>
                          <p className="font-mono text-xs text-cyan-300">{member.memberCode}</p>
                        </div>
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
                      </li>
                    ))}
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
        onClose={() => setAdminPasswordOpen(false)}
      />

      <TeamRoundsModal
        teamId={selectedTeamRounds}
        onClose={() => setSelectedTeamRounds(null)}
      />

      <AdminGameSandboxModal
        isOpen={sandboxOpen}
        onClose={() => setSandboxOpen(false)}
      />

      {setup.event && (
        <RoundGameMappingModal
          isOpen={roundMappingOpen}
          onClose={() => setRoundMappingOpen(false)}
          eventId={setup.event.id}
          checkpoints={setup.checkpoints}
          onSaved={() => void load()}
        />
      )}
    </div>
  );
}
