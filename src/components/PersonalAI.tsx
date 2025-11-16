// src/components/PersonalAI.tsx
import { useCallback, useRef, useState } from 'react';
import { API } from '../lib/api';
import { toast } from 'react-toastify';

type Provider = 'groq' | 'ollama' | 'gemini';
const PROVIDER_KEY = 'ai_provider'; // reused across cards so preference is shared

type Props = { standupId?: string };

/** ----- helpers ----- */
function toneBadgeClass(tone: string) {
  const t = (tone || '').toLowerCase();

  // Light first, then dark variants
  if (t.includes('overwhelm') || t.includes('frustrat')) {
    return [
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs border',
      'bg-rose-50 text-rose-700 border-rose-200',
      'dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30',
    ].join(' ');
  }

  if (t.includes('positive') || t.includes('confiden')) {
    return [
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs border',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30',
    ].join(' ');
  }

  // neutral/default
  return [
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs border',
    'bg-slate-100 text-slate-700 border-slate-200',
    'dark:bg-slate-500/20 dark:text-slate-200 dark:border-slate-500/30',
  ].join(' ');
}

function isNonEmptyArray(x: any): x is string[] {
  return Array.isArray(x) && x.length > 0;
}

/** ----- component ----- */
export default function PersonalAI({ standupId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<Provider>(() => {
    const saved = (localStorage.getItem(PROVIDER_KEY) || 'groq') as Provider;
    return saved === 'gemini' || saved === 'ollama' ? saved : 'groq';
  });

  // cooldown to prevent rapid re-clicks
  const lastRunRef = useRef<number>(0);
  const COOLDOWN_MS = 10_000;

  const fetchAI = useCallback(async () => {
    if (!standupId) {
      toast.info('Submit today’s standup first.');
      return;
    }
    const now = Date.now();
    if (now - lastRunRef.current < COOLDOWN_MS) {
      const secs = Math.ceil((COOLDOWN_MS - (now - lastRunRef.current)) / 1000);
      toast.info(`Please wait ${secs}s before running AI again.`);
      return;
    }

    localStorage.setItem(PROVIDER_KEY, provider);
    setLoading(true);
    try {
      const qs = new URLSearchParams({ provider }).toString();
      const d = await API.get(`/api/ai/personal/${standupId}?${qs}`);
      setData(d || null);
      lastRunRef.current = now;
      toast.success('AI feedback ready');
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('forbidden')) {
        toast.info('AI is only available for your own standup.');
      } else if (msg.includes('quota') || msg.includes('rate')) {
        toast.error('AI quota/rate limit hit');
      } else {
        toast.error('AI error');
      }
    } finally {
      setLoading(false);
    }
  }, [standupId, provider]);

  // normalize shapes (new vs old)
  const keyTasks: string[] | null =
    isNonEmptyArray(data?.keyTasks)
      ? data.keyTasks
      : isNonEmptyArray(data?.strengths)
      ? data.strengths
      : null;

  const clarityFeedback: string | null =
    typeof data?.clarityFeedback === 'string' && data.clarityFeedback.trim()
      ? data.clarityFeedback.trim()
      : typeof data?.summary === 'string' && data.summary.trim()
      ? data.summary.trim()
      : null;

  const tone: string | null =
    typeof data?.tone === 'string' && data.tone.trim() ? data.tone.trim() : null;

  const suggestions: string[] | null =
    isNonEmptyArray(data?.suggestions)
      ? data.suggestions
      : isNonEmptyArray(data?.nextActions)
      ? data.nextActions
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Feedback</h3>
          {tone && <span className={toneBadgeClass(tone)} title="Detected tone">Tone: {tone}</span>}
        </div>

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
            onClick={fetchAI}
            disabled={loading || !standupId}
            title={!standupId ? 'Submit today’s standup to enable AI' : 'Run AI analysis'}
          >
            {loading ? 'Getting…' : data ? 'Refresh AI' : 'Get AI Feedback'}
          </button>
        </div>
      </div>

      {!data && !loading && (
        <div
          className={[
            'mt-3 rounded-md p-3 text-sm',
            // light muted
            'bg-slate-50 text-slate-700 border border-slate-200',
            // dark muted
            'dark:bg-white/5 dark:text-slate-200 dark:border-white/10',
          ].join(' ')}
        >
          Click <b>Get AI Feedback</b> to analyze today’s update. We won’t auto-run to save your quota.
        </div>
      )}

      {loading && (
        <div className="mt-3 space-y-2 animate-pulse">
          <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
        </div>
      )}

      {data && !loading && (
        <div className="mt-4 space-y-4">
          {/* Key Tasks */}
          {keyTasks && keyTasks.length > 0 && (
            <>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Key Tasks</div>
              <ul className="list-disc list-inside space-y-1 text-slate-800 dark:text-white/90">
                {keyTasks.slice(0, 6).map((t, i) => (
                  <li key={i} className="leading-relaxed">
                    {t}
                  </li>
                ))}
              </ul>
              <div className="h-px my-2 bg-slate-200 dark:bg-white/10" />
            </>
          )}

          {/* Clarity Feedback */}
          {clarityFeedback && (
            <>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Clarity Feedback</div>
              <p className="leading-relaxed text-slate-800 dark:text-white/90">{clarityFeedback}</p>
              <div className="h-px my-2 bg-slate-200 dark:bg-white/10" />
            </>
          )}

          {/* Suggestions */}
          {suggestions && suggestions.length > 0 && (
            <>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Suggestions</div>
              <ul className="list-disc list-inside space-y-1 text-slate-800 dark:text-white/90">
                {suggestions.slice(0, 5).map((s: string, i: number) => (
                  <li key={i} className="leading-relaxed">
                    {s}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
