import { Check } from 'lucide-react';
import { FiltersPopover, PillButton, FilterSection, type FilterChip } from '../../../components/filtersPopover';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../ticketDisplay';
import { avatarColorClass } from '../../tasks/avatarColors';
import { getInitials } from '../../../lib/getInitials';
import { SORT_LABEL, SORT_ICON, type TicketSortKey } from './ticketSort';
import type { Ticket } from '../../../api/ticket';
import type { Department } from '../../../api/departments';
import type { AssignableUser } from '../../../api/users';

export interface TicketFilters {
  status:       Ticket['status'] | 'all';
  priority:     Ticket['priority'][];
  departmentId: string;
  assigneeIds:  string[];
  raisedByIds:  string[];
}

interface TicketFiltersPopoverProps {
  filters:          TicketFilters;
  onChange:         (patch: Partial<TicketFilters>) => void;
  onClearAll:       () => void;
  departments?:     Department[];
  assignableUsers?: AssignableUser[];
  activeCount:      number;
  /** Sort — desktop keeps this as its own separate toolbar dropdown, but on mobile there's no
   *  room for a second button next to Filters, so it folds into this panel as an extra section. */
  sort:             TicketSortKey;
  onSortChange:     (key: TicketSortKey) => void;
}

const STATUS_OPTIONS: { value: Ticket['status']; label: string }[] =
  (Object.entries(STATUS_CONFIG) as [Ticket['status'], { label: string }][]).map(([value, { label }]) => ({ value, label }));

const PRIORITY_OPTIONS: { value: Ticket['priority']; label: string }[] = [
  { value: 'CRITICAL', label: PRIORITY_CONFIG.CRITICAL.label },
  { value: 'HIGH', label: PRIORITY_CONFIG.HIGH.label },
  { value: 'MEDIUM', label: PRIORITY_CONFIG.MEDIUM.label },
  { value: 'LOW', label: PRIORITY_CONFIG.LOW.label },
];

const toggleValue = <T,>(arr: T[], value: T): T[] =>
  arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

// Thin wrapper over the shared FiltersPopover shell, same pattern as TaskFiltersPopover — this
// file just owns Ticket's own filter fields (Status/Priority/Assignee/Raised By/Department).
// No Category section (Ticket has no such concept) and no "Assigned to me" convenience toggle
// (Ticket already has that as a first-class Scope tab in the toolbar).
export const TicketFiltersPopover = ({
  filters, onChange, onClearAll, departments, assignableUsers, activeCount, sort, onSortChange,
}: TicketFiltersPopoverProps) => {
  const departmentOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Departments' },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];

  const userName = (id: string) => {
    const u = (assignableUsers ?? []).find((u) => u.id === id);
    return u ? `${u.firstName} ${u.lastName ?? ''}`.trim() : 'Unknown';
  };

  const renderChips = (draft: TicketFilters, updateDraft: (fn: (d: TicketFilters) => TicketFilters) => void): FilterChip[] => [
    ...(draft.status !== 'all' ? [{
      key: 'status', label: `${STATUS_CONFIG[draft.status].label}`,
      onRemove: () => updateDraft((d) => ({ ...d, status: 'all' })),
    }] : []),
    ...draft.priority.map((p) => ({
      key: `priority-${p}`,
      label: PRIORITY_CONFIG[p].label,
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

  const renderSections = (draft: TicketFilters, updateDraft: (fn: (d: TicketFilters) => TicketFilters) => void) => (
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

      {!!assignableUsers?.length && (
        <FilterSection title="Assignee">
          <div className="flex flex-wrap items-center gap-2.5">
            {assignableUsers.map((u) => {
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

  // Mobile-only: desktop keeps Sort as its own separate toolbar dropdown, but a phone-width
  // toolbar has no room for a second button next to Filters — it folds into this sheet instead.
  const renderMobileOnlySections = () => (
    <FilterSection title="Sort by">
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(SORT_LABEL) as TicketSortKey[]).map((key) => {
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
  );

  return (
    <FiltersPopover<TicketFilters>
      filters={filters}
      onChange={onChange}
      onClearAll={onClearAll}
      activeCount={activeCount}
      renderSections={renderSections}
      renderChips={renderChips}
      renderMobileOnlySections={renderMobileOnlySections}
    />
  );
};
