import { useId, useMemo, type ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  className?: string;
}

export const RadialGauge = ({
  percent,
  size = 220,
  trackClassName = 'text-slate-100', // Premium soft track default
  gradientFrom = 'var(--color-primary-600, #4f46e5)',
  gradientTo = 'var(--color-primary-400, #818cf8)',
  children,
  className,
}: RadialGaugeProps) => {
  const baseId = useId();
  const gradientId = `${baseId}-gradient`;
  const glowId = `${baseId}-glow`;

  const { trackLength, fillLength, circumference } = useMemo(() => {
    const radius = 40;
    const circ = 2 * Math.PI * radius;
    const track = (240 / 360) * circ;
    const fill = (Math.min(Math.max(percent, 0), 100) / 100) * track;

    return { circumference: circ, trackLength: track, fillLength: fill };
  }, [percent]);

  return (
    <div
      // overflow-hidden here (not just left to whatever card wraps this) is the load-bearing fix:
      // the SVG below deliberately uses overflow-visible so its drop-shadow glow isn't clipped
      // right at the arc's edge, but that glow's filter region (140% of the SVG's own box) was
      // escaping past this component entirely into the surrounding page whenever the wrapping
      // card didn't happen to have its own overflow-hidden — self-contained here means it can
      // never leak regardless of what wraps it.
      className={cn("relative shrink-0 flex items-center justify-center overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>

          {/* Premium SVG drop shadow that follows the exact curve of the arc */}
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow 
              dx="0" 
              dy="3" 
              stdDeviation="3" 
              floodColor={gradientFrom} 
              floodOpacity="0.25" 
            />
          </filter>
        </defs>

        {/* Background Track */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          className={trackClassName}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${trackLength} ${circumference}`}
          transform="rotate(150 50 50)"
        />

        {/* Active Fill Track */}
        {percent > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${fillLength} ${circumference}`}
            transform="rotate(150 50 50)"
            filter={`url(#${glowId})`}
            className="transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] origin-center"
          />
        )}
      </svg>

      {/* The 240° arc leaves its gap at the bottom, so centered content reads slightly high unless
          nudged down — offset scales with size instead of a fixed px value so smaller gauges
          (e.g. a compact compliance rail) don't get over-shifted relative to their own arc. */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2"
        style={{ paddingTop: size * (24 / 220) }}
      >
        {children}
      </div>
    </div>
  );
};