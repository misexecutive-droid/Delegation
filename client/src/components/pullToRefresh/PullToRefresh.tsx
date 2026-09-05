import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Tuned for the size-10 indicator footprint + margins
const PULL_THRESHOLD = 80;
const MAX_PULL = 120;
const HOLD_HEIGHT = 64;
const RESISTANCE = 0.5;
const SETTLE_MS = 280;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
// Matches the ease the rest of the app uses for settling motion (cubic-bezier(0.22, 1, 0.36, 1)
// closely enough at this duration) — framer-motion's spring overshot slightly on release; this
// eases in without the bounce.
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export interface PullToRefreshProps {
  /** Called once the user releases past the threshold. Resolve/return to end the refresh state. */
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * A native-feeling pull-to-refresh wrapper for touch devices.
 *
 * This owns the scroll container itself — the gesture only engages when the *wrapper* is
 * already scrolled to its top, so it never fights native scrolling of the content inside it.
 * Desktop pointers never fire touch events, so this is a no-op there by construction.
 *
 * The pull distance is held in a ref and written straight to the indicator's style, never to
 * React state. That's the same reason the previous version used framer-motion's `useMotionValue`
 * — a finger drag produces a value per animation frame, and routing that through `useState` would
 * re-render the whole dashboard underneath on every one of them.
 */
export const PullToRefresh = ({ onRefresh, children, className, disabled }: PullToRefreshProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const puckRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const touchStartY = useRef<number | null>(null);
  const pulling = useRef(false);
  const pull = useRef(0);
  const frame = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const paint = useCallback((value: number) => {
    pull.current = value;
    const progress = clamp01(value / PULL_THRESHOLD);
    const track = trackRef.current;
    if (track) {
      track.style.height = `${value}px`;
      track.style.opacity = `${progress}`;
    }
    if (puckRef.current) puckRef.current.style.transform = `scale(${0.8 + progress * 0.2})`;
    if (arrowRef.current) arrowRef.current.style.transform = `rotate(${progress * 180}deg)`;
  }, []);

  const settle = useCallback((to: number) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const from = pull.current;
    if (from === to) return;
    const start = performance.now();

    const step = (now: number) => {
      const t = clamp01((now - start) / SETTLE_MS);
      paint(from + (to - from) * easeOut(t));
      frame.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
  }, [paint]);

  // A settle animation outliving its component would keep writing to detached nodes.
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  const onTouchStart = (e: ReactTouchEvent) => {
    if (disabled || refreshing) return;
    if ((scrollRef.current?.scrollTop ?? 0) > 0) return;
    touchStartY.current = e.touches[0].clientY;
    pulling.current = true;
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    if (!pulling.current || touchStartY.current == null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta <= 0 || (scrollRef.current?.scrollTop ?? 0) > 0) {
      pulling.current = false;
      paint(0);
      return;
    }
    // Only steal the gesture from native scroll once we know it's a downward pull at the top.
    e.preventDefault();
    paint(Math.min(delta * RESISTANCE, MAX_PULL));
  };

  const onTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    touchStartY.current = null;

    if (pull.current >= PULL_THRESHOLD) {
      setRefreshing(true);
      settle(HOLD_HEIGHT);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        settle(0);
      }
    } else {
      settle(0);
    }
  };

  return (
    <div
      ref={scrollRef}
      className={cn("relative", className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        ref={trackRef}
        aria-hidden="true"
        style={{ height: 0, opacity: 0 }}
        className="pointer-events-none flex items-end justify-center overflow-hidden absolute top-0 left-0 right-0 z-50"
      >
        {/* Was `bg-white border-slate-200 shadow-slate-200/50` — raw Tailwind defaults in a project
            with its own palette, and invisible against a dark surface. */}
        <div
          ref={puckRef}
          style={{ transform: 'scale(0.8)' }}
          className="flex items-center justify-center size-10 rounded-full bg-surface border border-border mb-4"
        >
          {refreshing ? (
            <Loader2 size={18} className="text-primary-600 animate-spin" strokeWidth={2.5} />
          ) : (
            <span ref={arrowRef} style={{ transform: 'rotate(0deg)' }} className="flex">
              <ArrowDown size={18} className="text-primary-600" strokeWidth={2.5} />
            </span>
          )}
        </div>
      </div>

      {children}
    </div>
  );
};
