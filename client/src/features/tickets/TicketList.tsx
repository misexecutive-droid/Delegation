import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, AlertCircle, Inbox, RotateCcw, Building2, User, FileDown, X, LayoutGrid, UserPen, UserCheck } from 'lucide-react';
import { Button, PageNav } from '../../components';
import { useAuth } from '@/context/AuthContext';
import { useTicketsQuery, useDepartmentsQuery } from './hook';
import { TicketForm } from './TicketForm';
import { TicketDetail } from './TicketDetail';
import { ExportDialog } from '../reports';
import { TicketSearchInput, TicketStatusFilterDropdown } from './list/TicketListControls';
import { TicketListSkeleton } from './list/TicketListSkeleton';
import { TicketGroupedList } from './list/TicketGroupedList';
import { TicketQuickStats, type TicketQuickFilterKey, type TicketQuickFilterCounts } from './list/TicketQuickStats';
import {
  STATUS_FILTER_PREDICATES,
  SCOPE_FILTER_PREDICATES,
  SCOPE_FILTERS,
  type ScopeFilter,
  type FilterStatus,
} from './list/ticketFilters';
import { groupByDepartment, groupByAssignee } from './list/ticketGrouping';
import type { Ticket } from '../../api/ticket';

const SCOPE_ICON: Record<ScopeFilter, typeof LayoutGrid> = {
  ALL: LayoutGrid,
  CREATED_BY_ME: UserPen,
  ASSIGNED_TO_ME: UserCheck,
};

