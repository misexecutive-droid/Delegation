import { CircleDashed, CheckCircle2, CalendarClock, AlertTriangle } from "lucide-react";
import { QuickFilterStats, type QuickFilterTile } from "../../components/quickFilterStats";

export type QuickFilterKey = 'pending' | 'completed' | 'due' | 'delayed';

export interface QuickFilterCounts {
  pending: number;
  completed: number;
  due: number;
  delayed: number;
}

const TILES: QuickFilterTile<QuickFilterKey>[] = [
  { key: 'pending', label: 'Pending', icon: CircleDashed, tint: 'text-status-todo', bgTint: 'bg-status-todo/10', accentBar: 'bg-status-todo', accentBorder: 'border-status-todo/50', accentRing: 'ring-status-todo/25' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, tint: 'text-success', bgTint: 'bg-success/10', accentBar: 'bg-success', accentBorder: 'border-success/50', accentRing: 'ring-success/25' },
  { key: 'due', label: 'Due', icon: CalendarClock, tint: 'text-warning', bgTint: 'bg-warning/10', accentBar: 'bg-warning', accentBorder: 'border-warning/50', accentRing: 'ring-warning/25' },
  { key: 'delayed', label: 'Delayed', icon: AlertTriangle, tint: 'text-danger', bgTint: 'bg-danger/10', accentBar: 'bg-danger', accentBorder: 'border-danger/50', accentRing: 'ring-danger/25' },
];

interface TaskQuickStatsProps {
  counts: QuickFilterCounts;
  active: QuickFilterKey | null;
  onToggle: (key: QuickFilterKey) => void;
}

// Thin wrapper around the shared QuickFilterStats — this file just owns the Delegation-specific
// tile data (keys/icons/colors), not the tile rendering itself.
export const TaskQuickStats = ({ counts, active, onToggle }: TaskQuickStatsProps) => (
  <QuickFilterStats tiles={TILES} counts={counts} active={active} onToggle={onToggle} itemLabel="delegations" />
);
