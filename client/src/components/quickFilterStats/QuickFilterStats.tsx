import { Check, type LucideIcon } from 'lucide-react';
import { AdminChromeAccents } from '../../features/admin/AdminChromeAccents';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface QuickFilterTile<K extends string> {
  key: K;
  label: string;
  icon: LucideIcon;
  tint: string;
  bgTint: string;
  accentBar: string;
  accentBorder: string;
  accentRing: string;
}

interface QuickFilterStatsProps<K extends string> {
  tiles: QuickFilterTile<K>[];
  counts: Record<K, number>;
  active: K | null;
  onToggle: (key: K) => void;
  itemLabel: string;
  variant?: 'default' | 'navy';
}

export function QuickFilterStats<K extends string>({ 
  tiles, 
  counts, 
  active, 
  onToggle, 
  itemLabel, 
  variant = 'default' 
}: QuickFilterStatsProps<K>) {
  
  if (variant === 'navy') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {tiles.map(({ key, label }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              aria-pressed={isActive}
              title={isActive ? `Clear "${label}" filter` : `Show only ${label.toLowerCase()} ${itemLabel}`}
              className={cn(
                "group relative flex flex-col justify-center gap-1.5 overflow-hidden rounded-2xl p-4 md:p-5 text-left transition-all duration-400 ease-out cursor-pointer outline-none",
                "bg-gradient-to-br from-slate-900 via-primary-900 to-primary-700",
                "focus:ring-4 focus:ring-primary-400/30",
                isActive 
                  ? "ring-2 ring-white/60 -translate-y-1 shadow-xl shadow-slate-900/20" 
                  : "hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/20 active:scale-[0.98]"
              )}
            >
              <AdminChromeAccents scale="compact" />
              
              <div className="relative z-10 min-w-0">
                <p className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-none">
                  {counts[key]}
                </p>
                <p className="text-xs md:text-sm font-medium text-white/80 mt-2 truncate tracking-wide">
                  {label}
                </p>
              </div>

              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-3 right-3 flex items-center justify-center size-5 rounded-full bg-white/25 text-white shadow-sm z-10 animate-in zoom-in-95 duration-200"
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {tiles.map(({ key, label, icon: Icon, tint, bgTint, accentBar, accentBorder, accentRing }) => {
        const isActive = active === key;
        
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            aria-pressed={isActive}
            title={isActive ? `Clear "${label}" filter` : `Show only ${label.toLowerCase()} ${itemLabel}`}
            className={cn(
              "group relative flex items-center gap-4 overflow-hidden rounded-2xl p-4 md:p-5 text-left transition-all duration-400 ease-out cursor-pointer outline-none bg-white",
              "focus:ring-4 focus:ring-primary-50/50",
              isActive
                ? `${accentBorder} ${bgTint} shadow-md -translate-y-1`
                : "border border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 active:scale-[0.98]"
            )}
          >
            {/* Left accent bar */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-0 left-0 w-1.5 transition-opacity duration-300 rounded-l-2xl",
                accentBar,
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
              )}
            />

            {/* Icon Tile */}
            <div
              className={cn(
                "relative flex items-center justify-center size-12 rounded-[14px] shrink-0 transition-all duration-300",
                tint,
                isActive 
                  ? `${bgTint} ring-1 ${accentRing}` 
                  : "bg-slate-50 group-hover:bg-slate-100 group-hover:shadow-sm ring-1 ring-slate-100"
              )}
            >
              <Icon 
                size={22} 
                strokeWidth={2.5} 
                className={cn("transition-transform duration-300", isActive && "scale-110")} 
              />
            </div>

            {/* Typography */}
            <div className="min-w-0 flex-1">
              <p className={cn("text-2xl font-bold tracking-tight leading-none transition-colors", isActive ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900")}>
                {counts[key]}
              </p>
              <p className="text-xs md:text-sm font-medium text-slate-500 mt-1.5 truncate tracking-wide">
                {label}
              </p>
            </div>

            {/* Active Checkmark */}
            {isActive && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-3 right-3 flex items-center justify-center size-5 rounded-full text-white shadow-sm animate-in zoom-in-95 duration-200",
                  accentBar
                )}
              >
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}