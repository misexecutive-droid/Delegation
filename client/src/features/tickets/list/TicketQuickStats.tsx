import { CircleDashed, CheckCircle2, CalendarClock, AlertTriangle } from "lucide-react";
import { QuickFilterStats, type QuickFilterTile } from "../../../components/quickFilterStats";

export type TicketQuickFilterKey = 'pending' | 'completed' | 'due' | 'delayed';

export interface TicketQuickFilterCounts {
  pending: number;
  completed: number;
  due: number;
  delayed: number;
}

const TILES: QuickFilterTile<TicketQuickFilterKey>[] = [
  { key: 'pending', label: 'Pending', icon: CircleDashed, tint: 'text-status-todo', bgTint: 'bg-status-todo/10', accentBar: 'bg-status-todo', accentBorder: 'border-status-todo/50', accentRing: 'ring-status-todo/25' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, tint: 'text-success', bgTint: 'bg-success/10', accentBar: 'bg-success', accentBorder: 'border-success/50', accentRing: 'ring-success/25' },
  { key: 'due', label: 'Due', icon: CalendarClock, tint: 'text-warning', bgTint: 'bg-warning/10', accentBar: 'bg-warning', accentBorder: 'border-warning/50', accentRing: 'ring-warning/25' },
  { key: 'delayed', label: 'Delayed', icon: AlertTriangle, tint: 'text-danger', bgTint: 'bg-danger/10', accentBar: 'bg-danger', accentBorder: 'border-danger/50', accentRing: 'ring-danger/25' },
];

interface TicketQuickStatsProps {
  counts: TicketQuickFilterCounts;
  active: TicketQuickFilterKey | null;
  onToggle: (key: TicketQuickFilterKey) => void;
}

// Thin wrapper around the shared QuickFilterStats, same one the Delegation page uses — this file
// just owns the Ticket-specific tile data (keys/icons/colors), not the tile rendering itself.
export const TicketQuickStats = ({ counts, active, onToggle }: TicketQuickStatsProps) => (
  <QuickFilterStats tiles={TILES} counts={counts} active={active} onToggle={onToggle} itemLabel="tickets" />
);
