// src/components/TeamAI.tsx
import { useEffect, useState } from 'react';
import { API } from '../lib/api';
import { toast } from 'react-toastify';

function errMsg(e: unknown) {
  if (e && typeof e === 'object') {
    const anyE = e as any;
    return anyE?.response?.data?.message || anyE?.message || 'Something went wrong';
  }
  return 'Something went wrong';
}

type Provider = 'groq' | 'ollama' | 'gemini';
const PROVIDER_KEY = 'ai_provider'; // remember selection

// Title-case helper for member names (e.g., "suraj thakkar" -> "Suraj Thakkar")
function titleCaseName(n: string) {
  return (n || '')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

export default function TeamAI({ teamId, date }: { teamId?: string; date: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<Provider>(() => {
    const saved = (localStorage.getItem(PROVIDER_KEY) || 'groq') as Provider;
    return saved === 'gemini' || saved === 'ollama' ? saved : 'groq';
  });

  // Clear stale data when inputs change
  useEffect(() => {
    setData(null);
    setLoading(false);
  }, [teamId, date, provider]);

  const runAI = async () => {
    if (!teamId) return toast.warn('Pick a team first');
    localStorage.setItem(PROVIDER_KEY, provider);
    setLoading(true);
    try {
      const qs = new URLSearchParams({ teamId, date, provider }).toString();
      const res = await API.get(`/api/ai/team?${qs}`);
      setData(res || null);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  if (!teamId) return null;

  // Decide if we have blockerCounts; otherwise fall back to commonBlockers (strings)
  const blockerEntries: Array<[string, number]> | null = data?.blockerCounts
    ? Object.entries(data.blockerCounts as Record<string, number>)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
    : data?.commonBlockers && Array.isArray(data.commonBlockers)
    ? (data.commonBlockers as string[]).slice(0, 5).map((label) => [label, 0])
    : null;

  return (
    <div
      className={[
        'mt-3 rounded-2xl p-4',
        // light card
        'bg-white border border-slate-200',
        // dark card
        'dark:bg-black/30 dark:border-white/10',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          AI Team Summary ({date})
        </h3>

        <div className="flex items-center gap-2">
          <select
            className={[
              'rounded-xl px-3 py-2 text-sm',
              // light input
              'bg-white border border-slate-200 text-slate-800',
              // dark input
              'dark:bg-white/10 dark:border-white/10 dark:text-slate-100',
            ].join(' ')}
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            title="Choose LLM provider"
          >
            <option value="groq">Groq (Llama 3.1)</option>
            <option value="gemini">Gemini 1.5</option>
            <option value="ollama">Ollama (local)</option>
          </select>

          <button
            className={[
              'px-3 py-2 rounded-xl text-sm transition-colors',
              // light button
              'bg-slate-900 text-white hover:bg-black',
              // dark button
              'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
            ].join(' ')}
            onClick={runAI}
            disabled={loading}
          >
            {loading ? 'Summarizing…' : data ? 'Refresh AI' : 'Get AI Summary'}
          </button>
        </div>
      </div>

      {!data && !loading && (
        <div
          className={[
            'rounded-md p-3 text-sm',
            // light muted
            'bg-slate-50 text-slate-700 border border-slate-200',
            // dark muted
            'dark:bg-white/5 dark:text-slate-200 dark:border-white/10',
          ].join(' ')}
        >
          Click “Get AI Summary” to generate a summary for this date.
        </div>
      )}

      {loading && (
        <div className="mt-3 space-y-2 animate-pulse">
          <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
        </div>
      )}

      {data && !loading && (
        <>
          {data.teamSummary && (
            <p className="text-slate-800 dark:text-white/90 leading-relaxed">{data.teamSummary}</p>
          )}

          {blockerEntries && blockerEntries.length > 0 && (
            <>
              <div className="h-px bg-slate-200 dark:bg-white/10 my-3" />
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300 mt-2">
                Common Blockers
              </div>
              <ul className="list-disc list-inside text-slate-800 dark:text-white/90 space-y-1">
                {blockerEntries.map(([label, count], i) => (
                  <li key={i}>
                    {label} {count > 0 && <span className="opacity-75">({count})</span>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {Array.isArray(data.suggestedSyncs) && data.suggestedSyncs.length > 0 && (
            <>
              <div className="h-px bg-slate-200 dark:bg-white/10 my-3" />
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300 mt-2">
                Suggested Syncs
              </div>
              <ul className="list-disc list-inside text-slate-800 dark:text-white/90 space-y-1">
                {data.suggestedSyncs.slice(0, 5).map((s: any, i: number) => (
                  <li key={i}>
                    <b>{(s.members || []).map(titleCaseName).join(', ')}</b>: {s.reason}
                  </li>
                ))}
              </ul>
            </>
          )}

          {Array.isArray(data.risks) && data.risks.length > 0 && (
            <>
              <div className="h-px bg-slate-200 dark:bg-white/10 my-3" />
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300 mt-2">
                Risks
              </div>
              <ul className="list-disc list-inside text-slate-800 dark:text-white/90 space-y-1">
                {data.risks.slice(0, 3).map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
