import { Trash2, Check, ListTodo, CalendarClock, CalendarX2, FilterX } from 'lucide-react';
import { Loader, Skeleton } from '../../components';
import { ErrorMessage, EmptyState } from '../admin/adminDisplay';
import { PRIORITY_MAP } from '../tasks/taskDisplay';
import { useTodosQuery, useUpdateTodoMutation, useDeleteTodoMutation } from './hook';
import { isSameDay, relativeDayLabel } from './todoDate';
import { TODO_QUICK_FILTER_PREDICATES } from './todoQuickFilters';
import type { TodoQuickFilterKey } from './TodoQuickStats';
import type { Todo } from '../../api/todos';

interface TodoListProps {
  // When set, only todos due on this exact day are shown (both pending and completed) — used by
  // the /todo page's day strip. Left undefined for the Dashboard's TodoDrawer, which always shows
  // the full list.
  selectedDate?: Date | null;
  // Same Pending/Completed/Due/Delayed quick filter as the Delegation/Tickets pages — set by
  // clicking a TodoQuickStats tile. Left undefined for the Dashboard's TodoDrawer.
  quickFilter?: TodoQuickFilterKey | null;
}

// Self-contained: fetches and mutates its own data, so it drops in identically on the full
// /todo page and inside the Dashboard's TodoDrawer with no props to thread through.
export const TodoList = ({ selectedDate = null, quickFilter = null }: TodoListProps) => {
  const { data: allTodos = [], isPending, isError } = useTodosQuery();
  const updateMut = useUpdateTodoMutation();
  const deleteMut = useDeleteTodoMutation();

  const dateFiltered = selectedDate
    ? allTodos.filter((t) => !!t.dueDate && isSameDay(new Date(t.dueDate), selectedDate))
    : allTodos;
  const todos = quickFilter ? dateFiltered.filter(TODO_QUICK_FILTER_PREDICATES[quickFilter]) : dateFiltered;

  const toggleComplete = (id: string, completed: boolean) => {
    updateMut.mutate({ id, payload: { completed: !completed } });
  };

  const renderRow = (todo: Todo) => {
    const isToggling = updateMut.isPending && updateMut.variables?.id === todo.id;
    const isDeleting = deleteMut.isPending && deleteMut.variables === todo.id;
    const priorityMeta = PRIORITY_MAP[todo.priority];
    const overdue = !!todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date();

    return (
      <div
        key={todo.id}
        className={`group relative flex items-center gap-3.5 rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 ${
          todo.completed
            ? 'border-border/50 bg-surface-hover/30 opacity-70'
            : `border-border/60 ${priorityMeta.accent}/5 hover:shadow-md hover:-translate-y-0.5 hover:border-border`
        } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
      >
        {/* Doubles as the priority cue (soft-tinted when open) and the "mark done" control (solid
            fill once completed) — same soft-chip language used for icons across the app. */}
        <button
          type="button"
          onClick={() => toggleComplete(todo.id, todo.completed)}
          disabled={isToggling}
          aria-pressed={todo.completed}
          aria-label={todo.completed ? 'Mark as not done' : 'Mark as done'}
          className={`shrink-0 flex items-center justify-center size-11 rounded-xl transition-all duration-200 cursor-pointer disabled:cursor-wait ${
            todo.completed ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/25' : priorityMeta.className
          }`}
        >
          {isToggling ? (
            <Loader size="sm" variant="slate" className="w-4 h-4" />
          ) : (
            <Check size={18} strokeWidth={2.5} className={todo.completed ? '' : 'opacity-30'} />
          )}
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p
            className={`text-sm sm:text-[15px] font-display font-semibold truncate transition-colors duration-200 ${
              todo.completed ? 'text-text-light line-through' : 'text-text'
            }`}
          >
            {todo.text}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-display font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${priorityMeta.className}`}>
              {priorityMeta.label}
            </span>
            {todo.dueDate ? (
              <span className={`inline-flex items-center gap-1 text-[11px] font-display font-semibold ${overdue ? 'text-danger' : 'text-text-muted'}`}>
                <CalendarClock size={11} />
                {relativeDayLabel(new Date(todo.dueDate))}
              </span>
            ) : (
              <span className="text-[11px] font-display font-semibold text-text-light">No due date</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => deleteMut.mutate(todo.id)}
          disabled={isDeleting}
          aria-label="Delete todo"
          className="shrink-0 p-2 rounded-lg text-text-light/70 hover:text-danger hover:bg-danger/10 transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          {isDeleting ? <Loader size="sm" variant="rose" className="w-3.5 h-3.5" /> : <Trash2 size={14} />}
        </button>
      </div>
    );
  };

  if (isPending) return <TodoListSkeleton />;
  if (isError) return <ErrorMessage message="Failed to load your to-dos." />;
  if (todos.length === 0) {
    if (quickFilter) {
      return (
        <EmptyState
          label="No matches for this filter"
          description="Nothing due on this day matches the selected tile — try another one, or clear it above."
          Icon={FilterX}
        />
      );
    }
    return selectedDate ? (
      <EmptyState
        label="Nothing due on this day"
        description="Pick another day on the strip above, or add a task due here."
        Icon={CalendarX2}
      />
    ) : (
      <EmptyState
        label="Nothing on your list yet"
        description="Add a to-do task for yourself and check it off once it's done."
        Icon={ListTodo}
      />
    );
  }

  const pending = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {pending.map(renderRow)}
      </div>

      {completed.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-display font-semibold uppercase tracking-wide text-text-light px-1">
            Completed ({completed.length})
          </p>
          {completed.map(renderRow)}
        </div>
      )}
    </div>
  );
};

const TodoListSkeleton = () => (
  <div className="flex flex-col gap-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-surface">
        <Skeleton className="size-11 rounded-xl shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="size-7 rounded-md shrink-0" />
      </div>
    ))}
  </div>
);
