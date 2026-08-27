import { lazy, Suspense, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { FiltersPopover, PillButton, FilterSection, type FilterChip } from '../../components/filtersPopover';
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

// Thin wrapper over the shared FiltersPopover shell — this file just owns Task's own filter
// fields (Status/Category/Priority/Assignee/Raised By/Department), the Sort + card-field-visibility
// mobile-only sections, and the "Add user" shortcut, none of which the shared shell knows about.
export const TaskFiltersPopover = ({
  filters, onChange, onClearAll, departments, assignableUsers, currentUserId, isAdmin = false, activeCount,
  sort, onSortChange, fieldVisibility, onToggleField,
}: TaskFiltersPopoverProps) => {
  const [showAddUser, setShowAddUser] = useState(false);

  const departmentOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Departments' },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];

  const userName = (id: string) => {
    const u = (assignableUsers ?? []).find((u) => u.id === id);
    return u ? `${u.firstName} ${u.lastName ?? ''}`.trim() : 'Unknown';
  };

  const renderChips = (draft: TaskFilters, updateDraft: (fn: (d: TaskFilters) => TaskFilters) => void): FilterChip[] => [
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

  // Shared between the desktop dropdown and the mobile modal, so both stay in sync for free.
  const renderSections = (
    draft: TaskFilters,
    updateDraft: (fn: (d: TaskFilters) => TaskFilters) => void,
    closePopover: () => void,
  ) => {
    const isAssignedToMe = !!currentUserId && draft.assigneeIds.length === 1 && draft.assigneeIds[0] === currentUserId;
    const isAllTeam = draft.assigneeIds.length === 0;

    return (
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
                <label key={opt.value} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${checked ? 'bg-surface-active/50 text-text' : 'text-text-secondary hover:bg-surface hover:text-text'}`}>
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
                  onClick={() => { setShowAddUser(true); closePopover(); }}
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
              <label className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isAssignedToMe ? 'bg-surface-active/50 text-text' : 'text-text-secondary hover:bg-surface hover:text-text'}`}>
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
              <label className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isAllTeam ? 'bg-surface-active/50 text-text' : 'text-text-secondary hover:bg-surface hover:text-text'}`}>
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
  };
  const renderMobileOnlySections = () => (
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
              <label key={key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${checked ? 'bg-surface-active/50 text-text' : 'text-text-secondary hover:bg-surface hover:text-text'}`}>
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

  return (
    <>
      <FiltersPopover<TaskFilters>
        filters={filters}
        onChange={onChange}
        onClearAll={onClearAll}
        activeCount={activeCount}
        renderSections={renderSections}
        renderChips={renderChips}
        renderMobileOnlySections={renderMobileOnlySections}
      />

      {showAddUser && (
        <Suspense fallback={null}>
          <UserForm onClose={() => setShowAddUser(false)} />
        </Suspense>
      )}
    </>
  );
};
