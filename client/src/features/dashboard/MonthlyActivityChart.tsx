import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { lastMonths, countInMonth } from './dashboardDisplay';
import type { Task } from '../../api/task';
import type { Ticket } from '../../api/ticket';

interface MonthlyActivityChartProps {
  tasks: Task[];
  tickets: Ticket[];
}

interface MonthlyDatum {
  month: string;
  isCurrent: boolean;
  delegations: number;
  tickets: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { payload: MonthlyDatum }[];
}

const ChartTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  const { month, delegations, tickets } = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/50 bg-surface/95 backdrop-blur-md px-4 py-3 shadow-lg flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-200">
      <p className="text-xs font-display font-medium text-text-muted capitalize tracking-wide">{month}</p>
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
    </div>
  );
};

// Six months of combined created-item volume, one bar per month — the current month is picked
// out in the solid brand color, the rest sit in a muted neutral, mirroring how a lot of analytics
// dashboards draw attention to "where we are right now" against recent history.
export const MonthlyActivityChart = ({ tasks, tickets }: MonthlyActivityChartProps) => {
  const data = useMemo<MonthlyDatum[]>(() => {
    const months = lastMonths(6);
    const currentIndex = months.length - 1;
    return months.map((m, i) => ({
      month: m.label,
      isCurrent: i === currentIndex,
      delegations: countInMonth(tasks.map((t) => t.createdAt), m.year, m.month),
      tickets: countInMonth(tickets.map((t) => t.createdAt), m.year, m.month),
    }));
  }, [tasks, tickets]);

  const hasData = data.some((d) => d.delegations + d.tickets > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-text-muted">
        No activity in the last 6 months yet.
      </div>
    );
  }

  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" strokeOpacity={0.6} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500 }}
            dy={10}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} width={30} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'var(--color-surface-hover)' }} content={<ChartTooltip />} />
          <Bar dataKey="delegations" stackId="stack" radius={[0, 0, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.month} fill={d.isCurrent ? 'var(--color-primary-600)' : 'var(--color-surface-hover)'} />
            ))}
          </Bar>
          <Bar dataKey="tickets" stackId="stack" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.month} fill={d.isCurrent ? 'var(--color-primary-400)' : 'var(--color-border)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};