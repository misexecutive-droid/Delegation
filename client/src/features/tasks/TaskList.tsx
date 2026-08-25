import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { Wand2, AlertCircle, LayoutList, Kanban, Check, Save, Inbox, X, Plus, Settings2, ChevronDown, UserCheck, Send, FileDown } from "lucide-react";
import { Button, Skeleton, Fab, ViewToggle, type ViewTab } from "../../components";
import { ExportDialog } from "../reports";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { useTasksQuery, useAssignableUsersQuery } from "./hook";
import { useDepartmentsQuery } from "../tickets/hook";
import type { Task } from '../../api/task';
import { TaskForm } from "./TaskForm";
import { TaskDetail } from "./TaskDetail";
import { TaskBoard } from "./TaskBoard";
import { TaskRow } from "./TaskRow";
import { SmartTaskModal } from "./SmartTaskModal";
import { TaskFiltersPopover, type TaskFilters } from "./TaskFiltersPopover";
import { TaskQuickStats, type QuickFilterKey } from "./TaskQuickStats";
import { CATEGORY_PREDICATES, SORT_LABEL, SORT_ICON, SORT_COMPARATORS, type CategoryFilterKey, type TaskSortKey } from "./taskFilters";
import { STATUS_LABEL, PRIORITY_MAP } from "./taskDisplay";
import { useCardFieldVisibility, CARD_FIELD_CONFIG, taskAssigneeIds } from "./cardFields";
import { useAuth } from "../../context/AuthContext";

const groupByDueDate = (tasks: Task[]) => {
  const groups = new Map<string, { key: string; label: string; sortValue: number; tasks: Task[] }>();

  for (const task of tasks) {
    const due = task.dueDate ? new Date(task.dueDate) : null;
    const key = due ? due.toDateString() : '__none__';
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: due
          ? due.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
          : 'No due date',
        sortValue: due ? due.setHours(0, 0, 0, 0) : Number.MAX_SAFE_INTEGER,
        tasks: [],
      });
    }
    groups.get(key)!.tasks.push(task);
  }

  return [...groups.values()].sort((a, b) => a.sortValue - b.sortValue);
};

interface TaskListProps {
  userId?: string;
  hideHeader?: boolean;
}

type TaskView = 'list' | 'board';

const VIEW_TABS: ViewTab<TaskView>[] = [
  { key: 'list', label: 'List', icon: LayoutList },
  { key: 'board', label: 'Board', icon: Kanban },
];

const DEFAULT_FILTERS: TaskFilters = { category: 'all', status: 'all', priority: [], departmentId: '', assigneeIds: [], raisedByIds: [] };

const URL_TRACKED_DEFAULTS: Pick<TaskFilters, 'category' | 'status' | 'departmentId' | 'assigneeIds' | 'raisedByIds'> = {
  category: 'all', status: 'all', departmentId: '', assigneeIds: [], raisedByIds: [],
};

const filtersFromUrl = (searchParams: URLSearchParams): Partial<TaskFilters> => {
  const fromUrl: Partial<TaskFilters> = {};
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const departmentId = searchParams.get('departmentId');
  const assigneeIds = searchParams.get('assigneeIds');
  const raisedByIds = searchParams.get('raisedByIds');
  if (category) fromUrl.category = category as CategoryFilterKey;
  if (status) fromUrl.status = status as Task['status'];
  if (departmentId) fromUrl.departmentId = departmentId;
  if (assigneeIds) fromUrl.assigneeIds = assigneeIds.split(',');
  if (raisedByIds) fromUrl.raisedByIds = raisedByIds.split(',');
  return fromUrl;
};

const filtersStorageKey = (userId?: string) => `task-filters:${userId ?? 'anon'}`;

const viewFromUrl = (searchParams: URLSearchParams): TaskView | null => {
  if (searchParams.get('mine') === '1') return 'list';
  if (searchParams.get('category') === 'delegation') return 'board';
  return null;
};

