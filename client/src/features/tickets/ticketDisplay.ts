import type { Ticket, TicketStatus } from '../../api/ticket';

// `className` here is only for RecentActivity.tsx's own glow-dot activity pill (a more
// specialized treatment than the shared StatusChip) — every plain status chip render should use
// <StatusChip status={...} /> from components/statusChip instead of this className.
export const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string; dot: string }> = {
  OPEN: {
    label: 'Open',
    className: 'bg-surface-hover text-text-secondary ring-border',
    dot: 'bg-text-muted',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-warning/10 text-warning ring-warning/20',
    dot: 'bg-warning',
  },
  IN_REVIEW: {
    label: 'In Review',
    className: 'bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-primary-500/20',
    dot: 'bg-primary-500',
  },
  CLOSED: {
    label: 'Closed',
    className: 'bg-success/10 text-success ring-success/20',
    dot: 'bg-success',
  },
  ON_HOLD: {
    label: 'On Hold',
    className: 'bg-surface-hover text-text-muted ring-border',
    dot: 'bg-border',
  },
};

export const PRIORITY_CONFIG: Record<Ticket['priority'], { label: string; className: string; accent: string; stripe: string }> = {
  LOW: { 
    label: 'Low', 
    className: 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border/50 bg-surface-hover/30 px-2.5 py-0.5 text-xs font-medium text-text-muted transition-all', 
    accent: 'bg-text-muted', 
    stripe: 'bg-border' 
  },
  MEDIUM: { 
    label: 'Medium', 
    className: 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning-700 dark:text-warning shadow-sm transition-all', 
    accent: 'bg-warning', 
    stripe: 'bg-warning/50' 
  },
  HIGH: { 
    label: 'High', 
    className: 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-danger/30 bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger-700 dark:text-danger shadow-sm transition-all', 
    accent: 'bg-danger', 
    stripe: 'bg-danger/50' 
  },
  CRITICAL: { 
    label: 'Critical', 
    className: 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-transparent bg-danger px-2.5 py-0.5 text-xs font-bold text-white shadow-md shadow-danger/20 transition-all', 
    accent: 'bg-white', 
    stripe: 'bg-danger/80' 
  },
};