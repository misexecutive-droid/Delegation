import { ClipboardCheck, ShieldCheck, AlertTriangle, Camera } from 'lucide-react';
import { StatCard, pointDelta } from '../../dashboard';
import { useTaskComplianceReportQuery, useTicketTatReportQuery, useChecklistInstanceComplianceReportQuery } from './useAnalyticsQueries';
import { latestWithTrend, slaMetRate } from './analyticsDisplay';
import type { GroupBy } from './GroupByControl';

interface AnalyticsSummaryStripProps {
  groupBy: GroupBy;
  from?: string;
  to?: string;
}

export const AnalyticsSummaryStrip = ({ groupBy, from, to }: AnalyticsSummaryStripProps) => {
  const { data: taskRows } = useTaskComplianceReportQuery(groupBy, from, to);
  const { data: ticketRows } = useTicketTatReportQuery(groupBy, from, to);
  const { data: instanceRows } = useChecklistInstanceComplianceReportQuery(groupBy, from, to);

  const checklistCompletion = latestWithTrend(taskRows, 'completionRate', 'rate');
  const overdue = latestWithTrend(ticketRows, 'overdueCount', 'count');

  const latestTicket = ticketRows?.[ticketRows.length - 1];
  const previousTicket = ticketRows && ticketRows.length > 1 ? ticketRows[ticketRows.length - 2] : undefined;
  const slaMetValue = slaMetRate(latestTicket);
  const previousSlaMet = slaMetRate(previousTicket);
  const slaMetTrend = slaMetValue != null && previousSlaMet != null
    ? pointDelta(slaMetValue, previousSlaMet)
    : { direction: 'up' as const, label: slaMetValue != null ? 'New' : '—' };

  const taskQuality = latestWithTrend(taskRows, 'qualityRate', 'rate');
  const instanceQuality = latestWithTrend(instanceRows, 'qualityRate', 'rate');
  const proofCompliance = taskQuality.value != null && instanceQuality.value != null
    ? Math.round((taskQuality.value + instanceQuality.value) / 2)
    : taskQuality.value ?? instanceQuality.value;
  const proofTrend = taskQuality.value != null ? taskQuality.trend : instanceQuality.trend;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* Leads the row as the highlighted "hero" tile — the single most central org-wide metric —
          same convention as the dashboard's own KpiStrip.tsx. */}
      <StatCard
        icon={ShieldCheck}
        label="On-time completion"
        value={slaMetValue != null ? `${slaMetValue}%` : '—'}
        trend={slaMetTrend}
        highlight
        decorative
      />
      <StatCard
        icon={ClipboardCheck}
        iconTint="text-primary-600 dark:text-primary-400"
        label="Checklist completion"
        value={checklistCompletion.value != null ? `${checklistCompletion.value}%` : '—'}
        trend={checklistCompletion.trend}
      />
      <StatCard
        icon={AlertTriangle}
        iconTint="text-amber-600 dark:text-amber-400"
        label="Overdue"
        value={overdue.value ?? '—'}
        trend={overdue.trend}
      />
      <StatCard
        icon={Camera}
        iconTint="text-emerald-600 dark:text-emerald-400"
        label="Proof compliance"
        value={proofCompliance != null ? `${proofCompliance}%` : '—'}
        trend={proofTrend}
      />
    </div>
  );
};
