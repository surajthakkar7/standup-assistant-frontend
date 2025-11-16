// src/pages/Insights.tsx
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { API } from '../lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// ---- IST helpers ----
const toISO = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
const today = toISO(new Date());
const sixDaysAgo = (() => {
  const x = new Date();
  x.setDate(x.getDate() - 6);
  return toISO(x);
})();

function errMsg(e: unknown) {
  if (e && typeof e === 'object') {
    const anyE = e as any;
    return anyE?.response?.data?.message || anyE?.message || 'Something went wrong';
  }
  return 'Something went wrong';
}

export default function Insights() {
  const [teamId, setTeamId] = useState<string>(
    localStorage.getItem('currentTeamId') || localStorage.getItem('teamId') || ''
  );
  const [from, setFrom] = useState<string>(sixDaysAgo);
  const [to, setTo] = useState<string>(today);
  const [perDay, setPerDay] = useState<{ date: string; count: number }[]>([]);
  const [blockerCounts, setBlockerCounts] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // clear data if filters/team change (no auto-fetch)
  useEffect(() => {
    setPerDay([]);
    setBlockerCounts({});
    setStreak(0);
  }, [teamId, from, to]);

  const load = async () => {
    if (!teamId) return toast.warn('Pick a team (open Team tab or paste ID then "Use Saved")');
    setLoading(true);
    try {
      const qs = new URLSearchParams({ teamId, from, to }).toString();
      const trends = await API.get(`/api/insights/trends?${qs}`);
      const streakRes = await API.get(`/api/insights/streak?teamId=${teamId}`);

      setPerDay((trends.perDay || []).map((d: any) => ({ date: d._id, count: d.count })));
      setBlockerCounts(trends.blockerCounts || {});
      setStreak(streakRes.streak || 0);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const blockersData = Object.entries(blockerCounts).map(([name, value]) => ({ name, value }));

  // Recharts can use CSS currentColor; we set color on a wrapper for light/dark
  const chartWrapperClass = 'text-slate-800 dark:text-slate-200';

  return (
    <div className="space-y-4">
      {/* Filters card */}
      <div
        className={[
          'rounded-2xl p-4',
          'bg-white border border-slate-200',
          'dark:bg-black/30 dark:border-white/10',
        ].join(' ')}
      >
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Team ID</div>
            <div className="flex gap-2 mt-1">
              <input
                className={[
                  'rounded-xl px-3 py-2 flex-1',
                  'bg-white border border-slate-200 text-slate-800',
                  'dark:bg-white/10 dark:border-white/10 dark:text-slate-100',
                ].join(' ')}
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="paste team _id"
              />
              <button
                className={[
                  'px-3 py-2 rounded-xl text-sm transition-colors',
                  'bg-slate-900 text-white hover:bg-black',
                  'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
                ].join(' ')}
                onClick={() => {
                  const saved =
                    localStorage.getItem('currentTeamId') || localStorage.getItem('teamId') || '';
                  setTeamId(saved);
                  if (!saved) toast.info('No teamId stored yet');
                }}
              >
                Use Saved
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">From</div>
            <input
              className={[
                'rounded-xl px-3 py-2 w-full mt-1',
                'bg-white border border-slate-200 text-slate-800',
                'dark:bg-white/10 dark:border-white/10 dark:text-slate-100',
              ].join(' ')}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">To</div>
            <input
              className={[
                'rounded-xl px-3 py-2 w-full mt-1',
                'bg-white border border-slate-200 text-slate-800',
                'dark:bg-white/10 dark:border-white/10 dark:text-slate-100',
              ].join(' ')}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            className={[
              'px-3 py-2 rounded-xl text-sm transition-colors',
              'bg-slate-900 text-white hover:bg-black',
              'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
            ].join(' ')}
            onClick={load}
            disabled={loading}
          >
            {loading
              ? 'Loading…'
              : perDay.length || Object.keys(blockerCounts).length || streak
              ? 'Refresh'
              : 'Load'}
          </button>
        </div>
      </div>

      {/* Insights card */}
      <div
        className={[
          'rounded-2xl p-4',
          'bg-white border border-slate-200',
          'dark:bg-black/30 dark:border-white/10',
        ].join(' ')}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Insights</div>
          <div className="text-slate-700 dark:text-slate-300">
            Streak: <b>{streak}</b> days
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Line chart */}
          <div
            className={[
              'rounded-2xl p-3',
              'bg-white border border-slate-200',
              'dark:bg-black/30 dark:border-white/10',
              chartWrapperClass,
            ].join(' ')}
          >
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300 mb-1">
              Team activity (standups/day)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={perDay}>
                <CartesianGrid stroke="currentColor" strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" stroke="currentColor" />
                <YAxis allowDecimals={false} stroke="currentColor" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(17, 24, 39, 0.9)',
                    border: 'none',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="count" stroke="currentColor" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            {!loading && perDay.length === 0 && (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                No data for this range.
              </div>
            )}
          </div>

          {/* Bar chart */}
          <div
            className={[
              'rounded-2xl p-3',
              'bg-white border border-slate-200',
              'dark:bg-black/30 dark:border-white/10',
              chartWrapperClass,
            ].join(' ')}
          >
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300 mb-1">
              Top blocker keywords
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={Object.entries(blockerCounts).map(([name, value]) => ({ name, value }))}>
                <CartesianGrid stroke="currentColor" strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" stroke="currentColor" />
                <YAxis allowDecimals={false} stroke="currentColor" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(17, 24, 39, 0.9)',
                    border: 'none',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="currentColor" />
              </BarChart>
            </ResponsiveContainer>
            {!loading && Object.keys(blockerCounts).length === 0 && (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                No blockers found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
