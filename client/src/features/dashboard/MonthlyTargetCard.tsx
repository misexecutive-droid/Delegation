import { ArrowDown, ArrowUp, Minus, Target } from 'lucide-react';
import { RadialGauge } from '../../components/radialGauge';
import { useIsMobile } from '../../lib/useMediaQuery';
import { PeriodTabControl } from './PeriodTabControl';
import { PERIOD_LABEL, COMPLIANCE_PERIOD_OPTIONS, PERIOD_TAB_LABEL, type CompliancePeriod, type Trend } from './dashboardDisplay';

export interface FooterStat {
  label: string;
  value: string;
  /**
   * Which way the number itself actually moved against the previous period. This used to double as
   * the sentiment, which broke on "Pending": fewer pending items is good, so it was passed
   * `direction: 'up'` when the count had gone *down* — a green upward arrow beside a number that
   * had visibly dropped.
   */
  direction: 'up' | 'down' | 'flat';
  /** Whether that movement is good news for this particular metric. Drives colour only. */
  sentiment: 'good' | 'bad' | 'neutral';
}

interface MonthlyTargetCardProps {
  percent: number;
  change: Trend;
  description: string;
  stats: [FooterStat, FooterStat, FooterStat];
  period: CompliancePeriod;
  onPeriodChange: (period: CompliancePeriod) => void;
}

const STAT_SENTIMENT: Record<FooterStat['sentiment'], string> = {
  good: 'text-success',
  bad: 'text-danger',
  neutral: 'text-text-muted',
};

export const MonthlyTargetCard = ({ percent, change, description, stats, period, onPeriodChange }: MonthlyTargetCardProps) => {
  // 220px was hardcoded, which is a lot of gauge for a card that sits in a half-width column.
  // Scales down on phones the way the Compliance gauges already do.
  const isMobile = useIsMobile();
  const gaugeSize = isMobile ? 180 : 220;

  // pointDelta always signs its label ("+0.0%"), so an unchanged score has to be detected
  // numerically — it was previously rendering as a green upward arrow, i.e. claiming an
  // improvement that hadn't happened. Same fix already applied to the Compliance gauges.
  const isFlatChange = Number.parseFloat(change.label) === 0;
  const ChangeIcon = isFlatChange ? Minus : change.direction === 'up' ? ArrowUp : ArrowDown;
  const changeClassName = isFlatChange
    ? 'bg-surface-hover text-text-muted border-border/60'
    : change.direction === 'up'
      ? 'bg-success/10 text-success border-success/20'
      : 'bg-danger/10 text-danger border-danger/20';

  return (
    // `@container` + `@lg:`/`@sm:` below size this card's internal layout off its own rendered
    // width, not the viewport — it now shares a row with CompareDashboard in a 2-column grid, so a
    // viewport breakpoint would flip to the wide side-by-side layout on any laptop-width screen
    // even though the actual column is only half that wide.
    // `hover:border-primary-500/40` matches every other card on the page — `primary-300` was a
    // one-off with no dark-mode variant, so in dark mode this card's hover barely registered.
    // `gap-6` replaces the body block's own `mt-6`, so the card owns its spacing in one place.
    <section aria-labelledby="delegation-score-heading" className="@container relative group rounded-2xl border border-border/60 dark:border-white/[0.06] bg-surface p-4 sm:p-6 lg:p-7 flex flex-col gap-6 hover:border-primary-500/40 transition-all duration-300 overflow-hidden">

      {/* Decorative Background Glow - Adjusted for Light/Dark modes */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/15 dark:bg-primary-500/10 rounded-full blur-[60px] pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-60" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4 z-10">
        <div className="flex gap-3 items-center">
          <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-800/50 text-primary-600 dark:text-primary-400 shadow-sm">
            <Target size={20} strokeWidth={2.5} />
          </div>
          <div>
            {/* Was "Target" / "Checklist completion" — but `percent` here is a weighted delegation
                score (see HomePage's weightedScorePercent), not checklist data at all. Naming it
                accurately also keeps it from reading as the same number as the Compliance gauges
                or Compare Dashboard's own "Completion", which are scoped differently. */}
            <h2 id="delegation-score-heading" className="text-base sm:text-lg font-display font-bold text-text tracking-tight leading-tight">Delegation Score</h2>
            <p className="text-xs font-medium text-text-muted mt-0.5 tracking-wide">Weighted completion, {PERIOD_LABEL[period]}</p>
          </div>
        </div>

        <PeriodTabControl
          value={period}
          options={COMPLIANCE_PERIOD_OPTIONS}
          labels={PERIOD_TAB_LABEL}
          onChange={onPeriodChange}
          className="w-full sm:w-auto"
        />
      </div>

      {/* Body Layout Split */}
      <div className="relative z-10 flex flex-col @lg:flex-row items-center gap-6 @lg:gap-10">

        {/* Gauge */}
        <RadialGauge percent={percent} size={gaugeSize}>
          {/* Solid `text-text`, not the gradient-to-`text-muted` clip this had — a decorative fade
              on the card's headline number dropped its lower half to muted contrast, which is the
              one figure here that has to be legible at a glance. */}
          <span className="text-5xl font-display font-bold text-text tracking-tight tabular-nums">
            {percent}<span className="text-3xl">%</span>
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border ${changeClassName}`}>
            <ChangeIcon size={12} strokeWidth={3} />
            {change.label}
          </span>
        </RadialGauge>

        {/* Right Details Column */}
        <div className="flex-1 w-full flex flex-col gap-5">
          <p className="text-sm font-medium text-text-muted text-center @lg:text-left leading-relaxed max-w-lg mx-auto @lg:mx-0">
            {description}
          </p>

          <div className="grid grid-cols-1 @sm:grid-cols-3 gap-3">
            {stats.map(stat => {
              // Arrow = which way the number moved; colour = whether that's good. Separating the
              // two is what lets "Pending: 3 ↓" be green.
              const TrendIcon = stat.direction === 'flat' ? Minus : stat.direction === 'up' ? ArrowUp : ArrowDown;
              const trendClassName = STAT_SENTIMENT[stat.sentiment];

              return (
                <div
                  key={stat.label}
                  className="flex flex-row @sm:flex-col items-center justify-between @sm:justify-center gap-1.5 p-4 rounded-xl bg-surface-hover/30 border border-border/40 hover:bg-surface-hover/70 hover:border-border/80 transition-all duration-200"
                >
                  <span className="text-xs font-medium text-text-muted capitalize tracking-wide">{stat.label}</span>
                  <span className="inline-flex items-center gap-1.5 text-xl font-bold text-text">
                    {stat.value}
                    <TrendIcon size={16} strokeWidth={3} className={trendClassName} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};