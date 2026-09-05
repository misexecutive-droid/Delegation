import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Todo } from '../../api/todos';
import { isSameDay, dateKey } from './todoDate';

interface TodoDayStripProps {
  selected: Date | null;
  onSelect: (date: Date | null) => void;
  todos: Todo[];
}

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const NAV_BUTTON_CLASS =
  'flex items-center justify-center size-9 shrink-0 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-all duration-200 ease-in-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

export const TodoDayStrip = ({ selected, onSelect, todos }: TodoDayStripProps) => {
  const today = useMemo(() => new Date(), []);
  // The strip was pinned to today-3…today+3 with no way to move it, so any todo due more than
  // three days out — which the create form happily accepts — could never be reached by this
  // filter. One week of offset per arrow press keeps the whole range navigable.
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - 3 + i + weekOffset * 7);
        return d;
      }),
    [today, weekOffset],
  );

  const dueDaysWithTasks = useMemo(() => {
    const set = new Set<string>();
    for (const t of todos) {
      if (!t.dueDate || t.completed) continue;
      set.add(dateKey(new Date(t.dueDate)));
    }
    return set;
  }, [todos]);

  // "Mar 2026", or "Feb – Mar 2026" when the visible week straddles a month boundary — without it
  // the bare day numbers are ambiguous as soon as you step away from the current week.
  const rangeLabel = useMemo(() => {
    const first = days[0];
    const last = days[days.length - 1];
    const month = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });
    if (first.getMonth() === last.getMonth()) return `${month(first)} ${first.getFullYear()}`;
    return first.getFullYear() === last.getFullYear()
      ? `${month(first)} – ${month(last)} ${last.getFullYear()}`
      : `${month(first)} ${first.getFullYear()} – ${month(last)} ${last.getFullYear()}`;
  }, [days]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week" className={NAV_BUTTON_CLASS}>
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-display font-semibold text-text-secondary tracking-tight truncate">
            {rangeLabel}
          </span>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="shrink-0 px-2 py-1 rounded-md text-[11px] font-display font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-500/10 transition-all duration-200 ease-in-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Today
            </button>
          )}
        </div>

        <button type="button" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week" className={NAV_BUTTON_CLASS}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
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
              // The dot is decorative, so what it means has to reach screen readers through the
              // label instead — otherwise "has work due" is conveyed by color/shape alone.
              aria-label={[
                day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
                isToday ? '(today)' : '',
                hasDue ? '— has tasks due' : '',
              ].filter(Boolean).join(' ')}
              className={`group flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-all duration-200 ease-in-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                isSelected ? 'bg-primary-600' : 'hover:bg-surface-hover'
              }`}
            >
              <span
                className={`text-[10px] font-display font-medium tracking-wide transition-colors duration-200 ${
                  isSelected ? 'text-white/80' : 'text-text-light'
                }`}
              >
                {WEEKDAY[day.getDay()]}
              </span>
              <span
                className={`flex items-center justify-center size-8 rounded-lg text-xs sm:text-sm font-display font-bold tabular-nums transition-all duration-200 ease-in-out ${
                  isSelected
                    ? 'text-white'
                    : isToday
                      ? 'text-primary-600 ring-1 ring-primary-300 group-hover:ring-primary-400'
                      : 'text-text'
                }`}
              >
                {day.getDate()}
              </span>
              {/* The due-work marker gets its own reserved row rather than being absolutely
                  positioned under the date. Overlaid, it sat outside the date circle and was clipped
                  by the strip's own padding at small sizes; a fixed-height row keeps every cell the
                  same height whether or not it has a dot. */}
              <span className="flex items-center justify-center h-1.5" aria-hidden="true">
                {hasDue && (
                  <span className={`size-1.5 rounded-full ${isSelected ? 'bg-white/70' : 'bg-primary-500'}`} />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