export const TicketList = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [page, setPage] = useState(1);

  // A deep link from the Team Overview drill-down (department -> person -> Ticket bar) — a
  // one-person server-side filter, distinct from the scope/status/search filters below, which
  // stay session-only. Cleared via its own "×", not "Reset Filters".
  const [searchParams, setSearchParams] = useSearchParams();
  const assigneeIdFilter = searchParams.get('assigneeIds') ?? undefined;

  const { data, isPending, isError } = useTicketsQuery(page, 20, assigneeIdFilter);
  const tickets = data?.data ?? [];
  const meta = data?.meta;
  const { data: departments } = useDepartmentsQuery();
  const departmentNames = new Map((departments ?? []).map(d => [d.id, d.name]));

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<'department' | 'assignee'>('department');
  // The page's own "at a glance" tiles (Pending/Completed/Due/Delayed) — layered on top of the
  // scope/status/search filters below rather than replacing them. Click the active tile again to
  // clear it.
  const [quickFilter, setQuickFilter] = useState<TicketQuickFilterKey | null>(null);
  const toggleQuickFilter = (key: TicketQuickFilterKey) => setQuickFilter((prev) => (prev === key ? null : key));

  const scopeFiltered = user
    ? tickets.filter(t => SCOPE_FILTER_PREDICATES[scopeFilter](t, user.id))
    : tickets;
  const statusFiltered = scopeFiltered.filter(STATUS_FILTER_PREDICATES[statusFilter]);

  // Quick-stat tiles — "Delayed" mirrors the server-computed ticket.isOverdue (excluding CLOSED,
  // same as the badge shown on each card); "Due" is everything else that still has an open TAT
  // clock running. Counts are taken from scopeFiltered (before status/search) so the tiles read
  // as a stable overview of the current scope tab, not a number that shrinks as other filters
  // are layered on.
  const quickFilterPredicates: Record<TicketQuickFilterKey, (t: Ticket) => boolean> = {
    pending: (t) => t.status !== 'CLOSED',
    completed: (t) => t.status === 'CLOSED',
    due: (t) => !!t.tatDueAt && t.status !== 'CLOSED' && !t.isOverdue,
    delayed: (t) => t.isOverdue && t.status !== 'CLOSED',
  };
  const quickCounts: TicketQuickFilterCounts = {
    pending: scopeFiltered.filter(quickFilterPredicates.pending).length,
    completed: scopeFiltered.filter(quickFilterPredicates.completed).length,
    due: scopeFiltered.filter(quickFilterPredicates.due).length,
    delayed: scopeFiltered.filter(quickFilterPredicates.delayed).length,
  };

  const query = search.trim().toLowerCase();
  const searched = query
    ? statusFiltered.filter(t =>
      t.title.toLowerCase().includes(query) ||
      (t.description ?? '').toLowerCase().includes(query),
    )
    : statusFiltered;
  const filtered = quickFilter ? searched.filter(quickFilterPredicates[quickFilter]) : searched;

  // Lookup map instead of a ternary — each grouping mode has its own builder function, so
  // adding a third grouping mode later is one more entry, not another branch.
  const GROUP_BUILDERS: Record<'department' | 'assignee', () => { key: string; label: string; tickets: Ticket[] }[]> = {
    department: () => groupByDepartment(filtered, departmentNames).map(g => ({
      key: g.departmentId ?? '__none__',
      label: g.departmentName,
      tickets: g.tickets,
    })),
    assignee: () => groupByAssignee(filtered).map(g => ({
      key: g.assigneeId ?? '__unassigned__',
      label: g.assigneeName,
      tickets: g.tickets,
    })),
  };
  const groups = GROUP_BUILDERS[groupBy]();

  const hasActiveFilters = search.length > 0 || statusFilter !== 'ALL' || scopeFilter !== 'ALL' || quickFilter !== null;

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setScopeFilter('ALL');
    setQuickFilter(null);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto w-full pb-10">

      {/* Page Header + Controls */}
      <div className="flex flex-col gap-4 pb-4 border-b border-border/40">
        {/* Top row — title/count on the left, primary action on the right */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-display font-semibold text-text tracking-tight">
              Support Tickets
            </h1>
            <p className="text-xs sm:text-sm text-text-muted font-display mt-0.5 flex items-center gap-1.5">
              <span>{meta?.total ?? 0} total record{meta?.total !== 1 ? 's' : ''}</span>
              {statusFilter !== 'ALL' && (
                <span className="text-primary-500 font-medium">({filtered.length} matching filter)</span>
              )}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="group size-10 sm:size-11 rounded-full p-0 shadow-md hover:shadow-lg transition-all duration-300 flex justify-center items-center"
            onClick={() => setShowForm(true)}
            aria-label="Create Ticket"
            title="Create Ticket"
          >
            <Plus size={18} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
          </Button>
        </div>

        {/* Controls Bar — icon-sized controls (scope, group-by, status, export) share one row;
            search gets its own full-width row below since it actually needs room to type into. */}
        <div className="flex flex-col gap-2 bg-surface/50 p-1.5 sm:p-2 rounded-xl border border-border/50">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Scope Tabs */}
            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-surface-hover/50 border border-border/40">
              {SCOPE_FILTERS.map((f) => {
                const Icon = SCOPE_ICON[f.key];
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => { setScopeFilter(f.key); setPage(1); }}
                    title={f.label}
                    aria-label={f.label}
                    aria-pressed={scopeFilter === f.key}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 cursor-pointer ${
                      scopeFilter === f.key
                        ? 'bg-background text-text shadow-sm ring-1 ring-border/50'
                        : 'text-text-muted hover:text-text-secondary hover:bg-surface-active/50'
                    }`}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>

            {/* Group By Toggle */}
            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-surface-hover/50 border border-border/40">
              <button
                type="button"
                onClick={() => setGroupBy('department')}
                title="Group by department"
                aria-label="Group by department"
                aria-pressed={groupBy === 'department'}
                className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 cursor-pointer ${
                  groupBy === 'department'
                    ? 'bg-background text-text shadow-sm ring-1 ring-border/50'
                    : 'text-text-muted hover:text-text-secondary hover:bg-surface-active/50'
                }`}
              >
                <Building2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('assignee')}
                title="Group by person"
                aria-label="Group by person"
                aria-pressed={groupBy === 'assignee'}
                className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 cursor-pointer ${
                  groupBy === 'assignee'
                    ? 'bg-background text-text shadow-sm ring-1 ring-border/50'
                    : 'text-text-muted hover:text-text-secondary hover:bg-surface-active/50'
                }`}
              >
                <User size={14} />
              </button>
            </div>

            {/* Status filter sits with the other icon-sized controls, right next to Group By */}
            <TicketStatusFilterDropdown
              statusFilter={statusFilter}
              onStatusFilterChange={key => { setStatusFilter(key); setPage(1); }}
            />

            {/* Export — admin/PC only, and hidden on mobile entirely (not just icon-only): a
                background-report download isn't a mobile-first action, and dropping it here
                keeps the icon row from getting crowded on a phone. */}
            {(user?.role === 'ADMIN' || user?.role === 'PC') && (
              <Button
                variant="secondary"
                size="sm"
                className="hidden sm:inline-flex h-9 px-3 gap-1.5 ml-auto border border-border/60 shadow-sm rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                onClick={() => setShowExport(true)}
                aria-label="Export tickets"
                title="Export tickets"
              >
                <FileDown size={14} className="text-text-muted" />
                <span className="text-xs font-medium hidden md:inline">Export</span>
              </Button>
            )}
          </div>

          <TicketSearchInput value={search} onChange={setSearch} />
        </div>

        {assigneeIdFilter && (
          <div className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold w-fit">
            Showing tickets for {tickets[0]?.assignee?.firstName ?? 'this person'}
            <button
              type="button"
              onClick={() => setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('assigneeIds'); return p; })}
              aria-label="Clear assignee filter"
              className="p-0.5 rounded-full hover:bg-primary-100 transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Quick-stat tiles — click any one to instantly narrow the list to just that category;
          click again (or use the chip in TicketListControls area below) to go back. */}
      <TicketQuickStats counts={quickCounts} active={quickFilter} onToggle={toggleQuickFilter} />

      {quickFilter && (
        <div className="-mt-1 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-xs font-display font-semibold rounded-full bg-primary-50 text-primary-700 border border-primary-200">
            Showing: {quickFilter.charAt(0).toUpperCase() + quickFilter.slice(1)}
            <button
              type="button"
              onClick={() => setQuickFilter(null)}
              aria-label="Clear quick filter"
              className="p-0.5 rounded-full hover:bg-primary-100 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      {/* Loading Skeletons */}
      {isPending && <TicketListSkeleton />}

      {/* Error State */}
      {isError && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-display">
          <AlertCircle size={16} className="shrink-0" />
          <span>Failed to load tickets. Please check your network connection and try again.</span>
        </div>
      )}

      {/* Empty State */}
      {!isPending && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border/70 rounded-xl bg-surface/30 text-center">
          <div className="mb-3 text-text-muted">
            <Inbox size={26} />
          </div>
          <h3 className="text-sm font-semibold text-text font-display">No tickets found</h3>
          <p className="text-xs text-text-muted font-display mt-1 max-w-xs">
            {hasActiveFilters
              ? 'No tickets matched your current search query or filter selection.'
              : 'There are currently no tickets registered in the system.'}
          </p>

          {hasActiveFilters && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetFilters}
              className="mt-4 gap-1.5 text-xs font-display"
            >
              <RotateCcw size={13} />
              Reset Filters
            </Button>
          )}
        </div>
      )}

      {/* Ticket List Grouped by Department or Person */}
      {!isPending && !isError && filtered.length > 0 && (
        <TicketGroupedList
          groups={groups}
          groupBy={groupBy}
          onSelectTicket={setSelected}
          departmentNames={departmentNames}
        />
      )}

      {/* Pagination Footer */}
      {meta && meta.totalPages > 1 && (
        <div className="pt-4 border-t border-border/40 flex justify-center">
          <PageNav page={page} totalPages={meta.totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Dialog Modals */}
      {showForm && <TicketForm onClose={() => setShowForm(false)} />}
      {showExport && (
        <ExportDialog
          reportModule="tickets"
          title="Export Tickets"
          description="Every ticket created in the selected period — status, priority, department, assignee, and TAT."
          onClose={() => setShowExport(false)}
        />
      )}
      {selected && <TicketDetail ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
