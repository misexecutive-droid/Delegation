import { CheckSquare } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChecklistProgressBarProps {
  done: number;
  total: number;
  className?: string;
}

export const ChecklistProgressBar = ({ done, total, className }: ChecklistProgressBarProps) => {
  if (total === 0) return null;
  const percent = Math.round((done / total) * 100);
  const complete = done === total && total > 0;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <CheckSquare
        size={14}
        strokeWidth={2.5}
        className={cn(
          "shrink-0 transition-colors duration-500",
          complete ? "text-success" : "text-text-light"
        )}
      />

      {/* Progress Track — theme token, not raw slate, so it stays soft/dull in dark mode instead
          of a fixed light-gray track sitting on a dark card. */}
      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
        {/* Progress Fill */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            complete ? 'bg-success' : 'bg-primary-500'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Ratio Counter */}
      <span
        className={cn(
          "text-[11px] font-bold tabular-nums tracking-wider shrink-0 transition-colors duration-500",
          complete ? "text-success" : "text-text-muted"
        )}
      >
        {done}/{total}
      </span>
    </div>
  );
};
