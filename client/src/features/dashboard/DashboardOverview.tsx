import { KpiStrip, type WorkflowStats } from './KpiStrip';
import type { Task } from '../../api/task';
import type { Ticket } from '../../api/ticket';
import type { Todo } from '../../api/todos';

interface DashboardOverviewProps {
  isPending: boolean;
  tickets: Ticket[];
  tasks: Task[];
  todos: Todo[];
  workflowStats: WorkflowStats;
}

export const DashboardOverview = ({ isPending, tickets, tasks, todos, workflowStats }: DashboardOverviewProps) => {
  return <KpiStrip tickets={tickets} tasks={tasks} todos={todos} isPending={isPending} workflowStats={workflowStats} />;
};
