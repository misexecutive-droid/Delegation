import { STATUS_CONFIG, PRIORITY_CONFIG } from '../ticketDisplay';
import { SelectFilterRow, MultiSelectFilterRow, PeopleFilterRow, type FilterOption } from '../../../components/filterRow';
import { toFilterPeople } from '../../../lib/filterPeople';
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

interface TicketFilterFieldsProps {
  filters:          TicketFilters;
  onChange:         (patch: Partial<TicketFilters>) => void;
  departments?:     Department[];
  assignableUsers?: AssignableUser[];
}

const STATUS_OPTIONS: FilterOption<TicketFilters['status']>[] = [
  { value: 'all', label: 'All' },
  ...(Object.entries(STATUS_CONFIG) as [Ticket['status'], { label: string }][]).map(([value, { label }]) => ({ value, label })),
];

const PRIORITY_OPTIONS: FilterOption<Ticket['priority']>[] = [
  { value: 'CRITICAL', label: PRIORITY_CONFIG.CRITICAL.label },
  { value: 'HIGH', label: PRIORITY_CONFIG.HIGH.label },
  { value: 'MEDIUM', label: PRIORITY_CONFIG.MEDIUM.label },
  { value: 'LOW', label: PRIORITY_CONFIG.LOW.label },
];

// Renders Status/Priority/Department/Assignee/Raised By as ordinary rows inside the Options
// modal's own list — no separate trigger, header, or Apply/Clear footer of its own. Every change
// applies to `filters` immediately, same as Scope/Group-by/Sort above it.
export const TicketFilterFields = ({ filters, onChange, departments, assignableUsers }: TicketFilterFieldsProps) => {
  const departmentOptions: FilterOption<string>[] = [
    { value: '', label: 'All Departments' },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];
  const people = toFilterPeople(assignableUsers);

  return (
    <>
      <SelectFilterRow label="Status" options={STATUS_OPTIONS} value={filters.status} onSelect={(status) => onChange({ status })} />

      <MultiSelectFilterRow
        label="Priority"
        options={PRIORITY_OPTIONS}
        selected={filters.priority}
        onChange={(priority) => onChange({ priority })}
      />

      <SelectFilterRow
        label="Department"
        options={departmentOptions}
        value={filters.departmentId}
        onSelect={(departmentId) => onChange({ departmentId })}
      />

      {!!people.length && (
        <PeopleFilterRow
          label="Assignee"
          people={people}
          selected={filters.assigneeIds}
          onChange={(assigneeIds) => onChange({ assigneeIds })}
        />
      )}

      {!!people.length && (
        <PeopleFilterRow
          label="Raised by"
          people={people}
          selected={filters.raisedByIds}
          onChange={(raisedByIds) => onChange({ raisedByIds })}
        />
      )}
    </>
  );
};
