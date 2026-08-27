import { Check, type LucideIcon } from 'lucide-react';
import { AdminChromeAccents } from '../../features/admin/AdminChromeAccents';

export interface QuickFilterTile<K extends string> {
  key: K;
  label: string;
  icon: LucideIcon;
  tint: string;
  bgTint: string;
  /** Solid version of `tint`'s color (e.g. "bg-success") — used for the left accent bar and the
   *  active-state check badge. Kept as its own literal field (rather than derived from `tint` at
   *  runtime) so Tailwind's static scanner can see the complete class name and actually generate it. */
  accentBar: string;
  /** Complete literal border/ring utility strings for the active state, one per tile, so each
   *  tile lights up in its own status color instead of every tile sharing one generic highlight. */
  accentBorder: string;
  accentRing: string;
}

interface QuickFilterStatsProps<K extends string> {
  tiles: QuickFilterTile<K>[];
  counts: Record<K, number>;
  active: K | null;
  onToggle: (key: K) => void;
  /** Plural noun used in the tile's tooltip, e.g. "delegations" or "tickets". */
  itemLabel: string;
  /** 'default' (unchanged): white card, per-tile status-colored icon badge and accents — still
   *  used by Todo's quick stats. 'navy': the Dashboard's dark navy chrome — no icon, every tile
   *  the same uniform gradient instead of each picking up its own status color. */
  variant?: 'default' | 'navy';
}

// A row of clickable, glanceable KPI tiles that double as one-click filters into that exact
// subset — the shared shape behind the Delegation, Ticket, and Todo list pages' quick-stat rows.
export function QuickFilterStats<K extends string>({ tiles, counts, active, onToggle, itemLabel, variant = 'default' }: QuickFilterStatsProps<K>) {
  if (variant === 'navy') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {tiles.map(({ key, label }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              aria-pressed={isActive}
              title={isActive ? `Clear "${label}" filter` : `Show only ${label.toLowerCase()} ${itemLabel}`}
              className={`group relative flex flex-col justify-center gap-1 overflow-hidden rounded-2xl p-3.5 md:p-5 text-left transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 bg-gradient-to-br from-slate-950 via-primary-800 to-primary-600 shadow-lg shadow-primary-900/20 ${
                isActive ? 'ring-2 ring-white/60 -translate-y-0.5 shadow-xl' : 'hover:-translate-y-0.5 hover:shadow-xl'
              }`}
            >
              <AdminChromeAccents scale="compact" />
              <div className="relative z-10 min-w-0">
                <p className="text-xl md:text-2xl font-display font-bold tracking-tight text-white leading-none">
                  {counts[key]}
                </p>
                <p className="text-[12px] md:text-sm font-display font-medium text-white/70 mt-1.5 truncate">
                  {label}
                </p>
              </div>

              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-2.5 right-2.5 md:top-3 md:right-3 flex items-center justify-center size-4 rounded-full bg-white/20 text-white shadow-sm z-10"
                >
                  <Check size={10} strokeWidth={3.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {tiles.map(({ key, label, icon: Icon, tint, bgTint, accentBar, accentBorder, accentRing }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            aria-pressed={isActive}
            title={isActive ? `Clear "${label}" filter` : `Show only ${label.toLowerCase()} ${itemLabel}`}
            className={`group relative flex items-center gap-3 md:gap-4 overflow-hidden rounded-2xl p-3.5 md:p-5 text-left transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 border ${
              isActive
                ? `${accentBorder} ${bgTint} shadow-md -translate-y-0.5`
                : 'border-border/60 bg-surface shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] dark:border-white/[0.06] hover:border-border hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            {/* Left accent bar — always present but invisible until hover/active, so each tile's
                own status color reads as a deliberate design element, not just an icon tint. */}
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-1 ${accentBar} transition-opacity duration-300 ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
              }`}
            />

            {/* Icon glyph carries the status color; the badge itself stays the same neutral
                surface on every tile at rest, so the four cards read as one uniform row instead
                of each picking up its own background tint — only the active (selected) tile
                still tints its whole card, as a deliberate "this one's picked" signal. */}
            <div
              className={`relative flex items-center justify-center size-10 md:size-12 rounded-xl shrink-0 transition-all duration-300 ${tint} ${
                isActive ? `${bgTint} ring-1 ${accentRing}` : 'bg-surface-hover group-hover:shadow-sm'
              }`}
            >
              <Icon size={20} strokeWidth={2.5} className={isActive ? 'scale-110 transition-transform' : 'transition-transform'} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xl md:text-2xl font-bold tracking-tight text-text leading-none">
                {counts[key]}
              </p>
              <p className="text-[12px] md:text-sm font-medium text-text-muted mt-1.5 truncate">
                {label}
              </p>
            </div>

            {isActive && (
              <span
                aria-hidden="true"
                className={`absolute top-2.5 right-2.5 md:top-3 md:right-3 flex items-center justify-center size-4 rounded-full text-white shadow-sm ${accentBar}`}
              >
                <Check size={10} strokeWidth={3.5} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
