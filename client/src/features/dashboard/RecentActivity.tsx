import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Ticket as TicketIcon, CheckSquare, Clock, Activity, Search, ArrowUpDown } from 'lucide-react';
import { Skeleton } from '../../components';
import { TASK_STATUS_COLORS, type FeedItem } from './dashboardDisplay';
import { STATUS_LABEL } from '../tasks/taskDisplay';
import { STATUS_CONFIG as TICKET_STATUS_CONFIG } from '../tickets/ticketDisplay';
import type { TicketStatus } from '../../api/ticket';
import type { Task } from '../../api/task';

interface RecentActivityProps {
  feed: FeedItem[];
  isPending: boolean;
}

type SortOrder = 'newest' | 'oldest';

// A searchable, sortable table over the same recent feed — same idea as a "Recent orders" panel,
// scoped to whatever `feed` HomePage hands it (its most recent handful of tickets/tasks, not the
// full history), so search/sort here narrows down that window rather than the whole account.
export const RecentActivity = ({ feed, isPending }: RecentActivityProps) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOrder>('newest');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle ? feed.filter((item) => item.title.toLowerCase().includes(needle)) : feed;
    return [...filtered].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === 'newest' ? -diff : diff;
    });
  }, [feed, query, sort]);

  return (
    <div id="recent-activity" className="relative group rounded-xl border border-border/60 bg-surface flex flex-col hover:border-primary-300 transition-colors duration-300 overflow-hidden">
      {/* Decorative Background Glow */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none transition-opacity group-hover:opacity-100 opacity-50" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 border-b border-border/40 bg-surface/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-800/50 text-primary-600 dark:text-primary-400 shadow-sm flex items-center justify-center">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold text-text tracking-tight">Recent Activity</h2>
            <p className="text-xs font-display text-text-muted mt-0.5">Latest updates on tickets and tasks</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 w-28 sm:w-40 pl-7 pr-2.5 rounded-lg border border-border/60 bg-surface-hover/60 text-xs text-text placeholder:text-text-muted/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-surface"
            />
          </div>
          <button
            type="button"
            onClick={() => setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}
            title="Toggle sort order"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border/60 bg-surface hover:bg-surface-hover text-xs font-display font-medium text-text-secondary transition-colors cursor-pointer"
          >
            <ArrowUpDown size={12} />
            <span className="hidden sm:inline">{sort === 'newest' ? 'Newest' : 'Oldest'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="relative z-10 overflow-x-auto">
        {isPending ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg">
                <Skeleton className="size-8 rounded-lg shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className="h-4 w-3/4 max-w-sm rounded" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        ) : feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="p-3 rounded-full bg-surface-hover border border-border/50">
              <Clock size={20} className="text-text-muted" />
            </div>
            <p className="text-sm font-display text-text-muted font-medium">Nothing here yet — create a ticket or task to get started.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="p-3 rounded-full bg-surface-hover border border-border/50">
              <Search size={20} className="text-text-muted" />
            </div>
            <p className="text-sm font-display text-text-muted font-medium">No matches for "{query}".</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left font-display text-[11px] font-semibold capitalize tracking-wide text-text-muted px-4 py-2.5">Item</th>
                <th className="text-left font-display text-[11px] font-semibold capitalize tracking-wide text-text-muted px-4 py-2.5 hidden sm:table-cell">Type</th>
                <th className="text-left font-display text-[11px] font-semibold capitalize tracking-wide text-text-muted px-4 py-2.5">Status</th>
                <th className="text-right font-display text-[11px] font-semibold capitalize tracking-wide text-text-muted px-4 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {visible.map((item) => (
                <tr key={`${item.kind}-${item.id}`} className="group/row hover:bg-surface-hover/60 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={item.kind === 'ticket' ? '/tickets' : '/tasks'} className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex items-center justify-center size-8 rounded-lg shrink-0 transition-colors ${
                          item.kind === 'ticket'
                            ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 group-hover/row:bg-primary-500/15'
                            : 'bg-warning/10 text-warning group-hover/row:bg-warning/15'
                        }`}
                      >
                        {item.kind === 'ticket' ? <TicketIcon size={14} /> : <CheckSquare size={14} />}
                      </div>
                      <span className="font-display font-medium text-text truncate">{item.title}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs font-display font-medium text-text-muted">
                      {item.kind === 'ticket' ? 'Ticket' : 'Delegation'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center justify-center text-[11px] font-display font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        item.kind === 'ticket'
                          ? TICKET_STATUS_CONFIG[item.status as TicketStatus].className
                          : TASK_STATUS_COLORS[item.status as Task['status']]
                      }`}
                    >
                      {item.kind === 'ticket' ? TICKET_STATUS_CONFIG[item.status as TicketStatus].label : STATUS_LABEL[item.status as Task['status']]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-text-muted font-display font-medium whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};