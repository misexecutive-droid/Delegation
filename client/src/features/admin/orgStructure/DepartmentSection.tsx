import { memo, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Layers, Store as StoreIcon, Users } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EntityIconTile, MetricPill, AvatarStack } from '../../../components';
import { resolveAvatarUrl } from '../../../lib/uploadsBase';
import type { DepartmentNode } from './orgStructureDisplay';
import { UserRow } from './UserRow';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DepartmentSectionProps {
  node: DepartmentNode;
  isOpen: boolean;
  forceOpen: boolean;
  /** Takes the department's own id — lets callers pass one stable, id-accepting callback down
   *  instead of a fresh per-item closure on every render (see StoreSection/OrgStructurePage). */
  onToggle: (id: string) => void;
  /** Shown only in the "Unassigned Departments" bucket, where the store link itself is the point. */
  showUnassignedStoreHint?: boolean;
}

// Memoized: without this, expanding/collapsing one department (or a sibling store) re-renders
// every department section — and every user row inside it — across the whole org tree.
export const DepartmentSection = memo(({ node, isOpen, forceOpen, onToggle, showUnassignedStoreHint }: DepartmentSectionProps) => {
  const open = isOpen || forceOpen;
  const people = useMemo(
    () => node.users.map((u) => ({ name: `${u.firstName} ${u.lastName ?? ''}`, src: resolveAvatarUrl(u.avatarUrl) })),
    [node.users]
  );

  return (
    <div className="rounded-xl border border-border/70 bg-surface-hover/30 overflow-hidden transition-colors duration-200 hover:border-primary-200 hover:bg-surface">
      <button
        type="button"
        onClick={forceOpen ? undefined : () => onToggle(node.department.id)}
        className="flex w-full flex-wrap items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-surface-hover cursor-pointer disabled:cursor-default"
        disabled={forceOpen}
      >
        <EntityIconTile icon={Layers} tone="primary" />
        <span className="text-sm font-display font-bold text-text truncate">{node.department.name}</span>
        {showUnassignedStoreHint && (
          <span className="flex items-center gap-1 text-[10px] font-display font-bold px-2 py-0.5 rounded-full shrink-0 bg-warning/10 text-warning">
            <StoreIcon className="w-3 h-3" /> No store
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <AvatarStack people={people} max={3} size="sm" className="hidden sm:flex" />
          <MetricPill icon={Users}>
            {node.users.length} {node.users.length === 1 ? 'member' : 'members'}
          </MetricPill>
          <ChevronDown className={cn('w-3.5 h-3.5 text-text-light shrink-0 transition-transform duration-300', open && 'rotate-180')} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 px-2 pb-2.5 pt-0.5 border-t border-border/60 mx-1">
              {node.users.length === 0 ? (
                <p className="px-3 py-2.5 text-xs font-display text-text-light italic">No members in this department yet.</p>
              ) : (
                node.users.map((u) => <UserRow key={u.id} user={u} />)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
DepartmentSection.displayName = 'DepartmentSection';
