import type { LucideIcon } from 'lucide-react';

const SIZE_CONFIG = {
  sm: { tile: 'size-9', icon: 16, shadow: 'shadow-sm shadow-primary-600/20' },
  md: { tile: 'size-10', icon: 18, shadow: 'shadow-sm shadow-primary-600/20' },
  lg: { tile: 'size-12', icon: 22, shadow: 'shadow-md shadow-primary-500/20 border border-primary-400/20' },
} as const;

interface GradientIconTileProps {
  icon: LucideIcon;
  size?: keyof typeof SIZE_CONFIG;
  className?: string;
}

// The page-header "brand mark" tile — a gradient-filled rounded-xl square with a white icon —
// used identically across every page/modal header that wants one, instead of each hand-rolling
// the same gradient+shadow combination.
export const GradientIconTile = ({ icon: Icon, size = 'md', className = '' }: GradientIconTileProps) => {
  const { tile, icon, shadow } = SIZE_CONFIG[size];
  return (
    <div
      className={`${tile} rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shrink-0 ${shadow} ${className}`}
    >
      <Icon size={icon} className="text-white" />
    </div>
  );
};
