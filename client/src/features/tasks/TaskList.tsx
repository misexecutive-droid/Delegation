import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { Wand2, AlertCircle, Save, Inbox, X, Plus, ChevronDown, Store, Building2, Check, type LucideIcon } from "lucide-react";
import { Button, Skeleton, Fab } from "../../components";
import { ExportDialog } from "../reports";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTasksQuery, useAssignableUsersQuery } from "./hook";
import { useDepartmentsQuery, useStoresQuery } from "../tickets/hook";
import type { Task } from '../../api/task';
import { TaskForm } from "./TaskForm";
import { TaskDetail } from "./TaskDetail";
import { TaskBoard } from "./TaskBoard";
import { TaskMobileList } from "./TaskMobileList";
import { useIsMobile } from "../../lib/useMediaQuery";
import { SmartTaskModal } from "./SmartTaskModal";
import { TaskOptionsDialog } from "./TaskOptionsDialog";
import { TaskQuickStats, type QuickFilterKey } from "./TaskQuickStats";
import { type BoardGroupBy } from "./taskBoardGroups";
import { CATEGORY_PREDICATES, SORT_COMPARATORS, isOverdueTask, type CategoryFilterKey, type TaskSortKey, type TaskFilters } from "./taskFilters";
import { STATUS_LABEL, PRIORITY_MAP } from "./taskDisplay";
import { useCardFieldVisibility, taskAssigneeIds } from "./cardFields";
import { useAuth } from "../../context/AuthContext";
import { useNotificationsQuery, useMarkNotificationReadMutation } from "../notifications/hooks";
import { readQuickFilterParam } from "../../lib/readQuickFilterParam";

const QUICK_FILTER_VALUES = ["pending", "completed", "due", "delayed"] as const;

interface TaskListProps {
  userId?: string;
  hideHeader?: boolean;
}


const QUICK_FILTER_PREDICATES: Record<QuickFilterKey, (t: Task) => boolean> = {
  pending: (t) => t.status !== 'done',
  completed: (t) => t.status === 'done',
  due: (t) => !!t.dueDate && t.status !== 'done' && !isOverdueTask(t),
  delayed: isOverdueTask,
};

const DEFAULT_FILTERS: TaskFilters = { category: 'all', status: 'all', priority: [], storeId: '', departmentId: '', assigneeIds: [], raisedByIds: [] };

const URL_TRACKED_DEFAULTS: Pick<TaskFilters, 'category' | 'status' | 'storeId' | 'departmentId' | 'assigneeIds' | 'raisedByIds'> = {
  category: 'all', status: 'all', storeId: '', departmentId: '', assigneeIds: [], raisedByIds: [],
};

const filtersFromUrl = (searchParams: URLSearchParams): Partial<TaskFilters> => {
  const fromUrl: Partial<TaskFilters> = {};
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const storeId = searchParams.get('storeId');
  const departmentId = searchParams.get('departmentId');
  const assigneeIds = searchParams.get('assigneeIds');
  const raisedByIds = searchParams.get('raisedByIds');
  if (category) fromUrl.category = category as CategoryFilterKey;
  if (status) fromUrl.status = status as Task['status'];
  if (storeId) fromUrl.storeId = storeId;
  if (departmentId) fromUrl.departmentId = departmentId;
  if (assigneeIds) fromUrl.assigneeIds = assigneeIds.split(',');
  if (raisedByIds) fromUrl.raisedByIds = raisedByIds.split(',');
  return fromUrl;
};

const filtersStorageKey = (userId?: string) => `task-filters:${userId ?? 'anon'}`;


