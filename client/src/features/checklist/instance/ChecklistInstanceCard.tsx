import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/statusChip';
import { formatDateShort, rateBarClass, isInstanceOverdue } from '../checklistDisplay';
import type { ChecklistInstance } from '../../../api/checklistInstances';

interface ChecklistInstanceCardProps {
  instance: ChecklistInstance;
}

// One card in MyChecklists' grid — the card-view sibling of ChecklistInstanceRow (used by
// ChecklistDefinitionDetail's list instead).
export const ChecklistInstanceCard = ({ instance }: ChecklistInstanceCardProps) => {
  const total = instance.items.length;
  const done = instance.items.filter(i => i.isDone).length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const isComplete = total > 0 && done === total;
  const overdue = isInstanceOverdue(instance.periodEnd, isComplete);

  return (
    <Link
      to={`/checklists/${instance.id}`}
      className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-surface hover:border-primary-500/40 transition-colors duration-200"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-display font-medium text-text">{instance.title}</p>
        <Badge variant={isComplete ? 'success' : 'warning'} className="shrink-0">
          {isComplete ? 'Done' : `Mark ${progress}%`}
        </Badge>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-text-muted font-display">
          {formatDateShort(instance.periodStart)} – {formatDateShort(instance.periodEnd)}
        </p>
        {overdue && <StatusChip status="overdue" />}
      </div>

      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 bg-surface-hover rounded-full overflow-hidden border border-border/50">
          <div
            className={`h-full rounded-full transition-all duration-500 ${rateBarClass(progress)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-text-muted font-display font-medium w-8 text-right">{done}/{total}</span>
      </div>
    </Link>
  );
};
