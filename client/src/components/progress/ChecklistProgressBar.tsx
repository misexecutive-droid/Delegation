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
          complete ? "text-emerald-500" : "text-slate-400"
        )} 
      />
      
      {/* Progress Track */}
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        {/* Progress Fill */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            complete ? 'bg-emerald-500' : 'bg-primary-500'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      
      {/* Ratio Counter */}
      <span 
        className={cn(
          "text-[11px] font-bold tabular-nums tracking-wider shrink-0 transition-colors duration-500",
          complete ? "text-emerald-600" : "text-slate-500"
        )}
      >
        {done}/{total}
      </span>
    </div>
  );
};