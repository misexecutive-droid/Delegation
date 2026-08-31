import { useId, useMemo } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isOverdueTodo } from '../todo/todoQuickFilters';
import {
  type CompliancePeriod,
  MONTH_LABELS,
  PERIOD_END_LABEL,
  periodStartDate,
  shiftPeriod,
  pointDelta,
} from './dashboardDisplay';
import { useMyChecklistInstancesQuery } from '../checklist/hook';
import { getChecklistProgress } from '../../lib/checklistProgress';
import type { Task } from '../../api/task';
import type { Ticket } from '../../api/ticket';
import type { Todo } from '../../api/todos';

interface CompareDashboardProps {
  tasks: Task[];
  tickets: Ticket[];
  todos: Todo[];
  period: CompliancePeriod;
  onPeriodChange: (period: CompliancePeriod) => void;
}

const PERIOD_OPTIONS: CompliancePeriod[] = ['day', 'week', 'month', 'year'];
const TREND_BUCKET_COUNT: Record<CompliancePeriod, number> = { day: 7, week: 8, month: 6, year: 4 };

interface WorkItem {
  createdAt: string;
  completed: boolean;
  overdue: boolean;
}

interface PeriodRates {
  completion: number | null;
  onTime: number | null;
  completedCount: number;
  total: number;
}

const rateFor = (items: WorkItem[]): PeriodRates => {
  const completedCount = items.filter((i) => i.completed).length;
  const overdueCount = items.filter((i) => i.overdue).length;
  return {
    completion: items.length ? Math.round((completedCount / items.length) * 100) : null,
    onTime: items.length ? Math.round(((items.length - overdueCount) / items.length) * 100) : null,
    completedCount,
    total: items.length,
  };
};

const bucketLabel = (period: CompliancePeriod, start: Date): string => {
  if (period === 'day') return start.toLocaleDateString(undefined, { weekday: 'short' });
  if (period === 'week') return start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (period === 'month') return MONTH_LABELS[start.getMonth()];
  return String(start.getFullYear());
};

// Trailing buckets of the selected granularity ending with the current one — reuses the same
// periodStartDate/shiftPeriod primitives MonthlyTargetCard's own period comparison already relies
// on, so "a week" or "a month" means the exact same thing in both places on this page.
const buildBuckets = (period: CompliancePeriod, count: number, now: Date) =>
  Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    const start = periodStartDate(period, shiftPeriod(period, now, -offset));
    const end = periodStartDate(period, shiftPeriod(period, now, -offset + 1));
    return { label: bucketLabel(period, start), start, end };
  });

interface SummaryChipProps {
  label: string;
  value: number | null;
  previous: number | null;
  dotClassName: string;
}

