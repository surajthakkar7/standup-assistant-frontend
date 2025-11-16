// src/pages/Team.tsx
import { useEffect, useMemo, useState } from 'react';
import { Teams, Standups } from '../lib/api';
import { toast } from 'react-toastify';
import TeamAI from '../components/TeamAI';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ---- Markdown wrapper (dark-aware) ----
function Md({ text = '', inline = false }: { text?: string; inline?: boolean }) {
  return (
    <div className={inline ? 'prose max-w-none inline-block align-top dark:prose-invert' : 'prose max-w-none dark:prose-invert'}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

// ---- IST date helpers ----
function toISODateIST(d: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
const todayISO = () => toISODateIST(new Date());

// ---- error helper ----
function errMsg(e: unknown) {
  if (e && typeof e === 'object') {
    const anyE = e as any;
    return anyE?.response?.data?.message || anyE?.message || 'Something went wrong';
  }
  return 'Something went wrong';
}

type TeamLite = {
  _id: string;
  name: string;
  code?: string;
  ownerId?: string;
};

export default function TeamPage() {
  const [teamName, setTeamName] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [currentTeamId, setCurrentTeamId] = useState<string>(
    localStorage.getItem('currentTeamId') || localStorage.getItem('teamId') || ''
  );
  const [currentTeam, setCurrentTeam] = useState<TeamLite | null>(null);

  const [myTeams, setMyTeams] = useState<TeamLite[]>([]);
  const [ownedTeams, setOwnedTeams] = useState<TeamLite[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [date, setDate] = useState(todayISO());
  const [standups, setStandups] = useState<any[]>([]);

  const [busyCreate, setBusyCreate] = useState(false);
  const [busyJoin, setBusyJoin] = useState(false);
  const [busyMembers, setBusyMembers] = useState(false);
  const [busyStandups, setBusyStandups] = useState(false);
  const [busySaveName, setBusySaveName] = useState(false);
  const [busyRotate, setBusyRotate] = useState(false);
  const [busyLeave, setBusyLeave] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyHardDelete, setBusyHardDelete] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // Load lists on mount
  useEffect(() => {
    void refreshLists();
  }, []);

  // Load current team details if we have an id
  useEffect(() => {
    if (!currentTeamId) {
      setCurrentTeam(null);
      setMembers([]);
      setStandups([]);
      return;
    }
    localStorage.setItem('currentTeamId', currentTeamId);
    void loadCurrentTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeamId]);

  const isOwner = useMemo(() => {
    const me = (() => {
      try {
        return JSON.parse(localStorage.getItem('me') || 'null');
      } catch {
        return null;
      }
    })();
    return !!(currentTeam && me && (currentTeam as any).ownerId && String((currentTeam as any).ownerId) === String(me.id));
  }, [currentTeam]);

  async function refreshLists() {
    try {
      const mine = await Teams.listMine();
      const owned = await Teams.listOwned();
      setMyTeams(mine.teams || []);
      setOwnedTeams(owned.teams || []);
      if (!currentTeamId && mine.teams?.[0]?._id) {
        setCurrentTeamId(mine.teams[0]._id);
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function loadCurrentTeam() {
    try {
      const t = await Teams.get(currentTeamId);
      setCurrentTeam(t.team);
      if (t?.team?.name) setTeamName(t.team.name); // prefill rename box
      await loadMembers();
    } catch (e) {
      toast.error(errMsg(e));
      setCurrentTeam(null);
      setMembers([]);
    }
  }

  // ----- actions -----
  async function createTeam() {
    if (!teamName.trim()) return toast.warn('Team name is required');
    setBusyCreate(true);
    try {
      const res = await Teams.create(teamName.trim());
      toast.success(`Team created. Join code: ${res.team.code}`);
      setCurrentTeamId(res.team._id);
      await refreshLists();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyCreate(false);
    }
  }

  async function joinTeam() {
    if (!joinInput.trim()) return toast.warn('Team code is required');
    setBusyJoin(true);
    try {
      const res = await Teams.join(joinInput.trim());
      toast.success(`Joined: ${res.team.name}`);
      setCurrentTeamId(res.team._id);
      await refreshLists();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyJoin(false);
    }
  }

  async function loadMembers() {
    if (!currentTeamId) return toast.warn('Pick a team');
    setBusyMembers(true);
    try {
      const mem = await Teams.members(currentTeamId);
      setMembers(mem.members || []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyMembers(false);
    }
  }

  async function loadStandups() {
    if (!currentTeamId) return toast.warn('Pick a team');
    setBusyStandups(true);
    try {
      // includeDeleted only respected for owners/admins on server
      const data = await Standups.team(currentTeamId, date, includeDeleted as any);
      setStandups(data || []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyStandups(false);
    }
  }

  async function saveName() {
    if (!currentTeamId) return;
    if (!teamName.trim()) return toast.warn('Team name is required');
    setBusySaveName(true);
    try {
      const res = await Teams.update(currentTeamId, teamName.trim());
      setCurrentTeam(res.team);
      toast.success('Team renamed');
      await refreshLists();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusySaveName(false);
    }
  }

  async function rotateCode() {
    if (!currentTeamId) return;
    setBusyRotate(true);
    try {
      const res = await Teams.rotateCode(currentTeamId);
      setCurrentTeam((c) => (c ? { ...c, code: res.code } : c));
      toast.success(`New join code: ${res.code}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyRotate(false);
    }
  }

  async function leave() {
    if (!currentTeamId) return;
    if (!confirm('Leave this team?')) return;
    setBusyLeave(true);
    try {
      await Teams.leave(currentTeamId);
      toast.success('Left team');
      await refreshLists();
      const nextId = myTeams.find((t) => t._id !== currentTeamId)?._id || '';
      setCurrentTeamId(nextId);
      if (!nextId) {
        localStorage.removeItem('currentTeamId');
        setCurrentTeam(null);
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyLeave(false);
    }
  }

  async function softDelete() {
    if (!currentTeamId) return;
    if (!confirm('Delete this team for everyone? (soft delete)')) return;
    setBusyDelete(true);
    try {
      await Teams.remove(currentTeamId);
      toast.success('Team deleted (soft)');
      await refreshLists();
      setCurrentTeamId('');
      localStorage.removeItem('currentTeamId');
      setCurrentTeam(null);
      setMembers([]);
      setStandups([]);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyDelete(false);
    }
  }

  async function hardDelete() {
    if (!currentTeamId) return;
    if (!confirm('HARD DELETE: This is permanent. Continue?')) return;
    setBusyHardDelete(true);
    try {
      await Teams.removeHard(currentTeamId);
      toast.success('Team deleted (hard)');
      await refreshLists();
      setCurrentTeamId('');
      localStorage.removeItem('currentTeamId');
      setCurrentTeam(null);
      setMembers([]);
      setStandups([]);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyHardDelete(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.info('Copied');
    } catch {
      toast.error('Copy failed');
    }
  }

  // ----- UI -----
  return (
    <div className="space-y-4">
      {/* Team picker */}
      <div className={['rounded-2xl p-4', 'bg-white border border-slate-200', 'dark:bg-black/30 dark:border-white/10'].join(' ')}>
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Select Team</div>
            <select
              className={['mt-1 w-full rounded-xl px-3 py-2', 'bg-white border border-slate-200 text-slate-800', 'dark:bg-white/10 dark:border-white/10 dark:text-slate-100'].join(' ')}
              value={currentTeamId}
              onChange={(e) => setCurrentTeamId(e.target.value)}
            >
              <option value="">— Select —</option>
              {myTeams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Create Team</div>
            <div className="flex gap-2 mt-1">
              <input
                className={['flex-1 rounded-xl px-3 py-2', 'bg-white border border-slate-200 text-slate-800', 'dark:bg-white/10 dark:border-white/10 dark:text-slate-100'].join(' ')}
                placeholder="Team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              <button
                className={['px-3 py-2 rounded-xl text-sm transition-colors', 'bg-slate-900 text-white hover:bg-black', 'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'].join(' ')}
                onClick={createTeam}
                disabled={busyCreate}
              >
                {busyCreate ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Join Team</div>
            <div className="flex gap-2 mt-1">
              <input
                className={['flex-1 rounded-xl px-3 py-2', 'bg-white border border-slate-200 text-slate-800', 'dark:bg-white/10 dark:border-white/10 dark:text-slate-100'].join(' ')}
                placeholder="Join code"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
              />
              <button
                className={['px-3 py-2 rounded-xl text-sm transition-colors', 'bg-slate-900 text-white hover:bg-black', 'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'].join(' ')}
                onClick={joinTeam}
                disabled={busyJoin}
              >
                {busyJoin ? 'Joining…' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Current team details & actions */}
      {currentTeam && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className={['rounded-2xl p-4', 'bg-white border border-slate-200', 'dark:bg-black/30 dark:border-white/10'].join(' ')}>
            <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">Team Details</h3>

            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Team Name</div>
            <div className="flex gap-2 mt-1">
              <input
                className={['flex-1 rounded-xl px-3 py-2', 'bg-white border border-slate-200 text-slate-800', 'dark:bg-white/10 dark:border-white/10 dark:text-slate-100'].join(' ')}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={currentTeam.name}
              />
              <button
                className={['px-3 py-2 rounded-xl text-sm transition-colors', 'bg-slate-900 text-white hover:bg-black', 'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'].join(' ')}
                onClick={saveName}
                disabled={busySaveName || !isOwner}
              >
                {busySaveName ? 'Saving…' : 'Rename'}
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Team ID</div>
                <div className="flex gap-2 mt-1">
                  <input
                    className={['flex-1 rounded-xl px-3 py-2', 'bg-white border border-slate-200 text-slate-800', 'dark:bg-white/10 dark:border-white/10 dark:text-slate-100'].join(' ')}
                    value={currentTeamId}
                    readOnly
                  />
                  <button
                    className={['px-3 py-2 rounded-xl text-sm transition-colors', 'bg-slate-100 text-slate-800 hover:bg-slate-200', 'dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20'].join(' ')}
                    onClick={() => copy(currentTeamId)}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Join Code</div>
                <div className="flex gap-2 mt-1">
                  <input
                    className={['flex-1 rounded-xl px-3 py-2', 'bg-white border border-slate-200 text-slate-800', 'dark:bg-white/10 dark:border-white/10 dark:text-slate-100'].join(' ')}
                    value={currentTeam.code || ''}
                    readOnly
                  />
                  <button
                    className={['px-3 py-2 rounded-xl text-sm transition-colors', 'bg-slate-100 text-slate-800 hover:bg-slate-200', 'dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20'].join(' ')}
                    onClick={() => copy(currentTeam.code || '')}
                  >
                    Copy
                  </button>
                  <button
                    className={['px-3 py-2 rounded-xl text-sm transition-colors', 'bg-slate-900 text-white hover:bg-black', 'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'].join(' ')}
                    onClick={rotateCode}
                    disabled={!isOwner || busyRotate}
                  >
                    {busyRotate ? 'Rotating…' : 'Rotate'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!isOwner && (
                <button
                  className={['px-3 py-2 rounded-xl text-sm transition-colors', 'bg-slate-900 text-white hover:bg-black', 'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'].join(' ')}
                  onClick={leave}
                  disabled={busyLeave}
                >
                  {busyLeave ? 'Leaving…' : 'Leave Team'}
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    className={['px-3 py-2 rounded-xl text-sm transition-colors', 'bg-slate-100 text-slate-800 hover:bg-slate-200', 'dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20'].join(' ')}
                    onClick={softDelete}
                    disabled={busyDelete}
                  >
                    {busyDelete ? 'Deleting…' : 'Delete (soft)'}
                  </button>
                  <button
                    className={['px-3 py-2 rounded-xl text-sm transition-colors', 'bg-rose-600 text-white hover:bg-rose-700', 'dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400'].join(' ')}
                    onClick={hardDelete}
                    disabled={busyHardDelete}
                  >
                    {busyHardDelete ? 'Deleting…' : 'Delete (hard)'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={['rounded-2xl p-4', 'bg-white border border-slate-200', 'dark:bg-black/30 dark:border-white/10'].join(' ')}>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">Team Members</h3>
            <div className="flex gap-2">
              <button
                className={['px-3 py-2 rounded-xl text-sm transition-colors', 'bg-slate-900 text-white hover:bg-black', 'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'].join(' ')}
                onClick={loadMembers}
                disabled={busyMembers}
              >
                {busyMembers ? 'Loading…' : 'Refresh'}
              </button>
            </div>
            {members.length === 0 && (
              <div className={['mt-2 rounded-md p-3 text-sm', 'bg-slate-50 text-slate-700 border border-slate-200', 'dark:bg-white/5 dark:text-slate-200 dark:border-white/10'].join(' ')}>
                No members yet
              </div>
            )}
            <ul className="mt-2 space-y-1 list-disc list-inside text-slate-800 dark:text-white/90">
              {members.map((m: any) => (
                <li key={m.id || m._id}>
                  {m.name} <span className="text-slate-500 dark:text-white/50">({m.email})</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={['rounded-2xl p-4 md:col-span-2', 'bg-white border border-slate-200', 'dark:bg-black/30 dark:border-white/10'].join(' ')}>
            <div className="flex items-end justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Standups by Date</h3>
              {isOwner && (
                <label className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeDeleted}
                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                  />
                  Show deleted
                </label>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                className={['rounded-xl px-3 py-2', 'bg-white border border-slate-200 text-slate-800', 'dark:bg-white/10 dark:border-white/10 dark:text-slate-100'].join(' ')}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                className={['px-3 py-2 rounded-xl text-sm transition-colors', 'bg-slate-900 text-white hover:bg-black', 'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'].join(' ')}
                onClick={loadStandups}
                disabled={busyStandups}
              >
                {busyStandups ? 'Loading…' : 'Load'}
              </button>
            </div>
            {standups.length === 0 && (
              <div className={['mt-2 rounded-md p-3 text-sm', 'bg-slate-50 text-slate-700 border border-slate-200', 'dark:bg-white/5 dark:text-slate-200 dark:border-white/10'].join(' ')}>
                No standups found
              </div>
            )}

            <div className="mt-3 grid md:grid-cols-2 gap-3">
              {standups.map((s: any) => (
                <div
                  key={s._id || s.id}
                  className={['rounded-xl p-3', 'bg-white border border-slate-200', 'dark:bg-black/30 dark:border-white/10'].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {s.userId?.name || s.user?.name || 'User'}
                    </div>
                    {s.isDeleted && (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30">
                        Deleted
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-white/60">{s.date}</div>

                  <div className="text-sm mt-2 text-slate-800 dark:text-white/90">
                    <b>Y:</b> <Md text={s.yesterday || ''} inline />
                  </div>
                  <div className="text-sm mt-2 text-slate-800 dark:text-white/90">
                    <b>T:</b> <Md text={s.today || ''} inline />
                  </div>
                  {s.blockers && (
                    <div className="text-sm mt-2 text-slate-800 dark:text-white/90">
                      <b>B:</b> <Md text={s.blockers} inline />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI summary card (button-driven inside TeamAI) */}
          <TeamAI teamId={currentTeamId} date={date} />
        </div>
      )}

      {!currentTeam && (
        <div className={['rounded-2xl p-4', 'bg-white border border-slate-200', 'dark:bg-black/30 dark:border-white/10'].join(' ')}>
          <div className="text-slate-600 dark:text-slate-300">Pick or create a team to continue.</div>
        </div>
      )}
    </div>
  );
}
