import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, AlertCircle, Inbox, RotateCcw, Building2, User, FileDown, X, LayoutGrid, UserPen, UserCheck, LayoutList, Kanban, Check } from 'lucide-react';
import { Button, PageNav, Fab, ViewToggle, type ViewTab } from '../../components';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { useDepartmentsQuery, useAssignableUsersQuery, useTicketsBoardQuery } from './hook';
import { TicketForm } from './TicketForm';
import { TicketDetail } from './TicketDetail';
import { TicketBoard } from './TicketBoard';
import { ExportDialog } from '../reports';
import { TicketSearchInput } from './list/TicketListControls';
import { TicketListSkeleton } from './list/TicketListSkeleton';
import { TicketGroupedList } from './list/TicketGroupedList';
import { TicketQuickStats, type TicketQuickFilterKey, type TicketQuickFilterCounts } from './list/TicketQuickStats';
import { TicketFiltersPopover, type TicketFilters } from './list/TicketFiltersPopover';
import { SORT_LABEL, SORT_ICON, SORT_COMPARATORS, type TicketSortKey } from './list/ticketSort';
import {
  SCOPE_FILTER_PREDICATES,
  SCOPE_FILTERS,
  type ScopeFilter,
} from './list/ticketFilters';
import { groupByDepartment, groupByAssignee } from './list/ticketGrouping';
import type { Ticket } from '../../api/ticket';

type TicketView = 'list' | 'board';

const VIEW_TABS: ViewTab<TicketView>[] = [
  { key: 'list', label: 'List', icon: LayoutList },
  { key: 'board', label: 'Board', icon: Kanban },
];

