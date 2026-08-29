import type { LucideIcon } from 'lucide-react';
import { Pencil, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader } from '../loaders/Loader';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shared visual language for the Users / Departments / Stores cards — one definition so the
// three entity types read as one design system instead of three hand-drifted lookalikes.

export const ENTITY_CARD_CLASS = 
  'group relative flex flex-col justify-between p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-400 ease-out hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 hover:border-primary-200';

interface EntityIconTileProps {
  icon: LucideIcon;
  /** primary (navy) for org structure — users, departments; coral (gold) for physical stores. */
  tone?: 'primary' | 'coral';
  className?: string;
}

// The leading visual for Departments/Stores — exactly 40px to match User avatars.
export const EntityIconTile = ({ icon: Icon, tone = 'primary', className }: EntityIconTileProps) => (
  <div
    className={cn(
      'flex items-center justify-center size-10 rounded-xl shrink-0 transition-colors duration-300',
      tone === 'coral'
        ? 'bg-coral-50 text-coral-600 ring-1 ring-coral-100/50 group-hover:bg-coral-100'
        : 'bg-primary-50 text-primary-600 ring-1 ring-primary-100/50 group-hover:bg-primary-100',
      className
    )}
  >
    <Icon className="size-5" strokeWidth={2.5} />
  </div>
);

interface StatusPillProps {
  active: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  ariaLabel: string;
}

// Identical Active/Inactive toggle used by all three entity cards.
export const StatusPill = ({ active, isUpdating, onToggle, ariaLabel }: StatusPillProps) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={isUpdating}
    aria-label={ariaLabel}
    className={cn(
      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0 transition-all duration-200 active:scale-95',
      'focus:outline-none focus:ring-4 focus:ring-primary-50/50',
      active
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50 hover:bg-emerald-100'
        : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/50 hover:bg-slate-200',
      isUpdating && 'opacity-70 cursor-not-allowed active:scale-100'
    )}
  >
    {isUpdating ? (
      <Loader size="sm" variant={active ? 'emerald' : 'slate'} className="size-3" />
    ) : (
      <span className={cn("size-1.5 rounded-full shrink-0", active ? "bg-emerald-500" : "bg-slate-400")} />
    )}
    {active ? 'Active' : 'Inactive'}
  </button>
);

interface MetricPillProps {
  icon: LucideIcon;
  children: React.ReactNode;
}

export const MetricPill = ({ icon: Icon, children }: MetricPillProps) => (
  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-semibold tracking-wide border border-slate-100 transition-colors duration-200 group-hover:bg-slate-100/50 group-hover:border-slate-200">
    <Icon className="size-3.5 text-slate-400 shrink-0" strokeWidth={2.5} />
    <span>{children}</span>
  </div>
);

interface EntityCardActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  editLabel: string;
  deleteLabel: string;
}
  
export const EntityCardActions = ({ onEdit, onDelete, isDeleting, editLabel, deleteLabel }: EntityCardActionsProps) => (
  <div className="flex items-center gap-1">
    <button
      type="button"
      onClick={onEdit}
      className="p-2 rounded-lg text-slate-400 transition-all duration-200 hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-50/50 active:scale-90"
      aria-label={editLabel}
    >
      <Pencil className="size-4" strokeWidth={2.5} />
    </button>

    <button
      type="button"
      onClick={onDelete}
      disabled={isDeleting}
      className={cn(
        'p-2 rounded-lg text-slate-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-4 focus:ring-red-50/50 active:scale-90',
        isDeleting && 'opacity-50 cursor-not-allowed active:scale-100'
      )}
      aria-label={deleteLabel}
    >
      {isDeleting ? (
        <Loader size="sm" variant="rose" className="size-4" />
      ) : (
        <Trash2 className="size-4" strokeWidth={2.5} />
      )}
    </button>
  </div>
);