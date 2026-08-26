import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useDepartmentsQuery, useTicketsQuery } from '../../tickets/hook';
import { useTasksQuery } from '../../tasks/hook';
import { checklistInstanceApi } from '../../../api/checklistInstances';
import type { GroupBy } from './GroupByControl';

interface StoresPerformanceSectionProps {
  groupBy: GroupBy;
  from?: string;
  to?: string;
}

interface StoreRow {
  id: string;
  name: string;
  checklistRate: number | null;
  auditScore: number | null;
  openIssues: number;
  avgTat: number | null;
  slaMet: number | null;
}

export const StoresPerformanceSection = ({ groupBy, from, to }: StoresPerformanceSectionProps) => {
  const { token } = useAuth();
  const { data: departments = [] } = useDepartmentsQuery();
  const { data: ticketPage } = useTicketsQuery(1, 200);
  const { data: tasks = [] } = useTasksQuery();

  const tickets = useMemo(() => ticketPage?.data ?? [], [ticketPage]);

  // "Audit score" per row — recurring checklists are now store-scoped (see ChecklistDefinition),
  // not department-scoped, and there's no reliable department-to-store mapping to key off here.
  // Until this table itself is rebuilt around real stores, every row falls back to the same
  // org-wide completion rate the KPI sections above already show, rather than silently querying
  // with the wrong id and showing an always-empty score.
  const { data: auditRows } = useQuery({
    queryKey: ['analytics', 'checklist-instance-compliance', 'org-wide', groupBy, from, to],
    queryFn: () => checklistInstanceApi.getComplianceReport(groupBy, undefined, from, to).then((r) => r.data),
    enabled: !!token,
  });
  const latestAudit = auditRows?.[auditRows.length - 1];
  const auditScore = latestAudit?.completionRate != null ? Math.round(latestAudit.completionRate) : null;

  const storeRows: StoreRow[] = useMemo(
    () =>
      departments.map((dept) => {
        const deptTasks = tasks.filter((t) => t.departmentId === dept.id);
        const deptTickets = tickets.filter((t) => t.departmentId === dept.id);

        const checklistRate =
          deptTasks.length > 0
            ? Math.round((deptTasks.filter((t) => t.status === 'done').length / deptTasks.length) * 100)
            : null;

        const openIssues = deptTickets.filter((t) => t.status !== 'CLOSED').length;

        const tatValues = deptTickets.map((t) => t.tatHours).filter((v): v is number => v != null);
        const avgTat =
          tatValues.length > 0
            ? Math.round((tatValues.reduce((sum, v) => sum + v, 0) / tatValues.length) * 10) / 10
            : null;

        const slaMet =
          deptTickets.length > 0
            ? Math.round(
                ((deptTickets.length - deptTickets.filter((t) => t.isOverdue).length) / deptTickets.length) * 100,
              )
            : null;

        return { id: dept.id, name: dept.name, checklistRate, auditScore, openIssues, avgTat, slaMet };
      }),
    [departments, tasks, tickets, auditScore],
  );

  return (
    <div>
      {/* Store performance — table on tablet/desktop, stacked cards on phones */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary-700 text-white">
                <th className="text-left font-display font-semibold px-5 py-3 whitespace-nowrap">Store</th>
                <th className="text-right font-display font-semibold px-5 py-3 whitespace-nowrap">Checklist</th>
                <th className="text-right font-display font-semibold px-5 py-3 whitespace-nowrap">Audit score</th>
                <th className="text-right font-display font-semibold px-5 py-3 whitespace-nowrap">Open issues</th>
                <th className="text-right font-display font-semibold px-5 py-3 whitespace-nowrap">Avg TAT</th>
                <th className="text-right font-display font-semibold px-5 py-3 whitespace-nowrap">SLA met</th>
              </tr>
            </thead>
            <tbody>
              {storeRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-text-muted font-display">
                    No department data yet.
                  </td>
                </tr>
              ) : (
                storeRows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60 hover:bg-surface-hover/50 transition-colors">
                    <td className="px-5 py-3 font-display font-medium text-text whitespace-nowrap">{row.name}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-text">
                      {row.checklistRate != null ? `${row.checklistRate}%` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-text">
                      {row.auditScore != null ? row.auditScore : '—'}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-text">{row.openIssues}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-text">
                      {row.avgTat != null ? `${row.avgTat}h` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-text">
                      {row.slaMet != null ? `${row.slaMet}%` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: card stack instead of a cramped scrolling table */}
        <div className="md:hidden divide-y divide-border/60">
          {storeRows.length === 0 ? (
            <p className="px-5 py-10 text-center text-text-muted font-display text-sm">No department data yet.</p>
          ) : (
            storeRows.map((row) => (
              <div key={row.id} className="p-4 flex flex-col gap-3">
                <p className="font-display font-semibold text-text text-sm">{row.name}</p>
                <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text-muted uppercase tracking-wide text-[10px]">Checklist</span>
                    <span className="font-display font-semibold tabular-nums text-text">
                      {row.checklistRate != null ? `${row.checklistRate}%` : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text-muted uppercase tracking-wide text-[10px]">Audit score</span>
                    <span className="font-display font-semibold tabular-nums text-text">
                      {row.auditScore != null ? row.auditScore : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text-muted uppercase tracking-wide text-[10px]">Open issues</span>
                    <span className="font-display font-semibold tabular-nums text-text">{row.openIssues}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text-muted uppercase tracking-wide text-[10px]">Avg TAT</span>
                    <span className="font-display font-semibold tabular-nums text-text">
                      {row.avgTat != null ? `${row.avgTat}h` : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text-muted uppercase tracking-wide text-[10px]">SLA met</span>
                    <span className="font-display font-semibold tabular-nums text-text">
                      {row.slaMet != null ? `${row.slaMet}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
