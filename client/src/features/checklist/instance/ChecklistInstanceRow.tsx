import { Link } from 'react-router';
import { Check, Circle, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/statusChip';
import {
  formatDate,
  instanceProgressStatus,
  VERIFICATION_STATUS_LABEL,
  isInstanceOverdue,
} from '../checklistDisplay';
import type { ChecklistInstance, ChecklistVerificationStatus } from '../../../api/checklistInstances';

interface ChecklistInstanceRowProps {
  instance: ChecklistInstance;
}

// Row-local mapping from the verification workflow status to a Badge tone — same status concept
// previously rendered via VERIFICATION_STATUS_STYLE's hand-rolled border/bg classes.
const VERIFICATION_BADGE_VARIANT: Record<ChecklistVerificationStatus, 'neutral' | 'warning' | 'success' | 'destructive'> = {
  NOT_SUBMITTED: 'neutral',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

// One row in ChecklistDefinitionDetail's Todo/In-progress/Completed grouped instance list — the
// row-view sibling of ChecklistInstanceCard (used by MyChecklists' grid instead).
export const ChecklistInstanceRow = ({ instance }: ChecklistInstanceRowProps) => {
  const total = instance.items.length;
  const done = instance.items.filter(i => i.isDone).length;
  const status = instanceProgressStatus(done, total);
  const progress = total ? Math.round((done / total) * 100) : 0;
  const overdue = isInstanceOverdue(instance.periodEnd, status === 'COMPLETED');

  return (
    <Link
      to={`/checklists/${instance.id}`}
      className="flex items-center gap-3 px-4 py-3.5 rounded-lg border border-border bg-surface hover:border-border-hover transition-colors duration-200"
    >
      {status === 'COMPLETED' ? (
        <span className="flex items-center justify-center size-5 rounded-full bg-success text-white shrink-0">
          <Check size={12} strokeWidth={3} />
        </span>
      ) : (
        <Circle
          size={20}
          className={`shrink-0 ${status === 'IN_PROGRESS' ? 'text-warning' : 'text-text-light'}`}
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-medium text-text truncate">
          {formatDate(instance.periodStart)} — {formatDate(instance.periodEnd)}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-text-muted font-display">
            <ClipboardList size={11} /> {done}/{total}
          </span>
          <Badge variant={status === 'COMPLETED' ? 'success' : 'warning'}>
            {status === 'COMPLETED' ? 'Done' : `Mark ${progress}%`}
          </Badge>
          <Badge variant={VERIFICATION_BADGE_VARIANT[instance.verificationStatus]}>
            {VERIFICATION_STATUS_LABEL[instance.verificationStatus]}
          </Badge>
          {overdue && <StatusChip status="overdue" />}
        </div>
      </div>

      <span className="text-xs text-text-muted font-display shrink-0">{formatDate(instance.generatedAt)}</span>
    </Link>
  );
};
