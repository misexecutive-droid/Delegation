import { Repeat, Camera, ShieldCheck } from 'lucide-react';
import { KpiSectionShell } from './KpiSectionShell';
import { ReportTrendChart } from './ReportTrendChart';
import { useChecklistInstanceComplianceReportQuery } from './useAnalyticsQueries';
import { latestWithTrend } from './analyticsDisplay';
import type { GroupBy } from './GroupByControl';

interface ChecklistInstanceKpiSectionProps {
  groupBy: GroupBy;
  from?: string;
  to?: string;
}

export const ChecklistInstanceKpiSection = ({ groupBy, from, to }: ChecklistInstanceKpiSectionProps) => {
  const { data: rows, isPending, isError } = useChecklistInstanceComplianceReportQuery(groupBy, from, to);
  const completion = latestWithTrend(rows, 'completionRate', 'rate');
  const quality = latestWithTrend(rows, 'qualityRate', 'rate');
  const approval = latestWithTrend(rows, 'approvalRate', 'rate');

  return (
    <KpiSectionShell
      icon={Repeat}
      title="Recurring Checklists"
      description="Completion, photo-evidence compliance, and PC first-attempt approval for scheduled checklist instances, bucketed by each instance's period."
      isPending={isPending}
      isError={isError}
      errorMessage="Failed to load recurring checklist data."
      from={from}
      to={to}
      cards={[
        {
          icon: Repeat,
          iconTint: 'text-primary-600 dark:text-primary-400',
          label: 'Completion rate',
          value: completion.value != null ? `${completion.value}%` : '—',
          trend: completion.trend,
        },
        {
          icon: Camera,
          iconTint: 'text-success',
          label: 'Photo quality rate',
          value: quality.value != null ? `${quality.value}%` : '—',
          trend: quality.trend,
        },
        {
          icon: ShieldCheck,
          iconTint: 'text-coral-600 dark:text-coral-400',
          // "First attempt" — an instance the PC ever rejected no longer counts here, even once
          // it's later fixed and approved (see checklistInstance.service.ts#complianceReport).
          label: 'PC approval rate (first attempt)',
          value: approval.value != null ? `${approval.value}%` : '—',
          trend: approval.trend,
        },
      ]}
      chart={
        <ReportTrendChart
          data={rows ?? []}
          series={[
            { key: 'completionRate', label: 'Completion %', color: 'var(--color-primary-500)' },
            { key: 'qualityRate', label: 'Quality %', color: 'var(--color-success)' },
            { key: 'approvalRate', label: 'PC approval %', color: 'var(--color-coral-500)' },
          ]}
          valueSuffix="%"
          yDomain={[0, 100]}
        />
      }
    />
  );
};
