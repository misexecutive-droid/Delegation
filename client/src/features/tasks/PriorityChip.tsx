import { PRIORITY_MAP } from './taskDisplay';
import type { Task } from '../../api/task';

interface PriorityChipProps {
  priority: Task['priority'];
  className?: string;
}

const DEFAULT_CLASS = 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium';

// A colored dot + label chip driven by PRIORITY_MAP — the markup itself was being copy-pasted at
// every call site even though the color lookup was already centralized. `className` lets each
// call site keep its own sizing (card vs row vs table density) without duplicating the dot+label
// structure or the color-lookup logic.
export const PriorityChip = ({ priority, className = DEFAULT_CLASS }: PriorityChipProps) => {
  const meta = PRIORITY_MAP[priority];
  return (
    <span className={`${className} ${meta.className}`}>
      <span className={`size-1.5 rounded-full shrink-0 ${meta.accent}`} />
      {meta.label}
    </span>
  );
};
