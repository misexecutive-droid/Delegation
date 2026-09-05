import { StatusRemarkDialog } from '../../components/statusRemarkDialog';
import { StatusChip, getStatusChipLabel, type StatusChipStatus } from '../../components/statusChip';
import type { Ticket } from '../../api/ticket';

interface TicketStatusRemarkDialogProps {
  ticket: Ticket;
  toStatus: Ticket['status'];
  onCancel: () => void;
  onConfirm: (remark: string) => void;
  isSubmitting?: boolean;
  nested?: boolean;
}

const chip = (status: Ticket['status']) => {
  const key = status.toLowerCase() as StatusChipStatus;
  return <StatusChip status={key} label={getStatusChipLabel(key)} icon={false} />;
};

/** Tickets' wording and chips over the shared StatusRemarkDialog — see TaskStatusRemarkDialog. */
export const TicketStatusRemarkDialog = ({
  ticket, toStatus, onCancel, onConfirm, isSubmitting, nested,
}: TicketStatusRemarkDialogProps) => (
  <StatusRemarkDialog
    itemTitle={ticket.title}
    from={chip(ticket.status)}
    to={chip(toStatus)}
    confirmLabel={`Move to ${getStatusChipLabel(toStatus.toLowerCase() as StatusChipStatus)}`}
    description="Status changes are recorded on this ticket's history for everyone working on it."
    placeholder="e.g. Spoke to the vendor — replacement part is in transit, resuming work."
    onCancel={onCancel}
    onConfirm={onConfirm}
    isSubmitting={isSubmitting}
    nested={nested}
  />
);
