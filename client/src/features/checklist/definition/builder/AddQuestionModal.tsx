import { useState, type FormEvent } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Modal } from '../../../../components';
import { ItemTypeConfigFields, isItemDraftComplete } from './ItemTypeConfigFields';
import { emptyItemDraft, type ItemDraft } from '../ChecklistDefinitionItemDraftRow';
import type { PaletteEntry } from './QuestionTypePalette';

interface AddQuestionModalProps {
  entry: PaletteEntry;
  storeId?: string;
  onClose: () => void;
  onConfirm: (patch: Partial<ItemDraft>) => void;
}

export const AddQuestionModal = ({
  entry,
  storeId,
  onClose,
  onConfirm,
}: AddQuestionModalProps) => {
  const [draft, setDraft] = useState<ItemDraft>(() => ({
    ...emptyItemDraft(),
    ...entry.patch,
    label: '',
  }));

  const Icon = entry.icon;
  const patchDraft = (patch: Partial<ItemDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const hasLabel = Boolean(draft.label.trim());
  const isComplete = isItemDraftComplete(draft);
  const canConfirm = hasLabel && isComplete;

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canConfirm) return;
    onConfirm(draft);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={entry.label}
      description="Set this up once — you can still fine-tune it in the list afterwards."
      icon={<Icon size={18} className="text-primary-700 dark:text-primary-400" />}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-display font-medium text-text-secondary border border-border bg-surface hover:bg-surface-hover transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!canConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-display font-medium text-white bg-primary-700 shadow-xs transition-all duration-150 hover:bg-primary-800 hover:shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
          >
            <Sparkles size={14} />
            <span>Add to checklist</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-1">
        {/* Main Item Label Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="quick-add-label"
              className="text-xs font-display font-semibold text-text"
            >
              Task prompt or question <span className="text-danger">*</span>
            </label>
            <span className="text-[11px] text-text-muted">
              What store staff will see
            </span>
          </div>

          <div className="relative">
            <input
              id="quick-add-label"
              autoFocus
              type="text"
              value={draft.label}
              onChange={(e) => patchDraft({ label: e.target.value })}
              placeholder="e.g. Count cash drawer before closing"
              className="w-full px-3.5 py-2.5 text-sm font-display bg-surface text-text rounded-lg border border-border placeholder:text-text-muted/60 transition-all duration-150 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          {!hasLabel && (
            <p className="text-[11px] font-display text-text-muted">
              Enter a clear, actionable title for this task.
            </p>
          )}
        </div>

        {/* Dynamic Type-specific Configuration Fields */}
        <div className="flex flex-col gap-3 pt-3 border-t border-dashed border-border/80">
          <ItemTypeConfigFields
            draft={draft}
            onChange={patchDraft}
            storeId={storeId}
          />
        </div>
      </form>
    </Modal>
  );
};