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
  const totalWindow = end - start;
  const percent = totalWindow > 0 ? Math.min(100, Math.max(0, Math.round(((now - start) / totalWindow) * 100))) : 100;
  const overdue = now > end;
  const warning = percent >= 80 && !overdue;

  // Semantic color mappings for track fill and typography
  const fillTone = overdue ? 'bg-red-500' : warning ? 'bg-amber-500' : 'bg-primary-500';
  const textTone = overdue ? 'text-red-600' : warning ? 'text-amber-600' : 'text-slate-500';
  const iconTone = overdue ? 'text-red-500' : warning ? 'text-amber-500' : 'text-slate-400';
  
  const label = overdue ? 'Overdue' : formatTimeLeft(end - now);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {overdue ? (
        <AlertCircle size={14} strokeWidth={2.5} className={cn("shrink-0 transition-colors duration-500", iconTone)} />
      ) : (
        <Clock size={14} strokeWidth={2.5} className={cn("shrink-0 transition-colors duration-500", iconTone)} />
      )}
      
      {/* Progress Track */}
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        {/* Progress Fill */}
        <div 
          className={cn("h-full rounded-full transition-all duration-500 ease-out", fillTone)} 
          style={{ width: `${percent}%` }} 
        />
      </div>
      
      {/* Time Label */}
      <span 
        className={cn(
          "text-[11px] font-bold tabular-nums tracking-wider shrink-0 transition-colors duration-500", 
          textTone,
          overdue && "uppercase" // Adds a bit more visual weight to the overdue state
        )}
      >
        {label}
      </span>
    </div>
  );
};