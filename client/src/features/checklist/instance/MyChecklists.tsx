import { useState } from 'react';
import { AlertCircle, ClipboardCheck, X } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Skeleton, PageNav } from '../../../components';
import { Badge } from '@/components/ui/badge';
import { useMyChecklistInstancesQuery, useChecklistInstanceSummaryQuery } from '../hook';
import { ChecklistInstanceCard } from './ChecklistInstanceCard';
import { MyChecklistsQuickStats, type MyChecklistsQuickFilterKey } from './MyChecklistsQuickStats';
import { RECURRENCE_LABEL } from '../checklistDisplay';
import type { ChecklistInstance, ChecklistInstanceStatus } from '../../../api/checklistInstances';
import type { ChecklistRecurrence } from '../../../api/checklistDefinitions';

// "Due" mirrors the Dashboard's own Due/Completed split for this domain (KpiStrip.tsx) — anything
// not every-item-done yet. "Overdue" is the subset of that whose period has already closed, same
// due/overdue relationship TicketQuickStats uses for pending/delayed. These three now map onto the
// server's OPEN / COMPLETED / OVERDUE status filter (see `serverStatus` below) rather than being
// applied here over a fully-downloaded list.

const QUICK_FILTER_LABEL: Record<MyChecklistsQuickFilterKey, string> = { due: 'Due', completed: 'Completed', overdue: 'Overdue' };

const PAGE_SIZE = 50;

export const MyChecklists = () => {
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  // One-time-read-from-URL seed (same pattern as TicketList/TaskList/TodoPage's `quickFilter`) so
  // the Dashboard's "Due"/"Completed" rows still land on the matching subset here; from then on
  // the tiles below drive it directly, same as everywhere else this pattern is used.
  const [quickFilter, setQuickFilter] = useState<MyChecklistsQuickFilterKey | null>(() => {
    const sf = searchParams.get('status');
    return sf === 'due' || sf === 'completed' ? sf : null;
  });
  // The tile now narrows the query itself instead of filtering an already-downloaded list —
  // `overdue` became a real server status (unfinished and past its period end), which is what let
  // this endpoint start paginating at all.
  const serverStatus: ChecklistInstanceStatus | undefined =
    quickFilter === 'completed' ? 'COMPLETED'
    : quickFilter === 'due' ? 'OPEN'
    : quickFilter === 'overdue' ? 'OVERDUE'
    : undefined;

  const { data: allInstances = [], isPending, isError } = useMyChecklistInstancesQuery(serverStatus, { page, limit: PAGE_SIZE });

  const toggleQuickFilter = (key: MyChecklistsQuickFilterKey) => {
    setQuickFilter((prev) => (prev === key ? null : key));
    // Page 4 of the old filter is meaningless against the new one, and usually past its end.
    setPage(1);
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete('status'); return p; });
  };

  // From the database, not from `allInstances.length`. Counting the fetched array is what forced
  // /mine to return every instance ever assigned; with the tiles independent of the list, the list
  // can page later without the numbers above it quietly turning into page sizes.
  const { data: summary } = useChecklistInstanceSummaryQuery({ mine: true });
  const counts: Record<MyChecklistsQuickFilterKey, number> = {
    completed: summary?.completed ?? 0,
    due: summary?.pending ?? 0,
    overdue: summary?.overdue ?? 0,
  };

  const instances = allInstances;

  // How many rows the active filter matches — taken from the summary counts already fetched
  // above rather than a second request, since they're the same four numbers the tiles show.
  const matchingTotal =
    quickFilter === 'completed' ? counts.completed
    : quickFilter === 'due' ? counts.due
    : quickFilter === 'overdue' ? counts.overdue
    : (summary?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(matchingTotal / PAGE_SIZE));

  const grouped = new Map<ChecklistRecurrence, ChecklistInstance[]>();
  for (const instance of instances) {
    if (!grouped.has(instance.recurrence)) grouped.set(instance.recurrence, []);
    grouped.get(instance.recurrence)!.push(instance);
  }

  return (
    // Was `max-w-5xl` with no `mx-auto` — a 1024px cap, left-aligned, while every other top-level
    // page uses the shared 1536px container and centres. Moving between Delegation and Checklists
    // visibly jumped the content ~500px narrower and slammed it against the left edge.
    <div className="flex flex-col gap-6 mx-auto w-full max-w-(--container-width) transition-all duration-300">
      {/* Same header treatment as Delegation, Tickets and To-Do: no visible title block — the nav
          item that got you here already says My Checklists, and the lead "Assigned to you" tile
          carries the count. The heading stays as the page's one accessibility landmark. */}
      <h1 className="sr-only">My Checklists</h1>

      <MyChecklistsQuickStats
        counts={counts}
        total={summary?.total ?? 0}
        active={quickFilter}
        onToggle={toggleQuickFilter}
        onClear={() => setQuickFilter(null)}
        isLoading={isPending}
      />

      {quickFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-xs font-display font-medium rounded-full bg-primary-50 text-primary-700 border border-primary-200">
            Showing: {QUICK_FILTER_LABEL[quickFilter]}
            <button
              type="button"
              onClick={() => setQuickFilter(null)}
              aria-label="Clear status filter"
              className="p-0.5 rounded-full hover:bg-primary-100 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      {isPending && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div role="alert" className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-danger/20 bg-danger/10 text-danger text-sm font-display">
          <AlertCircle size={18} className="shrink-0" />
          <span>Failed to load your checklists. Please check your connection and try again.</span>
        </div>
      )}

      {!isPending && !isError && instances.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 rounded-xl border border-dashed border-border/70 bg-surface/30 text-center">
          <span className="flex items-center justify-center size-12 rounded-lg bg-surface-hover text-text-muted border border-border">
            <ClipboardCheck size={20} strokeWidth={2.25} />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-display font-bold text-text">
              {quickFilter ? `No checklists match "${QUICK_FILTER_LABEL[quickFilter]}"` : 'No checklists assigned to you yet'}
            </p>
            <p className="text-xs font-display text-text-muted max-w-xs">
              {quickFilter ? 'Try clearing the filter to see all your checklists.' : "Once you're assigned a recurring checklist, it will show up here."}
            </p>
          </div>
        </div>
      )}

      {!isPending && !isError && instances.length > 0 && (
        <div className="flex flex-col gap-6">
          {[...grouped.entries()].map(([recurrence, group]) => (
            <div key={recurrence} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-display font-bold text-text">
                  {RECURRENCE_LABEL[recurrence]}
                </h3>
                <Badge variant="neutral">{group.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.map(instance => <ChecklistInstanceCard key={instance.id} instance={instance} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isPending && !isError && totalPages > 1 && (
        <PageNav page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
};
