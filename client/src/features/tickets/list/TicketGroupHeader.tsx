import { Building2, User } from 'lucide-react';

interface TicketGroupHeaderProps {
  label: string;
  groupBy: 'department' | 'assignee';
  ticketCount: number;
  stats: { total: number; done: number };
}

export const TicketGroupHeader = ({ label, groupBy, ticketCount, stats }: TicketGroupHeaderProps) => {
  const Icon = groupBy === 'department' ? Building2 : User;

  return (
    <div className="flex items-center justify-between px-1 pb-3 border-b-2 border-border/50 mb-1">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center p-1.5 rounded bg-surface-hover border border-border/60 shadow-sm">
          <Icon size={14} strokeWidth={2.5} className="text-text" />
        </div>
        <h3 className="text-sm font-display font-bold text-text tracking-wider">
          {label}
        </h3>
      </div>

      <div className="flex items-center gap-2.5">
        {stats.total > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-display font-bold px-2.5 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-700 dark:text-primary-300 shadow-sm">
            <span className="tabular-nums">{stats.done}/{stats.total}</span>
            <span className="opacity-80">tasks</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] font-display font-bold px-2.5 py-1 rounded-full bg-surface border border-border/80 text-text shadow-sm">
          <span className="tabular-nums">{ticketCount}</span>
          <span className="opacity-80">{ticketCount === 1 ? 'ticket' : 'tickets'}</span>
        </span>
      </div>
    </div>
  );
};