const SummaryChip = ({ label, value, previous, dotClassName }: SummaryChipProps) => {
  const delta = value != null && previous != null ? pointDelta(value, previous) : null;
  const TrendIcon = delta?.direction === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface-hover/60 border border-border/50">
      <span className={`size-2.5 rounded-full shrink-0 ${dotClassName}`} />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[11px] font-display font-medium text-text-muted whitespace-nowrap">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-base font-display font-bold text-text tabular-nums">{value != null ? `${value}%` : '—'}</span>
          {delta && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${delta.direction === 'up' ? 'text-success' : 'text-danger'}`}>
              <TrendIcon size={10} strokeWidth={3} />
              {delta.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const SoonChip = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface-hover/30 border border-dashed border-border/60">
    <span className="text-[11px] font-display font-medium text-text-light whitespace-nowrap">{label}</span>
    <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-wide bg-surface-hover text-text-light border border-border">
      Soon
    </span>
  </div>
);

interface ChartDatum {
  label: string;
  completion: number | null;
  onTime: number | null;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
}

const ChartTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  const { label, completion, onTime } = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/50 bg-surface/95 backdrop-blur-md px-4 py-3 shadow-lg flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-200">
      <p className="text-xs font-display  text-text-muted capitalize tracking-wide">{label}</p>
      <div className="flex items-center gap-2 text-sm">
        <span className="size-2 rounded-full shrink-0 bg-primary-500" />
        <span className="text-text-muted">Completion</span>
        <span className="font-display font-bold text-text ml-auto">{completion != null ? `${completion}%` : '—'}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="size-2 rounded-full shrink-0 bg-coral-500" />
        <span className="text-text-muted">On-time</span>
        <span className="font-display font-bold text-text ml-auto">{onTime != null ? `${onTime}%` : '—'}</span>
      </div>
    </div>
  );
};


export const CompareDashboard = ({ tasks, tickets, todos, period, onPeriodChange }: CompareDashboardProps) => {
  const gradientId = useId();
  const { data: checklistInstances = [] } = useMyChecklistInstancesQuery();
  const { progress: checklistCompliance } = getChecklistProgress(checklistInstances);

  const { chartData, current, previous, projection } = useMemo(() => {
    const now = new Date().getTime();
    const nowDate = new Date(now);

    const items: WorkItem[] = [
      ...tasks.map((t) => ({
        createdAt: t.createdAt,
        completed: t.status === 'done',
        overdue: t.status !== 'done' && !!t.dueDate && new Date(t.dueDate).getTime() < now,
      })),
      ...tickets.map((t) => ({ createdAt: t.createdAt, completed: t.status === 'CLOSED', overdue: t.isOverdue })),
      ...todos.map((t) => ({ createdAt: t.createdAt, completed: t.completed, overdue: isOverdueTodo(t) })),
    ];

    const inRange = (start: Date, end: Date) =>
      items.filter((i) => {
        const t = new Date(i.createdAt).getTime();
        return t >= start.getTime() && t < end.getTime();
      });

    const buckets = buildBuckets(period, TREND_BUCKET_COUNT[period], nowDate);
    const bucketRates = buckets.map((b) => rateFor(inRange(b.start, b.end)));
    const data: ChartDatum[] = buckets.map((b, i) => ({
      label: b.label,
      completion: bucketRates[i].completion,
      onTime: bucketRates[i].onTime,
    }));

    const currentRates = bucketRates[bucketRates.length - 1];
    const previousRates = bucketRates[bucketRates.length - 2] ?? rateFor([]);

    const currentStart = buckets[buckets.length - 1].start;
    const currentEnd = buckets[buckets.length - 1].end;

    const elapsedFraction = Math.min(1, Math.max(0.02, (now - currentStart.getTime()) / (currentEnd.getTime() - currentStart.getTime())));
    const projectedCompleted =
      currentRates.total > 0 && elapsedFraction < 0.98 ? Math.round(currentRates.completedCount / elapsedFraction) : null;

    return { chartData: data, current: currentRates, previous: previousRates, projection: projectedCompleted };
  }, [tasks, tickets, todos, period]);

  const hasData = chartData.some((d) => d.completion != null || d.onTime != null);

  return (
    <div className="@container rounded-2xl border border-border/60 dark:border-white/[0.06] bg-surface p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-800/50 text-primary-600 dark:text-primary-400 shadow-sm">
            <TrendingUp size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text tracking-tight leading-tight">Compare Dashboard</h3>
            <p className="text-xs font-medium text-text-muted mt-0.5 capitalize">trend by {period}</p>
          </div>
        </div>

        <Tabs value={period} onValueChange={(v) => onPeriodChange(v as CompliancePeriod)}>
          <TabsList>
            {PERIOD_OPTIONS.map((p) => (
              <TabsTrigger key={p} value={p} className="capitalize">
                {p}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 @sm:grid-cols-4 gap-2 mb-4">
        <SummaryChip label="Completion" value={current.completion} previous={previous.completion} dotClassName="bg-primary-500" />
        <SummaryChip label="On-time" value={current.onTime} previous={previous.onTime} dotClassName="bg-coral-500" />
        <SoonChip label="Quality Rate" />
        <SummaryChip label="Checklist" value={checklistCompliance} previous={null} dotClassName="bg-emerald-500" />
      </div>

      {hasData ? (
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`compFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`onTimeFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-coral-500)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-coral-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={0}
                padding={{ left: 16, right: 16 }}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500 }}
                dy={10}
              />
              <Tooltip cursor={{ stroke: 'var(--color-border-hover)' }} content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="completion"
                stroke="var(--color-primary-500)"
                strokeWidth={2.5}
                fill={`url(#compFill-${gradientId})`}
                connectNulls
                dot={{ r: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
              />
              <Area
                type="monotone"
                dataKey="onTime"
                stroke="var(--color-coral-500)"
                strokeWidth={2.5}
                fill={`url(#onTimeFill-${gradientId})`}
                connectNulls
                dot={{ r: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-[220px] text-sm text-text-muted">No activity in this range yet.</div>
      )}

      {projection != null && (
        <div className="flex items-center gap-2 mt-4 px-3.5 py-2.5 rounded-xl bg-primary-500/5 border border-primary-500/10 text-xs font-display font-medium text-text-secondary">
          <Sparkles size={14} className="text-primary-500 shrink-0" />
          <span>
            At this pace, you're on track for <span className="font-bold text-text">~{projection}</span> completed by {PERIOD_END_LABEL[period]}.
          </span>
        </div>
      )}
    </div>
  );
};
