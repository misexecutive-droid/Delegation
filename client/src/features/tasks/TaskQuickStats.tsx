import { QuickFilterStats, statusTiles } from "../../components/quickFilterStats";

export type QuickFilterKey = 'pending' | 'completed' | 'due' | 'delayed';

export interface QuickFilterCounts {
  pending: number;
  completed: number;
  due: number;
  delayed: number;
}

const TILES = statusTiles<QuickFilterKey>(['pending', 'completed', 'due', 'delayed']);

interface TaskQuickStatsProps {
  counts: QuickFilterCounts;
  /** Everything in scope, unfiltered — the number the page header used to state in words. */
  total: number;
  active: QuickFilterKey | null;
  onToggle: (key: QuickFilterKey) => void;
  onClear: () => void;
  isLoading?: boolean;
}

// All this file owns now is which buckets Delegation shows — the tiles' appearance comes from the
// shared statusTiles() catalogue, and the lead "Total" tile from QuickFilterStats' own `total`
// prop, which is what stopped this row and the Tickets/To-Do/Checklists rows from drifting apart.
export const TaskQuickStats = ({ counts, total, active, onToggle, onClear, isLoading }: TaskQuickStatsProps) => (
  <QuickFilterStats
    tiles={TILES}
    counts={counts}
    active={active}
    onToggle={onToggle}
    total={total}
    onClearFilter={onClear}
    itemLabel="delegations"
    variant="navy"
    isLoading={isLoading}
  />
);
