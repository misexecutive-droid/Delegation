import { memo } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Avatar } from '../../../components';
import { resolveAvatarUrl } from '../../../lib/uploadsBase';
import type { AdminUser } from '../../../api/admin';
import { ROLE_STYLES, ROLE_LABEL } from '../roleBadge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Memoized: a large org can render hundreds of these inside StoreSection/DepartmentSection —
// without this, toggling one accordion elsewhere re-renders every row in the tree.
export const UserRow = memo(({ user }: { user: AdminUser }) => (
  <div className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors duration-200 hover:bg-surface-hover">
    <Avatar name={`${user.firstName} ${user.lastName ?? ''}`} src={resolveAvatarUrl(user.avatarUrl)} size="sm" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-display font-semibold text-text truncate">
        {user.firstName} {user.lastName ?? ''}
      </p>
      <p className="text-xs font-display text-text-muted truncate">{user.email}</p>
    </div>
    <span
      className={cn(
        'shrink-0 text-[10px] font-display font-bold px-1.5 py-0.5 rounded-md border',
        ROLE_STYLES[user.role]
      )}
    >
      {ROLE_LABEL[user.role]}
    </span>
    {!user.isActive && (
      <span className="shrink-0 text-[10px] font-display font-bold px-1.5 py-0.5 rounded-md bg-surface-hover text-text-light border border-border">
        Inactive
      </span>
    )}
  </div>
));
UserRow.displayName = 'UserRow';
