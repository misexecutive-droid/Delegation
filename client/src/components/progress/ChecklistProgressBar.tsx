import { CheckSquare } from 'lucide-react';

interface ChecklistProgressBarProps {
  done: number;
  total: number;
  className?: string;
}

// Thin fill bar + "done/total" count — the one shared visual for "how much of this checklist is
// finished", used identically on Delegation and Ticket cards instead of each rendering its own
// version of the same idea.
export const ChecklistProgressBar = ({ done, total, className = '' }: ChecklistProgressBarProps) => {
  if (total === 0) return null;
  const percent = Math.round((done / total) * 100);
  const complete = done === total;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <CheckSquare size={12} className="text-text-light shrink-0" />
      <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${complete ? 'bg-success' : 'bg-primary-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-text-muted shrink-0">
        {done}/{total}
      </span>
    </div>
  );
};
