import { ArrowDown, ArrowUp, Target } from 'lucide-react';
import { RadialGauge } from '../../components/radialGauge';
import type { CompliancePeriod, Trend } from './dashboardDisplay';

export interface FooterStat {
  label: string;
  value: string;
  direction: 'up' | 'down';
}

const PERIOD_OPTIONS: { key: CompliancePeriod; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

interface MonthlyTargetCardProps {
  percent: number;
  change: Trend;
  description: string;
  stats: [FooterStat, FooterStat, FooterStat];
  period: CompliancePeriod;
  onPeriodChange: (period: CompliancePeriod) => void;
}

export const MonthlyTargetCard = ({ percent, change, description, stats, period, onPeriodChange }: MonthlyTargetCardProps) => {
  const ChangeIcon = change.direction === 'up' ? ArrowUp : ArrowDown;
  const changeClassName = change.direction === 'up'
    ? 'bg-success/10 text-success border-success/20'
    : 'bg-danger/10 text-danger border-danger/20';

  return (
    <div className="relative group rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 lg:p-7 flex flex-col gap-2 hover:border-border hover:shadow-md transition-all duration-300 overflow-hidden">

      {/* Decorative Background Glow - Adjusted for Light/Dark modes */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/15 dark:bg-primary-500/10 rounded-full blur-[60px] pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-60" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4 z-10">
        <div className="flex gap-3 items-center">
          <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-800/50 text-primary-600 dark:text-primary-400 shadow-sm">
            <Target size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text tracking-tight leading-tight">Target</h3>
            <p className="text-xs font-medium text-text-muted mt-0.5 capitalize tracking-wide">Checklist completion</p>
          </div>
        </div>

        {/* Period selector — Flex-1 ensures perfect scaling on tiny mobile screens */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-hover/80 border border-border/40 w-full sm:w-auto">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onPeriodChange(opt.key)}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                period === opt.key
                  ? 'bg-surface text-text shadow-sm ring-1 ring-border/50'
                  : 'text-text-muted hover:text-text hover:bg-surface-active/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body Layout Split */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6 lg:gap-10 mt-6">

        {/* Gauge */}
        <RadialGauge percent={percent} size={220}>
          <span className="text-5xl font-bold bg-gradient-to-br from-text to-text-muted bg-clip-text text-transparent tracking-tight">
            {percent}<span className="text-3xl">%</span>
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border shadow-sm ${changeClassName}`}>
            <ChangeIcon size={12} strokeWidth={3} />
            {change.label}
          </span>
        </RadialGauge>

        {/* Right Details Column */}
        <div className="flex-1 w-full flex flex-col gap-5">
          <p className="text-sm font-medium text-text-muted text-center lg:text-left leading-relaxed max-w-lg mx-auto lg:mx-0">
            {description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.map(stat => {
              const TrendIcon = stat.direction === 'up' ? ArrowUp : ArrowDown;
              const trendClassName = stat.direction === 'up' ? 'text-success' : 'text-danger';

              return (
                <div
                  key={stat.label}
                  className="flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-1.5 p-4 rounded-xl bg-surface-hover/30 border border-border/40 hover:bg-surface-hover/70 hover:border-border/80 transition-all duration-200"
                >
                  <span className="text-xs font-semibold text-text-muted capitalize tracking-wide">{stat.label}</span>
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
    </div>
  );
};