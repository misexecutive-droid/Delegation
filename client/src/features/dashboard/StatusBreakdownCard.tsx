import type { MouseEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
// Cross-feature import is deliberate: this decorative overlay has no admin-specific logic (just
// circles/lines), and the user asked for these cards to visually match the admin chrome — rather
// than fork a duplicate copy, it's shared as-is from where it already lives.
import { AdminChromeAccents } from '../admin/AdminChromeAccents';

export interface StatusBreakdownRow {
  label: string;
  value: number;
  tone?: 'default' | 'warning' | 'success';
  /** Deep-links this one row into the filtered list view — omit where the app has nowhere
   *  specific to send it (e.g. a row that folds multiple statuses together). */
  onClick?: () => void;
}

interface StatusBreakdownCardProps {
  icon: LucideIcon;
  title: string;
  total: number;
  totalLabel?: string;
  /** The whole card navigates on click — no separate icon button needed. */
  onOpen?: () => void;
  /** Renders a "Coming Soon" placeholder body instead of rows/total, for a domain that isn't a
   *  real feature yet (e.g. Checklists) — same card chrome, so it sits naturally in the row
   *  instead of looking like a broken/empty tile. */
  comingSoon?: boolean;
  rows?: StatusBreakdownRow[];
}

const ROW_VALUE_TONE_CLASS: Record<NonNullable<StatusBreakdownRow['tone']>, string> = {
  default: 'text-white',
  warning: 'text-coral-300',
  success: 'text-emerald-300',
};

// A "breakdown + total" card — a short list of status counts on the left, one bold total on the
// right — on the same navy gradient + circle/line chrome as the admin header and sidebar, so the
// dashboard's own stats read as part of the same "interactive control surface" visual language
// instead of a plain white card.
export const StatusBreakdownCard = ({ icon: Icon, title, rows = [], total, totalLabel = 'Assigned', onOpen, comingSoon = false }: StatusBreakdownCardProps) => (
  <div
    onClick={comingSoon ? undefined : onOpen}
    role={onOpen && !comingSoon ? 'button' : undefined}
    tabIndex={onOpen && !comingSoon ? 0 : undefined}
    onKeyDown={onOpen && !comingSoon ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
    className={`group relative flex flex-col rounded-2xl bg-gradient-to-br from-slate-950 via-primary-800 to-primary-600 shadow-lg shadow-primary-900/20 overflow-hidden transition-all duration-300 ${
      onOpen && !comingSoon ? 'cursor-pointer outline-none hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-white/40' : ''
    } ${comingSoon ? 'opacity-80' : ''}`}
  >
    <AdminChromeAccents scale="compact" />

    <div className="relative z-10 flex items-center gap-2.5 px-4 py-3.5 border-b border-white/10">
      <div className="flex items-center justify-center size-8 rounded-lg bg-white/15 shrink-0 transition-transform duration-300 group-hover:scale-105">
        <Icon size={16} className="text-white" strokeWidth={2.25} />
      </div>
      <span className="text-sm font-display font-bold text-white truncate">{title}</span>
      {comingSoon && (
        <span className="ml-auto shrink-0 text-[10px] font-display font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/60">
          Soon
        </span>
      )}
    </div>

    {comingSoon ? (
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 text-center">
        <p className="text-xs font-display font-medium text-white/50 max-w-[16rem]">
          {title} isn't available yet — check back once it's ready.
        </p>
      </div>
    ) : (
      <div className="relative z-10 flex flex-1 items-stretch gap-3 p-3">
        <div className="flex-1 flex flex-col justify-center min-w-0 px-1">
          {rows.map((row) => {
            const RowTag = row.onClick ? 'button' : 'div';
            return (
              <RowTag
                key={row.label}
                type={row.onClick ? 'button' : undefined}
                onClick={
                  row.onClick
                    ? (e: MouseEvent) => {
                        e.stopPropagation();
                        row.onClick?.();
                      }
                    : undefined
                }
                className={`flex items-center justify-between gap-3 text-sm font-display rounded-lg px-1.5 py-1 -mx-1.5 transition-colors ${
                  row.onClick ? 'cursor-pointer hover:bg-white/10 text-left' : ''
                }`}
              >
                <span className="text-white/70 truncate">{row.label}</span>
                <span className={`font-bold tabular-nums shrink-0 ${ROW_VALUE_TONE_CLASS[row.tone ?? 'default']}`}>{row.value}</span>
              </RowTag>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-center gap-0.5 w-24 sm:w-28 shrink-0 rounded-xl bg-white/10 border border-white/15 transition-transform duration-300 group-hover:scale-[1.02]">
          <span className="text-2xl sm:text-3xl font-display font-bold tabular-nums leading-none text-white">{total}</span>
          <span className="text-[11px] font-display font-medium text-white/70">{totalLabel}</span>
        </div>
      </div>
    )}
  </div>
);
