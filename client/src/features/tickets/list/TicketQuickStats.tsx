import { CircleDashed, CheckCircle2, CalendarClock, AlertTriangle, type LucideIcon } from "lucide-react";

export type TicketQuickFilterKey = 'pending' | 'completed' | 'due' | 'delayed';

export interface TicketQuickFilterCounts {
    pending: number;
    completed: number;
    due: number;
    delayed: number;
}

const TILES: { key: TicketQuickFilterKey; label: string; icon: LucideIcon; tint: string }[] = [
    { key: 'pending', label: 'Pending', icon: CircleDashed, tint: 'text-status-todo' },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, tint: 'text-success' },
    { key: 'due', label: 'Due', icon: CalendarClock, tint: 'text-warning' },
    { key: 'delayed', label: 'Delayed', icon: AlertTriangle, tint: 'text-danger' },
];

interface TicketQuickStatsProps {
    counts: TicketQuickFilterCounts;
    active: TicketQuickFilterKey | null;
    onToggle: (key: TicketQuickFilterKey) => void;
}

// Same "at a glance, one tap" tile row as the Delegation page's TaskQuickStats — kept as its own
// component (rather than shared) since the underlying predicates are ticket-shaped (status/
// tatDueAt/isOverdue) rather than task-shaped, but the visual language is identical on purpose.
export const TicketQuickStats = ({ counts, active, onToggle }: TicketQuickStatsProps) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TILES.map(({ key, label, icon: Icon, tint }) => {
            const isActive = active === key;
            return (
                <button
                    key={key}
                    type="button"
                    onClick={() => onToggle(key)}
                    aria-pressed={isActive}
                    title={isActive ? `Clear "${label}" filter` : `Show only ${label.toLowerCase()} tickets`}
                    className={[
                        'group relative flex items-center gap-3 rounded-xl p-4 text-left transition-[box-shadow,transform,border-color] duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 font-display',
                        isActive
                            ? 'border border-primary-300 bg-primary-50 shadow-sm dark:bg-primary-500/10'
                            : 'border border-border bg-surface hover:border-primary-200 hover:shadow-sm hover:-translate-y-0.5',
                    ].join(' ')}
                >
                    <div className={`flex items-center justify-center size-9 rounded-lg shrink-0 bg-surface-hover ${tint}`}>
                        <Icon size={18} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-bold tracking-tight text-text leading-none">{counts[key]}</p>
                        <p className="text-xs font-medium text-text-muted mt-1 truncate">{label}</p>
                    </div>
                </button>
            );
        })}
    </div>
);
