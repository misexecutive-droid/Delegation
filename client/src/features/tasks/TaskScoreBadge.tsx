import { TASK_SCORE, taskScorePercent } from './taskDisplay';
import type { Task } from '../../api/task';

// Done gets the success tint; anything still in progress uses the app's single navy-blue accent
// (not a warning/yellow tier) rather than reading as an alert.
const scoreBadgeClass = (status: Task['status']) => {
  const score = TASK_SCORE[status];
  if (score >= 1) return 'bg-success/10 text-success';
  if (score > 0) return 'bg-primary-500/10 text-primary-600';
  return 'bg-surface-hover text-text-muted';
};

interface TaskScoreBadgeProps {
  status: Task['status'];
  /** 'sm' matches TaskCard's compact meta pills; 'md' matches TaskRow/TaskTable's larger ones. */
  variant?: 'sm' | 'md';
}

const VARIANT_CLASS = {
  sm: 'gap-1 px-1.5 py-0.5 rounded text-[10px]',
  md: 'gap-1.5 px-2 py-0.5 rounded-full text-[11px]',
} as const;

export const TaskScoreBadge = ({ status, variant = 'md' }: TaskScoreBadgeProps) => (
  <span className={`inline-flex items-center font-medium ${VARIANT_CLASS[variant]} ${scoreBadgeClass(status)}`}>
    Mark {taskScorePercent(status)}%
  </span>
);
