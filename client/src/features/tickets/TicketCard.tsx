import { Clock, AlertCircle, User } from 'lucide-react';
import type { Ticket } from '../../api/ticket';
import { getChecklistProgress } from '../../lib/checklistProgress';
import { getTicketStatusLabel } from '../../lib/ticketStatusLabel';
import { getInitials } from '../../lib/getInitials';
import { avatarColorClass } from '../tasks/avatarColors';
import { useAuth } from '../../context/AuthContext';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './ticketDisplay';
import { ChecklistProgressBar, DueProgressBar } from '../../components/progress';

interface TicketCardProps {
  ticket: Ticket;
  onClick: (ticket: Ticket) => void;
  departmentName?: string;
  index?: number;
}

export const TicketCard = ({ ticket, onClick, departmentName, index = 0 }: TicketCardProps) => {
  const { user } = useAuth();
  const { totalItems, doneItems, progress } = getChecklistProgress(ticket.checklists);

  const isOverdue = ticket.isOverdue && ticket.status !== 'CLOSED';
  const priorityInfo = PRIORITY_CONFIG[ticket.priority];
  const statusInfo = STATUS_CONFIG[ticket.status];
  const statusLabel = getTicketStatusLabel(ticket.status, user?.role, statusInfo.label);
  const assigneeName = ticket.assignee ? ticket.assignee.firstName : null;

  return (
    <button
      type="button"
      onClick={() => onClick(ticket)}
      className="group relative w-full text-left flex flex-col gap-2.5 p-4 rounded-lg border border-border bg-surface hover:border-primary-500/40 transition-colors duration-200 cursor-pointer animate-step-in outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
    >
      {/* Priority stripe — same glanceable triage cue used on delegation cards. */}
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${priorityInfo.stripe}`} />
      {/* Title + Department */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex-1 min-w-0 text-sm font-medium text-text truncate leading-snug">
          {ticket.title}
        </h3>
        <span className="shrink-0 max-w-[140px] truncate text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400">
          {departmentName ?? 'Ticket'}
        </span>
      </div>

      {/* Clamped Description */}
      {ticket.description && (
        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
          {ticket.description}
        </p>
      )}

      {/* Progress — checklist completion when there's a checklist to track, otherwise how much of
          the created-to-TAT-deadline window has elapsed. */}
      {progress !== null ? (
        <ChecklistProgressBar done={doneItems} total={totalItems} />
      ) : (
        ticket.tatDueAt && ticket.status !== 'CLOSED' && (
          <DueProgressBar createdAt={ticket.createdAt} dueDate={ticket.tatDueAt} />
        )
      )}

      {/* Footer: Status/Priority/Due Chips + Assignee */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.className}`}>
            {statusLabel}
          </span>

          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityInfo.className}`}>
            {priorityInfo.label}
          </span>

          {ticket.tatDueAt && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                isOverdue ? 'bg-danger/10 text-danger' : 'bg-surface-hover text-text-muted'
              }`}
            >
              {isOverdue ? <AlertCircle size={11} className="shrink-0" /> : <Clock size={11} className="shrink-0" />}
              {new Date(ticket.tatDueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {assigneeName ? (
          <div
            className={`flex items-center justify-center size-6 rounded-full text-white text-[10px] font-bold shrink-0 ${avatarColorClass(assigneeName)}`}
            title={`Assigned to ${assigneeName}`}
          >
            {getInitials(assigneeName)}
          </div>
        ) : (
          <div className="flex items-center justify-center size-6 rounded-full bg-surface-hover text-text-light shrink-0" title="Unassigned">
            <User size={12} />
          </div>
        )}
      </div>
    </button>
  );
};
