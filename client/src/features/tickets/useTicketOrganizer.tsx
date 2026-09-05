import { useState } from 'react';
import { useSearchParams } from 'react-router';
import type { useAuth } from '@/context/AuthContext';
import { SCOPE_FILTER_PREDICATES, type ScopeFilter } from './list/ticketFilters';
import { SORT_COMPARATORS, type TicketSortKey } from './list/ticketSort';
import { groupByDepartment, groupByAssignee } from './list/ticketGrouping';
import { readQuickFilterParam } from '../../lib/readQuickFilterParam';
import type { Ticket } from '../../api/ticket';
import type { TicketQuickFilterKey, TicketQuickFilterCounts } from './list/TicketQuickStats';
import type { TicketFilters } from './list/TicketFilterFields';

export type TicketView = 'list' | 'board';
const QUICK_FILTER_VALUES = ['pending', 'completed', 'due', 'delayed'] as const;
export const DEFAULT_TICKET_FILTERS: TicketFilters = { status: 'all', priority: [], departmentId: '', assigneeIds: [], raisedByIds: [] };

type AuthUser = ReturnType<typeof useAuth>['user'];

export const useTicketOrganizer = (allTickets: Ticket[], user: AuthUser, departmentNames: Map<string, string>) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const assigneeIdFilter = searchParams.get('assigneeIds') ?? undefined;

  const [view, setView] = useState<TicketView>('list');
  const [filters, setFilters] = useState<TicketFilters>(DEFAULT_TICKET_FILTERS);
  const [sort, setSort] = useState<TicketSortKey>('tatDueAt');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<'department' | 'assignee'>('department');
  const [page, setPage] = useState(1);

  const [quickFilter, setQuickFilter] = useState<TicketQuickFilterKey | null>(() =>
    readQuickFilterParam(searchParams, QUICK_FILTER_VALUES)
  );

  const toggleQuickFilter = (key: TicketQuickFilterKey) => {
    setQuickFilter((prev) => (prev === key ? null : key));
    setPage(1);
  };

  // Backs the stat row's lead "Total" tile: clears the bucket filter only, leaving search/scope/
  // field filters alone — unlike handleResetFilters, which clears everything.
  const clearQuickFilter = () => {
    setQuickFilter(null);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilters(DEFAULT_TICKET_FILTERS);
    setScopeFilter('ALL');
    setQuickFilter(null);
    setPage(1);
  };

  const quickFilterPredicates: Record<TicketQuickFilterKey, (t: Ticket) => boolean> = {
    pending: (t) => t.status !== 'CLOSED',
    completed: (t) => t.status === 'CLOSED',
    due: (t) => !!t.tatDueAt && t.status !== 'CLOSED' && !t.isOverdue,
    delayed: (t) => t.isOverdue && t.status !== 'CLOSED',
  };

  const scopeFiltered = user ? allTickets.filter(t => SCOPE_FILTER_PREDICATES[scopeFilter](t, user.id)) : allTickets;

  const quickCounts: TicketQuickFilterCounts = {
    pending: scopeFiltered.filter(quickFilterPredicates.pending).length,
    completed: scopeFiltered.filter(quickFilterPredicates.completed).length,
    due: scopeFiltered.filter(quickFilterPredicates.due).length,
    delayed: scopeFiltered.filter(quickFilterPredicates.delayed).length,
  };

  const applyPipeline = (list: Ticket[]) => {
    const scoped = user ? list.filter(t => SCOPE_FILTER_PREDICATES[scopeFilter](t, user.id)) : list;
    const statusFiltered = filters.status === 'all' ? scoped : scoped.filter(t => t.status === filters.status);
    const priorityFiltered = filters.priority.length === 0 ? statusFiltered : statusFiltered.filter(t => filters.priority.includes(t.priority));
    const departmentFiltered = filters.departmentId ? priorityFiltered.filter(t => t.departmentId === filters.departmentId) : priorityFiltered;
    const assigneeFiltered = filters.assigneeIds.length === 0 ? departmentFiltered : departmentFiltered.filter(t => !!t.assigneeId && filters.assigneeIds.includes(t.assigneeId));
    const raisedByFiltered = filters.raisedByIds.length === 0 ? assigneeFiltered : assigneeFiltered.filter(t => filters.raisedByIds.includes(t.userId));
    const query = search.trim().toLowerCase();
    
    const searched = query
      ? raisedByFiltered.filter(t => t.title.toLowerCase().includes(query) || (t.description ?? '').toLowerCase().includes(query))
      : raisedByFiltered;
      
    const quickFiltered = quickFilter ? searched.filter(quickFilterPredicates[quickFilter]) : searched;
    return [...quickFiltered].sort(SORT_COMPARATORS[sort]);
  };

  const sorted = applyPipeline(allTickets);
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedSorted = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const groups = groupBy === 'department'
    ? groupByDepartment(pagedSorted, departmentNames).map(g => ({ key: g.departmentId ?? '__none__', label: g.departmentName, tickets: g.tickets }))
    : groupByAssignee(pagedSorted).map(g => ({ key: g.assigneeId ?? '__unassigned__', label: g.assigneeName, tickets: g.tickets }));

  const activeCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.priority.length > 0 ? 1 : 0) +
    (filters.departmentId ? 1 : 0) +
    (filters.assigneeIds.length > 0 ? 1 : 0) +
    (filters.raisedByIds.length > 0 ? 1 : 0);

  const hasActiveFilters = search.length > 0 || activeCount > 0 || scopeFilter !== 'ALL' || quickFilter !== null;

  return {
    view, setView,
    filters, setFilters,
    sort, setSort,
    scopeFilter, setScopeFilter,
    search, setSearch,
    groupBy, setGroupBy,
    page, setPage, safePage, totalPages,
    quickFilter, toggleQuickFilter, clearQuickFilter, quickCounts,
    // The number the page header's "N total tickets" subtitle used to state — scope-aware, so it
    // matches what the tiles beside it are counting.
    scopedTotal: scopeFiltered.length,
    handleResetFilters,
    sorted, pagedSorted, groups, activeCount, hasActiveFilters,
    assigneeIdFilter, searchParams, setSearchParams
  };
};