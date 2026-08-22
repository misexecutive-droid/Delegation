import { CalendarDays, Plus } from 'lucide-react';
import { Button } from '../../components/button';
import { LightBeams } from '../../components/lightBeams';
import { greeting } from './dashboardDisplay';

interface DashboardHeaderProps {
  userName?: string;
  /** Opens the shared To-Do drawer — the trigger for it lives here on desktop (md and up); on
   *  mobile it's a floating action button instead (see HomePage), so this button is hidden there. */
  onOpenTodo: () => void;
}

export const DashboardHeader = ({ userName, onOpenTodo }: DashboardHeaderProps) => {
  // Using 'short' for weekday saves critical horizontal space on small mobile screens
  const now = new Date();
  const currentDate = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const currentTime = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="relative isolate overflow-hidden flex flex-col gap-4 sm:gap-6 mb-5 md:mb-8 pb-5 md:pb-6 border-b border-border/40">
      {/* Constrained to a short strip pinned to the header's top edge — LightBeams positions its
          beams at percentages of *this* box's height, not the full header, so they stay clear of
          the date pill and the greeting text below instead of one sweeping straight across it. */}
      <div className="absolute inset-x-0 top-0 h-12 -z-10 overflow-hidden pointer-events-none">
        <LightBeams />
      </div>

      <div className="flex flex-col gap-1.5 sm:gap-2.5 relative z-10 w-full sm:w-auto">
        {/* Eyebrow Date/Time Pill, with the "New Todo" action right beside it */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-surface-hover/80 border border-border/40 text-[10px] sm:text-[11px] font-bold text-text-muted w-fit backdrop-blur-md shadow-sm">
            <CalendarDays size={12} className="text-primary-500 dark:text-primary-400 sm:w-3.5 sm:h-3.5" />
            <span className="uppercase tracking-widest">{currentDate} · {currentTime}</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="group size-8 sm:size-9 rounded-full p-0 shrink-0 shadow-md hover:shadow-lg transition-all duration-300 hidden md:inline-flex"
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
    </div>
  );
};