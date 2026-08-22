import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  trend?: { direction: 'up' | 'down'; label: string };
  icon?: LucideIcon;
  iconTint?: string;
  caption?: string;
  /** Accepted but intentionally not rendered — the reference design has no sparkline in these cards. */
  sparkline?: number[];
  onClick?: () => void;
}

const TREND_STYLE = {
  up: 'text-success bg-success/10 border-success/20 dark:bg-success/10 dark:text-success dark:border-success/20',
  down: 'text-danger bg-danger/10 border-danger/20 dark:bg-danger/10 dark:text-danger dark:border-danger/20',
} as const;

export const StatCard = ({ label, value, trend, icon: Icon, iconTint, caption, onClick }: StatCardProps) => {
  const TrendIcon = trend?.direction === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`group relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 transition-all duration-300 ${
        onClick 
          ? 'cursor-pointer outline-none shadow-sm hover:border-border hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary-500/50' 
          : 'shadow-sm'
      }`}
    >
      {/* Top Row: Label & Icon */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold text-text-muted uppercase tracking-wider">
            {label}
          </span>
          <p className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-text leading-none">
            {value}
          </p>
        </div>
        
        {Icon && (
          <div className={`flex items-center justify-center size-10 rounded-xl bg-surface-hover/80 border border-border/40 transition-colors shrink-0 ${onClick ? 'group-hover:bg-surface-hover group-hover:border-border/60' : ''}`}>
            <Icon size={18} className={iconTint ?? 'text-text-muted'} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Bottom Row: Trend Badge & Caption */}
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
        {trend && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${TREND_STYLE[trend.direction]}`}>
            <TrendIcon size={12} strokeWidth={3} />
            {trend.label}
          </span>
        )}
        
        {!trend && caption && (
          <span className="text-[12px] font-medium text-text-muted">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
};