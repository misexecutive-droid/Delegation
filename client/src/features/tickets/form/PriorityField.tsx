import { Check } from 'lucide-react';
import { LABEL_CLASS, PRIORITIES, type TicketPriority } from './formConstants';

interface PriorityFieldProps {
  value: TicketPriority;
  onChange: (value: TicketPriority) => void;
}

export const PriorityField = ({ value, onChange }: PriorityFieldProps) => (
  <div className="flex flex-col gap-2">
    <label className={LABEL_CLASS}>Priority Level</label>
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Priority Level">
      {PRIORITIES.map((p) => {
        const isSelected = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            aria-pressed={isSelected}
            aria-label={`Select ${p.label} priority`}
            onClick={() => onChange(p.value)}
          
            className={`h-8 px-3.5 text-xs font-display font-semibold rounded-full border-2 bg-surface transition-all duration-150 cursor-pointer outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
              isSelected 
                ? `${p.selectedClass} shadow-sm` 
                : `${p.outlineClass} hover:border-border-hover`
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {isSelected && <Check size={12} strokeWidth={3} className="shrink-0" />}
              <span>{p.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  </div>
);