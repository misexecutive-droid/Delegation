import { KpiStrip, type WorkflowStats } from './KpiStrip';
import type { Task } from '../../api/task';
import type { Ticket } from '../../api/ticket';

interface DashboardOverviewProps {
  isPending: boolean;
  tickets: Ticket[];
  tasks: Task[];
  workflowStats: WorkflowStats;
}

export const DashboardOverview = ({
  isPending,
  tickets,
  tasks,
  workflowStats
}: DashboardOverviewProps) => {
  return (
    <section
      aria-label="Dashboard Overview"
      className="w-full relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both"
    >
      <KpiStrip
        tickets={tickets}
        tasks={tasks}
        isPending={isPending}
        workflowStats={workflowStats}
      />
    </section>
  );
};