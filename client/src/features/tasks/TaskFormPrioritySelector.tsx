import { FIELD_LABEL_CLASS, FIELD_CARD_CLASS } from './taskFormFieldStyles';
import type { Task } from '../../api/task';

const PRIORITIES: { value: Task['priority']; label: string; short: string }[] = [
  { value: 'low', label: 'Low', short: 'L' },
  { value: 'medium', label: 'Medium', short: 'M' },
  { value: 'high', label: 'High', short: 'H' },
];

interface TaskFormPrioritySelectorProps {
  value: Task['priority'];
  onChange: (value: Task['priority']) => void;
  disabled?: boolean;
}

export const TaskFormPrioritySelector = ({ value, onChange, disabled = false }: TaskFormPrioritySelectorProps) => (
  <div className={`group/field @container flex flex-col gap-1.5 ${FIELD_CARD_CLASS}`}>
    <label className={FIELD_LABEL_CLASS}>
      Priority Level
    </label>
    <div className="grid grid-cols-3 gap-1.5">
      {PRIORITIES.map((p) => {
        const isSelected = value === p.value;

        return (
          <button
            key={p.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(p.value)}
            disabled={disabled}
    
            className={`relative flex items-center justify-center gap-2 h-10 px-3 text-sm font-medium rounded border transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${
              isSelected
                ? 'bg-primary-50 text-primary-700 border-primary-300 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-700/60'
                : 'bg-surface border-border text-text-secondary hover:text-text hover:border-border-hover'
            }`}
          >
          
            <span className="@sm:hidden">{p.short}</span>
            <span className="hidden @sm:inline truncate">{p.label}</span>
          </button>
        );
      })}
    </div>
  </div>
);