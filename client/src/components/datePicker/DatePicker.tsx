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
  /** Adds a time-of-day input below the calendar (only once a date is picked), same pattern as
   *  DateRangePicker's `showTime` — for a single due-date-and-time field instead of a range. */
  showTime?: boolean;
  /** Earliest selectable day — days before this are rendered disabled rather than removed, so the
   *  month grid still reads normally. */
  minDate?: Date;
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
const formatTime = (d: Date) => {
  const h24 = d.getHours();
  const period = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${hour12}:${String(d.getMinutes()).padStart(2, '0')} ${period}`;
};

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

// Clock-face time dial — a watch-style circle with every value marked around it, instead of
// stepper arrows that need repeated clicks to travel any distance. Hour marks run 12,1,2…11
// clockwise from the top (index 0 = 12 o'clock position); minute marks run 0,5,10…55 the same way.
const HOUR_MARKS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_MARKS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const DIAL_SIZE = 176;
const DIAL_RADIUS = 72;
const DIAL_CENTER = DIAL_SIZE / 2;

const dialMarkPosition = (index: number) => {
  const angle = (index / 12) * 2 * Math.PI - Math.PI / 2;
  return {
    left: DIAL_CENTER + DIAL_RADIUS * Math.cos(angle),
    top: DIAL_CENTER + DIAL_RADIUS * Math.sin(angle),
  };
};

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
  showTime = false,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfDay(value ?? new Date()));
  // Which dial is showing — hour marks or minute marks. Picking an hour auto-advances to the
  // minute dial (same flow as Material's clock time picker), since both a hour and a minute are
  // needed and doing it in two focused steps beats cramming 24 targets onto one dial.
  const [dialMode, setDialMode] = useState<'hour' | 'minute'>('hour');
  const containerRef = useRef<HTMLDivElement>(null);

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const earliestDay = minDate ? startOfDay(minDate) : null;

  const selectDay = (day: Date) => {
    // Preserve whatever time-of-day was already picked; only the very first pick has no prior
    // value to carry forward, so it seeds from the actual current clock time instead of
    // snapping to midnight — a stray "12:00 AM" default reads as if a time had been deliberately
    // chosen, when nobody has touched the time controls yet.
    const now = new Date();
    const withTime = showTime
      ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), value ? value.getHours() : now.getHours(), value ? value.getMinutes() : now.getMinutes())
      : day;
    onChange(withTime);
    if (!showTime) setOpen(false);
  };

  // Clock-face dial instead of a native <input type="time"> — the native control renders as the
  // browser/OS's own widget (a totally different visual language, and one that doesn't reliably
  // theme for dark mode), which reads as a bolted-on second field rather than part of this
  // component. A tap on the dial jumps straight to that value instead of stepping one unit per
  // click.
  const selectHour = (hour12: number) => {
    if (!value) return;
    const isPM = value.getHours() >= 12;
    const next = new Date(value);
    next.setHours((hour12 % 12) + (isPM ? 12 : 0));
    onChange(next);
    setDialMode('minute');
  };

  const selectMinute = (minute: number) => {
    if (!value) return;
    const next = new Date(value);
    next.setMinutes(minute);
    onChange(next);
  };

  const setPeriod = (period: 'AM' | 'PM') => {
    if (!value) return;
    const h = value.getHours();
    const isPM = h >= 12;
    if ((period === 'PM') === isPM) return;
    const next = new Date(value);
    next.setHours(period === 'PM' ? h + 12 : h - 12);
    onChange(next);
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (!open) {
      setViewMonth(startOfDay(value ?? new Date()));
      setDialMode('hour');
    }
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

  // Expanding inline (instead of a floating popover) means the calendar grows the modal's own
  // scroll content — but the modal's scroll position itself never moves, so opening the field
  // near the bottom of the visible area left the newly-expanded grid sitting below the fold with
  // no indication anything happened. Scroll it into view once it's actually done expanding (the
  // grid-rows height transition is 300ms — scrolling any earlier targets the still-collapsed,
  // near-zero height and undershoots).
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 320);
    return () => clearTimeout(timer);
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
        <span className={cn('truncate', value ? 'text-text font-medium' : 'text-text-muted font-medium')}>
          {value ? formatDate(value) + (showTime ? ` ${formatTime(value)}` : '') : placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            className="ml-auto text-text-light hover:text-danger transition-colors shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onChange(null);
              }
            }}
          >
            <X size={14} />
          </span>
        )}
      </button>

      {/* grid-rows-[0fr]→[1fr] is a CSS-only "animate to auto height" trick: the inner overflow-hidden
          wrapper gets clipped to the grid row's resolved size, which transitions smoothly instead of
          snapping the way a plain height:auto toggle would. */}
      <div className={cn('grid transition-[grid-template-rows] duration-300 ease-in-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          {/* No own border/shadow/bg-surface card here — the parent field is already bg-surface,
              so a nested bordered-and-shadowed box on top of it looked like a separate panel
              floating over the modal instead of a natural continuation of the field below it. A
              plain top divider keeps it feeling like part of the same field. */}
          <div className="mt-3 pt-3 flex flex-col gap-2.5 border-t border-border/60">
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
                      'px-2 py-0.5 rounded-full border text-[10px] font-bold transition-colors cursor-pointer',
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
                className="w-6 h-6 rounded-md border border-border text-text-muted hover:bg-surface-hover flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-display font-bold text-text">
                {MONTH_LABELS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="w-6 h-6 rounded-md border border-border text-text-muted hover:bg-surface-hover flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Days Grid Header */}
            <div className="grid grid-cols-7">
              {WEEKDAY_LABELS.map((w) => (
                <span key={w} className="text-[10px] font-bold text-text-light text-center">
                  {w}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-0.5 gap-x-0.5">
              {grid.map((day) => {
                const inMonth = day.getMonth() === viewMonth.getMonth();
                const isBeforeMin = !!earliestDay && day < earliestDay;
                const isSelected = isSameDay(day, value);
                const isToday = isSameDay(day, today);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => selectDay(day)}
                    disabled={!inMonth || isBeforeMin}
                    className={cn(
                      // rounded-full (not rounded-md) — a filled square block for one day can read
                      // as a range highlight; a circular mark is the more standard "single day
                      // selected" affordance (Google/Apple Calendar) and avoids that ambiguity.
                      'relative h-7 text-xs rounded-full transition-colors font-medium',
                      (!inMonth || isBeforeMin) ? 'text-text-light/40 cursor-default' : 'text-text-secondary cursor-pointer',
                      isSelected && 'bg-primary-700 text-white shadow-sm hover:bg-primary-800',
                      // Today gets its own outlined-circle treatment (filled = selected, outlined =
                      // today), same convention as Google/Apple Calendar — the old bottom-edge dot
                      // was too subtle to register as "this is today" at a glance.
                      isToday && !isSelected && 'ring-1 ring-inset ring-primary-400 text-primary-600 font-bold',
                      inMonth && !isBeforeMin && !isSelected && 'hover:bg-surface-hover hover:text-primary-700',
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            {showTime && value && (() => {
              const h24 = value.getHours();
              const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
              const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
              const minute = value.getMinutes();
              // Continuous angle (not snapped to the nearest mark) so the hand still points to
              // roughly the right spot for a value that didn't come from clicking a mark — e.g.
              // an existing ticket loaded with a minute that isn't a multiple of 5.
              const handAngleDeg = dialMode === 'hour' ? (hour12 % 12) * 30 : (minute / 60) * 360;

              return (
                <div className="flex flex-col gap-2 pt-2.5 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-muted">Time</label>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDialMode('hour')}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-base font-display font-bold tabular-nums transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                          dialMode === 'hour' ? 'bg-primary-500/10 text-primary-600' : 'text-text hover:bg-surface-hover',
                        )}
                      >
                        {String(hour12).padStart(2, '0')}
                      </button>
                      <span className="text-base font-bold text-text-secondary">:</span>
                      <button
                        type="button"
                        onClick={() => setDialMode('minute')}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-base font-display font-bold tabular-nums transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                          dialMode === 'minute' ? 'bg-primary-500/10 text-primary-600' : 'text-text hover:bg-surface-hover',
                        )}
                      >
                        {String(minute).padStart(2, '0')}
                      </button>

                      <div className="flex rounded-md border border-border overflow-hidden ml-2">
                        <button
                          type="button"
                          onClick={() => setPeriod('AM')}
                          aria-pressed={period === 'AM'}
                          className={cn(
                            'px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/50',
                            period === 'AM' ? 'bg-primary-600 text-white' : 'bg-surface text-text-muted hover:bg-surface-hover',
                          )}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          onClick={() => setPeriod('PM')}
                          aria-pressed={period === 'PM'}
                          className={cn(
                            'px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer border-l border-border outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/50',
                            period === 'PM' ? 'bg-primary-600 text-white' : 'bg-surface text-text-muted hover:bg-surface-hover',
                          )}
                        >
                          PM
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Watch-face dial — every value is a tap target arranged around the circle,
                      instead of stepping through them one at a time. */}
                  <div className="relative mx-auto shrink-0" style={{ width: DIAL_SIZE, height: DIAL_SIZE }}>
                    <div className="absolute inset-0 rounded-full bg-surface-hover/60 border border-border/60" />

                    {/* Hand, pointing from center to the current value's angle */}
                    <div
                      className="absolute bg-primary-500/60 rounded-full pointer-events-none"
                      style={{
                        width: 2,
                        height: DIAL_RADIUS - 6,
                        left: DIAL_CENTER - 1,
                        top: DIAL_CENTER - (DIAL_RADIUS - 6),
                        transform: `rotate(${handAngleDeg}deg)`,
                        transformOrigin: `1px ${DIAL_RADIUS - 6}px`,
                      }}
                    />
                    <div className="absolute size-1.5 rounded-full bg-primary-600 pointer-events-none" style={{ left: DIAL_CENTER - 3, top: DIAL_CENTER - 3 }} />

                    {(dialMode === 'hour' ? HOUR_MARKS : MINUTE_MARKS).map((markValue, i) => {
                      const pos = dialMarkPosition(i);
                      const isActive = dialMode === 'hour' ? markValue === hour12 : markValue === minute;
                      return (
                        <button
                          key={markValue}
                          type="button"
                          onClick={() => (dialMode === 'hour' ? selectHour(markValue) : selectMinute(markValue))}
                          aria-label={dialMode === 'hour' ? `${markValue} o'clock` : `${markValue} minutes`}
                          aria-pressed={isActive}
                          className={cn(
                            'absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full text-[11px] font-display font-bold transition-colors cursor-pointer flex items-center justify-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
                            isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-text-secondary hover:bg-surface-active',
                          )}
                          style={{ left: pos.left, top: pos.top }}
                        >
                          {dialMode === 'minute' ? String(markValue).padStart(2, '0') : markValue}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
