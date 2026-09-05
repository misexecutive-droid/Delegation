import {
  Camera,
  MapPin,
  Clock,
  PenLine,
  ScanLine,
  ShieldCheck,
  Check,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ChecklistProofType } from '../../../../api/checklistDefinitions';

// Colocated with the component like ui/badge.tsx's own badgeVariants export — only affects Fast
// Refresh granularity (a full reload instead of a hot-swap when this file changes), not runtime
// correctness.
// eslint-disable-next-line react-refresh/only-export-components
export const PROOF_OPTIONS: {
  value: ChecklistProofType;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: 'PHOTO',
    label: 'Photo',
    description: 'Requires a photo upload from device camera',
    icon: Camera,
  },
  {
    value: 'GPS_MATCH',
    label: 'GPS match',
    description: 'Verifies staff is physically at the store location',
    icon: MapPin,
  },
  {
    value: 'TIMESTAMP',
    label: 'Timestamp',
    description: 'Logs exact capture time upon completion',
    icon: Clock,
  },
  {
    value: 'SIGNATURE',
    label: 'Signature',
    description: 'Collects digital sign-off from staff or manager',
    icon: PenLine,
  },
  {
    value: 'QR_SCAN',
    label: 'QR scan',
    description: 'Requires scanning an on-site QR code',
    icon: ScanLine,
  },
];

interface BuilderProofPanelProps {
  selected: ChecklistProofType[];
  onChange: (proof: ChecklistProofType[]) => void;
  className?: string;
}

export const BuilderProofPanel = ({
  selected,
  onChange,
  className = '',
}: BuilderProofPanelProps) => {
  const toggle = (value: ChecklistProofType) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const handleClearAll = () => onChange([]);

  return (
    <div
      role="group"
      aria-labelledby="proof-required-heading"
      className={`flex flex-col gap-4 p-5 rounded-xl border border-border bg-surface shadow-xs transition-all duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-muted/60 text-text-secondary">
            <ShieldCheck size={14} />
          </span>
          <div>
            <h3
              id="proof-required-heading"
              className="text-xs font-display font-bold uppercase tracking-wider text-text"
            >
              Proof & Verification
            </h3>
            <p className="text-[11px] font-display text-text-muted">
              Select any required validation before submission
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selected.length > 0 ? (
            <>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-display font-medium text-text-muted hover:text-text underline cursor-pointer transition-colors"
              >
                Clear all
              </button>
              <Badge variant="info" className="text-[11px] py-0.5 px-2">
                {selected.length} required
              </Badge>
            </>
          ) : (
            <Badge variant="outline" className="text-[11px] py-0.5 px-2 text-text-muted">
              Optional
            </Badge>
          )}
        </div>
      </div>

      {/* Proof Option Buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        {PROOF_OPTIONS.map((opt) => {
          const isChecked = selected.includes(opt.value);
          const Icon = opt.icon;

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={isChecked}
              title={opt.description}
              className={[
                'group flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-display font-medium transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                isChecked
                  ? 'bg-primary-700 text-white shadow-xs hover:bg-primary-800'
                  : 'bg-surface border border-border text-text-secondary hover:bg-surface-hover hover:border-border/80 hover:text-text',
              ].join(' ')}
            >
              <Icon
                size={13}
                className={
                  isChecked
                    ? 'text-white'
                    : 'text-text-muted group-hover:text-text'
                }
              />
              <span>{opt.label}</span>
              {isChecked && (
                <Check size={12} strokeWidth={3} className="ml-0.5 text-white/90" />
              )}
            </button>
          );
        })}
      </div>

      {/* Dynamic Guidance Banner */}
      <div
        className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs font-display leading-relaxed transition-colors duration-200 ${
          selected.length > 0
            ? 'bg-primary-500/10 border-primary-500/20 text-primary-900 dark:text-primary-200'
            : 'bg-muted/40 border-border/60 text-text-muted'
        }`}
      >
        <Info size={15} className="shrink-0 mt-0.5" />
        <p className="flex-1 text-[11px]">
          {selected.length > 0 ? (
            <>
              Checklist submission will require store staff to verify{' '}
              <strong className="font-semibold">
                {selected
                  .map((val) => PROOF_OPTIONS.find((p) => p.value === val)?.label)
                  .filter(Boolean)
                  .join(', ')}
              </strong>{' '}
              prior to completion.
            </>
          ) : (
            'No additional verification required. Store teams can mark checklist tasks complete without mandatory attachments.'
          )}
        </p>
      </div>
    </div>
  );
};