export const TaskList = ({ userId, hideHeader = false }: TaskListProps = {}) => {
  const { user } = useAuth();
  const isVerifier = user?.role === "PC" || user?.role === "ADMIN";
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  
  const { data: tasks, isPending, isError } = useTasksQuery(userId);
  const { data: assignableUsers } = useAssignableUsersQuery();
  const { data: departments } = useDepartmentsQuery();

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
  const [view, setView] = useState<TaskView>(() => viewFromUrl(searchParams) ?? 'board');
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey | null>(null);

  const isFirstViewRun = useRef(true);
  useEffect(() => {
    if (isFirstViewRun.current) {
      isFirstViewRun.current = false;
      return;
    }
    setView(prev => viewFromUrl(searchParams) ?? prev);
  }, [searchParams]);

  const { visibility: fieldVisibility, toggle: toggleField } = useCardFieldVisibility();

  const syncFiltersToUrl = (next: TaskFilters) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (next.category !== 'all') params.set('category', next.category); else params.delete('category');
      if (next.status !== 'all') params.set('status', next.status); else params.delete('status');
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

  const assigneeNames = new Map(
    (assignableUsers ?? []).map(u => [u.id, `${u.firstName} ${u.lastName ?? ''}`.trim()]),
  );
  const departmentNames = new Map((departments ?? []).map(d => [d.id, d.name]));

  const mineOnly = searchParams.get('mine') === '1';
  const mineFiltered = !mineOnly || !user
    ? (tasks ?? [])
    : (tasks ?? []).filter(t => t.userId === user.id || t.assigneeId === user.id || t.additionalAssigneeIds.includes(user.id));

  const categoryFiltered = mineFiltered.filter(CATEGORY_PREDICATES[filters.category]);
  const priorityFiltered = filters.priority.length === 0 ? categoryFiltered : categoryFiltered.filter(t => filters.priority.includes(t.priority));
  const departmentFiltered = filters.departmentId ? priorityFiltered.filter(t => t.departmentId === filters.departmentId) : priorityFiltered;
  const assigneeFiltered = filters.assigneeIds.length === 0
    ? departmentFiltered
    : departmentFiltered.filter(t => taskAssigneeIds(t).some(id => filters.assigneeIds.includes(id)));
  const raisedByFiltered = filters.raisedByIds.length === 0
    ? assigneeFiltered
    : assigneeFiltered.filter(t => filters.raisedByIds.includes(t.userId));
  const statusFiltered = filters.status === 'all' ? raisedByFiltered : raisedByFiltered.filter(t => t.status === filters.status);

  const isOverdue = (t: Task) => !!t.dueDate && t.status !== 'done' && new Date(t.dueDate).getTime() < new Date().getTime();
  const quickFilterPredicates: Record<QuickFilterKey, (t: Task) => boolean> = {
    pending: (t) => t.status !== 'done',
    completed: (t) => t.status === 'done',
    due: (t) => !!t.dueDate && t.status !== 'done' && !isOverdue(t),
    delayed: isOverdue,
  };
  const quickCounts = {
    pending: mineFiltered.filter(quickFilterPredicates.pending).length,
    completed: mineFiltered.filter(quickFilterPredicates.completed).length,
    due: mineFiltered.filter(quickFilterPredicates.due).length,
    delayed: mineFiltered.filter(quickFilterPredicates.delayed).length,
  };
  const filtered = quickFilter ? statusFiltered.filter(quickFilterPredicates[quickFilter]) : statusFiltered;

  const sorted = [...filtered].sort(SORT_COMPARATORS[sort]);
  const dateGroups = groupByDueDate(sorted);

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
    ...(filters.departmentId ? [{ key: 'departmentId', label: `Dept: ${departmentNames.get(filters.departmentId) ?? 'Unknown'}`, onClear: () => updateFilters({ departmentId: '' }) }] : []),
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

  const isEmpty = sorted.length === 0;
  const effectiveView: TaskView = isVerifier ? view : 'list';

  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-[1400px] transition-all duration-300">
      
      {/* Header & Controls Section */}
      <div className="flex flex-col gap-4">
        {/* Top row */}
        <div className="flex items-center justify-between gap-4">
          {!hideHeader && (
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-text tracking-tight">Delegation</h1>
              <p className="text-xs sm:text-sm font-medium text-text-muted mt-0.5">
                {tasks?.length ?? 0} total delegation{tasks?.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* "New Delegation" and "Smart Task" merged into one trigger — Smart Task stays
                visible to everyone (rather than disappearing for non-admins) but shows a "Soon"
                badge and is disabled until that role can actually use it, same pattern as the
                sidebar's other not-yet-available links. */}
            {!userId && (
              <>
                {/* Desktop: dropdown trigger. Mobile: the Fab below instead — same two actions,
                    same speed-dial pattern as the Dashboard's To-Do FAB and Tickets' Create FAB. */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="primary"
                        className="group gap-2 font-medium shadow-md rounded-full text-xs sm:text-sm px-4 py-2 hover:shadow-lg transition-all duration-200"
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
          </div>
        </div>

        {/* Quick-stat tiles — sit above the view/filter toolbar so the at-a-glance counts read
            before the controls that act on them. */}
        {!hideHeader && (
          <TaskQuickStats counts={quickCounts} active={quickFilter} onToggle={toggleQuickFilter} />
        )}

        <div className="flex items-center gap-3 flex-wrap justify-between bg-surface/50 p-1.5 sm:p-2 rounded-xl border border-border/50">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Ownership quick tabs — visible to everyone (not gated on isVerifier like the
                controls below), since "what's assigned to/by me" matters regardless of role. */}
            {!userId && user && (
              <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-hover/50 border border-border/40">
                <button
                  type="button"
                  onClick={toggleAssignedToMe}
                  title="Assigned to me"
                  aria-label="Assigned to me"
                  aria-pressed={isAssignedToMe}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                    isAssignedToMe
                      ? 'bg-background text-text shadow-sm ring-1 ring-border/50'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-active/50'
                  }`}
                >
                  <UserCheck size={14} />
                  <span className="hidden md:inline">Assigned to me</span>
                </button>
                <button
                  type="button"
                  onClick={toggleAssignedByMe}
                  title="Assigned by me"
                  aria-label="Assigned by me"
                  aria-pressed={isAssignedByMe}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                    isAssignedByMe
                      ? 'bg-background text-text shadow-sm ring-1 ring-border/50'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-active/50'
                  }`}
                >
                  <Send size={13} />
                  <span className="hidden md:inline">Assigned by me</span>
                </button>
              </div>
            )}

            {isVerifier && (
              <TaskFiltersPopover
                filters={filters}
                onChange={updateFilters}
                onClearAll={clearFilters}
                departments={departments}
                assignableUsers={assignableUsers}
                currentUserId={user?.id}
                isAdmin={isVerifier}
                activeCount={activeChips.length}
                sort={sort}
                onSortChange={setSort}
                fieldVisibility={fieldVisibility}
                onToggleField={toggleField}
              />
            )}

            {isVerifier && (
              <ViewToggle tabs={VIEW_TABS} value={view} onChange={setView} />
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <span className="hidden sm:inline-block text-xs font-medium text-text-muted px-2">
              {sorted.length} result{sorted.length !== 1 ? 's' : ''}
            </span>

            {/* Desktop only — on mobile these fold into the Filters sheet instead (see
                TaskFiltersPopover's "Sort by" / "Show only" sections) to save toolbar space. */}
            {isVerifier && (
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
                    {(Object.keys(SORT_LABEL) as TaskSortKey[]).map(key => {
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9 px-3 gap-2 border border-border/60 rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                      aria-label="Customize cards"
                      title="Customize cards"
                    >
                      <Settings2 size={14} className="text-text-muted" />
                      <span className="text-xs font-medium hidden md:inline">Fields</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl">
                    <DropdownMenuLabel className="text-xs text-text-muted font-semibold uppercase tracking-wider">Show only</DropdownMenuLabel>
                    {CARD_FIELD_CONFIG.map(({ key, label, icon: Icon }) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={fieldVisibility[key]}
                        onCheckedChange={() => toggleField(key)}
                        onSelect={(e) => e.preventDefault()}
                        className="gap-2.5 py-2 cursor-pointer"
                      >
                        <Icon size={14} className="text-text-muted" />
                        <span className="font-medium text-sm">{label}</span>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Export — admin/PC only, and hidden on mobile entirely: a background-report
                download isn't a mobile-first action, matching the same gating on Tickets. */}
            {isVerifier && (
              <Button
                variant="secondary"
                size="sm"
                className="hidden sm:inline-flex h-9 px-3 gap-1.5 border border-border/60 shadow-sm rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                onClick={() => setShowExport(true)}
                aria-label="Export delegations"
                title="Export delegations"
              >
                <FileDown size={14} className="text-text-muted" />
                <span className="text-xs font-medium hidden md:inline">Export</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2.5 flex-wrap px-1">
          {activeChips.map(chip => (
            <span
              key={chip.key}
              className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-[11px] font-semibold rounded-lg bg-primary-50/80 text-primary-700 border border-primary-200/60 shadow-sm dark:bg-primary-900/20 dark:border-primary-800/80 dark:text-primary-300"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onClear}
                aria-label={`Clear ${chip.label} filter`}
                className="p-1 rounded-md hover:bg-primary-200/50 dark:hover:bg-primary-800/50 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={saveFilters}
            title="Save this filter combination as your default"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg text-text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border/60 hover:shadow-sm transition-all duration-200 cursor-pointer ml-1"
          >
            <Save size={13} />
            Save view
          </button>
        </div>
      )}

      {/* Loading States */}
      {isPending && effectiveView === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border/60 bg-surface shadow-sm">
              <Skeleton className="w-5 h-5 rounded-md shrink-0" />
              <div className="flex flex-col gap-2 flex-1 max-w-md">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-6 w-20 rounded-md shrink-0" />
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* (Other Skeletons truncated for brevity - leaving your original skeleton structures intact but slightly rounded) */}
      {isPending && effectiveView === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
              {Array.from({ length: 4 }).map((_, col) => (
                  <div key={col} className="flex flex-col gap-4 p-3 bg-surface-hover/30 border border-border/50 rounded-xl">
                      <Skeleton className="h-6 w-32 rounded-md mx-2 mt-2" />
                      {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex flex-col gap-3 p-4 rounded-lg border border-border/60 bg-surface shadow-sm">
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

      {/* Error State */}
      {isError && (
        <div className="flex items-start gap-3 p-4 bg-danger/5 rounded-xl border border-danger/20 text-danger shadow-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold">Error Loading Delegations</h4>
            <p className="text-sm mt-1 opacity-90">Failed to connect to the server. Please refresh the page.</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isPending && !isError && isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-surface/30 rounded-2xl border border-dashed border-border/80">
          <div className="flex items-center justify-center mb-5 w-14 h-14 bg-surface rounded-full shadow-sm border border-border/50 text-text-muted">
            <Inbox size={26} strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-text tracking-tight">No delegations found</h3>
          <p className="text-sm text-text-muted mt-2 max-w-sm leading-relaxed">
            {activeChips.length > 0
              ? "No delegations match the current filters. Try adjusting or clearing them to see more."
              : "You're all caught up! There are no delegations assigned to this view."}
          </p>
          {activeChips.length > 0 && (
            <Button variant="secondary" size="sm" onClick={clearFilters} className="mt-6 rounded-full font-medium">
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* List View Render */}
      {!isPending && !isError && !isEmpty && effectiveView === 'list' && (() => {
        let rowIndex = 0;
        return (
          <div className="flex flex-col gap-8 pb-12">
            {dateGroups.map(group => (
              <div key={group.key} className="flex flex-col gap-4">
                {/* Sticky Date Header for smooth scrolling context */}
                <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 backdrop-blur-md py-2 -mx-2 px-2 rounded-lg">
                  <h3 className="text-sm font-bold text-text tracking-tight">
                    {group.label}
                  </h3>
                  <span className="flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-[10px] font-bold text-text-muted bg-surface border border-border/80 shadow-sm rounded-full">
                    {group.tasks.length}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
                
                {/* Tasks Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {group.tasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isVerifier={isVerifier}
                      onOpen={setSelected}
                      index={rowIndex++}
                      assigneeName={task.assigneeId ? assigneeNames.get(task.assigneeId) : undefined}
                      departmentName={task.departmentId ? departmentNames.get(task.departmentId) : undefined}
                      fields={fieldVisibility}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Board View Render */}
      {!isPending && !isError && !isEmpty && effectiveView === 'board' && (
        <div className="pb-12">
          <TaskBoard
            tasks={sorted}
            assigneeNames={assigneeNames}
            departmentNames={departmentNames}
            isVerifier={isVerifier}
            onOpen={setSelected}
            onAddTask={() => setShowForm(true)}
            fields={fieldVisibility}
          />
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
          onCreated={(task) => setSelected(task)}
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
          key={selected.id}
          task={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};