const DEFAULT_TICKET_FILTERS: TicketFilters = { status: 'all', priority: [], departmentId: '', assigneeIds: [], raisedByIds: [] };

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

  // Search/filter/sort/pagination all need to see the FULL matching set, not just whatever
  // 20-row page the server happens to hand back — see PAGE_SIZE/pagedSorted below for how the
  // list view still paginates, just against the already-filtered result instead of before it.
  const { data: allTicketsData, isPending, isError } = useTicketsBoardQuery(true, assigneeIdFilter);
  const allTickets = allTicketsData ?? [];
  const { data: departments } = useDepartmentsQuery();
  const departmentNames = new Map((departments ?? []).map(d => [d.id, d.name]));

  const isVerifier = user?.role === 'PC' || user?.role === 'ADMIN';
  const [view, setView] = useState<TicketView>('list');
  const [filters, setFilters] = useState<TicketFilters>(DEFAULT_TICKET_FILTERS);
  const [sort, setSort] = useState<TicketSortKey>('tatDueAt');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<'department' | 'assignee'>('department');
  // The page's own "at a glance" tiles (Pending/Completed/Due/Delayed) — layered on top of the
  // scope/status/search filters below rather than replacing them. Click the active tile again to
  // clear it.
  const [quickFilter, setQuickFilter] = useState<TicketQuickFilterKey | null>(null);
  const toggleQuickFilter = (key: TicketQuickFilterKey) => {
    setQuickFilter((prev) => (prev === key ? null : key));
    setPage(1);
  };

  const { data: assignableUsers } = useAssignableUsersQuery();

  const scopeFiltered = user
    ? allTickets.filter(t => SCOPE_FILTER_PREDICATES[scopeFilter](t, user.id))
    : allTickets;

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

  // Shared filter/sort pipeline, run once against the full `allTickets` set so Filters/Sort/
  // quick-filter/search all see every matching ticket — the list view then paginates the
  // *result* of this (see pagedSorted below) instead of filtering only within one server page.
  const applyPipeline = (list: Ticket[]) => {
    const scoped = user ? list.filter(t => SCOPE_FILTER_PREDICATES[scopeFilter](t, user.id)) : list;
    const statusFiltered = filters.status === 'all' ? scoped : scoped.filter(t => t.status === filters.status);
    const priorityFiltered = filters.priority.length === 0 ? statusFiltered : statusFiltered.filter(t => filters.priority.includes(t.priority));
    const departmentFiltered = filters.departmentId ? priorityFiltered.filter(t => t.departmentId === filters.departmentId) : priorityFiltered;
    const assigneeFiltered = filters.assigneeIds.length === 0 ? departmentFiltered : departmentFiltered.filter(t => !!t.assigneeId && filters.assigneeIds.includes(t.assigneeId));
    const raisedByFiltered = filters.raisedByIds.length === 0 ? assigneeFiltered : assigneeFiltered.filter(t => filters.raisedByIds.includes(t.userId));
    const query = search.trim().toLowerCase();
    const searched = query
      ? raisedByFiltered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        (t.description ?? '').toLowerCase().includes(query),
      )
      : raisedByFiltered;
    const quickFiltered = quickFilter ? searched.filter(quickFilterPredicates[quickFilter]) : searched;
    return [...quickFiltered].sort(SORT_COMPARATORS[sort]);
  };

  const sorted = applyPipeline(allTickets);

  // List view paginates the already-filtered result client-side (20/page), so a match on page 3
  // of the old server-paginated data no longer reads as "not found" just because search/filters
  // only ever looked inside whatever 20 rows the server handed back for the *unfiltered* page.
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  // Clamped rather than reset via effect: if a filter change shrinks the result set out from
  // under the page the user was on, this simply renders page 1 of the new set instead of an
  // empty "page 3 of 1" — while still remembering page 3 if they widen the filters back out.
  const safePage = Math.min(page, totalPages);
  const pagedSorted = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Lookup map instead of a ternary — each grouping mode has its own builder function, so
  // adding a third grouping mode later is one more entry, not another branch.
  // Groups the current page's rows (list view groups within a page, same as before); the Board
  // view groups by status column itself and reads straight off `sorted` (unpaginated) instead.
  const GROUP_BUILDERS: Record<'department' | 'assignee', () => { key: string; label: string; tickets: Ticket[] }[]> = {
    department: () => groupByDepartment(pagedSorted, departmentNames).map(g => ({
      key: g.departmentId ?? '__none__',
      label: g.departmentName,
      tickets: g.tickets,
    })),
    assignee: () => groupByAssignee(pagedSorted).map(g => ({
      key: g.assigneeId ?? '__unassigned__',
      label: g.assigneeName,
      tickets: g.tickets,
    })),
  };
  const groups = GROUP_BUILDERS[groupBy]();

  const activeCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.priority.length > 0 ? 1 : 0) +
    (filters.departmentId ? 1 : 0) +
    (filters.assigneeIds.length > 0 ? 1 : 0) +
    (filters.raisedByIds.length > 0 ? 1 : 0);

  const hasActiveFilters = search.length > 0 || activeCount > 0 || scopeFilter !== 'ALL' || quickFilter !== null;

  const handleResetFilters = () => {
    setSearch('');
    setFilters(DEFAULT_TICKET_FILTERS);
    setScopeFilter('ALL');
    setQuickFilter(null);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-[1400px] transition-all duration-300">

      {/* Page Header + Controls */}
      <div className="flex flex-col gap-4">
        {/* Top row — title/count on the left, primary action on the right */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-text tracking-tight">
              Support Tickets
            </h1>
            <p className="text-xs sm:text-sm font-medium text-text-muted mt-0.5 flex items-center gap-1.5">
              <span>{allTickets.length} total record{allTickets.length !== 1 ? 's' : ''}</span>
              {hasActiveFilters && (
                <span className="text-primary-500 font-medium">({sorted.length} matching filter)</span>
              )}
            </p>
          </div>

          {/* Desktop: inline pill button, matching Delegation's "New Delegation" trigger.
              Mobile: the Fab below instead — same size/color/position as the Dashboard's To-Do
              FAB and Delegation's New Delegation FAB. */}
          <Button
            variant="primary"
            size="sm"
            className="group hidden md:inline-flex gap-2 font-medium shadow-md rounded-full text-xs sm:text-sm px-4 py-2 hover:shadow-lg transition-all duration-200"
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
            <span>Create Ticket</span>
          </Button>

          <Fab actions={[{ key: 'create', label: 'Create Ticket', icon: Plus, onClick: () => setShowForm(true) }]} />
        </div>

        {/* Quick-stat tiles — same position (right below the title, above the toolbar) as the
            Delegation page's stat row; click any one to instantly narrow the list to just that
            category, click again to go back. */}
        <TicketQuickStats counts={quickCounts} active={quickFilter} onToggle={toggleQuickFilter} />

        {quickFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-xs font-display font-medium rounded-full bg-primary-50 text-primary-700 border border-primary-200">
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

            {/* View Toggle */}
            <ViewToggle tabs={VIEW_TABS} value={view} onChange={setView} />

            {/* Group By Toggle — list view only, Board view already groups by status via columns */}
            {view === 'list' && (
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
            )}

            {/* Filters popover — replaces the old single-status dropdown with Status/Priority/
                Department/Assignee/Raised By, shared shell with the Delegation page's Filters */}
            <TicketFiltersPopover
              filters={filters}
              onChange={(patch) => { setFilters(prev => ({ ...prev, ...patch })); setPage(1); }}
              onClearAll={() => { setFilters(DEFAULT_TICKET_FILTERS); setPage(1); }}
              departments={departments}
              assignableUsers={assignableUsers}
              activeCount={activeCount}
              sort={sort}
              onSortChange={setSort}
            />

            {/* Sort — desktop only, mobile folds this into the Filters sheet instead */}
            <div className="hidden md:flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 px-3 gap-1.5 border border-border/60 rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                    aria-label={`Sort: ${SORT_LABEL[sort]}`}
                    title={`Sort: ${SORT_LABEL[sort]}`}
                  >
                    {(() => {
                      const SortIcon = SORT_ICON[sort];
                      return <SortIcon size={14} className="text-text-muted" />;
                    })()}
                    <span className="text-xs font-medium hidden md:inline">{SORT_LABEL[sort]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                  {(Object.keys(SORT_LABEL) as TicketSortKey[]).map(key => {
                    const Icon = SORT_ICON[key];
                    return (
                      <DropdownMenuItem key={key} onClick={() => setSort(key)} className="gap-2.5 py-2 cursor-pointer">
                        <Icon size={14} className="text-text-muted" />
                        <span className="font-medium text-sm">{SORT_LABEL[key]}</span>
                        {sort === key && <Check size={14} className="ml-auto text-primary-600" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

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

          <TicketSearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        </div>

        {assigneeIdFilter && (
          <div className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium w-fit">
            Showing tickets for {allTickets[0]?.assignee?.firstName ?? 'this person'}
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
      {!isPending && !isError && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border/70 rounded-xl bg-surface/30 text-center">
          <div className="mb-3 text-text-muted">
            <Inbox size={26} />
          </div>
          <h3 className="text-sm font-medium text-text font-display">No tickets found</h3>
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

      {/* Ticket List Grouped by Department or Person — paginated (pagedSorted) */}
      {view === 'list' && !isPending && !isError && sorted.length > 0 && (
        <TicketGroupedList
          groups={groups}
          groupBy={groupBy}
          onSelectTicket={setSelected}
          departmentNames={departmentNames}
        />
      )}

      {/* Ticket Board — unpaginated, buckets the full filtered set into status columns */}
      {view === 'board' && !isPending && !isError && sorted.length > 0 && (
        <TicketBoard
          tickets={sorted}
          departmentNames={departmentNames}
          isVerifier={isVerifier}
          onOpen={setSelected}
        />
      )}

      {/* Pagination Footer — list view only, Board view isn't paginated */}
      {view === 'list' && totalPages > 1 && (
        <div className="pt-4 border-t border-border/40 flex justify-center">
          <PageNav page={safePage} totalPages={totalPages} onPageChange={setPage} />
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
