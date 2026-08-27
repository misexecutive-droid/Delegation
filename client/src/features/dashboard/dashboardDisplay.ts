import type { TicketStatus } from '../../api/ticket';
import type { Task } from '../../api/task';

// Mirrors taskDisplay.tsx's STATUS_CONFIG badge classes exactly — the feed sits on the same
// dashboard as the KPI modal that already uses those tokens, so the same task's status color
// shouldn't disagree depending on which widget is showing it.
export const TASK_STATUS_COLORS: Record<Task['status'], string> = {
  todo: 'bg-status-todo/10 text-status-todo',
  in_progress: 'bg-status-progress/10 text-status-progress',
  pending_verification: 'bg-status-verify/10 text-status-verify',
  done: 'bg-status-done/10 text-status-done',
};

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export type FeedItem =
  | { kind: 'ticket'; id: string; title: string; status: TicketStatus; createdAt: string }
  | { kind: 'task'; id: string; title: string; status: Task['status']; createdAt: string };

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Last `count` calendar months ending with the current one, oldest first.
export const lastMonths = (count: number) => {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] };
  });
};

const isSameMonth = (isoDate: string, year: number, month: number) => {
  const d = new Date(isoDate);
  return d.getFullYear() === year && d.getMonth() === month;
};

export const countInMonth = (dates: string[], year: number, month: number) =>
  dates.filter(d => isSameMonth(d, year, month)).length;

// Per-month counts across a set of month buckets, e.g. for a stat card sparkline.
export const seriesInMonths = (dates: string[], months: { year: number; month: number }[]) =>
  months.map(m => countInMonth(dates, m.year, m.month));

export type Trend = { direction: 'up' | 'down'; label: string };

// Percent change from `previous` to `current`, expressed as a stat-card trend badge.
// No history to compare against yet (previous === 0) reads as flat, not a fabricated spike.
export const trendFrom = (current: number, previous: number): Trend => {
  if (previous === 0) {
    return { 
      direction: current > 0 ? 'up' : 'down', 
      label: current > 0 ? 'New' : '0%' 
    };
  }
  
  const pct = ((current - previous) / previous) * 100;
  return { 
    direction: pct >= 0 ? 'up' : 'down', 
    label: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` 
  };
};

// Difference between two already-percentage values (e.g. two months' completion rates) —
// a plain point delta, not a percent-of-a-percent, so "76% vs 72%" reads as "+4%" not "+5.6%".
export const pointDelta = (current: number, previous: number): Trend => {
  const diff = current - previous;
  return {
    direction: diff >= 0 ? 'up' : 'down',
    label: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`
  };
};

// Granularities the server's compliance-report aggregation already buckets by (see
// server/src/utils/dateBucket.ts) — "quarter" isn't one of them, since Mongo's $dateToString
// can't express a quarter directly, so it isn't offered here either.
export type CompliancePeriod = 'day' | 'week' | 'month' | 'year';

export const PERIOD_LABEL: Record<CompliancePeriod, string> = {
  day: 'today',
  week: 'this week',
  month: 'this month',
  year: 'this year',
};

export const PERIOD_END_LABEL: Record<CompliancePeriod, string> = {
  day: 'end of day',
  week: 'end of week',
  month: 'end of month',
  year: 'end of year',
};

const pad2 = (n: number) => String(n).padStart(2, '0');

