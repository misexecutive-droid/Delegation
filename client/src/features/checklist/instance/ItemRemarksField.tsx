import { useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useSetChecklistInstanceItemDoneMutation } from '../hook';
import type { ChecklistInstanceItem } from '../../../api/checklistInstances';

interface ItemRemarksFieldProps {
  item: ChecklistInstanceItem;
  instanceId: string;
  // The item's parent instance is overdue and this item is still not done — a genuinely skipped
  // step should always carry an explanation, so the field is styled as required rather than
  // silently optional (there's no single "submit" action to hard-block on in this flow).
  required: boolean;
}

// Shared, item-type-agnostic remarks box — rendered once by ChecklistInstanceDetail around
// whichever card ITEM_CARD_RENDERERS picked, rather than duplicated inside all twelve item-type
// card components. AUDIT items are excluded by the caller — they already carry their own
// per-auditor remarks on ChecklistInstanceItemSubmission.
export const ItemRemarksField = ({ item, instanceId, required }: ItemRemarksFieldProps) => {
  const [value, setValue] = useState(item.remarks ?? '');
  const [dirty, setDirty] = useState(false);
  const mutation = useSetChecklistInstanceItemDoneMutation(instanceId);

  const save = () => {
    mutation.mutate({ itemId: item.id, isDone: item.isDone, remarks: value.trim() });
    setDirty(false);
  };

  const missing = required && !item.remarks?.trim();

  return (
    <div className={`flex flex-col gap-1.5 pl-3 ml-2 border-l-2 ${missing ? 'border-danger/40' : 'border-border/40'}`}>
      <label className={`flex items-center gap-1.5 text-[11px] font-display font-medium ${missing ? 'text-danger' : 'text-text-muted'}`}>
        <MessageSquare size={11} />
        {required ? 'Remarks required — this item is overdue' : 'Remarks (optional)'}
      </label>
      <div className="flex items-start gap-2">
        <textarea
          value={value}
          onChange={e => { setValue(e.target.value); setDirty(true); }}
          rows={1}
          placeholder="Explain why this isn't done yet…"
          className={`flex-1 min-w-0 px-2.5 py-1.5 text-xs font-display bg-surface text-text rounded-md border resize-none placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors duration-150 ${
            missing ? 'border-danger/50' : 'border-border'
          }`}
        />
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={mutation.isPending || !value.trim()}
            className="shrink-0 flex items-center justify-center px-2.5 py-1.5 rounded-md text-xs font-display font-medium text-white bg-primary-700 hover:bg-primary-800 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
};
