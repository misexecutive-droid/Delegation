import { useEffect, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { Button } from '../../components/button';
import { LightBeams } from '../../components/lightBeams';
import { greeting } from './dashboardDisplay';

// How often the date/time pill refreshes while the dashboard sits open in a tab — frequent enough
// that the displayed minute is never stale for long, without re-rendering every second for a
// display that only ever shows minute-level precision anyway.
const CLOCK_REFRESH_MS = 30_000;

interface DashboardHeaderProps {
  userName?: string;
  /** Opens the shared To-Do drawer — the trigger for it lives here on desktop (md and up); on
   *  mobile it's a floating action button instead (see HomePage), so this button is hidden there. */
  onOpenTodo: () => void;
}

export const DashboardHeader = ({ userName, onOpenTodo }: DashboardHeaderProps) => {
  // Was computed once per render with no way to trigger a re-render on its own — so once mounted,
  // this pill just froze at whatever time the dashboard happened to load, no matter how long the
  // tab stayed open or how much the user scrolled. Ticking it via its own interval keeps it live.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // Using 'short' for weekday saves critical horizontal space on small mobile screens
  const currentDate = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const currentTime = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    // lg:flex-row + lg:justify-between pushes the "New Todo" button all the way to the header's
    // right edge on large screens instead of it sitting cramped right next to the date pill —
    // below lg it stays in its original spot beside the pill.
    <div className="relative isolate overflow-hidden flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 mb-5 md:mb-8 pb-5 md:pb-6 border-b border-border/40">
      {/* Constrained to a short strip pinned to the header's top edge — LightBeams positions its
          beams at percentages of *this* box's height, not the full header, so they stay clear of
          the date pill and the greeting text below instead of one sweeping straight across it. */}
      <div className="absolute inset-x-0 top-0 h-12 -z-10 overflow-hidden pointer-events-none">
        <LightBeams />
      </div>

      <div className="flex flex-col gap-1.5 sm:gap-2.5 relative z-10 w-full sm:w-auto">
        {/* Eyebrow Date/Time Pill, with the "New Todo" action right beside it (up to lg — from lg
            up, that action moves to its own larger button on the far right instead). */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-surface-hover/80 border border-border/40 text-[10px] sm:text-[11px] font-bold text-text-muted w-fit backdrop-blur-md shadow-sm">
            <CalendarDays size={12} className="text-primary-500 dark:text-primary-400 sm:w-3.5 sm:h-3.5" />
            <span className="capitalize tracking-wide">{currentDate} · {currentTime}</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="group size-8 sm:size-9 rounded-full p-0 shrink-0 shadow-md hover:shadow-lg transition-all duration-300 hidden md:inline-flex lg:hidden"
            onClick={onOpenTodo}
            aria-label="New Todo"
            title="New Todo"
          >
            <Plus size={15} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
          </Button>
        </div>

        {/* Main Greeting - Responsive typography prevents awkward word-wrapping on phones */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-text tracking-tight leading-tight mt-0.5">
          {greeting()}
          {userName && (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400 dark:from-primary-400 dark:to-primary-300">
              , {userName}
            </span>
          )}
        </h1>
      </div>

      <Button
        variant="primary"
        size="sm"
        className="group hidden lg:inline-flex lg:size-14 rounded-full p-0 shrink-0 shadow-md hover:shadow-lg transition-all duration-300 relative z-10"
        onClick={onOpenTodo}
        aria-label="New Todo"
        title="New Todo"
      >
        <Plus size={22} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
      </Button>
    </div>
  );
};