import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  /** A raw `number` is formatted for display (thousands separators); a `string` is printed as-is. */
  value: number | string;
  trend?: { direction: 'up' | 'down'; label: string };
  /**
   * Set for metrics where a rising number is bad news — Overdue, backlog, failures. The trend
   * arrow always follows the actual movement; this only flips which movement is coloured green.
   *
   * Without it, `latestWithTrend(ticketRows, 'overdueCount')` returning `direction: 'up'` on a
   * *climbing* overdue count rendered as a green upward arrow, i.e. reported a worsening backlog
   * as an improvement.
   */
  lowerIsBetter?: boolean;
  icon?: LucideIcon;
  iconTint?: string;
  iconBgTint?: string;
  caption?: string;
  onClick?: () => void;
  highlight?: boolean;
  decorative?: boolean;
}

type TrendMood = 'good' | 'bad' | 'flat';

const TREND_STYLE: Record<TrendMood, string> = {
  good: 'text-success bg-success/10 border-success/20',
  bad: 'text-danger bg-danger/10 border-danger/20',
  flat: 'text-text-muted bg-surface-hover border-border/60',
};

const TREND_STYLE_HIGHLIGHT: Record<TrendMood, string> = {
  good: 'text-white bg-white/20 border-white/30',
  bad: 'text-white bg-white/20 border-white/30',
  flat: 'text-white/80 bg-white/10 border-white/20',
};

/**
 * Counts arrive as raw numbers, and `4218` printed bare is materially harder to read at a glance
 * than `4,218` — which matters most on exactly the big-number cards this component exists for.
 * Percentage strings ("85%") and placeholders ("—") are passed through untouched.
 */
const formatValue = (value: number | string) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : String(value);

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
  decorative = false,
  lowerIsBetter = false,
}: StatCardProps) => {
  const isInteractive = Boolean(onClick);

  // `latestWithTrend` hands back `{ direction: 'up', label: '—' }` when there's no data to compare,
  // which rendered as a green upward arrow next to an em-dash — a trend badge asserting a direction
  // it doesn't have. No comparison, no badge.
  const hasTrend = trend != null && trend.label !== '—';
  // Callers signing their own labels ("+0.0%") means a genuinely unchanged metric has to be
  // detected numerically rather than by string match. 'New' parses as NaN, so it stays directional.
  const isFlat = hasTrend && Number.parseFloat(trend.label) === 0;
  const trendMood: TrendMood = !hasTrend || isFlat ? 'flat' : trend.direction === 'up' !== lowerIsBetter ? 'good' : 'bad';
  const TrendIcon = isFlat ? Minus : trend?.direction === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!(); } } : undefined}
      className={`group relative flex flex-col gap-3 rounded-2xl p-5 sm:p-6 transition-all duration-300 ${
        highlight
          ? decorative
            // `from-slate-950` before — a raw Tailwind default in a project that mandates its own
            // palette, and the last one left in this folder. primary-900 is the darkest navy the
            // theme actually defines, so the ramp now starts on a token.
            ? 'bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600 shadow-md shadow-primary-900/30 overflow-hidden'
            : 'bg-gradient-to-br from-primary-600 to-primary-500 shadow-md shadow-primary-600/25'
          : 'border border-border/60 bg-surface dark:border-white/[0.06]'
      } ${
        isInteractive
          ? highlight
            ? 'cursor-pointer outline-none hover:shadow-lg hover:-translate-y-1 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600'
            // The bordered variant hovers on border color, not a box-shadow — the gradient
            // variants above keep their elevation, since a shadow is doing real work under a
            // floating hero card, but a plain bordered card in this app doesn't cast one.
            : 'cursor-pointer outline-none hover:border-border-hover hover:-translate-y-1 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary-500/50'
          : ''
      }`}
    >
      {/* Decorative Background Elements */}
      {highlight && decorative && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" aria-hidden="true">
          <span className="absolute -top-8 -right-6 size-24 rounded-full border border-white/10 opacity-70" />
          <span className="absolute -bottom-10 -left-6 size-20 rounded-full border border-white/5 opacity-70" />
          <span className="absolute top-0 right-12 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent -skew-x-12" />
        </div>
      )}

      {/* Top Row: Label & Icon */}
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex flex-col gap-1.5 min-w-0">
          {/* Sentence case, not `uppercase font-bold` — at 12px an all-caps bold label competes
              with the number it's labelling, and these read as real labels ("On-time completion"),
              not the 10-11px eyebrow micro-labels where caps still work. */}
          <span className={`text-xs font-display font-semibold tracking-wide ${highlight ? 'text-white/80' : 'text-text-muted'}`}>
            {label}
          </span>
          {/* `tabular-nums` keeps digits the same width, so a row of these cards aligns and a
              value that updates in place doesn't jitter. No `truncate` — a clipped number is a
              wrong number, and formatted values are short by nature. */}
          <p className={`font-display text-3xl sm:text-4xl font-bold tracking-tight leading-none tabular-nums ${highlight ? 'text-white' : 'text-text'}`}>
            {formatValue(value)}
          </p>
        </div>

        {Icon && (
          <div
            className={`flex items-center justify-center size-10 rounded-xl border transition-all duration-300 shrink-0 ${
              highlight
                ? 'bg-white/15 border-white/20'
                : `${iconBgTint} border-border/40 ${isInteractive ? 'group-hover:border-border/60 group-hover:bg-surface-hover' : ''}`
            }`}
          >
            <Icon 
              size={18} 
              className={`transition-transform duration-300 ${isInteractive ? 'group-hover:scale-110' : ''} ${highlight ? 'text-white' : (iconTint ?? 'text-text-muted')}`} 
              strokeWidth={2.5} 
            />
          </div>
        )}
      </div>

      {/* Bottom Row: Trend & Caption (Now allowed to coexist) */}
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5 relative z-10">
        {hasTrend && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold tabular-nums ${
              highlight ? TREND_STYLE_HIGHLIGHT[trendMood] : TREND_STYLE[trendMood]
            }`}
          >
            <TrendIcon size={12} strokeWidth={3} />
            {trend.label}
          </span>
        )}

        {/* Removed the !trend restriction so caption can explain the trend */}
        {caption && (
          <span className={`text-[12px] font-medium ${highlight ? 'text-white/70' : 'text-text-muted/80'}`}>
            {caption}
          </span>
        )}
      </div>
    </div>
  );
};