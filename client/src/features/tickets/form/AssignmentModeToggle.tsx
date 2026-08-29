import { User, Zap } from 'lucide-react';
import { LABEL_CLASS } from './formConstants';

interface AssignmentModeToggleProps {
  mode: 'MANUAL' | 'AUTO';
  onChange: (mode: 'MANUAL' | 'AUTO') => void;
}

// Both segments share one selected treatment (solid fill, not a faint tint) so which mode is
// active is obvious at a glance instead of only one option visibly "popping" when chosen.
const SEGMENT_BASE =
  'flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-2.5 px-1 text-xs font-display font-semibold rounded-md text-center transition-all duration-200 cursor-pointer';
const SEGMENT_SELECTED = 'bg-primary-600 text-white shadow-sm shadow-primary-600/25';
const SEGMENT_IDLE = 'text-text-muted hover:text-text hover:bg-surface-active/40';

export const AssignmentModeToggle = ({ mode, onChange }: AssignmentModeToggleProps) => (
  <div className="flex flex-col gap-2">
    <label className={LABEL_CLASS}>Assignment Strategy</label>
    <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-surface-muted/50 border border-border/50 rounded-lg">
      <button
        type="button"
        onClick={() => onChange('MANUAL')}
        aria-pressed={mode === 'MANUAL'}
        className={`${SEGMENT_BASE} ${mode === 'MANUAL' ? SEGMENT_SELECTED : SEGMENT_IDLE}`}
      >
        <User className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Manual Dispatch</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('AUTO')}
        aria-pressed={mode === 'AUTO'}
        className={`${SEGMENT_BASE} ${mode === 'AUTO' ? SEGMENT_SELECTED : SEGMENT_IDLE}`}
      >
        <Zap className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Auto Assign</span>
      </button>
    </div>
  </div>
);
