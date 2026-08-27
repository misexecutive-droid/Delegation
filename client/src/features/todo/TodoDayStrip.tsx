import { useMemo } from 'react';
import type { Todo } from '../../api/todos';
import { isSameDay, dateKey } from './todoDate';

interface TodoDayStripProps {
  selected: Date | null;
  onSelect: (date: Date | null) => void;
  todos: Todo[];
}

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// A 7-day strip centered on today (3 back, today, 3 ahead) — tap a day to filter the list below to
// just what's due then; tap the already-selected day again to clear back to "All tasks".
export const TodoDayStrip = ({ selected, onSelect, todos }: TodoDayStripProps) => {
  const today = useMemo(() => new Date(), []);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - 3 + i);
        return d;
      }),
    [today],
  );

  const dueDaysWithTasks = useMemo(() => {
    const set = new Set<string>();
    for (const t of todos) {
      if (!t.dueDate || t.completed) continue;
      set.add(dateKey(new Date(t.dueDate)));
    }
    return set;
  }, [todos]);

  return (
    <div className="flex items-center justify-between gap-1 rounded-2xl bg-surface-hover/50 p-1.5 sm:p-2">
      {days.map((day) => {
        const isSelected = !!selected && isSameDay(day, selected);
        const isToday = isSameDay(day, today);
        const hasDue = dueDaysWithTasks.has(dateKey(day));

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelect(isSelected ? null : day)}
            aria-pressed={isSelected}
            aria-label={day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            className="group flex flex-1 flex-col items-center gap-1.5 py-1 cursor-pointer outline-none"
          >
            <span
              className={`text-[10px] font-display font-medium uppercase tracking-wide transition-colors ${
                isSelected ? 'text-primary-600' : 'text-text-light'
              }`}
            >
              {WEEKDAY[day.getDay()]}
            </span>
            <span
              className={`relative flex items-center justify-center size-8 sm:size-10 rounded-xl text-xs sm:text-sm font-display font-medium transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-sm shadow-primary-600/30 scale-105'
                  : isToday
                    ? 'text-primary-600 ring-1 ring-primary-300 group-hover:bg-surface-active/60'
                    : 'text-text group-hover:bg-surface-active/60'
              }`}
            >
              {day.getDate()}
              {hasDue && !isSelected && <span className="absolute -bottom-1 size-1.5 rounded-full bg-primary-500" />}
            </span>
          </button>
        );
      })}
    </div>
  );
};
