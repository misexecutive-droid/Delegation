import { Clock, AlertCircle } from 'lucide-react';

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

// Elapsed-time bar for items with a due date but no checklist to show progress against instead —
// how much of the created-to-due window has passed, rather than just a static due-date pill.
export const DueProgressBar = ({ createdAt, dueDate, className = '' }: DueProgressBarProps) => {
  const start = new Date(createdAt).getTime();
  const end = new Date(dueDate).getTime();
  const now = new Date().getTime();
  const totalWindow = end - start;
  const percent = totalWindow > 0 ? Math.min(100, Math.max(0, Math.round(((now - start) / totalWindow) * 100))) : 100;
  const overdue = now > end;

  const tone = overdue ? 'bg-danger' : percent >= 80 ? 'bg-warning' : 'bg-primary-500';
  const textTone = overdue ? 'text-danger' : percent >= 80 ? 'text-warning' : 'text-text-muted';
  const label = overdue ? 'Overdue' : formatTimeLeft(end - now);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {overdue ? (
        <AlertCircle size={12} className="text-danger shrink-0" />
      ) : (
        <Clock size={12} className="text-text-light shrink-0" />
      )}
      <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      <span className={`text-[10px] font-medium tabular-nums shrink-0 ${textTone}`}>{label}</span>
    </div>
  );
};
