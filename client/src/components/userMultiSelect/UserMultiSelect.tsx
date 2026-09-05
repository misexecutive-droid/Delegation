import { Check, Loader2 } from 'lucide-react';
import { useAssignableUsersQuery } from '../../features/tickets/hook';
import { avatarColorClass } from '../../lib/avatarColors';
import { getInitials } from '../../lib/getInitials';

interface UserMultiSelectProps {
  departmentId?: string;
  storeId?: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}

// Picks specific users within a department and/or store — shadcn's Select is single-value only,
// so this is a small bordered checkbox-list instead. Disabled until a scope is chosen since
// assignable users are scoped server-side by departmentId/storeId.
export const UserMultiSelect = ({ departmentId, storeId, selected, onChange }: UserMultiSelectProps) => {
  const { data: users, isLoading } = useAssignableUsersQuery(departmentId, storeId);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  if (!departmentId && !storeId) {
    return (
      <div className="p-3 text-sm font-display text-text-muted bg-surface-hover/40 border border-dashed border-border rounded-lg">
        Select a department or store first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar p-1.5 bg-surface border border-border rounded-lg">
      {isLoading && (
        <p className="flex items-center gap-2 text-xs font-display text-text-muted px-2 py-2">
          <Loader2 size={13} className="animate-spin" /> Loading users…
        </p>
      )}
      {!isLoading && !users?.length && (
        <p className="text-xs font-display text-text-muted px-2 py-2">No assignable users in this scope.</p>
      )}
      {users?.map(u => {
        const name = `${u.firstName} ${u.lastName ?? ''}`.trim();
        const checked = selected.includes(u.id);
        return (
          <button
            key={u.id}
            type="button"
            aria-pressed={checked}
            onClick={() => toggle(u.id)}
            className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-sm font-display text-left transition-colors duration-150 cursor-pointer ${
              checked ? 'bg-primary-500/10 text-text' : 'text-text-secondary hover:bg-surface-hover hover:text-text'
            }`}
          >
            <span className={`flex items-center justify-center size-7 rounded-full text-[10px] font-bold text-white shrink-0 ${avatarColorClass(name)}`}>
              {getInitials(name)}
            </span>
            <span className="flex-1 min-w-0 truncate">{name}</span>
            <span
              className={`flex items-center justify-center size-4 rounded-full border shrink-0 transition-colors duration-150 ${
                checked ? 'bg-primary-600 border-primary-600 text-white' : 'border-border-hover text-transparent'
              }`}
            >
              <Check size={10} strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
};
