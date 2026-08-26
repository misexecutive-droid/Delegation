import { trendFrom, pointDelta, type Trend } from '../../dashboard';
import type { TatReportRow } from '../../../api/ticket';

type ReportRow = { bucket: string; [key: string]: unknown };

// SLA-met % isn't a field the API returns directly — derive it from a TAT bucket's
// overdueCount/createdCount so "on-time completion" reads as a real on-time rate, not
// the close-rate throughput ratio TicketKpiSection uses for a different purpose. Shared by
// AnalyticsSummaryStrip and ComplianceGaugeRail so both read the exact same on-time number.
export const slaMetRate = (row?: TatReportRow) =>
  row && row.createdCount > 0 ? Math.round((1 - row.overdueCount / row.createdCount) * 100) : null;

// trendFrom expects a percent-change between two raw counts (e.g. ticket volume); pointDelta
// expects a plain point difference between two already-percentage values (e.g. two buckets'
// completion rates) — see dashboardDisplay.ts. Looked up by kind so callers don't have to know
// which math applies to which metric.
const TREND_FN: Record<'rate' | 'count', (current: number, previous: number) => Trend> = {
  rate: pointDelta,
  count: trendFrom,
};

// Latest-bucket value + trend vs. the bucket before it, for a StatCard. Falls back gracefully
// when there's no data yet, or only one bucket to show (nothing to compare against).
export const latestWithTrend = (
  rows: ReportRow[] | undefined,
  key: string,
  kind: 'rate' | 'count' = 'count',
): { value: number | null; trend: Trend } => {
  if (!rows || rows.length === 0) return { value: null, trend: { direction: 'up', label: '—' } };

  const latest = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : undefined;
  const value = (latest[key] as number | null | undefined) ?? null;

  if (value == null) return { value: null, trend: { direction: 'up', label: '—' } };

  const previousValue = previous?.[key] as number | null | undefined;
  if (previousValue == null) return { value, trend: { direction: 'up', label: 'New' } };

  return { value, trend: TREND_FN[kind](value, previousValue) };
};
