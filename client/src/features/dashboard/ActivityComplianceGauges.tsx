import { useMemo } from 'react';
import { ClipboardCheck, ShieldCheck, type LucideIcon } from 'lucide-react';
import { RadialGauge } from '../../components';
import { isOverdueTodo } from '../todo/todoQuickFilters';
import { lastActivityBuckets, ACTIVITY_GROUP_PERIOD_LABEL, type ActivityGroupBy } from './dashboardDisplay';
import type { Task } from '../../api/task';
import type { Ticket } from '../../api/ticket';
import type { Todo } from '../../api/todos';

interface ActivityComplianceGaugesProps {
  tasks: Task[];
  tickets: Ticket[];
  todos: Todo[];
  /** Scopes the gauges to the current bucket of this granularity — same selector the trend chart
   *  above uses, so switching Day/Month/Quarter/Year moves both together. */
  groupBy: ActivityGroupBy;
}

interface GaugeProps {
  icon: LucideIcon;
  label: string;
  percent: number | null;
}

// Same single-color arc gauge as the admin's own ComplianceGaugeRail — a clean percent-of-100
// readout instead of a multi-color pie slicing up the same number three ways.
const Gauge = ({ icon: Icon, label, percent }: GaugeProps) => (
  <div className="flex flex-col items-center gap-2 flex-1">
    <RadialGauge percent={percent ?? 0} size={140}>
      <span className="text-xl font-bold text-text tracking-tight">
        {percent != null ? `${percent}%` : '—'}
      </span>
    </RadialGauge>
    <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
      <Icon size={13} />
      {label}
    </span>
  </div>
);

// "Where do things stand right now" for the whole workload (delegations + tickets + todos
// combined) — Completion (done vs total) and On-time (not currently overdue vs total) — mirroring
// the admin overview's own Compliance rail rather than a colorful pie chart. Scoped to items
// created within the current bucket of `groupBy` (today / this month / this quarter / this year),
// matching the trend chart's own granularity selector instead of always covering all-time.
export const ActivityComplianceGauges = ({ tasks, tickets, todos, groupBy }: ActivityComplianceGaugesProps) => {
  const { completionRate, onTimeRate } = useMemo(() => {
    const now = new Date().getTime();
    const [currentBucket] = lastActivityBuckets(groupBy, 1);
    const start = currentBucket.start.getTime();
    const end = currentBucket.end.getTime();
    const inBucket = (createdAt: string) => {
      const t = new Date(createdAt).getTime();
      return t >= start && t < end;
    };

    const scopedTasks = tasks.filter((t) => inBucket(t.createdAt));
    const scopedTickets = tickets.filter((t) => inBucket(t.createdAt));
    const scopedTodos = todos.filter((t) => inBucket(t.createdAt));

    const completed = scopedTasks.filter((t) => t.status === 'done').length
      + scopedTickets.filter((t) => t.status === 'CLOSED').length
      + scopedTodos.filter((t) => t.completed).length;

    const overdue = scopedTasks.filter((t) => t.status !== 'done' && !!t.dueDate && new Date(t.dueDate).getTime() < now).length
      + scopedTickets.filter((t) => t.isOverdue).length
      + scopedTodos.filter(isOverdueTodo).length;

    const total = scopedTasks.length + scopedTickets.length + scopedTodos.length;

    return {
      completionRate: total > 0 ? Math.round((completed / total) * 100) : null,
      onTimeRate: total > 0 ? Math.round(((total - overdue) / total) * 100) : null,
    };
  }, [tasks, tickets, todos, groupBy]);

  return (
    <div className="flex flex-col items-center gap-4 w-full sm:border-l sm:border-border/60 sm:pl-6">
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs font-display font-bold text-text-muted">Compliance</span>
        <span className="text-[10px] font-display font-medium text-text-light capitalize">{ACTIVITY_GROUP_PERIOD_LABEL[groupBy]}</span>
      </div>
      <div className="flex items-center justify-evenly gap-4 w-full max-w-sm">
        <Gauge icon={ClipboardCheck} label="Completion" percent={completionRate} />
        <Gauge icon={ShieldCheck} label="On-time" percent={onTimeRate} />
      </div>
    </div>
  );
};
