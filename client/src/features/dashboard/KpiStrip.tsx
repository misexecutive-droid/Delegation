import { useNavigate } from 'react-router';
import { ClipboardList, ListTodo, TicketCheck, ListChecks } from 'lucide-react';
import { Skeleton } from '../../components';
import { StatusBreakdownCard } from './StatusBreakdownCard';
import { isOverdueTodo } from '../todo/todoQuickFilters';
import type { Task } from '../../api/task';
import type { Ticket } from '../../api/ticket';
import type { Todo } from '../../api/todos';

export interface WorkflowStats {
  pending: number;
  approvals: number;
  completed: number;
  assigned: number;
}

interface KpiStripProps {
  tickets: Ticket[];
  tasks: Task[];
  todos: Todo[];
  isPending: boolean;
  workflowStats: WorkflowStats;
}

export const KpiStrip = ({ tickets, todos, isPending, workflowStats }: KpiStripProps) => {
  const navigate = useNavigate();

  if (isPending) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl bg-surface-hover p-5 animate-pulse">
            <Skeleton className="h-4 w-32 rounded-sm" />
            <div className="flex gap-4 mt-2">
              <div className="flex-1 flex flex-col gap-2.5">
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-full rounded-sm" />
              </div>
              <Skeleton className="h-20 w-24 rounded-xl shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Todo: pending = not completed, overdue = has a due date that's passed, completed = done —
  // same predicates TodoPage/TodoList already use (see todoQuickFilters.ts), so this card's
  // numbers never drift from what clicking through to /todo actually shows.
  const pendingTodos = todos.filter(t => !t.completed);
  const overdueTodos = todos.filter(isOverdueTodo);
  const completedTodos = todos.filter(t => t.completed);

  // Tickets: OPEN stays its own row, IN_PROGRESS/IN_REVIEW/ON_HOLD fold into one "In Progress"
  // row (all mid-lifecycle, not yet closed), CLOSED is its own row.
  const openTickets = tickets.filter(t => t.status === 'OPEN');
  const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW' || t.status === 'ON_HOLD');
  const closedTickets = tickets.filter(t => t.status === 'CLOSED');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-5">
      <StatusBreakdownCard
        icon={ClipboardList}
        title="Process & Workflow"
        total={workflowStats.assigned}
        onOpen={() => navigate('/tasks')}
        rows={[
          // "Pending" folds todo + in_progress together — no single status filter covers it, so
          // it deep-links to the plain list instead of a status-scoped one.
          { label: 'Pending', value: workflowStats.pending, tone: 'warning', onClick: () => navigate('/tasks') },
          { label: 'Approvals', value: workflowStats.approvals, onClick: () => navigate('/tasks?status=pending_verification') },
          { label: 'Completed', value: workflowStats.completed, tone: 'success', onClick: () => navigate('/tasks?status=done') },
        ]}
      />
      <StatusBreakdownCard
        icon={ListTodo}
        title="Todo"
        total={todos.length}
        onOpen={() => navigate('/todo')}
        rows={[
          { label: 'Pending', value: pendingTodos.length, tone: 'warning', onClick: () => navigate('/todo') },
          { label: 'Overdue', value: overdueTodos.length, onClick: () => navigate('/todo') },
          { label: 'Completed', value: completedTodos.length, tone: 'success', onClick: () => navigate('/todo') },
        ]}
      />
      <StatusBreakdownCard
        icon={TicketCheck}
        title="Tickets"
        total={tickets.length}
        onOpen={() => navigate('/tickets')}
        rows={[
          { label: 'Open', value: openTickets.length, tone: 'warning', onClick: () => navigate('/tickets') },
          { label: 'In Progress', value: inProgressTickets.length, onClick: () => navigate('/tickets') },
          { label: 'Closed', value: closedTickets.length, tone: 'success', onClick: () => navigate('/tickets') },
        ]}
      />
      <StatusBreakdownCard icon={ListChecks} title="Checklist" total={0} comingSoon />
    </div>
  );
};
