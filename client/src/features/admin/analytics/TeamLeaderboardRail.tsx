import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { PersonRow } from '../../../components';
import { useDepartmentsQuery, useTicketsQuery } from '../../tickets/hook';
import { useTasksQuery } from '../../tasks/hook';
import { useUsersQuery } from '../hook';

interface LeaderRow {
  id: string;
  name: string;
  departmentName: string;
  score: number;
}

// Top-5 org-wide performers by a simple completed-vs-overdue score — moved here from
// StoresPerformanceSection (same computation, same real data) so it's visible at a glance on the
// overview page instead of only inside the Stores tab.
export const TeamLeaderboardRail = () => {
  const { data: departments = [] } = useDepartmentsQuery();
  // 100 is the server's hard cap (ticket.validation.ts) — requesting more (e.g. 200) fails
  // validation outright with a 400, not a silent truncation.
  const { data: ticketPage } = useTicketsQuery(1, 100);
  const { data: tasks = [] } = useTasksQuery();
  const { data: users = [] } = useUsersQuery(true);

  const tickets = useMemo(() => ticketPage?.data ?? [], [ticketPage]);

  const leaderboard: LeaderRow[] = useMemo(() => {
    const departmentName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? '—';
    // "now" only needs to be approximately current for the overdue checks below; memoized so
    // it's read once per mount, not on every render (see HomePage.tsx for the same pattern).
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();

    return users
      .map((u) => {
        const myTasks = tasks.filter((t) => t.assigneeId === u.id || t.userId === u.id);
        const myTickets = tickets.filter((t) => t.assigneeId === u.id || t.userId === u.id);
        const totalWork = myTasks.length + myTickets.length;
        if (totalWork === 0) return null;

        const completed =
          myTasks.filter((t) => t.status === 'done').length + myTickets.filter((t) => t.status === 'CLOSED').length;
        const overdue =
          myTasks.filter((t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate).getTime() < now).length +
          myTickets.filter((t) => t.isOverdue).length;

        const score = Math.round(Math.max(0, (completed / totalWork) * 100 - (overdue / totalWork) * 20));

        return {
          id: u.id,
          name: `${u.firstName} ${u.lastName ?? ''}`.trim(),
          departmentName: departmentName(u.departmentId),
          score,
        };
      })
      .filter((row): row is LeaderRow => row !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [users, tasks, tickets, departments]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={16} className="text-coral-500" />
        <h3 className="text-sm font-display font-bold uppercase tracking-wider text-text">Leaderboard</h3>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-sm text-text-muted font-display py-6 text-center">No activity yet.</p>
      ) : (
        leaderboard.map((row, index) => (
          <PersonRow key={row.id} index={index} name={row.name} subtitle={row.departmentName} metric={row.score} />
        ))
      )}
    </div>
  );
};
