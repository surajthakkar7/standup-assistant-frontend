// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Standups } from "../lib/api";
import { toast } from "react-toastify";
import PersonalAI from "../components/PersonalAI";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ---- Markdown wrapper (dark-aware) ----
function Md({ text = "", inline = false }: { text?: string; inline?: boolean }) {
  return (
    <div
      className={
        inline
          ? "prose max-w-none inline-block align-top dark:prose-invert"
          : "prose max-w-none dark:prose-invert"
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

// ---- IST date helpers ----
function toISODateIST(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
function todayISO() {
  return toISODateIST(new Date());
}
function addDaysIST(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
const TODAY = todayISO();
const LAST_7 = toISODateIST(addDaysIST(new Date(), -6));

// ---- error helper ----
function errMsg(e: unknown) {
  if (e && typeof e === "object") {
    const anyE = e as any;
    return anyE?.response?.data?.message || anyE?.message || "Something went wrong";
  }
  return "Something went wrong";
}

type Standup = {
  _id: string;
  date: string;
  teamId: string;
  yesterday: string;
  today: string;
  blockers?: string;
};

export default function Dashboard() {
  // Prefill teamId from Team page (localStorage)
  const [teamId, setTeamId] = useState(
    localStorage.getItem("currentTeamId") || localStorage.getItem("teamId") || ""
  );

  // --- Today form state ---
  const [yesterday, setY] = useState("");
  const [today, setT] = useState("");
  const [blockers, setB] = useState("");

  // --- Today data/UI ---
  const [mine, setMine] = useState<Standup[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const todaysEntry: Standup | undefined = useMemo(
    () => mine.find((s) => s.date?.slice(0, 10) === TODAY),
    [mine]
  );
  const hasSubmittedToday = !!todaysEntry;

  // --- History state ---
  const [hFrom, setHFrom] = useState(LAST_7);
  const [hTo, setHTo] = useState(TODAY);
  const [hPage, setHPage] = useState(1);
  const [hLimit] = useState(10);
  const [hItems, setHItems] = useState<Standup[]>([]);
  const [hLoading, setHLoading] = useState(false);
  const [hHasMore, setHHasMore] = useState(false);
  const [hInitialLoaded, setHInitialLoaded] = useState(false);

  // ---- Today: load my entry for today ----
  const loadMine = async () => {
    setLoadingList(true);
    try {
      const data = await Standups.mine({ from: TODAY, to: TODAY });
      setMine(data || []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadMine();
  }, []);

  useEffect(() => {
    if (todaysEntry && !editingId) {
      setY(todaysEntry.yesterday || "");
      setT(todaysEntry.today || "");
      setB(todaysEntry.blockers || "");
    }
  }, [todaysEntry, editingId]);

  const validate = () => {
    if (!teamId) {
      toast.warn("Enter a teamId (create/join on Team tab)");
      return false;
    }
    if (!yesterday.trim() || !today.trim()) {
      toast.warn("Yesterday and Today are required");
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await Standups.create({
        teamId,
        yesterday: yesterday.trim(),
        today: today.trim(),
        blockers: blockers.trim(),
      });
      toast.success("Standup submitted");
      setEditingId(null);
      await loadMine();
      if (hInitialLoaded && hFrom <= TODAY && TODAY <= hTo) {
        await reloadHistory();
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = () => {
    if (!todaysEntry) return;
    setEditingId(todaysEntry._id);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      await Standups.update(editingId, {
        yesterday: yesterday.trim(),
        today: today.trim(),
        blockers: blockers.trim(),
      });
      toast.success("Standup updated");
      setEditingId(null);
      await loadMine();
      if (hInitialLoaded && hFrom <= TODAY && TODAY <= hTo) {
        await reloadHistory();
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    if (todaysEntry) {
      setY(todaysEntry.yesterday || "");
      setT(todaysEntry.today || "");
      setB(todaysEntry.blockers || "");
    } else {
      setY("");
      setT("");
      setB("");
    }
  };

  const handleDelete = async () => {
    const id = editingId || todaysEntry?._id;
    if (!id) return;
    if (!confirm("Delete today’s standup?")) return;
    setDeleting(true);
    try {
      await Standups.delete(id);
      toast.success("Deleted");
      setEditingId(null);
      setY("");
      setT("");
      setB("");
      await loadMine();
      if (hInitialLoaded && hFrom <= TODAY && TODAY <= hTo) {
        await reloadHistory();
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setDeleting(false);
    }
  };

  // ---- History: load list with pagination ----
  const loadHistory = async (page: number) => {
    if (!hFrom || !hTo) {
      toast.warn("Pick a valid date range");
      return;
    }
    setHLoading(true);
    try {
      const data: Standup[] = await Standups.mine({ from: hFrom, to: hTo, page, limit: hLimit });
      const hasMore = Array.isArray(data) && data.length === hLimit;
      setHHasMore(hasMore);
      if (page === 1) {
        setHItems(data || []);
      } else {
        setHItems((prev) => [...prev, ...(data || [])]);
      }
      setHPage(page);
      if (!hInitialLoaded) setHInitialLoaded(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setHLoading(false);
    }
  };

  const reloadHistory = async () => {
    await loadHistory(1);
  };

  // initial history (auto)
  useEffect(() => {
    void loadHistory(1);
  }, []);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Column 1: Today Form */}
      <div
        className={[
          "rounded-2xl p-4",
          "bg-white border border-slate-200",
          "dark:bg-black/30 dark:border-white/10",
        ].join(" ")}
      >
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">
          Today&apos;s Standup
        </h2>

        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Team ID</label>
        <div className="flex gap-2 mt-1">
          <input
            className={[
              "rounded-xl px-3 py-2 flex-1",
              "bg-white border border-slate-200 text-slate-800",
              "dark:bg-white/10 dark:border-white/10 dark:text-slate-100",
            ].join(" ")}
            placeholder="paste team _id"
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              localStorage.setItem("teamId", e.target.value);
            }}
          />
          <button
            className={[
              "px-3 py-2 rounded-xl text-sm transition-colors",
              "bg-slate-900 text-white hover:bg-black",
              "dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
            ].join(" ")}
            onClick={() => {
              const stored = localStorage.getItem("teamId") || "";
              setTeamId(stored);
              if (!stored) toast.info("No teamId in device storage yet");
              else toast.info("Team ID loaded from device");
            }}
          >
            Use Saved
          </button>
        </div>

        <label className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          What I did yesterday
        </label>
        <textarea
          className={[
            "rounded-xl px-3 py-2 h-28 w-full",
            "bg-white border border-slate-200 text-slate-800",
            "dark:bg-white/10 dark:border-white/10 dark:text-slate-100",
          ].join(" ")}
          value={yesterday}
          onChange={(e) => setY(e.target.value)}
          placeholder="Bulleted points are great"
        />

        <label className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          What I&apos;m doing today
        </label>
        <textarea
          className={[
            "rounded-xl px-3 py-2 h-28 w-full",
            "bg-white border border-slate-200 text-slate-800",
            "dark:bg-white/10 dark:border-white/10 dark:text-slate-100",
          ].join(" ")}
          value={today}
          onChange={(e) => setT(e.target.value)}
          placeholder="Plan for today"
        />

        <label className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          Blockers (optional)
        </label>
        <textarea
          className={[
            "rounded-xl px-3 py-2 h-24 w-full",
            "bg-white border border-slate-200 text-slate-800",
            "dark:bg-white/10 dark:border-white/10 dark:text-slate-100",
          ].join(" ")}
          value={blockers}
          onChange={(e) => setB(e.target.value)}
          placeholder="Anything blocking you?"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {!hasSubmittedToday && (
            <button
              className={[
                "px-3 py-2 rounded-xl text-sm transition-colors",
                "bg-slate-900 text-white hover:bg-black",
                "dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
              ].join(" ")}
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          )}
          {hasSubmittedToday && !editingId && (
            <>
              <button
                className={[
                  "px-3 py-2 rounded-xl text-sm transition-colors",
                  "bg-slate-900 text-white hover:bg-black",
                  "dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
                ].join(" ")}
                onClick={startEdit}
              >
                Edit today’s entry
              </button>
              <button
                className={[
                  "px-3 py-2 rounded-xl text-sm transition-colors",
                  "bg-rose-600 text-white hover:bg-rose-700",
                  "dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400",
                ].join(" ")}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
          {editingId && (
            <>
              <button
                className={[
                  "px-3 py-2 rounded-xl text-sm transition-colors",
                  "bg-slate-900 text-white hover:bg-black",
                  "dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
                ].join(" ")}
                onClick={saveEdit}
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save changes"}
              </button>
              <button
                className={[
                  "px-3 py-2 rounded-xl text-sm transition-colors",
                  "bg-slate-100 text-slate-800 hover:bg-slate-200",
                  "dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20",
                ].join(" ")}
                onClick={cancelEdit}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className={[
                  "px-3 py-2 rounded-xl text-sm transition-colors",
                  "bg-rose-600 text-white hover:bg-rose-700",
                  "dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400",
                ].join(" ")}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Rule: you can submit once per day and edit or delete it until the day ends. Older entries are read-only.
        </p>

        {/* Personal AI (only when today’s entry exists) */}
        {todaysEntry && <PersonalAI standupId={todaysEntry._id} />}
      </div>

      {/* Column 2: Today list */}
      <div
        className={[
          "rounded-2xl p-4",
          "bg-white border border-slate-200",
          "dark:bg-black/30 dark:border-white/10",
        ].join(" ")}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            My standups (today)
          </h3>
          <button
            className={[
              "px-3 py-2 rounded-xl text-sm transition-colors",
              "bg-slate-900 text-white hover:bg-black",
              "dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
            ].join(" ")}
            onClick={loadMine}
            disabled={loadingList}
          >
            {loadingList ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {mine.length === 0 && (
          <div
            className={[
              "rounded-md p-3 text-sm",
              "bg-slate-50 text-slate-700 border border-slate-200",
              "dark:bg-white/5 dark:text-slate-200 dark:border-white/10",
            ].join(" ")}
          >
            No entry yet
          </div>
        )}

        <div className="space-y-3">
          {mine.map((s) => {
            const isToday = s.date?.slice(0, 10) === TODAY;
            return (
              <div
                key={s._id}
                className={[
                  "rounded-xl p-3",
                  "bg-white border border-slate-200",
                  "dark:bg-black/30 dark:border-white/10",
                ].join(" ")}
              >
                <div className="text-sm text-slate-600 dark:text-white/70">
                  <b className="text-slate-900 dark:text-slate-100">{s.date}</b>{" "}
                  {isToday ? "(today)" : ""}
                </div>
                <div className="text-sm mt-2 text-slate-800 dark:text-white/90">
                  <b>Y:</b> <Md text={s.yesterday || ""} inline />
                </div>
                <div className="text-sm mt-2 text-slate-800 dark:text-white/90">
                  <b>T:</b> <Md text={s.today || ""} inline />
                </div>
                {s.blockers && (
                  <div className="text-sm mt-2 text-slate-800 dark:text-white/90">
                    <b>B:</b> <Md text={s.blockers} inline />
                  </div>
                )}
                {isToday && !editingId && (
                  <div className="mt-2 flex gap-2">
                    <button
                      className={[
                        "px-3 py-2 rounded-xl text-sm transition-colors",
                        "bg-slate-900 text-white hover:bg-black",
                        "dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
                      ].join(" ")}
                      onClick={startEdit}
                    >
                      Edit
                    </button>
                    <button
                      className={[
                        "px-3 py-2 rounded-xl text-sm transition-colors",
                        "bg-rose-600 text-white hover:bg-rose-700",
                        "dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400",
                      ].join(" ")}
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Column 3: History */}
      <div
        className={[
          "rounded-2xl p-4",
          "bg-white border border-slate-200",
          "dark:bg-black/30 dark:border-white/10",
        ].join(" ")}
      >
        <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">
          My History
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">From</div>
            <input
              className={[
                "rounded-xl px-3 py-2 w-full",
                "bg-white border border-slate-200 text-slate-800",
                "dark:bg-white/10 dark:border-white/10 dark:text-slate-100",
              ].join(" ")}
              type="date"
              value={hFrom}
              onChange={(e) => setHFrom(e.target.value)}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">To</div>
            <input
              className={[
                "rounded-xl px-3 py-2 w-full",
                "bg-white border border-slate-200 text-slate-800",
                "dark:bg-white/10 dark:border-white/10 dark:text-slate-100",
              ].join(" ")}
              type="date"
              value={hTo}
              onChange={(e) => setHTo(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            className={[
              "px-3 py-2 rounded-xl text-sm transition-colors",
              "bg-slate-900 text-white hover:bg-black",
              "dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
            ].join(" ")}
            onClick={reloadHistory}
            disabled={hLoading}
          >
            {hLoading ? "Loading…" : "Load"}
          </button>
          <button
            className={[
              "px-3 py-2 rounded-xl text-sm transition-colors",
              "bg-slate-100 text-slate-800 hover:bg-slate-200",
              "dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20",
            ].join(" ")}
            onClick={() => {
              setHFrom(LAST_7);
              setHTo(TODAY);
              void loadHistory(1);
            }}
            disabled={hLoading}
          >
            Last 7 days
          </button>
        </div>

        {hItems.length === 0 && (
          <div
            className={[
              "mt-3 rounded-md p-3 text-sm",
              "bg-slate-50 text-slate-700 border border-slate-200",
              "dark:bg-white/5 dark:text-slate-200 dark:border-white/10",
            ].join(" ")}
          >
            {hInitialLoaded ? "No results for this range" : "Pick a range and click Load"}
          </div>
        )}

        <div className="mt-3 space-y-3">
          {hItems.map((s) => (
            <div
              key={s._id}
              className={[
                "rounded-xl p-3",
                "bg-white border border-slate-200",
                "dark:bg-black/30 dark:border-white/10",
              ].join(" ")}
            >
              <div className="text-sm text-slate-600 dark:text-white/70">
                <b className="text-slate-900 dark:text-slate-100">{s.date}</b>
              </div>
              <div className="text-sm mt-2 text-slate-800 dark:text-white/90">
                <b>Y:</b> <Md text={s.yesterday || ""} inline />
              </div>
              <div className="text-sm mt-2 text-slate-800 dark:text-white/90">
                <b>T:</b> <Md text={s.today || ""} inline />
              </div>
              {s.blockers && (
                <div className="text-sm mt-2 text-slate-800 dark:text-white/90">
                  <b>B:</b> <Md text={s.blockers} inline />
                </div>
              )}
            </div>
          ))}
        </div>

        {hItems.length > 0 && (
          <div className="mt-3">
            <button
              className={[
                "px-3 py-2 rounded-xl text-sm transition-colors",
                hHasMore
                  ? "bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400",
              ].join(" ")}
              onClick={() => loadHistory(hPage + 1)}
              disabled={hLoading || !hHasMore}
              title={hHasMore ? "Load the next page" : "No more results"}
            >
              {hLoading ? "Loading…" : hHasMore ? "Load more" : "No more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
