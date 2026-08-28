import { useEffect, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { Button } from '../../components/button';
import { LightBeams } from '../../components/lightBeams';
import { greeting } from './dashboardDisplay';

const CLOCK_REFRESH_MS = 30_000;

interface DashboardHeaderProps {
  userName?: string;
  onOpenTodo: () => void;
}

export const DashboardHeader = ({ userName, onOpenTodo }: DashboardHeaderProps) => {

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const currentDate = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const currentTime = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
  
    <div className="relative isolate overflow-hidden flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-3 mb-2.5 md:mb-3 pb-2.5 md:pb-3 border-b border-border/40">

      <div className="absolute inset-x-0 top-0 h-8 -z-10 overflow-hidden pointer-events-none">
        <LightBeams />
      </div>

      <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 relative z-10 w-full sm:w-auto">
    
        <h1 className="text-base sm:text-lg font-display font-bold text-text tracking-tight leading-tight">
          {greeting()}
          {userName && (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400 dark:from-primary-400 dark:to-primary-300">
              , {userName}
            </span>
          )}
        </h1>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-hover/80 border border-border/40 text-[10px] sm:text-[11px] font-bold text-text-muted w-fit backdrop-blur-md shadow-sm shrink-0">
          <CalendarDays size={12} className="text-primary-500 dark:text-primary-400" />
          <span className="capitalize tracking-wide whitespace-nowrap">{currentDate} · {currentTime}</span>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="group size-8 rounded-full p-0 shrink-0 shadow-md hover:shadow-lg transition-all duration-300 hidden md:inline-flex lg:hidden ml-auto"
          onClick={onOpenTodo}
          aria-label="New Todo"
          title="New Todo"
        >
          <Plus size={15} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
        </Button>
      </div>

      <Button
        variant="primary"
        size="sm"
        className="group hidden lg:inline-flex lg:size-9 rounded-full p-0 shrink-0 shadow-md hover:shadow-lg transition-all duration-300 relative z-10"
        onClick={onOpenTodo}
        aria-label="New Todo"
        title="New Todo"
      >
        <Plus size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
      </Button>
    </div>
  );
};