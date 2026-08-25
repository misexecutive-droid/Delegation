import { useState } from 'react';
import { Plus, ListTodo } from 'lucide-react';
import { Button, Fab, GradientIconTile } from '../../components';
import { TodoList } from './TodoList';
import { TodoDayStrip } from './TodoDayStrip';
import { TodoQuickStats, type TodoQuickFilterKey } from './TodoQuickStats';
import { TODO_QUICK_FILTER_PREDICATES } from './todoQuickFilters';
import { TODO_BUTTON_CLASS } from './todoFormStyles';
import { CreateTodoModal } from './CreateTodoModal';
import { useTodosQuery } from './hook';
import { isSameDay } from './todoDate';

export const TodoPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [quickFilter, setQuickFilter] = useState<TodoQuickFilterKey | null>(null);
  // Same query key as TodoList, so this is served from cache, not a second network round-trip —
  // needed here to feed the day strip's "has tasks due" dots and the quick-stat tile counts.
  const { data: todos = [] } = useTodosQuery();

  const toggleQuickFilter = (key: TodoQuickFilterKey) => {
    setQuickFilter((prev) => (prev === key ? null : key));
  };

  const quickCounts = {
    pending: todos.filter(TODO_QUICK_FILTER_PREDICATES.pending).length,
    completed: todos.filter(TODO_QUICK_FILTER_PREDICATES.completed).length,
    due: todos.filter(TODO_QUICK_FILTER_PREDICATES.due).length,
    delayed: todos.filter(TODO_QUICK_FILTER_PREDICATES.delayed).length,
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <GradientIconTile icon={ListTodo} />
          <div>
            <h1 className="text-xl font-display font-semibold text-text">To-Do</h1>
            <p className="text-sm text-text-muted mt-0.5">Your own personal task list — add it, then check it off when it's done.</p>
          </div>
        </div>
        {/* Desktop: inline button. Mobile: the Fab below instead — same single "Add todo" action,
            same speed-dial primitive as the Dashboard/Delegation/Tickets FABs. */}
        <Button size="sm" variant="primary" className={`hidden md:inline-flex gap-1.5 ${TODO_BUTTON_CLASS}`} onClick={() => setShowForm(true)}>
          <Plus size={14} />
          Todo Task
        </Button>
      </div>

      <Fab actions={[{ key: 'add', label: 'Add todo', icon: Plus, onClick: () => setShowForm(true) }]} />

      {/* Quick-stat tiles — same position (right below the title, above the toolbar) and same
          click-to-filter behavior as the Delegation/Tickets pages' stat rows. */}
      <TodoQuickStats counts={quickCounts} active={quickFilter} onToggle={toggleQuickFilter} />

      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface p-4 shadow-sm">
        <TodoDayStrip selected={selectedDate} onSelect={setSelectedDate} todos={todos} />
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <p className="text-sm font-display font-semibold text-text">
            {selectedDate
              ? isSameDay(selectedDate, new Date())
                ? "Today's tasks"
                : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
              : 'All tasks'}
          </p>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-xs font-display font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
            >
              Show all
            </button>
          )}
        </div>
      </div>

      <TodoList selectedDate={selectedDate} quickFilter={quickFilter} />

      <CreateTodoModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
};