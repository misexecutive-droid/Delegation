import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

// Single-date sibling of DateRangePicker — same calendar visuals, but a single click selects and
// closes instead of requiring a from/to pair, which is what a plain due-date field actually needs.
//
// Renders the calendar inline (in normal document flow) right below the trigger, instead of as a
// floating/portalled popover. A floating panel lives outside the modal's own box, so opening it
// never changed the modal's size — it just overlaid whatever happened to be underneath, which is
// what caused it to cover the priority field/footer buttons, and kept the modal itself from
// recentering around the taller content. Inline, the calendar becomes part of the modal's actual
// height, so the surrounding Dialog (which centers itself via top:50%/translate(-50%)) recenters
// around it automatically, the body's own overflow-y-auto scrolls if it doesn't fit, and there is
// nothing left to overlap.
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
  const containerRef = useRef<HTMLDivElement>(null);

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const today = useMemo(() => startOfDay(new Date()), []);

  const selectDay = (day: Date) => {
    onChange(day);
    setOpen(false);
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (!open) setViewMonth(startOfDay(value ?? new Date()));
    setOpen((prev) => !prev);
  };

  // Click-outside + Escape to close, since this is no longer a Radix-managed popover that handled
  // that itself.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 w-full h-10 px-3 rounded-md border bg-surface text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border',
          open ? 'border-primary-500' : 'border-border hover:border-primary-400',
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

      {/* grid-rows-[0fr]→[1fr] is a CSS-only "animate to auto height" trick: the inner overflow-hidden
          wrapper gets clipped to the grid row's resolved size, which transitions smoothly instead of
          snapping the way a plain height:auto toggle would. */}
      <div className={cn('grid transition-[grid-template-rows] duration-300 ease-in-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="mt-2 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
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
          </div>
        </div>
      </div>
    </div>
  );
}