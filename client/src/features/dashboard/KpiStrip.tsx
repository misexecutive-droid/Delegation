import { useNavigate } from 'react-router';
import { ClipboardList, TicketCheck, ListChecks } from 'lucide-react';
import { StatusBreakdownCard, type StatusBreakdownVariant } from './StatusBreakdownCard';
import { AdminChromeAccents } from '../admin/AdminChromeAccents';
import { Skeleton } from '../../components/skeleton';
import { useChecklistInstanceSummaryQuery } from '../checklist/hook';
import type { Task } from '../../api/task';
import type { Ticket } from '../../api/ticket';

export interface WorkflowStats {
  pending: number;
  approvals: number;
  completed: number;
  assigned: number;
}

interface KpiStripProps {
  tickets: Ticket[];
  tasks: Task[];
  isPending: boolean;
  workflowStats: WorkflowStats;
}

/**
 * Mirrors StatusBreakdownCard's real structure — same shell, same header divider, same right-hand
 * total box — so what loads in looks like what was loading. It takes the same `variant` as the
 * real card for exactly that reason: with a navy hero followed by two surface cards, a skeleton
 * row of three identical placeholders would visibly re-colour as the data arrived.
 *
 * On the navy shell the shared Skeleton's `bg-surface-active` default is overridden to
 * `bg-white/10` so the placeholders read against the dark ground.
 */
const KpiCardSkeleton = ({ variant }: { variant: StatusBreakdownVariant }) => {
  const isNavy = variant === 'navy';
  const block = isNavy ? 'bg-white/10' : '';

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border ${
        isNavy
          ? 'border-transparent bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700'
          : 'border-border/60 dark:border-white/[0.06] bg-surface'
      }`}
    >
      {isNavy && <AdminChromeAccents scale="compact" />}

      <div className={`relative z-10 flex items-center gap-2 px-4 py-3.5 border-b ${isNavy ? 'border-white/10' : 'border-border/60'}`}>
        <Skeleton className={`size-4 rounded shrink-0 ${block}`} />
        <Skeleton className={`h-4 w-28 rounded-md ${block}`} />
      </div>

      <div className="relative z-10 flex items-stretch gap-3 p-3">
        <div className="flex-1 flex flex-col justify-center gap-3 px-1">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className={`h-3.5 w-20 rounded ${block}`} />
              <Skeleton className={`h-3.5 w-6 rounded ${block}`} />
            </div>
          ))}
        </div>
        <div
          className={`flex flex-col items-center justify-center gap-1.5 w-24 sm:w-28 shrink-0 rounded-xl border ${
            isNavy ? 'border-white/15 bg-white/5' : 'border-border/60 bg-surface-hover/50'
          }`}
        >
          <Skeleton className={`h-7 w-12 rounded-md ${block}`} />
          <Skeleton className={`h-3 w-10 rounded ${block}`} />
        </div>
      </div>
    </div>
  );
};

/**
 * Process & Workflow leads as the navy hero; Tickets and Checklist sit in the page's ordinary card
 * treatment behind it. Workflow gets the emphasis because it's the broadest of the three (every
 * delegation, not one queue) and its "Due" figure is the most common reason to open this page.
 *
 * Three equal-weight navy slabs gave the row no internal hierarchy and switched the page's visual
 * language wholesale at the top, so the dashboard opened heavy and then changed character.
 */
const CARD_VARIANTS: readonly StatusBreakdownVariant[] = ['navy', 'surface', 'surface'];

export const KpiStrip = ({ tickets, isPending, workflowStats }: KpiStripProps) => {
  const navigate = useNavigate();
  const { data: checklistSummary } = useChecklistInstanceSummaryQuery({ mine: true });

  if (isPending) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-5">
        {CARD_VARIANTS.map((variant, i) => (
          <KpiCardSkeleton key={i} variant={variant} />
        ))}
      </div>
    );
  }

  // --- Derived Metrics ---

  // Tickets: OPEN/IN_PROGRESS/IN_REVIEW/ON_HOLD map to 'Due'. CLOSED maps to 'Completed'.
  const dueTickets = tickets.filter(t => t.status !== 'CLOSED');
  const completedTickets = tickets.filter(t => t.status === 'CLOSED');

  // Checklists: counted by the database. This used to download every instance the user has ever
  // been assigned — items, images, submissions and all — purely to call `.length` on the result,
  // which is what forced the /mine endpoint to stay unbounded.

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-5">

      {/* Workflow Card */}
      <StatusBreakdownCard
        variant={CARD_VARIANTS[0]}
        icon={ClipboardList}
        title="Process & Workflow"
        total={workflowStats.assigned}
        onOpen={() => navigate('/tasks')}
        rows={[
          { 
            label: 'Due', 
            value: workflowStats.pending + workflowStats.approvals, 
            tone: 'warning', 
            onClick: () => navigate('/tasks?quickFilter=pending') 
          },
          { 
            label: 'Completed', 
            value: workflowStats.completed, 
            tone: 'success', 
            onClick: () => navigate('/tasks?status=done') 
          },
        ]}
      />

      {/* Tickets Card */}
      <StatusBreakdownCard
        variant={CARD_VARIANTS[1]}
        icon={TicketCheck}
        title="Tickets"
        total={tickets.length}
        onOpen={() => navigate('/tickets')}
        rows={[
          { 
            label: 'Due', 
            value: dueTickets.length, 
            tone: 'warning', 
            onClick: () => navigate('/tickets?quickFilter=pending') 
          },
          { 
            label: 'Completed', 
            value: completedTickets.length, 
            tone: 'success', 
            onClick: () => navigate('/tickets?quickFilter=completed') 
          },
        ]}
      />

      {/* Checklist Card */}
      <StatusBreakdownCard
        variant={CARD_VARIANTS[2]}
        icon={ListChecks}
        title="Checklist"
        total={checklistSummary?.total ?? 0}
        onOpen={() => navigate('/checklists')}
        rows={[
          { 
            label: 'Due', 
            value: checklistSummary?.pending ?? 0, 
            tone: 'warning', 
            onClick: () => navigate('/checklists?status=due') 
          },
          { 
            label: 'Completed', 
            value: checklistSummary?.completed ?? 0, 
            tone: 'success', 
            onClick: () => navigate('/checklists?status=completed') 
          },
        ]}
      />
      
    </div>
  );
};