const ScopeSelect = ({
  icon: Icon, label, allLabel, options, value, onSelect,
}: {
  icon: LucideIcon;
  label: string;
  allLabel: string;
  options: { id: string; name: string }[];
  value: string;
  onSelect: (id: string) => void;
}) => {
  const activeName = value ? options.find(o => o.id === value)?.name ?? 'Unknown' : allLabel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${label} scope: ${activeName}`}
          className="group flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-full border border-border bg-surface text-left transition-all duration-200 ease-in-out cursor-pointer hover:border-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Icon size={15} strokeWidth={2.5} className="text-primary-600 shrink-0" />
          <span className="text-xs font-medium text-text-muted hidden sm:inline">{label}</span>
          <span className="text-xs font-bold tracking-tight text-text truncate max-w-40">{activeName}</span>
          <ChevronDown size={14} className="text-text-light group-hover:text-text-muted transition-colors shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 rounded-xl max-h-80 overflow-y-auto">
        {[{ id: '', name: allLabel }, ...options].map((option) => (
          <DropdownMenuItem
            key={option.id || 'all'}
            onClick={() => onSelect(option.id)}
            className="gap-2.5 py-2 cursor-pointer justify-between"
          >
            <span className="font-medium text-sm truncate">{option.name}</span>
            {value === option.id && <Check size={14} className="text-primary-600 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const TaskList = ({ userId, hideHeader = false }: TaskListProps = {}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isVerifier = user?.role === "PC" || user?.role === "ADMIN";
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selected, setSelected] = useState<{ task: Task; mode: 'view' | 'edit' } | null>(null);

  const { data: tasks, isPending, isError } = useTasksQuery(userId);
  const { data: assignableUsers } = useAssignableUsersQuery();
  const { data: departments } = useDepartmentsQuery();
  const { data: stores } = useStoresQuery();
  const { data: notifications } = useNotificationsQuery();
  const markNotificationRead = useMarkNotificationReadMutation();


  const unreadAssignmentByTaskId = useMemo(
    () => new Map(
      (notifications ?? [])
        .filter(n => n.type === 'TASK_ASSIGNED' && !n.isRead && n.taskId)
        .map(n => [n.taskId as string, n.id]),
    ),
    [notifications],
  );

  const newlyAssignedTaskIds = useMemo(
    () => new Set(unreadAssignmentByTaskId.keys()),
    [unreadAssignmentByTaskId],
  );

  const openCreateForm = useCallback(() => setShowForm(true), []);

  const handleOpen = useCallback((task: Task, mode: 'view' | 'edit' = 'view') => {
    setSelected({ task, mode });
    const notificationId = unreadAssignmentByTaskId.get(task.id);
    if (notificationId) markNotificationRead.mutate(notificationId);
    // markNotificationRead is a stable mutation object from React Query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadAssignmentByTaskId]);

  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || !tasks) return;
    const match = tasks.find(t => t.id === openId);
    // Syncing from an external system (the URL, set by a notification click elsewhere) into local
    // state, not reacting to React state — and the param is stripped right after, so this only
    // ever fires once per navigation instead of looping.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) handleOpen(match);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('open');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tasks]);

  const [filters, setFilters] = useState<TaskFilters>(() => {
    const fromUrl = filtersFromUrl(searchParams);
    if (Object.keys(fromUrl).length) return { ...DEFAULT_FILTERS, ...fromUrl };

    try {
      const raw = localStorage.getItem(filtersStorageKey(user?.id));
      if (raw) {
        const saved = JSON.parse(raw);
        if (!Array.isArray(saved.priority)) delete saved.priority;
        if (!Array.isArray(saved.assigneeIds)) delete saved.assigneeIds;
        if (!Array.isArray(saved.raisedByIds)) delete saved.raisedByIds;
        return { ...DEFAULT_FILTERS, ...saved };
      }
    } catch {
      // Corrupt/unavailable localStorage
    }
    return DEFAULT_FILTERS;
  });

  const isFirstFiltersRun = useRef(true);
  useEffect(() => {
    if (isFirstFiltersRun.current) {
      isFirstFiltersRun.current = false;
      return;
    }
    setFilters(prev => ({ ...prev, ...URL_TRACKED_DEFAULTS, ...filtersFromUrl(searchParams) }));
  }, [searchParams]);

  const [sort, setSort] = useState<TaskSortKey>('dueDate');
  const [boardGroupBy, setBoardGroupBy] = useState<BoardGroupBy>('status');

  const [quickFilter, setQuickFilter] = useState<QuickFilterKey | null>(
    () => readQuickFilterParam(searchParams, QUICK_FILTER_VALUES),
  );

  const { visibility: fieldVisibility, toggle: toggleField } = useCardFieldVisibility();

  const syncFiltersToUrl = (next: TaskFilters) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (next.category !== 'all') params.set('category', next.category); else params.delete('category');
      if (next.status !== 'all') params.set('status', next.status); else params.delete('status');
      if (next.storeId) params.set('storeId', next.storeId); else params.delete('storeId');
      if (next.departmentId) params.set('departmentId', next.departmentId); else params.delete('departmentId');
      if (next.assigneeIds.length) params.set('assigneeIds', next.assigneeIds.join(',')); else params.delete('assigneeIds');
      if (next.raisedByIds.length) params.set('raisedByIds', next.raisedByIds.join(',')); else params.delete('raisedByIds');
      return params;
    }, { replace: true });
  };

  const persistFiltersIfSaved = (next: TaskFilters) => {
    try {
      const key = filtersStorageKey(user?.id);
      if (localStorage.getItem(key) !== null) {
        localStorage.setItem(key, JSON.stringify(next));
      }
    } catch {
      // Ignore
    }
  };

  const updateFilters = (patch: Partial<TaskFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    syncFiltersToUrl(next);
    persistFiltersIfSaved(next);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    syncFiltersToUrl(DEFAULT_FILTERS);
    persistFiltersIfSaved(DEFAULT_FILTERS);
    setQuickFilter(null);
  };

  const toggleQuickFilter = (key: QuickFilterKey) => {
    setQuickFilter((prev) => (prev === key ? null : key));
  };

  // Quick ownership tabs — tapping the active one again clears back to "everyone", same
  // toggle-off behavior as the quick-stat tiles above.
  const isAssignedToMe = !!user && filters.assigneeIds.length === 1 && filters.assigneeIds[0] === user.id;
  const isAssignedByMe = !!user && filters.raisedByIds.length === 1 && filters.raisedByIds[0] === user.id;
  const toggleAssignedToMe = () => {
    if (!user) return;
    updateFilters({ assigneeIds: isAssignedToMe ? [] : [user.id] });
  };
  const toggleAssignedByMe = () => {
    if (!user) return;
    updateFilters({ raisedByIds: isAssignedByMe ? [] : [user.id] });
  };

  const saveFilters = () => {
    try {
      localStorage.setItem(filtersStorageKey(user?.id), JSON.stringify(filters));
      toast.success('Filter saved');
    } catch {
      toast.error('Could not save filter');
    }
  };

  // Both are passed straight to the board/list; rebuilding them each render gave those children a
  // new prop identity every time and defeated any memoisation downstream.
  const assigneeNames = useMemo(
    () => new Map((assignableUsers ?? []).map(u => [u.id, `${u.firstName} ${u.lastName ?? ''}`.trim()])),
    [assignableUsers],
  );
  const departmentNames = useMemo(
    () => new Map((departments ?? []).map(d => [d.id, d.name])),
    [departments],
  );
  // A delegation carries a departmentId, never a storeId — the store is one hop further out, on
  // the department. This is that hop, resolved once instead of per task per render.
  const departmentStoreId = useMemo(
    () => new Map((departments ?? []).map(d => [d.id, d.storeId])),
    [departments],
  );
  const storeOptions = useMemo(
    () => (stores ?? []).filter(s => s.isActive).map(s => ({ id: s.id, name: s.name })),
    [stores],
  );

  // Narrowed by the store box beside it: with a store picked, the department list is that store's
  // departments only — offering the rest would let you build a combination that can never match.
  const departmentOptions = useMemo(
    () => (departments ?? [])
      .filter(d => d.isActive && (!filters.storeId || d.storeId === filters.storeId))
      .map(d => ({ id: d.id, name: d.name })),
    [departments, filters.storeId],
  );

  // Switching store while a department from the old store is selected would otherwise leave a
  // filter pair that matches nothing, and a Department box showing a name no longer in its list.
  const clearsDepartment = (nextStoreId: string) =>
    !!filters.departmentId && !!nextStoreId && departmentStoreId.get(filters.departmentId) !== nextStoreId;

  const mineOnly = searchParams.get('mine') === '1';
  const mineFiltered = useMemo(
    () => (!mineOnly || !user
      ? (tasks ?? [])
      : (tasks ?? []).filter(t => t.userId === user.id || t.assigneeId === user.id || t.additionalAssigneeIds.includes(user.id))),
    [tasks, mineOnly, user],
  );

  // The store box sits above the stat tiles and scopes the page, so it's applied before the counts
  // are taken — otherwise picking a store would narrow the board while the tiles above it kept
  // reporting company-wide numbers.
  const scopeFiltered = useMemo(
    () => (!filters.storeId
      ? mineFiltered
      : mineFiltered.filter(t => !!t.departmentId && departmentStoreId.get(t.departmentId) === filters.storeId)),
    [mineFiltered, filters.storeId, departmentStoreId],
  );

  // The whole narrowing chain in one memo. Previously these were eight separate array passes run on
  // every render, and — more importantly — each produced a fresh array, so `sorted` below could
  // never be stable and the board re-rendered its entire card grid on any state change at all.
  const filtered = useMemo(() => {
    const categoryFiltered = scopeFiltered.filter(CATEGORY_PREDICATES[filters.category]);
    const priorityFiltered = filters.priority.length === 0 ? categoryFiltered : categoryFiltered.filter(t => filters.priority.includes(t.priority));
    const departmentFiltered = filters.departmentId ? priorityFiltered.filter(t => t.departmentId === filters.departmentId) : priorityFiltered;
    const assigneeFiltered = filters.assigneeIds.length === 0
      ? departmentFiltered
      : departmentFiltered.filter(t => taskAssigneeIds(t).some(id => filters.assigneeIds.includes(id)));
    const raisedByFiltered = filters.raisedByIds.length === 0
      ? assigneeFiltered
      : assigneeFiltered.filter(t => filters.raisedByIds.includes(t.userId));
    const statusFiltered = filters.status === 'all' ? raisedByFiltered : raisedByFiltered.filter(t => t.status === filters.status);
    return quickFilter ? statusFiltered.filter(QUICK_FILTER_PREDICATES[quickFilter]) : statusFiltered;
  }, [scopeFiltered, filters, quickFilter]);

  // Left unmemoised on purpose: "due" vs "delayed" is decided against the clock, so freezing these
  // behind a dependency array would let a tile keep saying "due" after the deadline had passed.
  // Four passes over an already-narrowed array is not what was making this page slow.
  const quickCounts = {
    pending: scopeFiltered.filter(QUICK_FILTER_PREDICATES.pending).length,
    completed: scopeFiltered.filter(QUICK_FILTER_PREDICATES.completed).length,
    due: scopeFiltered.filter(QUICK_FILTER_PREDICATES.due).length,
    delayed: scopeFiltered.filter(QUICK_FILTER_PREDICATES.delayed).length,
  };

  // Copy-and-sort on every render handed the board a new array each time. Memoised on the filtered
  // result and the sort key, so it only changes when one of those actually does.
  const sorted = useMemo(() => [...filtered].sort(SORT_COMPARATORS[sort]), [filtered, sort]);

  const QUICK_FILTER_LABEL: Record<QuickFilterKey, string> = {
    pending: 'Pending', completed: 'Completed', due: 'Due', delayed: 'Delayed',
  };

  const activeChips: { key: string; label: string; onClear: () => void }[] = [
    ...(quickFilter ? [{ key: 'quickFilter', label: `Showing: ${QUICK_FILTER_LABEL[quickFilter]}`, onClear: () => setQuickFilter(null) }] : []),
    ...(filters.status !== 'all' ? [{ key: 'status', label: `Status: ${STATUS_LABEL[filters.status]}`, onClear: () => updateFilters({ status: 'all' }) }] : []),
    ...(filters.category !== 'all' ? [{ key: 'category', label: `Category: ${filters.category === 'task' ? 'Direct Task' : filters.category === 'issue' ? 'Issues' : 'Delegations'}`, onClear: () => updateFilters({ category: 'all' }) }] : []),
    ...(filters.priority.length > 0 ? [{
      key: 'priority',
      label: `Priority: ${filters.priority.map(p => PRIORITY_MAP[p].label).join(', ')}`,
      onClear: () => updateFilters({ priority: [] }),
    }] : []),
    // No chip for storeId/departmentId: their boxes above state the selection permanently, so a
    // chip would be the same fact a second time. They're counted into `activeCount` below instead.
    ...(filters.assigneeIds.length > 0 ? [{
      key: 'assigneeIds',
      label: filters.assigneeIds.length === 1
        ? `Assignee: ${assigneeNames.get(filters.assigneeIds[0]) ?? 'Unknown'}`
        : `Assignees: ${filters.assigneeIds.length}`,
      onClear: () => updateFilters({ assigneeIds: [] }),
    }] : []),
    ...(filters.raisedByIds.length > 0 ? [{
      key: 'raisedByIds',
      label: filters.raisedByIds.length === 1
        ? `Raised by: ${assigneeNames.get(filters.raisedByIds[0]) ?? 'Unknown'}`
        : `Raised by: ${filters.raisedByIds.length}`,
      onClear: () => updateFilters({ raisedByIds: [] }),
    }] : []),
  ];

  // The two scope boxes state their own selection permanently, so they don't also get chips — but
  // they still have to count towards the Options badge, or picking a store would leave "Clear
  // filters" hidden with a filter active.
  const activeCount = activeChips.length + (filters.storeId ? 1 : 0) + (filters.departmentId ? 1 : 0);

  const isEmpty = sorted.length === 0;

  // Pulled out of the header markup so the `hideHeader` case (this list embedded in another page,
  // which supplies its own title) can render the same controls without a second copy of them.
  const headerActions = (
    <>
          
            {!userId && (
              <>
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="primary"
                        className="group gap-2 font-semibold tracking-tight rounded-full text-xs sm:text-sm px-4 py-2 transition-all duration-200 ease-in-out"
                      >
                        <Plus size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
                        <span>New Delegation</span>
                        <ChevronDown size={14} className="opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl">
                      <DropdownMenuItem onClick={() => setShowForm(true)} className="gap-2.5 py-2 cursor-pointer">
                        <Plus size={15} className="text-primary-600" />
                        <span className="font-medium text-sm">New Delegation</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => isVerifier && setShowSmartModal(true)}
                        disabled={!isVerifier}
                        className="gap-2.5 py-2 cursor-pointer justify-between"
                      >
                        <span className="flex items-center gap-2.5">
                          <Wand2 size={15} className="text-primary-600" />
                          <span className="font-medium text-sm">Smart Task</span>
                        </span>
                        {!isVerifier && (
                          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-surface-hover border border-border text-text-light">
                            Soon
                          </span>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Fab
                  actions={[
                    { key: 'new', label: 'New Delegation', icon: Plus, onClick: () => setShowForm(true) },
                    {
                      key: 'smart',
                      label: 'Smart Task',
                      icon: Wand2,
                      onClick: () => setShowSmartModal(true),
                      disabled: !isVerifier,
                      badge: !isVerifier ? 'Soon' : undefined,
                    },
                  ]}
                />
              </>
            )}

      
            <TaskOptionsDialog
              isOpen={showOptions}
              setIsOpen={setShowOptions}
              filters={filters}
              onChange={updateFilters}
              onClearAll={clearFilters}
              activeCount={activeCount}
              sort={sort}
              onSortChange={setSort}
              groupBy={boardGroupBy}
              onGroupByChange={setBoardGroupBy}
              fieldVisibility={fieldVisibility}
              onToggleField={toggleField}
              assignableUsers={assignableUsers}
              isAdmin={isVerifier}
              canExport={isVerifier}
              onExport={() => setShowExport(true)}
              scope={!userId && user ? {
                assignedToMe: isAssignedToMe,
                raisedByMe: isAssignedByMe,
                onAssignedToMe: toggleAssignedToMe,
                onRaisedByMe: toggleAssignedByMe,
              } : undefined}
            />
    </>
  );

  const storeScopeBox = storeOptions.length > 1 && (
    <ScopeSelect
      icon={Store}
      label="Store"
      allLabel="All stores"
      options={storeOptions}
      value={filters.storeId}
      onSelect={(storeId) => updateFilters({ storeId, ...(clearsDepartment(storeId) ? { departmentId: '' } : {}) })}
    />
  );

  const departmentScopeBox = departmentOptions.length > 1 && (
    <ScopeSelect
      icon={Building2}
      label="Department"
      allLabel="All departments"
      options={departmentOptions}
      value={filters.departmentId}
      onSelect={(departmentId) => updateFilters({ departmentId })}
    />
  );

  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-(--container-width) transition-all duration-300">

      <div className="flex flex-col gap-4">
        {!hideHeader && (
          <>
        
            <h1 className="sr-only">Delegation</h1>

            <TaskQuickStats
              counts={quickCounts}
              total={scopeFiltered.length}
              active={quickFilter}
              onToggle={toggleQuickFilter}
              onClear={() => setQuickFilter(null)}
              isLoading={isPending}
            />
          </>
        )}

      
        <div className="flex items-center gap-3 flex-wrap">
          {activeChips.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {activeChips.map(chip => (
                <span
                  key={chip.key}
                  className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-[11px] font-semibold rounded-lg bg-primary-50/80 text-primary-700 border border-primary-200/60 dark:bg-primary-900/20 dark:border-primary-800/80 dark:text-primary-300"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onClear}
                    aria-label={`Clear ${chip.label} filter`}
                    className="p-1 rounded-md hover:bg-primary-200/50 dark:hover:bg-primary-800/50 transition-colors duration-200 ease-in-out cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={saveFilters}
                title="Save this filter combination as your default"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg text-text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border transition-all duration-200 ease-in-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Save size={13} />
                Save view
              </button>
            </div>
          )}

       
          {sorted.length !== scopeFiltered.length && (
            <span className="text-xs font-semibold tracking-tight text-text-muted tabular-nums">
              {sorted.length} of {scopeFiltered.length} shown
            </span>
          )}

        
          <div className="flex items-center gap-2.5 flex-wrap shrink-0 ml-auto">
            {storeScopeBox}
            {departmentScopeBox}
            {headerActions}
          </div>
        </div>
      </div>

      {isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
              {Array.from({ length: 4 }).map((_, col) => (
                  <div key={col} className="flex flex-col gap-4 p-3 bg-surface-hover/30 border border-border/50 rounded-xl">
                      <Skeleton className="h-6 w-32 rounded-md mx-2 mt-2" />
                      {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-surface">
                              <Skeleton className="h-5 w-3/4 rounded-md" />
                              <Skeleton className="h-4 w-1/2 rounded-md" />
                              <div className="flex justify-between items-center mt-2">
                                  <Skeleton className="h-5 w-16 rounded-md" />
                                  <Skeleton className="w-7 h-7 rounded-full" />
                              </div>
                          </div>
                      ))}
                  </div>
              ))}
          </div>
      )}

      
      {isError && (
        <div className="flex items-start gap-3 p-4 bg-danger/5 rounded-xl border border-danger/20 text-danger">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-medium">Error Loading Delegations</h4>
            <p className="text-sm mt-1 opacity-90">Failed to connect to the server. Please refresh the page.</p>
          </div>
        </div>
      )}

      {!isPending && !isError && isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-surface/30 rounded-2xl border border-dashed border-border/80">
          <div className="flex items-center justify-center mb-5 w-14 h-14 bg-surface rounded-full border border-border text-text-muted">
            <Inbox size={26} strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-text tracking-tight">No delegations found</h3>
          <p className="text-sm text-text-muted mt-2 max-w-sm leading-relaxed">
            {activeCount > 0
              ? "No delegations match the current filters. Try adjusting or clearing them to see more."
              : "You're all caught up! There are no delegations assigned to this view."}
          </p>
          {activeCount > 0 && (
            <Button variant="secondary" size="sm" onClick={clearFilters} className="mt-6 rounded-full font-medium">
              Clear all filters
            </Button>
          )}
        </div>
      )}

    
      {!isPending && !isError && !isEmpty && (
        <div className="pb-12">
          {isMobile ? (
            <TaskMobileList
              tasks={sorted}
              assigneeNames={assigneeNames}
              departmentNames={departmentNames}
              isVerifier={isVerifier}
              onOpen={handleOpen}
              fields={fieldVisibility}
              newlyAssignedTaskIds={newlyAssignedTaskIds}
            />
          ) : (
            <TaskBoard
              tasks={sorted}
              assigneeNames={assigneeNames}
              departmentNames={departmentNames}
              isVerifier={isVerifier}
              onOpen={handleOpen}
              onAddTask={openCreateForm}
              fields={fieldVisibility}
              newlyAssignedTaskIds={newlyAssignedTaskIds}
              isFiltered={activeCount > 0 || quickFilter !== null}
              groupBy={boardGroupBy}
            />
          )}
        </div>
      )}

      
      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
        />
      )}
      {showSmartModal && <SmartTaskModal onClose={() => setShowSmartModal(false)} />}
      {showExport && (
        <ExportDialog
          reportModule="tasks"
          title="Export Delegations"
          description="Every delegation created in the selected period — status, priority, department, and assignee."
          onClose={() => setShowExport(false)}
        />
      )}
      {selected && (
        <TaskDetail
          key={selected.task.id}
          task={selected.task}
          initialMode={selected.mode}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};