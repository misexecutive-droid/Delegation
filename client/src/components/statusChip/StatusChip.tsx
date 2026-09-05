import type { ReactNode } from 'react';
import { Clock, PauseCircle, CheckCircle2, CircleDot, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, type badgeVariants } from '../ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type StatusChipStatus =
  | 'due'
  | 'overdue'
  | 'on_hold'
  | 'open'
  | 'in_progress'
  | 'in_review'
  | 'pending'
  | 'completed'
  | 'closed';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

interface StatusChipConfig {
  label: string;
  variant: BadgeVariant;
  icon?: LucideIcon;
}

// Single source of truth for every "lifecycle status" chip in the app (Due / Overdue / On Hold /
// Open / In Progress / etc.) — tasks, tickets, and checklists were each hand-rolling their own
// version of the same pill (some via Badge, some via a raw <span>), which is how ticket status
// chips ended up on invalid classes like `text-warning-700` (not a real token) that silently
// rendered with no color at all in light mode.
const STATUS_CHIP_CONFIG: Record<StatusChipStatus, StatusChipConfig> = {
  due: { label: 'Due', variant: 'warning', icon: Clock },
  overdue: { label: 'Overdue', variant: 'destructive', icon: Clock },
  on_hold: { label: 'On Hold', variant: 'neutral', icon: PauseCircle },
  open: { label: 'Open', variant: 'neutral', icon: CircleDot },
  in_progress: { label: 'In Progress', variant: 'warning', icon: Clock },
  in_review: { label: 'In Review', variant: 'default', icon: Eye },
  pending: { label: 'Pending', variant: 'neutral', icon: Clock },
  completed: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
  closed: { label: 'Closed', variant: 'success', icon: CheckCircle2 },
};

export interface StatusChipProps {
  status: StatusChipStatus;
  /** Override the default label (e.g. a live "Mark 40%" instead of a static word). */
  label?: ReactNode;
  /** Pass `false` to hide the icon, or a different Lucide icon to override the default. */
  icon?: LucideIcon | false;
  className?: string;
  /** Extra trailing content inside the chip (e.g. a lock icon marking the status read-only). */
  children?: ReactNode;
}

/** The chip's default label for a status — for a caller that needs the plain word itself
 *  (e.g. to feed into role-based label overrides) rather than the rendered chip. Exported
 *  alongside the component like badge.tsx's own badgeVariants — only affects Fast Refresh
 *  granularity, not runtime correctness.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const getStatusChipLabel = (status: StatusChipStatus) => STATUS_CHIP_CONFIG[status].label;

export const StatusChip = ({ status, label, icon, className, children }: StatusChipProps) => {
  const config = STATUS_CHIP_CONFIG[status];
  const Icon = icon === false ? null : icon ?? config.icon;

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {Icon && <Icon size={11} />}
      {label ?? config.label}
      {children}
    </Badge>
  );
};
