import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  trend?: { direction: 'up' | 'down'; label: string };
  icon?: LucideIcon;
  iconTint?: string;
  /** Soft tinted icon-wrapper background, e.g. "bg-success/10" — matches the same glanceable
   *  color-coding used by the Delegation/Ticket pages' quick-filter tiles. Defaults to a neutral
   *  surface tint for callers that don't pass one (e.g. the analytics summary strip). Ignored
   *  when `highlight` is set, since that variant uses its own translucent-on-color treatment. */
  iconBgTint?: string;
  caption?: string;
  /** Accepted but intentionally not rendered — the reference design has no sparkline in these cards. */
  sparkline?: number[];
  onClick?: () => void;
  /** Renders as a solid brand-gradient "hero" tile instead of the plain surface card — for calling
   *  out one headline metric among a row of otherwise-equal stat tiles. */
  highlight?: boolean;
}

const TREND_STYLE = {
  up: 'text-success bg-success/10 border-success/20 dark:bg-success/10 dark:text-success dark:border-success/20',
  down: 'text-danger bg-danger/10 border-danger/20 dark:bg-danger/10 dark:text-danger dark:border-danger/20',
} as const;

const TREND_STYLE_HIGHLIGHT = {
  up: 'text-white bg-white/15 border-white/25',
  down: 'text-white bg-white/15 border-white/25',
} as const;

export const StatCard = ({
  label,
  value,
  trend,
  icon: Icon,
  iconTint,
  iconBgTint = 'bg-surface-hover/80',
  caption,
  onClick,
  highlight = false,
}: StatCardProps) => {
  const TrendIcon = trend?.direction === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`group relative flex flex-col gap-3 rounded-2xl p-5 sm:p-6 transition-all duration-300 ${
        highlight
          ? 'bg-gradient-to-br from-primary-600 to-primary-500 shadow-md shadow-primary-600/25'
          : 'border border-border/60 bg-surface shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] dark:border-white/[0.06] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_10px_28px_-14px_rgba(0,0,0,0.65)]'
      } ${
        onClick
          ? highlight
            ? 'cursor-pointer outline-none hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/50'
            : 'cursor-pointer outline-none hover:border-border dark:hover:border-primary-400/25 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm focus-visible:ring-2 focus-visible:ring-primary-500/50'
          : ''
      }`}
    >
      {/* Top Row: Label & Icon */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={`text-[12px] font-bold ${highlight ? 'text-white/80' : 'text-text-muted'}`}>
            {label}
          </span>
          <p className={`font-display text-3xl sm:text-4xl font-extrabold tracking-tight leading-none ${highlight ? 'text-white' : 'text-text'}`}>
            {value}
          </p>
        </div>

        {Icon && (
          <div
            className={`flex items-center justify-center size-10 rounded-xl border transition-colors shrink-0 ${
              highlight
                ? 'bg-white/15 border-white/20'
                : `${iconBgTint} border-border/40 ${onClick ? 'group-hover:border-border/60' : ''}`
            }`}
          >
            <Icon size={18} className={highlight ? 'text-white' : (iconTint ?? 'text-text-muted')} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Bottom Row: Trend Badge & Caption */}
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
        {trend && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${
              highlight ? TREND_STYLE_HIGHLIGHT[trend.direction] : TREND_STYLE[trend.direction]
            }`}
          >
            <TrendIcon size={12} strokeWidth={3} />
            {trend.label}
          </span>
        )}

        {!trend && caption && (
          <span className={`text-[12px] font-medium ${highlight ? 'text-white/80' : 'text-text-muted'}`}>
            {caption}
          </span>
        )}
      </div>
    </div>
  );
};
