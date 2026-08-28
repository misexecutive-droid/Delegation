import type { Ticket, TicketStatus, RestrictedStatus } from '../../../api/ticket';

// The 3 statuses a non-verifier (assignee/creator/manager) can move a ticket to through the
// dedicated "Update Status" panel — deliberately narrower than STATUS_OPTIONS, which still
// powers the full dropdown verifiers (PC/Admin) see. "Completed" is the human label for
// IN_REVIEW: from this role's perspective they're done, even though it still needs PC sign-off.
export const STATUS_UPDATE_OPTIONS: { value: RestrictedStatus; label: string }[] = [
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'IN_REVIEW', label: 'Completed' },
];

export const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

export const STATUS_CONFIG: Record<TicketStatus, { bg: string; text: string; border: string }> = {
  OPEN: { bg: 'bg-surface-hover', text: 'text-text-secondary', border: 'border-border' },
  IN_PROGRESS: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  IN_REVIEW: { bg: 'bg-primary-500/10', text: 'text-primary-600', border: 'border-primary-500/20' },
  CLOSED: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  ON_HOLD: { bg: 'bg-surface', text: 'text-text-muted', border: 'border-border' },
};

export const PRIORITY_CONFIG: Record<Ticket['priority'], { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-surface-hover', text: 'text-text-muted', border: 'border-border' },
  MEDIUM: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  HIGH: { bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/20' },
  CRITICAL: { bg: 'bg-danger/15', text: 'text-danger font-bold', border: 'border-danger/30' },
};

export const UPLOADS_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5050';

export const SECTION_HEADER = 'text-xs font-display font-medium text-text-secondary flex items-center gap-1.5 mb-2';
