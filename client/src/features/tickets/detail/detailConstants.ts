import type { TicketStatus, RestrictedStatus } from '../../../api/ticket';


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

export const UPLOADS_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5050';

export const SECTION_HEADER = 'text-xs font-display font-medium text-text-secondary flex items-center gap-1.5 mb-2';
