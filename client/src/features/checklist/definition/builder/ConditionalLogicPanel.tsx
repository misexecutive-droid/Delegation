import { Zap, ChevronRight, Check, X, AlertCircle } from 'lucide-react';
import type { ChecklistConditionalAction } from '../../../../api/checklistDefinitions';

const TRIGGER_LABELS: Record<'YES_NO' | 'PASS_FAIL', { yes: string; no: string }> = {
  YES_NO: { yes: 'Yes', no: 'No' },
  PASS_FAIL: { yes: 'Pass', no: 'Fail' },
};

const ACTION_OPTIONS: { value: ChecklistConditionalAction; label: string }[] = [
  { value: 'REQUIRE_PHOTO', label: 'Photo mandatory' },
  { value: 'ASK_REASON', label: 'Ask reason' },
  { value: 'CREATE_ISSUE', label: 'Create issue' },
  { value: 'NOTIFY_AREA_MANAGER', label: 'Notify Area Manager' },
];

interface ConditionalLogicPanelProps {
  itemType: 'YES_NO' | 'PASS_FAIL';
  trigger: 'YES' | 'NO' | '';
  actions: ChecklistConditionalAction[];
  onTriggerChange: (trigger: 'YES' | 'NO' | '') => void;
  onActionsChange: (actions: ChecklistConditionalAction[]) => void;
  className?: string;
}

export const ConditionalLogicPanel = ({
  itemType,
  trigger,
  actions,
  onTriggerChange,
  onActionsChange,
  className = '',
}: ConditionalLogicPanelProps) => {
  const labels = TRIGGER_LABELS[itemType];

  const toggleAction = (action: ChecklistConditionalAction) => {
    onActionsChange(
      actions.includes(action)
        ? actions.filter((a) => a !== action)
        : [...actions, action]
    );
  };

  // State when no conditional logic is attached yet
  if (!trigger) {
    return (
      <button
        type="button"
        onClick={() => onTriggerChange('NO')}
        className={`group/trigger inline-flex items-center gap-2 px-3 py-1.5 mt-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 text-xs font-display font-medium text-warning transition-all duration-150 hover:border-warning/60 hover:bg-warning/20 hover:shadow-xs active:scale-[0.98] cursor-pointer w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-warning/50 ${className}`}
      >
        <Zap
          size={13}
          className="text-warning transition-transform duration-200 group-hover/trigger:scale-110 group-hover/trigger:-rotate-6"
        />
        <span>Add conditional logic</span>
      </button>
    );
  }

  const activeSummary = actions.length
    ? actions
        .map((a) => ACTION_OPTIONS.find((o) => o.value === a)?.label)
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <div
      role="region"
      aria-label="Conditional logic settings"
      className={`flex flex-col gap-3 p-3.5 mt-2.5 rounded-xl bg-warning/10 border border-warning/30 shadow-xs transition-all ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider text-warning">
          <Zap size={13} className="text-warning shrink-0" />
          Conditional Logic
        </span>
        <button
          type="button"
          onClick={() => {
            onTriggerChange('');
            onActionsChange([]);
          }}
          className="p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
          aria-label="Remove conditional logic"
          title="Remove logic"
        >
          <X size={14} />
        </button>
      </div>

      {/* Trigger Expression Row */}
      <div className="flex items-center gap-2 text-xs font-display text-text-secondary flex-wrap bg-surface p-2 rounded-lg border border-border/80 shadow-2xs">
        <span className="font-medium text-text">If answer is</span>

        {/* Segmented Control */}
        <div className="inline-flex items-center rounded-md bg-muted/60 p-0.5 border border-border/60">
          {(['YES', 'NO'] as const).map((value) => {
            const isSelected = trigger === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onTriggerChange(value)}
                aria-pressed={isSelected}
                className={[
                  'px-2.5 py-1 rounded text-xs font-display font-medium transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                  isSelected
                    ? 'bg-surface text-warning font-bold shadow-xs border border-border/40'
                    : 'text-text-muted hover:text-text hover:bg-surface/50',
                ].join(' ')}
              >
                {value === 'YES' ? labels.yes : labels.no}
              </button>
            );
          })}
        </div>

        <ChevronRight size={13} className="text-text-muted shrink-0" />
        <span className="font-medium text-text">then trigger:</span>
      </div>

      {/* Action Chips */}
      <div className="flex flex-wrap gap-2 pt-0.5">
        {ACTION_OPTIONS.map((opt) => {
          const isChecked = actions.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleAction(opt.value)}
              aria-pressed={isChecked}
              className={[
                'group/chip inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-display font-medium transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-warning/50',
                isChecked
                  ? 'border-warning/50 bg-warning/15 text-warning shadow-2xs font-semibold'
                  : 'border-border bg-surface text-text-secondary hover:bg-surface-hover hover:border-border/80 hover:text-text',
              ].join(' ')}
            >
              <span
                className={[
                  'flex items-center justify-center size-3.5 rounded-full border transition-all duration-150 shrink-0',
                  isChecked
                    ? 'border-warning bg-warning text-white'
                    : 'border-border bg-transparent group-hover/chip:border-text-muted',
                ].join(' ')}
              >
                {isChecked && <Check size={9} strokeWidth={3.5} />}
              </span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Action Summary / Guidance */}
      {activeSummary ? (
        <div className="flex items-center gap-1.5 text-[11px] font-display text-warning/80 bg-warning/10 border border-warning/20 rounded-md px-2.5 py-1.5">
          <span>
            Rule: When answered <strong className="font-bold">{trigger === 'YES' ? labels.yes : labels.no}</strong> &rarr; {activeSummary}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-[11px] font-display text-text-muted px-1">
          <AlertCircle size={11} className="shrink-0" />
          <span>Select at least one action above to activate this rule.</span>
        </div>
      )}
    </div>
  );
};