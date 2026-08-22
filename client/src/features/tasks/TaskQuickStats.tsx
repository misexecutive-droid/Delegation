import { CircleDashed, CheckCircle2, CalendarClock, AlertTriangle, type LucideIcon } from "lucide-react";

export type QuickFilterKey = 'pending' | 'completed' | 'due' | 'delayed';

export interface QuickFilterCounts {
  pending: number;
  completed: number;
  due: number;
  delayed: number;
}

const TILES: { key: QuickFilterKey; label: string; icon: LucideIcon; tint: string; bgTint: string }[] = [
  { key: 'pending', label: 'Pending', icon: CircleDashed, tint: 'text-status-todo', bgTint: 'bg-status-todo/10' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, tint: 'text-success', bgTint: 'bg-success/10' },
  { key: 'due', label: 'Due', icon: CalendarClock, tint: 'text-warning', bgTint: 'bg-warning/10' },
  { key: 'delayed', label: 'Delayed', icon: AlertTriangle, tint: 'text-danger', bgTint: 'bg-danger/10' },
];

interface TaskQuickStatsProps {
  counts: QuickFilterCounts;
  active: QuickFilterKey | null;
  onToggle: (key: QuickFilterKey) => void;
}

// A row of clickable, glanceable KPI boxes for the Delegation list — each tile both shows a
// count and doubles as a one-click filter into that exact subset (click again, or another tile,
// to switch/clear). Kept separate from the fuller TaskFiltersPopover: this is the "at a glance,
// one tap" layer, that popover is the "I need to combine several conditions" layer.
export const TaskQuickStats = ({ counts, active, onToggle }: TaskQuickStatsProps) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
    {TILES.map(({ key, label, icon: Icon, tint, bgTint }) => {
      const isActive = active === key;
      return (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key)}
          aria-pressed={isActive}
          title={isActive ? `Clear "${label}" filter` : `Show only ${label.toLowerCase()} delegations`}
          className={`group relative flex items-center gap-3 md:gap-4 rounded-xl p-3.5 md:p-5 text-left transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 border ${
            isActive
              ? 'border-primary-300 bg-primary-50/80 shadow-md ring-1 ring-primary-300/50 dark:bg-primary-900/10 dark:border-primary-600/60 dark:ring-primary-600/30'
              : 'border-border/60 bg-surface shadow-sm hover:border-border hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          {/* Icon Wrapper: a soft status-tinted background (not just a status-colored icon on a
              neutral tile) so each tile reads at a glance, plus the usual lift/shift on hover */}
          <div className={`flex items-center justify-center size-10 md:size-12 rounded-lg shrink-0 transition-all duration-300 ${tint} ${bgTint} ${
            isActive
              ? 'shadow-sm border border-border/40'
              : 'group-hover:shadow-sm group-hover:border group-hover:border-border/40'
          }`}>
            <Icon size={20} strokeWidth={2.5} className={isActive ? 'scale-110 transition-transform' : 'transition-transform'} />
          </div>

          <div className="min-w-0">
            <p className="text-xl md:text-2xl font-bold tracking-tight text-text leading-none">
              {counts[key]}
            </p>
            <p className="text-[9px] md:text-xs font-semibold text-text-muted uppercase mt-1.5 truncate tracking-wider">
              {label}
            </p>
          </div>
        </button>
      );
    })}
  </div>
);