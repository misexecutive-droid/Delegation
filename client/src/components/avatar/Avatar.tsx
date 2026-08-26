import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getInitials } from '../../lib/getInitials';
import { SIZE_CLASS } from './avatarSize';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

// Shared photo-or-initials avatar — a real <img> when `src` is set, the same gradient-circle
// initials treatment every card in the app already used inline otherwise (see UserCard.tsx,
// AdminHeader.tsx) as the fallback, now in one place instead of reimplemented per component.
export const Avatar = ({ name, src, size = 'md', className }: AvatarProps) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'rounded-full object-cover shrink-0 shadow-sm ring-1 ring-primary-500/10',
          SIZE_CLASS[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white font-display font-bold shrink-0 shadow-sm ring-1 ring-primary-500/10',
        SIZE_CLASS[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};
