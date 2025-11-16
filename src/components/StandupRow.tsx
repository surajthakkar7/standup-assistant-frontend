// src/components/StandupRow.tsx
import { Standups } from '../lib/api';
import { toast } from 'react-toastify';

type Props = {
  s: any;                // standup doc
  canAdmin: boolean;     // caller decides if current user is admin
  refresh: () => void;   // refetch list after action
};

export default function StandupRow({ s, canAdmin, refresh }: Props) {
  const onSoftDelete = async () => {
    try {
      await Standups.delete(s._id);
      toast.success('Deleted');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  const onRestore = async () => {
    try {
      await Standups.restore(s._id);
      toast.success('Restored');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Restore failed');
    }
  };

  const onHardDelete = async () => {
    try {
      await Standups.deleteHard(s._id);
      toast.success('Hard deleted');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Hard delete failed');
    }
  };

  const displayName =
    s.user?.name || s.userId?.name || String(s.userId || 'User');

  return (
    <div
      className={[
        'flex items-start justify-between gap-3 rounded-xl px-3 py-2',
        // light card row
        'bg-white border border-slate-200',
        // dark card row
        'dark:bg-black/30 dark:border-white/10',
      ].join(' ')}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {displayName}
          </span>
          {s.isDeleted && (
            <span
              className={[
                'text-[11px] px-2 py-0.5 rounded-full border',
                // light badge
                'bg-rose-50 text-rose-700 border-rose-200',
                // dark badge
                'dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30',
              ].join(' ')}
              title="Soft-deleted"
            >
              Deleted
            </span>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-300">
          {s.date}
        </div>

        <div className="text-sm mt-1 text-slate-800 dark:text-white/90">
          <b>Yesterday:</b> {s.yesterday || '-'}
        </div>
        <div className="text-sm text-slate-800 dark:text-white/90">
          <b>Today:</b> {s.today || '-'}
        </div>
        <div className="text-sm text-slate-800 dark:text-white/90">
          <b>Blockers:</b> {s.blockers || '-'}
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {!s.isDeleted && (
          <button
            className={[
              'btn btn-xs',
              // ensure good contrast in both themes if your .btn is minimal
              'bg-slate-900 text-white hover:bg-black',
              'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
            ].join(' ')}
            onClick={onSoftDelete}
          >
            Delete
          </button>
        )}

        {s.isDeleted && (
          <button
            className={[
              'btn btn-xs',
              'bg-emerald-600 text-white hover:bg-emerald-700',
              'dark:bg-emerald-500 dark:text-slate-900 dark:hover:bg-emerald-400',
            ].join(' ')}
            onClick={onRestore}
          >
            Restore
          </button>
        )}

        {canAdmin && (
          <button
            className={[
              'btn btn-xs',
              'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-100',
              'dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/10',
            ].join(' ')}
            onClick={onHardDelete}
            title="Permanent delete (admin)"
          >
            Hard Delete
          </button>
        )}
      </div>
    </div>
  );
}
