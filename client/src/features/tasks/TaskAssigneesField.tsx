import { useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { avatarColorClass } from './avatarColors';
import { getInitials } from '../../lib/getInitials';
import { FIELD_LABEL_CLASS, FIELD_CARD_CLASS } from './taskFormFieldStyles';
import { useAuth } from '../../context/AuthContext';
import { UserForm } from '../admin/users/UserForm';
import type { AssignableUser } from '../../api/users';

interface TaskAssigneesFieldProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  users?: AssignableUser[];
  isLoading?: boolean;
  disabled?: boolean;
}

// Shows only the currently-assigned people as solid avatars, plus a dashed "+" trigger that
// opens a checklist of everyone else — instead of always showing every assignable user inline.
// The caller (TaskForm/TaskDetail) is responsible for splitting the result back into assigneeId
// (primary) + additionalAssigneeIds (extras) before saving.
export const TaskAssigneesField = ({ selectedIds, onChange, users, isLoading = false, disabled = false }: TaskAssigneesFieldProps) => {
  const { user: currentUser } = useAuth();
  // PC has full parity with ADMIN throughout this app.
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'PC';
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  // Reading a ref's .current during render isn't allowed (it can go stale without triggering a
  // re-render), so the trigger's DOM node is tracked in state via a callback ref instead.
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const nameOf = (u: AssignableUser) => `${u.firstName} ${u.lastName ?? ''}`.trim();
  const selectedUsers = (users ?? []).filter((u) => selectedIds.includes(u.id));

  return (
    <div className={`group/field flex flex-col gap-1.5 ${FIELD_CARD_CLASS}`}>
      <label className={FIELD_LABEL_CLASS}>
        Assignees
      </label>
      <div className="flex flex-wrap items-center gap-1.5 min-h-10">
        {selectedUsers.map((u) => {
          const name = nameOf(u);
          return (
            <button
              key={u.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(u.id)}
              title={`${name} — click to remove`}
              className={`flex items-center justify-center size-8 rounded-full text-[11px] font-bold text-white shrink-0 cursor-pointer transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100 ${avatarColorClass(name)}`}
            >
              {getInitials(name)}
            </button>
          );
        })}

        {!disabled && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {selectedUsers.length === 0 ? (
                // Empty state: the "Unassigned" label is part of the clickable trigger itself,
                // not separate inert text next to it — a plain <span> here reads as a status pill
                // but does nothing when clicked, which is exactly what looked broken.
                <button
                  ref={setTriggerEl}
                  type="button"
                  title="Add assignee"
                  aria-label="Add assignee"
                  className="flex items-center gap-1.5 h-8 pl-2 pr-3 rounded-full border border-dashed border-border-hover text-text-light hover:text-primary-600 hover:border-primary-400 transition-colors cursor-pointer shrink-0"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span className="text-xs font-display">Unassigned</span>
                </button>
              ) : (
                <button
                  ref={setTriggerEl}
                  type="button"
                  title="Add assignee"
                  aria-label="Add assignee"
                  className="flex items-center justify-center size-8 rounded-full border border-dashed border-border-hover text-text-light hover:text-primary-600 hover:border-primary-400 transition-colors cursor-pointer shrink-0"
                >
                  <Plus size={15} strokeWidth={2.5} />
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56"
              // See Combobox's identical comment: constrains flip/shift to the modal's own content
              // element instead of the viewport, so a trigger near the bottom of the modal doesn't
              // spill the checklist out past the modal's card.
              collisionBoundary={triggerEl?.closest('[data-slot="dialog-content"]') ?? undefined}
              collisionPadding={16}
            >
              {isLoading ? (
                <div className="px-2 py-1.5 text-xs text-text-light">Loading team…</div>
              ) : (users ?? []).length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-text-light">No assignable users</div>
              ) : (
                (users ?? []).map((u) => {
                  const name = nameOf(u);
                  const checked = selectedIds.includes(u.id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={u.id}
                      checked={checked}
                      onCheckedChange={() => toggle(u.id)}
                      onSelect={(e) => e.preventDefault()}
                      className="gap-2"
                    >
                      <span className={`flex items-center justify-center size-5 rounded-full text-[9px] font-bold text-white shrink-0 ${avatarColorClass(name)}`}>
                        {getInitials(name)}
                      </span>
                      {name}
                    </DropdownMenuCheckboxItem>
                  );
                })
              )}

              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setIsCreatingUser(true)}
                    className="gap-2 text-primary-600 dark:text-primary-400"
                  >
                    <UserPlus size={14} />
                    Create new user
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Disabled (read-only) view has no clickable trigger to fold this label into. */}
        {disabled && selectedUsers.length === 0 && (
          <span className="text-xs text-text-light">Unassigned</span>
        )}
      </div>

      {isCreatingUser && (
        <UserForm
          onClose={() => setIsCreatingUser(false)}
          onCreated={(created) => onChange([...selectedIds, created.id])}
        />
      )}
    </div>
  );
};