// ISO 8601 week-year + week-number (Thursday of the week decides the week-year) — matches the
// same convention Mongo's `%G-%V` format uses server-side, so a client-computed "week" bucket
// key lines up exactly with the server-aggregated one instead of drifting near year boundaries.
const isoWeek = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const isoYear = date.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const week = 1 + Math.round(((date.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return { isoYear, week };
};

// Builds the exact same bucket key string the server's $dateToString grouping produces for
// this granularity, so a client-computed "current period" lookup actually finds its row.
export const bucketKeyFor = (period: CompliancePeriod, date: Date): string => {
  switch (period) {
    case 'day': return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    case 'week': { const { isoYear, week } = isoWeek(date); return `${isoYear}-W${pad2(week)}`; }
    case 'month': return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
    case 'year': return String(date.getFullYear());
  }
};

// Start of the current period (local time) — e.g. midnight today, the Monday of this week, the
// 1st of this month/year. Used to filter a plain list of records (not server-bucketed) down to
// "just this period" client-side.
export const periodStartDate = (period: CompliancePeriod, date: Date): Date => {
  const d = new Date(date);
  if (period === 'day') { d.setHours(0, 0, 0, 0); return d; }
  if (period === 'week') {
    const dayIndex = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
    d.setDate(d.getDate() - dayIndex);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  return new Date(d.getFullYear(), 0, 1);
};

// One period-length step back (or forward, with a negative amount) — used to find "the
// previous period" for a trend comparison, at whatever granularity is currently selected.
export const shiftPeriod = (period: CompliancePeriod, date: Date, amount: number): Date => {
  const d = new Date(date);
  if (period === 'day') d.setDate(d.getDate() + amount);
  else if (period === 'week') d.setDate(d.getDate() + amount * 7);
  else if (period === 'month') d.setMonth(d.getMonth() + amount);
  else d.setFullYear(d.getFullYear() + amount);
  return d;
};

// The Activity Overview chart buckets a plain client-side array (already-fetched tasks/tickets/
// todos), never a server aggregation — unlike CompliancePeriod above, there's no `$dateToString`
// constraint to respect here, so "quarter" is fine to offer as its own separate type rather than
// widening CompliancePeriod (which PersonChecklistView.tsx matches against real server buckets,
// and the server genuinely can't produce a quarter bucket).
export type ActivityGroupBy = 'day' | 'month' | 'quarter' | 'year';

export const ACTIVITY_GROUP_LABEL: Record<ActivityGroupBy, string> = {
  day: 'Day', month: 'Month', quarter: 'Quarter', year: 'Year',
};

export const ACTIVITY_GROUP_PERIOD_LABEL: Record<ActivityGroupBy, string> = {
  day: 'today', month: 'this month', quarter: 'this quarter', year: 'this year',
};

// How many trailing buckets the trend chart shows per granularity — e.g. the last 7 days, or the
// last 4 quarters (a full year), rather than one fixed count regardless of grain.
export const ACTIVITY_BUCKET_COUNT: Record<ActivityGroupBy, number> = {
  day: 7, month: 6, quarter: 4, year: 4,
};

export interface ActivityBucket {
  label: string;
  start: Date;
  end: Date;
}

const quarterStart = (year: number, quarter: number) => new Date(year, quarter * 3, 1);

// `count` trailing buckets of the given granularity, ending with the one containing `now` —
// oldest first, matching lastMonths()'s existing convention.
export const lastActivityBuckets = (groupBy: ActivityGroupBy, count: number, now = new Date()): ActivityBucket[] => {
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    if (groupBy === 'day') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      return { label: start.toLocaleDateString(undefined, { weekday: 'short' }), start, end };
    }
    if (groupBy === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      return { label: MONTH_LABELS[start.getMonth()], start, end };
    }
    if (groupBy === 'quarter') {
      const currentQuarterIndex = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) - offset;
      const year = Math.floor(currentQuarterIndex / 4);
      const quarter = ((currentQuarterIndex % 4) + 4) % 4;
      return { label: `Q${quarter + 1} '${String(year).slice(-2)}`, start: quarterStart(year, quarter), end: quarterStart(year, quarter + 1) };
    }
    const start = new Date(now.getFullYear() - offset, 0, 1);
    const end = new Date(start.getFullYear() + 1, 0, 1);
    return { label: String(start.getFullYear()), start, end };
  });
};

export const countInRange = (dates: string[], start: Date, end: Date) =>
  dates.filter(d => { const t = new Date(d).getTime(); return t >= start.getTime() && t < end.getTime(); }).length;