import { useId, useMemo, type ReactNode } from 'react';

interface RadialGaugeProps {
  /** 0-100. Values outside that range are clamped. */
  percent: number;
  /** Pixel width/height of the gauge (it's square). */
  size?: number;
  trackClassName?: string;
  gradientFrom?: string;
  gradientTo?: string;
  /** Rendered centered inside the arc — the percent label, a trend badge, whatever the caller needs. */
  children?: ReactNode;
}

// A 240-degree radial gauge (120-degree gap at the bottom) — the arc math originally lived only
// in MonthlyTargetCard.tsx; extracted here so every gauge on the page (dashboard target card,
// admin compliance rail, etc.) shares one implementation instead of re-deriving the same
// circumference/dasharray math per caller. Each instance gets its own <linearGradient> id via
// useId() so multiple gauges rendered side by side don't collide on a shared "gaugeGradient" id.
export const RadialGauge = ({
  percent,
  size = 220,
  trackClassName = 'text-surface-hover dark:text-surface-hover/50',
  gradientFrom = 'var(--color-primary-600)',
  gradientTo = 'var(--color-primary-400)',
  children,
}: RadialGaugeProps) => {
  const gradientId = useId();

  const { trackLength, fillLength, circumference } = useMemo(() => {
    const radius = 40;
    const circ = 2 * Math.PI * radius;
    const track = (240 / 360) * circ;
    const fill = (Math.min(Math.max(percent, 0), 100) / 100) * track;

    return { circumference: circ, trackLength: track, fillLength: fill };
  }, [percent]);

  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-sm">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          className={trackClassName}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${trackLength} ${circumference}`}
          transform="rotate(150 50 50)"
        />

        {percent > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${fillLength} ${circumference}`}
            transform="rotate(150 50 50)"
            className="transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
          />
        )}
      </svg>

      {/* The 240° arc leaves its gap at the bottom, so centered content reads slightly high unless
          nudged down — offset scales with size instead of a fixed px value so smaller gauges
          (e.g. a compact compliance rail) don't get over-shifted relative to their own arc. */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
        style={{ paddingTop: size * (24 / 220) }}
      >
        {children}
      </div>
    </div>
  );
};
