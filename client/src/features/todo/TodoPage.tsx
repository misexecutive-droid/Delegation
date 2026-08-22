import { useState } from 'react';
import { Plus, ListTodo } from 'lucide-react';
import { Button, Fab } from '../../components';
import { TodoList } from './TodoList';
import { TodoDayStrip } from './TodoDayStrip';
import { CreateTodoModal } from './CreateTodoModal';
import { useTodosQuery } from './hook';
import { isSameDay } from './todoDate';

export const TodoPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Same query key as TodoList, so this is served from cache, not a second network round-trip —
  // only needed here to feed the day strip's "has tasks due" dots.
  const { data: todos = [] } = useTodosQuery();

  return (
    <div className="flex flex-col gap-5 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shrink-0 shadow-sm shadow-primary-600/20">
            <ListTodo size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold text-text">To-Do</h1>
            <p className="text-sm text-text-muted mt-0.5">Your own personal task list — add it, then check it off when it's done.</p>
          </div>
        </div>
        {/* Desktop: inline button. Mobile: the Fab below instead — same single "Add todo" action,
            same speed-dial primitive as the Dashboard/Delegation/Tickets FABs. */}
        <Button size="sm" variant="primary" className="hidden md:inline-flex gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={14} />
          Todo Task
        </Button>
      </div>

      <Fab actions={[{ key: 'add', label: 'Add todo', icon: Plus, onClick: () => setShowForm(true) }]} />

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

      <TodoList selectedDate={selectedDate} />

      <CreateTodoModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
};
