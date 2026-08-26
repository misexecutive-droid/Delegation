import { memo, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Store as StoreIcon, Users as UsersIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EntityIconTile, MetricPill, AvatarStack } from '../../../components';
import { resolveAvatarUrl } from '../../../lib/uploadsBase';
import type { StoreNode } from './orgStructureDisplay';
import { DepartmentSection } from './DepartmentSection';
import { UserRow } from './UserRow';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StoreSectionProps {
  node: StoreNode;
  isOpen: boolean;
  forceOpen: boolean;
  /** Takes the store's own id — see DepartmentSection's onToggle for why. */
  onToggle: (id: string) => void;
  isDeptOpen: (id: string) => boolean;
  onToggleDept: (id: string) => void;
}

// Memoized: without this, toggling any one store (or department, anywhere in the tree) re-renders
// every other store section too, since they're all siblings in one .map() over shared state.
export const StoreSection = memo(({ node, isOpen, forceOpen, onToggle, isDeptOpen, onToggleDept }: StoreSectionProps) => {
  const open = isOpen || forceOpen;
  const allUsers = useMemo(
    () => [...node.directUsers, ...node.departments.flatMap((d) => d.users)],
    [node.directUsers, node.departments]
  );
  const totalMembers = allUsers.length;
  const people = useMemo(
    () => allUsers.map((u) => ({ name: `${u.firstName} ${u.lastName ?? ''}`, src: resolveAvatarUrl(u.avatarUrl) })),
    [allUsers]
  );

  return (
    <div className="group/store rounded-2xl border border-border bg-surface shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-coral-200">
      <button
        type="button"
        onClick={forceOpen ? undefined : () => onToggle(node.store.id)}
        className="flex w-full items-center gap-4 p-4 sm:p-5 text-left transition-colors duration-200 hover:bg-surface-hover cursor-pointer disabled:cursor-default"
        disabled={forceOpen}
      >
        <EntityIconTile icon={StoreIcon} tone="coral" className="w-8 h-8 sm:w-9 sm:h-9" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-display font-bold text-text truncate">{node.store.name}</h3>
          <p className="text-xs font-display text-text-muted truncate">
            {node.departments.length} {node.departments.length === 1 ? 'department' : 'departments'}
            {node.store.code ? ` · ${node.store.code}` : ''}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <AvatarStack people={people} max={4} size="sm" />
          <MetricPill icon={UsersIcon}>{totalMembers} total</MetricPill>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-text-light shrink-0 transition-transform duration-300', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 px-4 sm:px-5 pb-5 border-t border-border/70 pt-4">
              {node.departments.length === 0 && node.directUsers.length === 0 ? (
                <p className="px-1 text-sm font-display text-text-light italic">No departments or staff assigned to this store yet.</p>
              ) : (
                <>
                  {node.departments.map((d) => (
                    <DepartmentSection
                      key={d.department.id}
                      node={d}
                      isOpen={isDeptOpen(d.department.id)}
                      forceOpen={forceOpen}
                      onToggle={onToggleDept}
                    />
                  ))}
                  {node.directUsers.length > 0 && (
                    <div className="rounded-xl border border-dashed border-border px-2 py-2 bg-surface-hover/40">
                      <p className="px-1 pb-1 text-[10px] font-display font-bold text-text-light uppercase tracking-wide">
                        Store-level staff (no department)
                      </p>
                      {node.directUsers.map((u) => (
                        <UserRow key={u.id} user={u} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
StoreSection.displayName = 'StoreSection';
