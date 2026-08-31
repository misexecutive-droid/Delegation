
import { ItemTypeConfigFields } from './builder/ItemTypeConfigFields';
import type { ChecklistItemType, ChecklistConditionalAction } from '../../../api/checklistDefinitions';

export type ItemDraft = {
  label: string;
  requiredImageCount: string;
  maxImageCount: string;
  requiresLivePhoto: boolean;
  itemType: ChecklistItemType;
  auditUserIds: string[];
  accessories: string[];
  numberEntryUnit: string;
  numberEntryMin: string;
  numberEntryMax: string;
  ratingScale: string;
  options: string[];
  gpsTargetLat: string;
  gpsTargetLng: string;
  gpsRadiusMeters: string;
  qrExpectedValue: string;
  cashExpectedAmount: string;
  conditionalTrigger: 'YES' | 'NO' | '';
  conditionalActions: ChecklistConditionalAction[];
};

// eslint-disable-next-line react-refresh/only-export-components
export const emptyItemDraft = (): ItemDraft => ({
  label: '',
  requiredImageCount: '0',
  maxImageCount: '',
  requiresLivePhoto: false,
  itemType: 'STANDARD',
  auditUserIds: [],
  accessories: [],
  numberEntryUnit: '',
  numberEntryMin: '',
  numberEntryMax: '',
  ratingScale: '5',
  options: [],
  gpsTargetLat: '',
  gpsTargetLng: '',
  gpsRadiusMeters: '',
  qrExpectedValue: '',
  cashExpectedAmount: '',
  conditionalTrigger: '',
  conditionalActions: [],
});

// eslint-disable-next-line react-refresh/only-export-components
export const ITEM_TYPE_LABEL: Record<ChecklistItemType, string> = {
  STANDARD: 'Standard',
  AUDIT: 'Audit',
  NUMBER_ENTRY: 'Number entry',
  RATING: 'Rating',
  YES_NO: 'Yes / No',
  PASS_FAIL: 'Pass / Fail',
  MULTIPLE_CHOICE: 'Multiple choice',
  DROPDOWN: 'Dropdown',
  TEXT_BOX: 'Text box',
  DATE_TIME: 'Date & time',
  GPS: 'GPS location',
  SIGNATURE: 'Signature',
  DUAL_SIGNATURE: 'Dual signature',
  QR_SCAN: 'QR / Barcode scan',
  CASH_TALLY: 'Cash tally',
  VIDEO_UPLOAD: 'Video upload',
};

const ITEM_TYPES = [
  'STANDARD', 'AUDIT', 'NUMBER_ENTRY', 'RATING',
  'YES_NO', 'PASS_FAIL', 'MULTIPLE_CHOICE', 'DROPDOWN', 'TEXT_BOX', 'DATE_TIME',
  'GPS', 'SIGNATURE', 'DUAL_SIGNATURE', 'QR_SCAN', 'CASH_TALLY', 'VIDEO_UPLOAD',
] as const satisfies readonly ChecklistItemType[];

interface ChecklistDefinitionItemDraftRowProps {
  index: number;
  draft: ItemDraft;
  onChange: (index: number, patch: Partial<ItemDraft>) => void;
  storeId?: string;
  className?: string;
}

export const ChecklistDefinitionItemDraftRow = ({
  index,
  draft,
  onChange,
  storeId,
  className = '',
}: ChecklistDefinitionItemDraftRowProps) => {
  const patch = (p: Partial<ItemDraft>) => onChange(index, p);

  return (
    <div
      className={`flex flex-col gap-3.5 p-4 rounded-xl border border-border bg-surface shadow-xs transition-all duration-150 hover:border-border/90 hover:shadow-sm ${className}`}
    >
      {/* Item Index + Main Description Input */}
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center size-7 rounded-lg bg-muted/60 text-text-secondary text-xs font-mono font-bold shrink-0 tabular-nums select-none border border-border/40">
          {String(index + 1).padStart(2, '0')}
        </span>

        <input
          type="text"
          value={draft.label}
          onChange={(e) => patch({ label: e.target.value })}
          placeholder={`Task ${index + 1} prompt (e.g. Inspect refrigeration temperature)...`}
          aria-label={`Task ${index + 1} title`}
          className="flex-1 min-w-0 px-3.5 py-2 text-sm font-display bg-surface text-text rounded-lg border border-border placeholder:text-text-muted/60 hover:border-border/80 transition-all duration-150 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {/* Horizontal Question Type Switcher */}
      <div
        role="radiogroup"
        aria-label="Question type switcher"
        className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-lg border border-border/80 bg-muted/30 p-1 text-xs font-display"
      >
        {ITEM_TYPES.map((type) => {
          const isSelected = draft.itemType === type;
          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Switch type to ${ITEM_TYPE_LABEL[type]}`}
              onClick={() => patch({ itemType: type })}
              className={[
                'shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                isSelected
                  ? 'bg-primary-700 text-white shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text hover:bg-surface/60',
              ].join(' ')}
            >
              {ITEM_TYPE_LABEL[type]}
            </button>
          );
        })}
      </div>

      {/* Type-specific Fields Configuration */}
      <div className="pt-2.5 border-t border-dashed border-border/60">
        <ItemTypeConfigFields draft={draft} onChange={patch} storeId={storeId} />
      </div>
    </div>
  );
};