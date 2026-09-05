import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus } from 'lucide-react';
import { Button, Fab } from '../../components';
import { TodoList } from './TodoList';
import { TodoDayStrip } from './TodoDayStrip';
import { TodoQuickStats, type TodoQuickFilterKey } from './TodoQuickStats';
import { TodoToolbar } from './TodoToolbar';
import type { TodoPriorityFilter, TodoSortKey } from './todoSort';
import { TODO_QUICK_FILTER_PREDICATES } from './todoQuickFilters';
import { TODO_BUTTON_CLASS } from './todoFormStyles';
import { CreateTodoModal } from './CreateTodoModal';
import { useTodosQuery } from './hook';
import { isSameDay } from './todoDate';
import { readQuickFilterParam } from '../../lib/readQuickFilterParam';

const QUICK_FILTER_VALUES = ['pending', 'completed', 'due', 'delayed'] as const;

export const TodoPage = () => {
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Seeded from `?quickFilter=` when present (e.g. the Dashboard's "Due"/"Completed" rows
  // deep-linking in as `/todo?quickFilter=pending` or `?quickFilter=completed`) — TodoPage had no
  // URL-tracked state before this, so this is the minimal read-once-on-mount addition.
  const [quickFilter, setQuickFilter] = useState<TodoQuickFilterKey | null>(
    () => readQuickFilterParam(searchParams, QUICK_FILTER_VALUES),
  );
  const [priority, setPriority] = useState<TodoPriorityFilter>('all');
  // Defaults to 'created' — newest first — which is exactly what the server already returns
  // (`orderBy(desc(createdAt))`), so adding the sort control didn't silently reorder anyone's
  // list. Due-date order is one click away for whoever wants it.
  const [sort, setSort] = useState<TodoSortKey>('created');
  // Same query key as TodoList, so this is served from cache, not a second network round-trip —
  // needed here to feed the day strip's "has tasks due" dots and the quick-stat tile counts.
  const { data: todos = [], isPending } = useTodosQuery();

  const toggleQuickFilter = (key: TodoQuickFilterKey) => {
    setQuickFilter((prev) => (prev === key ? null : key));
  };

  const quickCounts = {
    pending: todos.filter(TODO_QUICK_FILTER_PREDICATES.pending).length,
    completed: todos.filter(TODO_QUICK_FILTER_PREDICATES.completed).length,
    due: todos.filter(TODO_QUICK_FILTER_PREDICATES.due).length,
    delayed: todos.filter(TODO_QUICK_FILTER_PREDICATES.delayed).length,
  };

  // Mirrors TodoList's own date-then-quick-filter narrowing so the header count always matches
  // what's actually rendered below it. Same cached `todos` array, so no extra request.
  const dateFiltered = selectedDate
    ? todos.filter((t) => !!t.dueDate && isSameDay(new Date(t.dueDate), selectedDate))
    : todos;
  const quickFiltered = quickFilter
    ? dateFiltered.filter(TODO_QUICK_FILTER_PREDICATES[quickFilter])
    : dateFiltered;
  const shownCount =
    priority === 'all' ? quickFiltered.length : quickFiltered.filter((t) => t.priority === priority).length;

  return (
    // gap-6, matching the other three top-level pages — this was the only one on gap-5.
    <div className="flex flex-col gap-6 mx-auto w-full max-w-(--container-width) transition-all duration-300">
      {/* Same header treatment as Delegation and Tickets: no visible title block — the sidebar
          item that got you here already says To-Do, and the lead "Total" tile carries the count.
          The heading stays in the accessibility tree as the page's one landmark. */}
      <h1 className="sr-only">To-Do</h1>

      <Fab actions={[{ key: 'add', label: 'Add todo', icon: Plus, onClick: () => setShowForm(true) }]} />

      <TodoQuickStats
        counts={quickCounts}
        total={todos.length}
        active={quickFilter}
        onToggle={toggleQuickFilter}
        onClear={() => setQuickFilter(null)}
        isLoading={isPending}
      />

      {/* Controls band below the stats, matching the other two pages. Desktop: inline button.
          Mobile: the Fab above instead — same single "Add todo" action. */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" variant="primary" className={`hidden md:inline-flex gap-1.5 ml-auto ${TODO_BUTTON_CLASS}`} onClick={() => setShowForm(true)}>
          <Plus size={14} />
          Todo Task
        </Button>
      </div>

      <section aria-label="Filter by day" className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:p-4">
        <TodoDayStrip selected={selectedDate} onSelect={setSelectedDate} todos={todos} />
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex items-baseline gap-2 min-w-0">
            <p className="text-sm font-display font-semibold text-text tracking-tight truncate">
              {selectedDate
                ? isSameDay(selectedDate, new Date())
                  ? "Today's tasks"
                  : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
                : 'All tasks'}
            </p>
            <span className="text-xs font-display font-medium text-text-muted tabular-nums shrink-0">
              {shownCount === 1 ? '1 task' : `${shownCount} tasks`}
            </span>
          </div>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-display font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-500/10 transition-all duration-200 ease-in-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Show all
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-border/60">
          <TodoToolbar priority={priority} onPriorityChange={setPriority} sort={sort} onSortChange={setSort} />
        </div>
      </section>

      <TodoList selectedDate={selectedDate} quickFilter={quickFilter} priority={priority} sort={sort} />

      <CreateTodoModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
};