import { QuickFilterStats, statusTiles } from '../../components/quickFilterStats';

export type TodoQuickFilterKey = 'pending' | 'completed' | 'due' | 'delayed';

export interface TodoQuickFilterCounts {
  pending: number;
  completed: number;
  due: number;
  delayed: number;
}

const TILES = statusTiles<TodoQuickFilterKey>(['pending', 'completed', 'due', 'delayed']);

interface TodoQuickStatsProps {
  counts: TodoQuickFilterCounts;
  /** Everything in scope, unfiltered — the number the page header used to state in words. */
  total: number;
  active: TodoQuickFilterKey | null;
  onToggle: (key: TodoQuickFilterKey) => void;
  onClear: () => void;
  isLoading?: boolean;
}

// Identical buckets to Delegation's row, over to-dos instead of tasks. Previously this file and
// TaskQuickStats.tsx held character-for-character identical 4-tile arrays.
export const TodoQuickStats = ({ counts, total, active, onToggle, onClear, isLoading }: TodoQuickStatsProps) => (
  <QuickFilterStats tiles={TILES} counts={counts} active={active} onToggle={onToggle} total={total} onClearFilter={onClear} itemLabel="to-dos" variant="navy" isLoading={isLoading} />
);
