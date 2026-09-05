import { Check, type LucideIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button, FilterGroup, FilterPill } from '../../components';
import { TODO_PRIORITY_FILTERS, TODO_SORT_LABEL, TODO_SORT_ICON, type TodoPriorityFilter, type TodoSortKey } from './todoSort';

interface TodoToolbarProps {
  priority: TodoPriorityFilter;
  onPriorityChange: (key: TodoPriorityFilter) => void;
  sort: TodoSortKey;
  onSortChange: (key: TodoSortKey) => void;
}

/**
 * Priority filter + sort for the To-Do page.
 *
 * Priority could be set on a todo but never acted on — you couldn't filter or sort by it, so the
 * field was write-only. The pills reuse the shared FilterGroup/FilterPill primitives and the sort
 * dropdown mirrors the Delegation/Tickets sort trigger, so this reads as the same control language
 * rather than a fourth invented one.
 */
export const TodoToolbar = ({ priority, onPriorityChange, sort, onSortChange }: TodoToolbarProps) => {
  const ActiveSortIcon: LucideIcon = TODO_SORT_ICON[sort];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11px] font-display font-bold text-text-light tracking-widest shrink-0">Priority</span>
        <FilterGroup>
          {TODO_PRIORITY_FILTERS.map((f) => (
            <FilterPill key={f.key} active={priority === f.key} onClick={() => onPriorityChange(f.key)}>
              {f.label}
            </FilterPill>
          ))}
        </FilterGroup>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="h-9 px-3 gap-1.5 border border-border/60 rounded-lg w-fit">
            <ActiveSortIcon size={14} className="text-text-muted" />
            <span className="text-xs font-medium">{TODO_SORT_LABEL[sort]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 rounded-xl">
          {(Object.keys(TODO_SORT_LABEL) as TodoSortKey[]).map((key) => {
            const Icon: LucideIcon = TODO_SORT_ICON[key];
            return (
              <DropdownMenuItem key={key} onClick={() => onSortChange(key)} className="gap-2.5 py-2 cursor-pointer">
                <Icon size={14} className="text-text-muted" />
                <span className="font-medium text-sm">{TODO_SORT_LABEL[key]}</span>
                {sort === key && <Check size={14} className="ml-auto text-primary-600" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
