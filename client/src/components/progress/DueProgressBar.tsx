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
}

const formatTimeLeft = (ms: number) => {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m left`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h left`;
  return `${Math.round(hours / 24)}d left`;
};

export const DueProgressBar = ({ createdAt, dueDate, className }: DueProgressBarProps) => {
  const start = new Date(createdAt).getTime();
  const end = new Date(dueDate).getTime();
  const now = new Date().getTime();
  const overdue = now > end;

  // Once a ticket is overdue there's no "window" left to show progress within, so a full solid
  // bar isn't informative — just loud. A whole board of overdue cards each showing a thick, fully-
  // filled red block (plus the card's own priority stripe) reads as noisy rather than useful, so
  // overdue collapses to the same small quiet chip used for the Status/Priority badges elsewhere
  // on the card instead of a bar.
  if (overdue) {
    return (
      <span className={cn("inline-flex items-center gap-1 self-start px-1.5 py-0.5 rounded text-[10px] font-medium bg-danger/10 text-danger", className)}>
        <AlertCircle size={11} className="shrink-0" />
        Overdue
      </span>
    );
  }

  const totalWindow = end - start;
  const percent = totalWindow > 0 ? Math.min(100, Math.max(0, Math.round(((now - start) / totalWindow) * 100))) : 100;
  const warning = percent >= 80;

  const fillTone = warning ? 'bg-warning' : 'bg-primary-500';
  const textTone = warning ? 'text-warning' : 'text-text-muted';
  const iconTone = warning ? 'text-warning' : 'text-text-light';

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Clock size={14} strokeWidth={2.5} className={cn("shrink-0 transition-colors duration-500", iconTone)} />

      {/* Progress Track */}
      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
        {/* Progress Fill */}
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", fillTone)}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Time Label */}
      <span className={cn("text-[11px] font-bold tabular-nums tracking-wider shrink-0 transition-colors duration-500", textTone)}>
        {formatTimeLeft(end - now)}
      </span>
    </div>
  );
};
