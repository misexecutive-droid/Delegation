import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { taskApi, type ComplianceReportRow } from '../../../api/task';
import { ticketApi, type TatReportRow } from '../../../api/ticket';
import { checklistInstanceApi } from '../../../api/checklistInstances';
import { handleQueryRetry } from '../../../lib/queryHelpers';
import type { Role } from '../../../api/auth';
import type { GroupBy } from './GroupByControl';

// Anyone who can view the merged Overview/Analytics page — org-wide for ADMIN/PC, department-
// scoped for MANAGER, store-scoped for SENIOR (each report scopes itself server-side off the
// caller's token, see reportScope.ts on the server).
const ORG_REPORT_ROLES: Role[] = ['ADMIN', 'PC', 'MANAGER', 'SENIOR'];
const canViewOrgReports = (role?: Role) => !!role && ORG_REPORT_ROLES.includes(role);

// --- TEMP: mock fallback for visual review ------------------------------------------------
// A fresh/sparse dataset makes the Overview KPI cards and charts render blank. Until there's
// enough real report data to look at, fall back to randomized sample rows with the same shape
// the real API returns, so the dashboard can be reviewed populated. Safe to delete this whole
// block (and the `.length > 0 ? ... : mock...` fallback in each hook below) later.
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const MOCK_BUCKET_COUNT = 6;

const mockBucketDates = (groupBy: GroupBy) => {
  const now = new Date();
  return Array.from({ length: MOCK_BUCKET_COUNT }, (_, i) => {
    const stepsAgo = MOCK_BUCKET_COUNT - 1 - i;
    const d = new Date(now);
    if (groupBy === 'day') d.setDate(d.getDate() - stepsAgo);
    else if (groupBy === 'week') d.setDate(d.getDate() - stepsAgo * 7);
    else if (groupBy === 'year') d.setFullYear(d.getFullYear() - stepsAgo);
    else d.setMonth(d.getMonth() - stepsAgo);
    return d.toISOString();
  });
};

const mockComplianceRows = (groupBy: GroupBy): ComplianceReportRow[] =>
  mockBucketDates(groupBy).map((bucket) => {
    const totalItems = randomInt(20, 80);
    const doneItems = randomInt(Math.round(totalItems * 0.6), totalItems);
    return {
      bucket,
      totalItems,
      doneItems,
      completionRate: Math.round((doneItems / totalItems) * 100),
      itemsRequiringPhotos: randomInt(5, totalItems),
      qualityRate: randomInt(70, 99),
    };
  });

const mockTatRows = (groupBy: GroupBy): TatReportRow[] =>
  mockBucketDates(groupBy).map((bucket) => {
    const createdCount = randomInt(10, 40);
    const closedCount = randomInt(Math.round(createdCount * 0.5), createdCount);
    return {
      bucket,
      createdCount,
      closedCount,
      avgTatHours: randomInt(2, 36),
      overdueCount: randomInt(0, Math.round(createdCount * 0.2)),
      completionRate: Math.round((closedCount / createdCount) * 100),
    };
  });
// --- end TEMP mock fallback ----------------------------------------------------------------

export const useTaskComplianceReportQuery = (groupBy: GroupBy, from?: string, to?: string) => {
  const { token, user } = useAuth();
  const query = useQuery({
    queryKey: ['analytics', 'task-compliance', groupBy, from, to],
    queryFn: () => taskApi.getComplianceReport(groupBy, from, to).then((r) => r.data),
    enabled: !!token && canViewOrgReports(user?.role),
    retry: handleQueryRetry,
  });
  const mockData = useMemo(() => mockComplianceRows(groupBy), [groupBy]);
  return { ...query, data: query.data && query.data.length > 0 ? query.data : mockData };
};

export const useTicketTatReportQuery = (groupBy: GroupBy, from?: string, to?: string) => {
  const { token, user } = useAuth();
  const query = useQuery({
    queryKey: ['analytics', 'ticket-tat', groupBy, from, to],
    queryFn: () => ticketApi.getTatReport(groupBy, from, to).then((r) => r.data),
    enabled: !!token && canViewOrgReports(user?.role),
    retry: handleQueryRetry,
  });
  const mockData = useMemo(() => mockTatRows(groupBy), [groupBy]);
  return { ...query, data: query.data && query.data.length > 0 ? query.data : mockData };
};

export const useChecklistInstanceComplianceReportQuery = (groupBy: GroupBy, from?: string, to?: string) => {
  const { token, user } = useAuth();
  const query = useQuery({
    queryKey: ['analytics', 'checklist-instance-compliance', groupBy, from, to],
    queryFn: () => checklistInstanceApi.getComplianceReport(groupBy, undefined, from, to).then((r) => r.data),
    enabled: !!token && canViewOrgReports(user?.role),
    retry: handleQueryRetry,
  });
  const mockData = useMemo(() => mockComplianceRows(groupBy), [groupBy]);
  return { ...query, data: query.data && query.data.length > 0 ? query.data : mockData };
};
