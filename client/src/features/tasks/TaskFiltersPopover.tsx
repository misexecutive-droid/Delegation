import { lazy, Suspense, useEffect, useState } from 'react';
import { Filter, Plus, X, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Button, Modal } from '../../components';
import { STATUS_LABEL } from './taskDisplay';
import { avatarColorClass } from './avatarColors';
import { getInitials } from '../../lib/getInitials';
import type { Task } from '../../api/task';
import type { Department } from '../../api/departments';
import type { AssignableUser } from '../../api/users';
import { SORT_LABEL, SORT_ICON, type CategoryFilterKey, type TaskSortKey } from './taskFilters';
import { CARD_FIELD_CONFIG, type CardFieldKey, type CardFieldVisibility } from './cardFields';

export interface TaskFilters {
  category:     CategoryFilterKey;
  status:       Task['status'] | 'all';
  priority:     Task['priority'][];
  departmentId: string;
  assigneeIds:  string[];
  raisedByIds:  string[];
}

interface TaskFiltersPopoverProps {
  filters:          TaskFilters;
  onChange:         (patch: Partial<TaskFilters>) => void;
  onClearAll:       () => void;
  departments?:     Department[];
  assignableUsers?: AssignableUser[];
  currentUserId?:   string;
  isAdmin?:         boolean;
  activeCount:      number;
  /** Sort and card-field visibility — desktop keeps these as their own separate toolbar
   *  dropdowns, but on mobile there's no room for four separate buttons, so they fold into this
   *  panel as two extra sections instead. */
  sort:             TaskSortKey;
  onSortChange:     (key: TaskSortKey) => void;
  fieldVisibility:  CardFieldVisibility;
  onToggleField:    (key: CardFieldKey) => void;
}

const UserForm = lazy(() =>
  import('../admin/users/UserForm').then((m) => ({ default: m.UserForm })),
);

const STATUS_OPTIONS: { value: Task['status']; label: string }[] =
  (Object.entries(STATUS_LABEL) as [Task['status'], string][]).map(([value, label]) => ({ value, label }));

const CATEGORY_OPTIONS: { value: CategoryFilterKey; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'issue', label: 'Issue' },
  { value: 'delegation', label: 'Delegation' },
  { value: 'task', label: 'Direct Task' },
];

