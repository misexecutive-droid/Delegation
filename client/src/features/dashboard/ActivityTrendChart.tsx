import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, Cell } from 'recharts';
import { lastActivityBuckets, countInRange, ACTIVITY_BUCKET_COUNT, type ActivityGroupBy } from './dashboardDisplay';
import type { Task } from '../../api/task';
import type { Ticket } from '../../api/ticket';
import type { Todo } from '../../api/todos';

interface ActivityTrendChartProps {
  tasks: Task[];
  tickets: Ticket[];
  todos: Todo[];
  groupBy: ActivityGroupBy;
}

interface ActivityDatum {
  label: string;
  isCurrent: boolean;
  delegations: number;
  tickets: number;
  todos: number;
  /** Only nonzero on the current (still-in-progress) bucket — the straight-line pace projection
   *  for the rest of that bucket, stacked on top as a visually distinct "not real yet" segment. */
  projected: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { payload: ActivityDatum }[];
}

const BAR_WIDTH = 28;

interface NarrowCursorProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

// recharts' default BarChart tooltip cursor highlights the whole category band (the full slot a
// bar sits in, including its share of barCategoryGap) — with bars capped at BAR_WIDTH via
// maxBarSize, that band is much wider than the bar itself, so the hover highlight looked like a
// big rectangle sitting well past the thin bar it belongs to. Drawing our own narrow rect
// centered in that same band keeps the highlight sized to match the actual bar.
const NarrowCursor = ({ x = 0, y = 0, width = 0, height = 0 }: NarrowCursorProps) => (
  <rect x={x + width / 2 - BAR_WIDTH / 2} y={y} width={BAR_WIDTH} height={height} rx={6} fill="var(--color-surface-hover)" />
);

const LEGEND_ITEMS = [
  { key: 'delegations', label: 'Delegations', dotClassName: 'bg-primary-600' },
  { key: 'tickets', label: 'Tickets', dotClassName: 'bg-info' },
  { key: 'todos', label: 'Todo', dotClassName: 'bg-primary-200' },
] as const;

const ChartTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  const { label, delegations, tickets, todos, projected } = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/50 bg-surface/95 backdrop-blur-md px-4 py-3 shadow-lg flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-200">
      <p className="text-xs font-display font-medium text-text-muted capitalize tracking-wide">{label}</p>
      <div className="flex items-center gap-2 text-sm">
        <span className="size-2 rounded-full shrink-0 bg-primary-500" />
        <span className="text-text-muted">Delegations</span>
        <span className="font-display font-bold text-text ml-auto">{delegations}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="size-2 rounded-full shrink-0 bg-info" />
        <span className="text-text-muted">Tickets</span>
        <span className="font-display font-bold text-text ml-auto">{tickets}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="size-2 rounded-full shrink-0 bg-primary-200" />
        <span className="text-text-muted">Todo</span>
        <span className="font-display font-bold text-text ml-auto">{todos}</span>
      </div>
      {projected > 0 && (
        <div className="flex items-center gap-2 text-sm pt-1.5 mt-0.5 border-t border-border/50">
          <span className="size-2 rounded-full shrink-0 bg-primary-300" />
          <span className="text-text-muted">Projected (rest of period)</span>
          <span className="font-display font-bold text-primary-500 ml-auto">+{projected}</span>
        </div>
      )}
    </div>
  );
};

// One combined created-item volume series — delegations, tickets and todo items stacked into a
// single bar per bucket — re-bucketed by day/month/quarter/year depending on `groupBy`, so this
// is the one "master" activity chart rather than three separate per-domain charts. The current
// (still in-progress) bucket also gets a dashed "projected" cap — a plain pace projection, same
// spirit as Compare Dashboard's, extrapolated from how far into that bucket we already are.
export const ActivityTrendChart = ({ tasks, tickets, todos, groupBy }: ActivityTrendChartProps) => {
  const data = useMemo<ActivityDatum[]>(() => {
    const buckets = lastActivityBuckets(groupBy, ACTIVITY_BUCKET_COUNT[groupBy]);
    const currentIndex = buckets.length - 1;
    const now = new Date().getTime();

    return buckets.map((b, i) => {
      const delegations = countInRange(tasks.map((t) => t.createdAt), b.start, b.end);
      const tickets_ = countInRange(tickets.map((t) => t.createdAt), b.start, b.end);
      const todos_ = countInRange(todos.map((t) => t.createdAt), b.start, b.end);
      const actual = delegations + tickets_ + todos_;

      let projected = 0;
      if (i === currentIndex) {
        const elapsedFraction = Math.min(1, Math.max(0.02, (now - b.start.getTime()) / (b.end.getTime() - b.start.getTime())));
        if (actual > 0 && elapsedFraction < 0.98) {
          projected = Math.round(actual / elapsedFraction) - actual;
        }
      }

      return { label: b.label, isCurrent: i === currentIndex, delegations, tickets: tickets_, todos: todos_, projected };
    });
  }, [tasks, tickets, todos, groupBy]);

  const hasData = data.some((d) => d.delegations + d.tickets + d.todos > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-text-muted">
        No activity in this period yet.
      </div>
    );
  }

  const hasProjection = data.some((d) => d.projected > 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {LEGEND_ITEMS.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5 text-xs font-display font-medium text-text-secondary">
            <span className={`size-2 rounded-full shrink-0 ${item.dotClassName}`} />
            {item.label}
          </span>
        ))}
        {hasProjection && (
          <span className="flex items-center gap-1.5 text-xs font-display font-medium text-text-secondary">
            <span className="inline-block size-2 rounded-full bg-primary-300" />
            Projected
          </span>
        )}
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="40%">
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500 }}
              dy={10}
            />
            <Tooltip cursor={<NarrowCursor />} content={<ChartTooltip />} />
            <Bar dataKey="delegations" stackId="stack" radius={[0, 0, 0, 0]} maxBarSize={BAR_WIDTH}>
              {data.map((d) => (
                <Cell key={d.label} fill="var(--color-primary-600)" fillOpacity={d.isCurrent ? 1 : 0.3} />
              ))}
            </Bar>
            <Bar dataKey="tickets" stackId="stack" radius={[0, 0, 0, 0]} maxBarSize={BAR_WIDTH}>
              {data.map((d) => (
                <Cell key={d.label} fill="var(--color-primary-400)" fillOpacity={d.isCurrent ? 1 : 0.3} />
              ))}
            </Bar>
            <Bar dataKey="todos" stackId="stack" radius={[0, 0, 0, 0]} maxBarSize={BAR_WIDTH}>
              {data.map((d) => (
                <Cell key={d.label} fill="var(--color-primary-200)" fillOpacity={d.isCurrent ? 1 : 0.3} />
              ))}
            </Bar>
            {/* Lower-opacity cap — visually reads as "projected, not real" against the solid
                bars beneath it, only ever present on the current in-progress bucket. */}
            <Bar
              dataKey="projected"
              stackId="stack"
              radius={[6, 6, 0, 0]}
              maxBarSize={BAR_WIDTH}
              fill="var(--color-primary-300)"
              fillOpacity={0.35}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
