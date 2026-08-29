import { LABEL_CLASS, PRIORITIES, type TicketPriority } from './formConstants';

interface PriorityFieldProps {
  value: TicketPriority;
  onChange: (value: TicketPriority) => void;
}

export const PriorityField = ({ value, onChange }: PriorityFieldProps) => (
  <div className="flex flex-col gap-2">
    <label className={LABEL_CLASS}>Priority Level</label>
    <div className="flex flex-wrap gap-1.5">
      {PRIORITIES.map((p) => {
        const isSelected = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(p.value)}
            className={`h-8 px-3.5 text-xs font-display font-semibold rounded-full border bg-surface transition-all duration-150 cursor-pointer ${
              isSelected ? p.selectedClass : `${p.outlineClass} hover:border-border-hover`
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  </div>
);
