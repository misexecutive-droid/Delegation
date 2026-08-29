import { Tag, Sparkles, UserCheck, Clock, User, ChevronDown, Lock } from 'lucide-react';
import { Dropdown, type DropdownAction } from '../../../components';
import { getTicketStatusLabel } from '../../../lib/ticketStatusLabel';
import { STATUS_CONFIG, PRIORITY_CONFIG, STATUS_OPTIONS } from './detailConstants';
import type { Ticket } from '../../../api/ticket';
import type { Role } from '../../../api/auth';

interface TicketQuickAttributesProps {
  ticket: Ticket;
  currentUserRole: Role | undefined;
  canAssign: boolean;
  assigneeActions: DropdownAction[];
  isOverdue: boolean;
}

export const TicketQuickAttributes = ({
  ticket,
  currentUserRole,
  canAssign,
  assigneeActions,
  isOverdue,
}: TicketQuickAttributesProps) => {
  const statusStyle = STATUS_CONFIG[ticket.status];
  const priorityStyle = PRIORITY_CONFIG[ticket.priority];
  const statusLabel = getTicketStatusLabel(
    ticket.status,
    currentUserRole,
    STATUS_OPTIONS.find(s => s.value === ticket.status)?.label ?? ticket.status,
  );

  // Same "tinted fill + colored border" feedback as a selected card in a picker grid — applied on
  // hover/focus-within instead of a fixed selected state, since these are always-live info panels,
  // not options being chosen. Built from the app's own primary token, not a literal reference-image
  // sky blue, so it stays on-brand and correct in both themes automatically.
  const cardClass =
    'flex flex-col gap-1 p-2 rounded-lg bg-surface/60 border border-border/40 transition-colors duration-200 ' +
    'hover:bg-primary-500/5 hover:border-primary-500/30 focus-within:bg-primary-500/5 focus-within:border-primary-500/40';

  // Bumped from font-medium/text-text-muted — at 10px, the lighter weight and flatter gray read as
  // dull/hard to scan; semibold + the slightly darker text-secondary token (still not full-strength
  // text) keeps it a label, not a value, but with enough presence to actually notice.
  const attributeLabelClass = 'text-[10px] capitalize text-text-secondary font-semibold flex items-center gap-1';

  return (
    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-surface-muted/40 border border-border/50">

      {/* Status — read-only here. Changing it is a deliberate action (requires a comment first),
          not a stray click on a quick-glance info card, so the only way to change it is the
          dedicated control in the footer. */}
      <div className={cardClass}>
        <label className={attributeLabelClass}>
          <Tag size={11} className="text-primary-500" /> Status
        </label>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border w-fit ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
          {statusLabel}
          <Lock size={10} className="opacity-50" />
        </span>
      </div>

      {/* Priority Badge */}
      <div className={cardClass}>
        <label className={attributeLabelClass}>
          <Sparkles size={11} className="text-primary-500" /> Priority
        </label>
        <span className={`text-xs font-medium px-2 py-1 rounded-md border w-fit ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
          {ticket.priority}
        </span>
      </div>

      {/* Assignee Selection */}
      <div className={cardClass}>
        <label className={attributeLabelClass}>
          <UserCheck size={11} className="text-primary-500" /> Assignee
        </label>
        {canAssign ? (
          <Dropdown
            align="start"
            items={assigneeActions}
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs px-1.5 py-1 rounded-md border border-border bg-surface text-text cursor-pointer focus:outline-none w-fit"
              >
                {ticket.assignee ? (
                  <span className="flex items-center justify-center size-4.5 rounded-full bg-primary-600 text-white text-[9px] font-display font-medium shrink-0">
                    {ticket.assignee.firstName.slice(0, 2).toUpperCase()}
                  </span>
                ) : (
                  <User size={12} className="text-text-muted" />
                )}
                {ticket.assignee ? ticket.assignee.firstName : 'Unassigned'}
                <ChevronDown size={12} />
              </button>
            }
          />
        ) : (
          <span className="text-xs text-text-secondary flex items-center gap-1.5 py-0.5">
            {ticket.assignee ? (
              <span className="flex items-center justify-center size-4.5 rounded-full bg-primary-600 text-white text-[9px] font-display font-medium shrink-0">
                {ticket.assignee.firstName.slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <User size={12} />
            )}
            {ticket.assignee ? ticket.assignee.firstName : 'Unassigned'}
          </span>
        )}
      </div>

      {/* SLA / Due Date Info */}
      <div className={cardClass}>
        <label className={attributeLabelClass}>
          <Clock size={11} className="text-primary-500" /> SLA Deadline
        </label>
        {ticket.tatDueAt ? (
          <div className="flex items-center gap-1.5 py-0.5">
            <span className={`text-xs font-medium ${isOverdue ? 'text-danger font-bold' : 'text-text-secondary'}`}>
              {new Date(ticket.tatDueAt).toLocaleDateString()}
            </span>
            {isOverdue && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-danger/10 text-danger border border-danger/20 animate-pulse">
                Overdue
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-text-muted py-1">No SLA set</span>
        )}
      </div>

    </div>
  );
};
