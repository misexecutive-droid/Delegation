import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Modal } from '../modal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const isSameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatDate = (d: Date) => `${MONTH_LABELS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());

const buildMonthGrid = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) =>
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i),
  );
};

const QUICK_PICKS: { label: string; resolve: (today: Date) => Date }[] = [
  { label: 'Today', resolve: (today) => today },
  { label: 'Tomorrow', resolve: (today) => addDays(today, 1) },
  { label: 'Next week', resolve: (today) => addDays(today, 7) },
  { label: 'Next month', resolve: (today) => addMonths(today, 1) },
];

// Single-date sibling of DateRangePicker — same calendar visuals and same "opens as a real Modal"
// approach, but a single click selects and closes instead of requiring a from/to pair, which is
// what a plain due-date field actually needs.
export function DatePicker({
  value,
  onChange,
  placeholder = 'Select a date',
  className = '',
  triggerClassName = '',
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfDay(value ?? new Date()));

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const today = useMemo(() => startOfDay(new Date()), []);

  const selectDay = (day: Date) => {
    onChange(day);
    setOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setViewMonth(startOfDay(value ?? new Date()));
          setOpen(true);
        }}
        className={cn(
          'flex items-center gap-2 w-full h-10 px-3 rounded-md border bg-surface text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border',
          'border-border hover:border-primary-400',
          triggerClassName,
        )}
      >
        <CalendarIcon size={16} className="text-text-light shrink-0" />
        <span className={cn('truncate', value ? 'text-text font-semibold' : 'text-text-muted font-normal')}>
          {value ? formatDate(value) : placeholder}
        </span>
        {value && (
          <X
            size={14}
            className="ml-auto text-text-light hover:text-danger transition-colors shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          />
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} icon={<CalendarIcon className="w-5 h-5 text-primary-600" />} title="Select date" size="sm">
        {/* Quick Picks */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PICKS.map((pick) => {
            const target = startOfDay(pick.resolve(today));
            const isActive = isSameDay(value, target);
            return (
              <button
                key={pick.label}
                type="button"
                onClick={() => selectDay(target)}
                className={cn(
                  'px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors cursor-pointer',
                  isActive
                    ? 'bg-primary-700 border-primary-700 text-white'
                    : 'border-border text-text-secondary hover:border-primary-400 hover:text-primary-700',
                )}
              >
                {pick.label}
              </button>
            );
          })}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            className="w-8 h-8 rounded-md border border-border text-text-muted hover:bg-surface-hover flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-display font-bold uppercase tracking-wide text-primary-700">
            {MONTH_LABELS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </span>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="w-8 h-8 rounded-md border border-border text-text-muted hover:bg-surface-hover flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Days Grid Header */}
        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className="text-[10px] font-bold uppercase tracking-wide text-text-light text-center">
              {w}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-1">
          {grid.map((day) => {
            const inMonth = day.getMonth() === viewMonth.getMonth();
            const isSelected = isSameDay(day, value);
            const isToday = isSameDay(day, today);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => selectDay(day)}
                disabled={!inMonth}
                className={cn(
                  'relative h-9 text-xs rounded-md transition-colors font-semibold',
                  !inMonth ? 'text-text-light/40 cursor-default' : 'text-text-secondary cursor-pointer',
                  isSelected && 'bg-primary-700 text-white shadow-sm hover:bg-primary-800',
                  inMonth && !isSelected && 'hover:bg-surface-hover hover:text-primary-700',
                )}
              >
                {day.getDate()}
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary-500" />
                )}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
