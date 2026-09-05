export interface PriorityChipMeta {
  label: string;
  className: string;
  accent: string;
}

interface PriorityChipProps {
  meta: PriorityChipMeta;
  className?: string;
}

const DEFAULT_CLASS = 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium';

// A colored dot + label chip driven by a domain's own priority map (Task's PRIORITY_MAP, Ticket's
// PRIORITY_CONFIG — same {label, className, accent} shape) — shared here so tasks and tickets
// render priority identically instead of each hand-rolling the same dot+label markup.
export const PriorityChip = ({ meta, className = DEFAULT_CLASS }: PriorityChipProps) => (
  <span className={`${className} ${meta.className}`}>
    <span className={`size-1.5 rounded-full shrink-0 ${meta.accent}`} />
    {meta.label}
  </span>
);
