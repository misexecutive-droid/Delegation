import { QuickFilterStats, statusTiles } from '../../../components/quickFilterStats';

export type MyChecklistsQuickFilterKey = 'completed' | 'due' | 'overdue';

export interface MyChecklistsQuickFilterCounts {
  completed: number;
  due: number;
  overdue: number;
}

// The user-facing counterpart of the admin Compliance board's stat row, one tier down: "Due" is
// the broad not-yet-done bucket (mirrors the Dashboard's own Due/Completed split), "Overdue" is
// the subset that has run past its period end — the same due/overdue relationship Tickets uses.
const TILES = statusTiles<MyChecklistsQuickFilterKey>(['due', 'completed', 'overdue']);

interface MyChecklistsQuickStatsProps {
  counts: MyChecklistsQuickFilterCounts;
  /** Everything in scope, unfiltered — the number the page header used to state in words. */
  total: number;
  active: MyChecklistsQuickFilterKey | null;
  onToggle: (key: MyChecklistsQuickFilterKey) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export const MyChecklistsQuickStats = ({ counts, total, active, onToggle, onClear, isLoading }: MyChecklistsQuickStatsProps) => (
  <QuickFilterStats tiles={TILES} counts={counts} active={active} onToggle={onToggle} total={total} onClearFilter={onClear} totalLabel="Assigned to you" itemLabel="checklists" variant="navy" isLoading={isLoading} />
);
