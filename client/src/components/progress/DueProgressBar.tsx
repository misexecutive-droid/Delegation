import { Clock, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DueProgressBarProps {
  createdAt: string;
  dueDate: string;
  className?: string;
  /**
   * Overrides this component's own `now > dueDate` verdict.
   *
   * Tickets carry a server-computed `isOverdue`, and the two can disagree — a stale cache or a
   * skewed client clock is enough — which showed up as a card whose bar said "Overdue" while the
   * pill beside it was still neutral. Where a caller has an authoritative answer, it wins.
   */
  overdue?: boolean;
}

const formatTimeLeft = (ms: number) => {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m left`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h left`;
  return `${Math.round(hours / 24)}d left`;
};

export const DueProgressBar = ({ createdAt, dueDate, className, overdue: overdueProp }: DueProgressBarProps) => {
  const start = new Date(createdAt).getTime();
  const end = new Date(dueDate).getTime();
  const now = new Date().getTime();
  const overdue = overdueProp ?? now > end;

  // 1. Premium Overdue State (Matches the soft pastel UI)
  if (overdue) {
    return (
      <span 
        title="This item is past its due date"
        className={cn(
          "inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all duration-300",
          "bg-danger/10 text-danger border border-danger/20",
          className
        )}
      >
        <AlertCircle size={12} strokeWidth={2.5} className="shrink-0 animate-pulse" />
        Overdue
      </span>
    );
  }

  const totalWindow = end - start;
  const percent = totalWindow > 0 ? Math.min(100, Math.max(0, Math.round(((now - start) / totalWindow) * 100))) : 100;
  
  // 2. Multi-stage visual warnings
  const isDanger = percent >= 95;
  const isWarning = percent >= 80 && !isDanger;

  // 3. Dynamic soft color mapping
  const fillTone = isDanger ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-primary-500';
  const textTone = isDanger ? 'text-danger' : isWarning ? 'text-warning' : 'text-text-muted';
  const iconTone = isDanger ? 'text-danger' : isWarning ? 'text-warning' : 'text-primary-500/70';

  return (
    <div className={cn("flex items-center gap-2.5 w-full", className)}>
      <Clock 
        size={13} 
        strokeWidth={2.5} 
        className={cn("shrink-0 transition-colors duration-500", iconTone)} 
      />

      {/* Progress Track */}
      <div className="flex-1 h-1.5 bg-surface-hover/80 rounded-full overflow-hidden shadow-inner border border-border/40">
        {/* Progress Fill */}
        <div
          className={cn("h-full rounded-full transition-all duration-1000 ease-out relative", fillTone)}
          style={{ width: `${percent}%` }}
        >
          {/* Subtle glossy sheen on the leading edge of the progress bar */}
          <div className="absolute top-0 right-0 bottom-0 w-6 bg-gradient-to-r from-transparent to-white/40 rounded-full" />
        </div>
      </div>

      {/* Time Label */}
      <span className={cn(
        "text-[10px] sm:text-[11px] font-bold tabular-nums tracking-wide shrink-0 transition-colors duration-500 text-right min-w-[3.5rem]", 
        textTone
      )}>
        {formatTimeLeft(end - now)}
      </span>
    </div>
  );
};