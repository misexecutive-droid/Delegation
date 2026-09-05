import { trendFrom, pointDelta, type Trend } from '../../dashboard';
import type { TatReportRow } from '../../../api/ticket';

type ReportRow = { bucket: string; [key: string]: unknown };

export const slaMetRate = (row?: TatReportRow) =>
  row && row.closedCount > 0 ? Math.round((1 - row.overdueCount / row.closedCount) * 100) : null;

const TREND_FN: Record<'rate' | 'count', (current: number, previous: number) => Trend> = {
  rate: pointDelta,
  count: trendFrom,
};

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