const PRIORITY_OPTIONS: { value: Task['priority']; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const toggleValue = <T,>(arr: T[], value: T): T[] =>
  arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

const PillButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center w-full px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 cursor-pointer border ${
      active
        ? 'bg-primary-50/80 border-primary-300 text-primary-700 shadow-sm dark:bg-primary-900/30 dark:border-primary-700/80 dark:text-primary-300'
        : 'bg-surface border-border/60 text-text-muted hover:text-text hover:bg-surface-hover hover:border-border'
    }`}
  >
    {children}
  </button>
);

// Advanced UI Helper: Groups filters into beautiful, distinct card-like blocks
const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2.5">
    <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest pl-1">{title}</span>
    <div className="p-3 rounded-xl bg-surface-hover/30 border border-border/40 dark:bg-surface-hover/10">
      {children}
    </div>
  </div>
);

// Below this width the panel opens as a full Modal (Radix Dialog, centered with a backdrop)
// instead of a Popper-anchored dropdown — an anchored popover next to a small toolbar button
// reads awkwardly on a phone (it has to squeeze itself near the trigger rather than just being
// the thing on screen), the same reasoning DateRangePicker already uses a Modal for.
const MOBILE_QUERY = '(max-width: 639px)';

export const TaskFiltersPopover = ({
  filters, onChange, onClearAll, departments, assignableUsers, currentUserId, isAdmin = false, activeCount,
  sort, onSortChange, fieldVisibility, onToggleField,
}: TaskFiltersPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TaskFilters>(filters);
  const [showAddUser, setShowAddUser] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onMqChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onMqChange);
    return () => mq.removeEventListener('change', onMqChange);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(filters);
    setOpen(next);
  };

  const openMobile = () => {
    setDraft(filters);
    setOpen(true);
  };

  const departmentOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Departments' },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];

  const isAssignedToMe = !!currentUserId && draft.assigneeIds.length === 1 && draft.assigneeIds[0] === currentUserId;
  const isAllTeam = draft.assigneeIds.length === 0;

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  // On mobile there's no separate "Apply" step — every toggle commits immediately, so this
  // updates the draft and, on mobile only, pushes it straight to the parent's applied filters
  // in the same tick. Desktop keeps staging changes in `draft` until "Apply filters" is clicked.
  const updateDraft = (updater: (d: TaskFilters) => TaskFilters) => {
    setDraft((prev) => {
      const next = updater(prev);
      if (isMobile) onChange(next);
      return next;
    });
  };

  const userName = (id: string) => {
    const u = (assignableUsers ?? []).find((u) => u.id === id);
    return u ? `${u.firstName} ${u.lastName ?? ''}`.trim() : 'Unknown';
  };

  // Live preview of the draft selection
  const draftChips: { key: string; label: string; onRemove: () => void }[] = [
    ...(draft.status !== 'all' ? [{
      key: 'status', label: `${STATUS_LABEL[draft.status]}`,
      onRemove: () => updateDraft((d) => ({ ...d, status: 'all' })),
    }] : []),
    ...(draft.category !== 'all' ? [{
      key: 'category', label: `${CATEGORY_OPTIONS.find((o) => o.value === draft.category)?.label ?? draft.category}`,
      onRemove: () => updateDraft((d) => ({ ...d, category: 'all' })),
    }] : []),
    ...draft.priority.map((p) => ({
      key: `priority-${p}`,
      label: `${PRIORITY_OPTIONS.find((o) => o.value === p)?.label ?? p}`,
      onRemove: () => updateDraft((d) => ({ ...d, priority: d.priority.filter((x) => x !== p) })),
    })),
    ...(draft.departmentId ? [{
      key: 'department',
      label: `${departmentOptions.find((o) => o.value === draft.departmentId)?.label ?? 'Unknown'}`,
      onRemove: () => updateDraft((d) => ({ ...d, departmentId: '' })),
    }] : []),
    ...draft.assigneeIds.map((id) => ({
      key: `assignee-${id}`,
      label: userName(id),
      onRemove: () => updateDraft((d) => ({ ...d, assigneeIds: d.assigneeIds.filter((x) => x !== id) })),
    })),
    ...draft.raisedByIds.map((id) => ({
      key: `raisedby-${id}`,
      label: `By ${userName(id)}`,
      onRemove: () => updateDraft((d) => ({ ...d, raisedByIds: d.raisedByIds.filter((x) => x !== id) })),
    })),
  ];

  const triggerInner = (
    <>
      <Filter size={14} className={activeCount > 0 ? "text-primary-600 dark:text-primary-400" : "text-text-muted"} />
      <span className={`text-xs font-medium hidden md:inline ${activeCount > 0 ? "text-primary-700 dark:text-primary-300" : ""}`}>
        Filters
      </span>
      {activeCount > 0 && (
        <span className="flex items-center justify-center min-w-[1.25rem] h-[1.25rem] px-1 text-[10px] font-bold rounded-full bg-primary-600 text-white shadow-sm ml-0.5">
          {activeCount}
        </span>
      )}
    </>
  );

  const triggerClassName = `h-9 px-3 gap-2 border rounded-lg transition-colors ${
    activeCount > 0
      ? 'bg-primary-50 border-primary-200 hover:bg-primary-100 dark:bg-primary-900/20 dark:border-primary-800/50'
      : 'bg-surface border-border/60 hover:bg-surface-hover'
  }`;

  // Horizontally scrollable draft chips - hides scrollbar for a clean look
  const draftChipsRow = draftChips.length > 0 && (
    <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {draftChips.map((chip) => (
        <span
          key={chip.key}
          className="flex items-center gap-1.5 pl-3 pr-1 py-1 text-[11px] font-bold rounded-full bg-primary-50 text-primary-700 border border-primary-200/60 shadow-sm dark:bg-primary-900/30 dark:border-primary-800/80 dark:text-primary-300 shrink-0"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.label}`}
            className="p-1 rounded-full hover:bg-primary-200/50 dark:hover:bg-primary-800/50 transition-colors cursor-pointer"
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        </span>
      ))}
    </div>
  );

  // Shared between the desktop dropdown and the mobile modal, so both stay in sync for free.
  const filterSectionsBody = (
    <>
      <FilterSection title="Status">
        <div className="grid grid-cols-2 gap-2">
          <PillButton active={draft.status === 'all'} onClick={() => updateDraft(d => ({ ...d, status: 'all' }))}>
            All Statuses
          </PillButton>
          {STATUS_OPTIONS.map((opt) => (
            <PillButton key={opt.value} active={draft.status === opt.value} onClick={() => updateDraft(d => ({ ...d, status: opt.value }))}>
              {opt.label}
            </PillButton>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Category">
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <PillButton key={opt.value} active={draft.category === opt.value} onClick={() => updateDraft(d => ({ ...d, category: opt.value }))}>
              {opt.label}
            </PillButton>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Priority">
        <div className="flex flex-col gap-1">
          {PRIORITY_OPTIONS.map((opt) => {
            const checked = draft.priority.includes(opt.value);
            return (
              <label key={opt.value} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${checked ? 'bg-surface-active/50 text-text' : 'text-text-secondary hover:bg-surface hover:text-text'}`}>
                <span className="flex items-center gap-3">
                  <div className={`flex items-center justify-center size-4 rounded-[4px] border transition-all ${checked ? 'bg-primary-600 border-primary-600 text-white' : 'bg-surface border-border-hover'}`}>
                    {checked && <Check size={12} strokeWidth={3} />}
                  </div>
                  {opt.label}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => updateDraft(d => ({ ...d, priority: toggleValue(d.priority, opt.value) }))}
                />
              </label>
            );
          })}
        </div>
      </FilterSection>

      {(!!assignableUsers?.length || isAdmin) && (
        <FilterSection title="Assignee">
          <div className="flex flex-wrap items-center gap-2.5">
            {(assignableUsers ?? []).map((u) => {
              const name = `${u.firstName} ${u.lastName ?? ''}`.trim();
              const selected = draft.assigneeIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => updateDraft(d => ({ ...d, assigneeIds: toggleValue(d.assigneeIds, u.id) }))}
                  title={name}
                  aria-pressed={selected}
                  className={`relative flex items-center justify-center size-9 rounded-full text-[12px] font-bold text-white transition-all duration-200 cursor-pointer ${avatarColorClass(name)} ${
                    selected ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-background shadow-md' : 'opacity-60 hover:opacity-100 hover:scale-105 hover:shadow-sm'
                  }`}
                >
                  {getInitials(name)}
                  {selected && (
                    <span className="absolute -bottom-1 -right-1 flex items-center justify-center size-4 rounded-full bg-primary-600 border-2 border-surface text-white sm:hidden shadow-sm">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}

            {isAdmin && (
              <button
                type="button"
                onClick={() => { setShowAddUser(true); setOpen(false); }}
                title="Add a new user"
                aria-label="Add a new user"
                className="flex items-center justify-center size-9 rounded-full border border-dashed border-border-hover text-text-light hover:text-primary-600 hover:border-primary-400 hover:bg-primary-50/50 transition-all cursor-pointer bg-surface"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </FilterSection>
      )}

      {currentUserId && (
        <FilterSection title="Assignment Target">
          <div className="flex flex-col gap-1">
            <label className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${isAssignedToMe ? 'bg-surface-active/50 text-text' : 'text-text-secondary hover:bg-surface hover:text-text'}`}>
              <span className="flex items-center gap-3">
                <div className={`flex items-center justify-center size-4 rounded-full border transition-all ${isAssignedToMe ? 'border-primary-600' : 'bg-surface border-border-hover'}`}>
                  {isAssignedToMe && <div className="size-2 rounded-full bg-primary-600" />}
                </div>
                Assigned to me
              </span>
              <input
                type="radio"
                name="assigned-to"
                className="sr-only"
                checked={isAssignedToMe}
                onChange={() => updateDraft(d => ({ ...d, assigneeIds: [currentUserId] }))}
              />
            </label>
            <label className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${isAllTeam ? 'bg-surface-active/50 text-text' : 'text-text-secondary hover:bg-surface hover:text-text'}`}>
              <span className="flex items-center gap-3">
                <div className={`flex items-center justify-center size-4 rounded-full border transition-all ${isAllTeam ? 'border-primary-600' : 'bg-surface border-border-hover'}`}>
                  {isAllTeam && <div className="size-2 rounded-full bg-primary-600" />}
                </div>
                All team
              </span>
              <input
                type="radio"
                name="assigned-to"
                className="sr-only"
                checked={isAllTeam}
                onChange={() => updateDraft(d => ({ ...d, assigneeIds: [] }))}
              />
            </label>
          </div>
        </FilterSection>
      )}

      {!!assignableUsers?.length && (
        <FilterSection title="Raised By">
          <div className="flex flex-wrap items-center gap-2.5">
            {assignableUsers.map((u) => {
              const name = `${u.firstName} ${u.lastName ?? ''}`.trim();
              const selected = draft.raisedByIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => updateDraft(d => ({ ...d, raisedByIds: toggleValue(d.raisedByIds, u.id) }))}
                  title={name}
                  aria-pressed={selected}
                  className={`relative flex items-center justify-center size-9 rounded-full text-[12px] font-bold text-white transition-all duration-200 cursor-pointer ${avatarColorClass(name)} ${
                    selected ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-background shadow-md' : 'opacity-60 hover:opacity-100 hover:scale-105 hover:shadow-sm'
                  }`}
                >
                  {getInitials(name)}
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Department">
        <div className="grid grid-cols-2 gap-2">
          {departmentOptions.map((opt) => (
            <PillButton key={opt.value} active={draft.departmentId === opt.value} onClick={() => updateDraft(d => ({ ...d, departmentId: opt.value }))}>
              {opt.label}
            </PillButton>
          ))}
        </div>
      </FilterSection>
    </>
  );

  // Mobile-only: desktop keeps Sort and "Show only" (card fields) as their own separate toolbar
  // dropdowns, but a phone-width toolbar has no room for four buttons — these fold into the same
  // sheet as the rest of the filters instead of disappearing entirely.
  const mobileOnlySections = (
    <>
      <FilterSection title="Sort by">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SORT_LABEL) as TaskSortKey[]).map((key) => {
            const Icon = SORT_ICON[key];
            return (
              <PillButton key={key} active={sort === key} onClick={() => onSortChange(key)}>
                <span className="flex items-center gap-1.5">
                  <Icon size={13} />
                  {SORT_LABEL[key]}
                </span>
              </PillButton>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Show only">
        <div className="grid grid-cols-2 gap-1">
          {CARD_FIELD_CONFIG.map(({ key, label, icon: Icon }) => {
            const checked = fieldVisibility[key];
            return (
              <label key={key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${checked ? 'bg-surface-active/50 text-text' : 'text-text-secondary hover:bg-surface hover:text-text'}`}>
                <div className={`flex items-center justify-center size-4 rounded-[4px] border shrink-0 transition-all ${checked ? 'bg-primary-600 border-primary-600 text-white' : 'bg-surface border-border-hover'}`}>
                  {checked && <Check size={12} strokeWidth={3} />}
                </div>
                <Icon size={14} className="text-text-light shrink-0" />
                <span className="truncate">{label}</span>
                <input type="checkbox" className="sr-only" checked={checked} onChange={() => onToggleField(key)} />
              </label>
            );
          })}
        </div>
      </FilterSection>
    </>
  );

  const footerButtons = (
    <>
      <button
        type="button"
        onClick={() => { onClearAll(); setOpen(false); }}
        disabled={activeCount === 0}
        className="text-xs font-bold text-text-muted hover:text-danger transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg hover:bg-danger/10"
      >
        Clear all
      </button>
      <Button variant="primary" size="md" className="flex-1 rounded-xl font-bold shadow-md" onClick={apply}>
        Apply filters
      </Button>
    </>
  );

  return (
    <>
    {isMobile ? (
      <Button
        variant="secondary"
        size="sm"
        className={triggerClassName}
        aria-label="Filters"
        title="Filters"
        onClick={openMobile}
      >
        {triggerInner}
      </Button>
    ) : (
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className={triggerClassName} aria-label="Filters" title="Filters">
            {triggerInner}
          </Button>
        </DropdownMenuTrigger>

        {/*
          The Dropdown Content is divided into a Sticky Header, Scrollable Body, and Sticky Footer.
        */}
        <DropdownMenuContent align="start" className="w-[26rem] max-h-[85vh] p-0 flex flex-col rounded-2xl border-border/60 shadow-2xl overflow-hidden bg-surface">

          {/* 1. STICKY HEADER */}
          <div className="flex flex-col gap-3 p-5 border-b border-border/50 bg-surface/95 backdrop-blur-md sticky top-0 z-20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                  <Filter size={16} className="text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-sm font-extrabold tracking-tight text-text">Refine View</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {draftChipsRow}
          </div>

          {/* 2. SCROLLABLE BODY */}
          <div className="flex flex-col gap-6 p-5 overflow-y-auto overscroll-contain">
            {filterSectionsBody}
          </div>

          {/* 3. STICKY FOOTER */}
          <div className="flex items-center justify-between gap-4 p-5 border-t border-border/50 bg-surface/95 backdrop-blur-md sticky bottom-0 z-20 shrink-0">
            {footerButtons}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )}

    {isMobile && (
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon={<Filter className="w-4 h-4 text-primary-600" />}
        title="Refine view"
        size="lg"
        bodyClassName="gap-4"
      >
        {draftChipsRow}
        {filterSectionsBody}
        {mobileOnlySections}
      </Modal>
    )}

    {showAddUser && (
      <Suspense fallback={null}>
        <UserForm onClose={() => setShowAddUser(false)} />
      </Suspense>
    )}
    </>
  );
};