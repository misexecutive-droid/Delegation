import { Plus } from 'lucide-react';
import { STATUS_LABEL } from './taskDisplay';
import { SelectFilterRow, MultiSelectFilterRow, PeopleFilterRow, type FilterOption } from '../../components/filterRow';
import { toFilterPeople } from '../../lib/filterPeople';
import type { CategoryFilterKey, TaskFilters } from './taskFilters';
import type { Task } from '../../api/task';
import type { AssignableUser } from '../../api/users';

interface TaskFilterFieldsProps {
  filters:          TaskFilters;
  onChange:         (patch: Partial<TaskFilters>) => void;
  assignableUsers?: AssignableUser[];
  isAdmin?:         boolean;
  onAddUser?:       () => void;
}

const STATUS_OPTIONS: FilterOption<TaskFilters['status']>[] = [
  { value: 'all', label: 'All' },
  ...(Object.entries(STATUS_LABEL) as [Task['status'], string][]).map(([value, label]) => ({ value, label })),
];

const CATEGORY_OPTIONS: FilterOption<CategoryFilterKey>[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'issue', label: 'Issue' },
  { value: 'delegation', label: 'Delegation' },
  { value: 'task', label: 'Direct Task' },
];

const PRIORITY_OPTIONS: FilterOption<Task['priority']>[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// Same shape as tickets/list/TicketFilterFields.tsx — renders Category/Status/Priority/Department/
// Assignee/Raised by as ordinary rows inside the Options modal's own list, no separate trigger,
// header, or Apply/Clear footer of its own. Both now build those rows from the shared
// components/filterRow set rather than each assembling them out of the primitives.
export const TaskFilterFields = ({ filters, onChange, assignableUsers, isAdmin = false, onAddUser }: TaskFilterFieldsProps) => {
  const people = toFilterPeople(assignableUsers);

  return (
    <>
      <SelectFilterRow
        label="Category"
        options={CATEGORY_OPTIONS}
        value={filters.category}
        onSelect={(category) => onChange({ category })}
      />

      <SelectFilterRow label="Status" options={STATUS_OPTIONS} value={filters.status} onSelect={(status) => onChange({ status })} />

      <MultiSelectFilterRow
        label="Priority"
        options={PRIORITY_OPTIONS}
        selected={filters.priority}
        onChange={(priority) => onChange({ priority })}
      />

      {/* Department used to be a row here. It's now a permanent box beside the Store one, above
          the stat tiles — the two together are the org scope the page is read in, and splitting
          them across a toolbar control and a dialog row made them look unrelated. */}

      {!!people.length && (
        <PeopleFilterRow
          label="Assignee"
          people={people}
          selected={filters.assigneeIds}
          onChange={(assigneeIds) => onChange({ assigneeIds })}
          action={
            isAdmin && onAddUser ? (
              <button
                type="button"
                onClick={onAddUser}
                title="Add a new user"
                aria-label="Add a new user"
                className="flex items-center justify-center size-7 rounded-full border border-dashed border-border-hover text-text-light hover:text-primary-600 hover:border-primary-400 hover:bg-primary-50/50 transition-all cursor-pointer bg-surface"
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
            ) : undefined
          }
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
