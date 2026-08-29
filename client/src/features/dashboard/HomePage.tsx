import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTicketsQuery } from '../tickets/hook';
import { useTasksQuery } from '../tasks/hook';
import { useUpcomingEventsQuery } from '../events/hook';
import { useTodosQuery } from '../todo/hook';
import { TASK_SCORE } from '../tasks/taskDisplay';
import { DashboardHeader } from './DashboardHeader';
import { DashboardOverview } from './DashboardOverview';
import { MonthlyTargetCard, type FooterStat } from './MonthlyTargetCard';
import { ActivityTrendChart } from './ActivityTrendChart';
import { ActivityComplianceGauges } from './ActivityComplianceGauges';
import { ActivityGroupByControl } from './ActivityGroupByControl';
import { CompareDashboard } from './CompareDashboard';
import { RecentActivity } from './RecentActivity';
import { UpcomingEvents } from './UpcomingEvents';
import { type FeedItem, type CompliancePeriod, type ActivityGroupBy, PERIOD_LABEL, periodStartDate, shiftPeriod, pointDelta } from './dashboardDisplay';
import type { Task } from '../../api/task';
import { TodoDrawer, TodoFab } from '../todo';

export const HomePage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<CompliancePeriod>('month');
  const [comparePeriod, setComparePeriod] = useState<CompliancePeriod>('month');
  const [activityGroupBy, setActivityGroupBy] = useState<ActivityGroupBy>('month');
  const [showTodoDrawer, setShowTodoDrawer] = useState(false);
  const { data: ticketPage, isPending: ticketsPending } = useTicketsQuery(1, 100);
  const { data: allTasks, isPending: tasksPending } = useTasksQuery();
  const { data: todos = [], isPending: todosPending } = useTodosQuery();
  const { data: upcomingEvents, isPending: eventsPending } = useUpcomingEventsQuery(5);

  const isPending = ticketsPending || tasksPending;
  const activityPending = isPending || todosPending;

  const tickets = (ticketPage?.data ?? []).filter((t) => t.userId === user?.id || t.assigneeId === user?.id);
  const tasks = (allTasks ?? []).filter(
    (t) => t.userId === user?.id || t.assigneeId === user?.id || t.additionalAssigneeIds?.includes(user?.id ?? ''),
  );

  const isOrgWideRole = user?.role === 'ADMIN' || user?.role === 'PC';
  const workflowTasks = isOrgWideRole ? (allTasks ?? []) : tasks;
  const workflowStats = {
    pending: workflowTasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length,
    approvals: workflowTasks.filter((t) => t.status === 'pending_verification').length,
    completed: workflowTasks.filter((t) => t.status === 'done').length,
    assigned: workflowTasks.length,
  };

  // "now" only needs to be approximately current for the overdue/period checks below; memoized
  // so it's read once per mount, not on every render.
  // eslint-disable-next-line react-hooks/purity
  const now = useMemo(() => Date.now(), []);

  const feed: FeedItem[] = [
    ...tickets.map((t): FeedItem => ({ kind: 'ticket', id: t.id, title: t.title, status: t.status, createdAt: t.createdAt })),
    ...tasks.map((t): FeedItem => ({ kind: 'task', id: t.id, title: t.title, status: t.status, createdAt: t.createdAt })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);
  const nowDate = useMemo(() => new Date(now), [now]);
  const tasksCreatedIn = (periodDate: Date) => {
    const start = periodStartDate(period, periodDate).getTime();
    const end = periodStartDate(period, shiftPeriod(period, periodDate, 1)).getTime();
    return tasks.filter((t) => {
      const created = new Date(t.createdAt).getTime();
      return created >= start && created < end;
    });
  };
  const weightedScorePercent = (list: Task[]) =>
    list.length ? (list.reduce((sum, t) => sum + TASK_SCORE[t.status], 0) / list.length) * 100 : 0;

  const currentTasks = tasksCreatedIn(nowDate);
  const previousTasks = tasksCreatedIn(shiftPeriod(period, nowDate, -1));
  const targetPercent = Math.round(weightedScorePercent(currentTasks));
  const previousPercent = Math.round(weightedScorePercent(previousTasks));
  const targetChange = pointDelta(targetPercent, previousPercent);

  const totalItems = currentTasks.length;
  const doneItems = currentTasks.filter((t) => t.status === 'done').length;
  const pendingItems = totalItems - doneItems;
  const prevTotal = previousTasks.length;
  const prevDone = previousTasks.filter((t) => t.status === 'done').length;
  const prevPending = prevTotal - prevDone;

  const periodLabel = PERIOD_LABEL[period];
  const targetDescription = totalItems === 0
    ? `No delegations created ${periodLabel}.`
    : `${targetPercent}% weighted completion of ${periodLabel}'s delegations${
        prevTotal ? (targetPercent >= previousPercent ? " — ahead of the previous period's pace." : " — behind the previous period's pace.") : '.'
      }`;

  const targetStats: [FooterStat, FooterStat, FooterStat] = [
    { label: 'Target', value: String(totalItems), direction: totalItems >= prevTotal ? 'up' : 'down' },
    { label: 'Resolved', value: String(doneItems), direction: doneItems >= prevDone ? 'up' : 'down' },
    { label: 'Pending', value: String(pendingItems), direction: pendingItems <= prevPending ? 'up' : 'down' },
  ];

  return (
    <div className="flex flex-col gap-5 w-full animate-in fade-in duration-500 ease-out">
      <DashboardHeader userName={user?.name} onOpenTodo={() => setShowTodoDrawer(true)} />

      <DashboardOverview isPending={isPending} tickets={tickets} tasks={tasks} todos={todos} workflowStats={workflowStats} />

      <div className="rounded-2xl border border-border/60 dark:border-white/[0.06] bg-surface p-5 sm:p-6 lg:p-7 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-800/50 text-primary-600 dark:text-primary-400 shadow-sm">
              <BarChart3 size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text tracking-tight leading-tight">Activity Overview</h3>
              <p className="text-xs font-medium text-text-muted mt-0.5 tracking-wide">Delegations, tickets &amp; todo, and your overall completion rate</p>
            </div>
          </div>
          <ActivityGroupByControl value={activityGroupBy} onChange={setActivityGroupBy} />
        </div>

        {activityPending ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-text-muted">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <ActivityTrendChart tasks={tasks} tickets={tickets} todos={todos} groupBy={activityGroupBy} />
            <ActivityComplianceGauges tasks={tasks} tickets={tickets} todos={todos} groupBy={activityGroupBy} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <CompareDashboard tasks={tasks} tickets={tickets} todos={todos} period={comparePeriod} onPeriodChange={setComparePeriod} />

        <MonthlyTargetCard
          percent={targetPercent}
          change={targetChange}
          description={targetDescription}
          stats={targetStats}
          period={period}
          onPeriodChange={setPeriod}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        <RecentActivity feed={feed} isPending={isPending} />
        <UpcomingEvents events={upcomingEvents ?? []} isPending={eventsPending} />
      </div>

      <TodoDrawer open={showTodoDrawer} onClose={() => setShowTodoDrawer(false)} />
      <TodoFab onOpenDrawer={() => setShowTodoDrawer(true)} />
    </div>
  );
};