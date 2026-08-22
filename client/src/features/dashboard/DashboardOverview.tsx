import { KpiStrip } from './KpiStrip';
import type { Task } from '../../api/task';
import type { Ticket } from '../../api/ticket';

interface DashboardOverviewProps {
  isPending: boolean;
  tickets: Ticket[];
  tasks: Task[];
}

export const DashboardOverview = ({ isPending, tickets, tasks }: DashboardOverviewProps) => {
  return <KpiStrip tickets={tickets} tasks={tasks} isPending={isPending} />;
};
