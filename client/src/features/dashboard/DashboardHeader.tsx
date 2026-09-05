import { useEffect, useState } from 'react';
import { greeting } from './dashboardDisplay';

const CLOCK_REFRESH_MS = 30_000;

interface DashboardHeaderProps {
  userName?: string;
}

export const DashboardHeader = ({ userName }: DashboardHeaderProps) => {

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
    // Was a flex row with `justify-between` and a single child (so neither did anything), wrapped
    // in `isolate overflow-hidden` with nothing to clip, and spaced with mb-*/pb-* even though
    // HomePage's own `gap-6 lg:gap-8` already owns the space below it — a sibling-margin hack the
    // project's Tailwind conventions rule out.
    <header className="flex flex-row flex-wrap items-center gap-2 sm:gap-3">
      <h1 className="text-lg sm:text-xl font-display font-semibold text-text tracking-tight leading-tight">
        {greeting()}
        {userName && (
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400 dark:from-primary-400 dark:to-primary-300">
            , {userName}
          </span>
        )}
      </h1>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border/60 text-sm font-medium text-text-secondary w-fit">
        <span className="capitalize tracking-wide whitespace-nowrap">{currentDate}</span>
        <span className="size-1 rounded-full bg-border shrink-0" />
        <span className="tracking-wide whitespace-nowrap tabular-nums">{currentTime}</span>
      </div>
    </header>
  );
};