import { useCallback, useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowDown, Loader2 } from 'lucide-react';

const PULL_THRESHOLD = 68;
const MAX_PULL = 96;
const HOLD_HEIGHT = 44;
const RESISTANCE = 0.5;
const SPRING = { type: 'spring', stiffness: 380, damping: 32 } as const;

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
 */
export const PullToRefresh = ({ onRefresh, children, className, disabled }: PullToRefreshProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const pulling = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const pull = useMotionValue(0);
  const indicatorOpacity = useTransform(pull, [0, PULL_THRESHOLD], [0, 1]);
  const indicatorRotate = useTransform(pull, [0, PULL_THRESHOLD], [0, 180]);

  const settle = useCallback((to: number) => animate(pull, to, SPRING), [pull]);

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
      pull.set(0);
      return;
    }
    // Only steal the gesture from native scroll once we know it's a downward pull at the top.
    e.preventDefault();
    pull.set(Math.min(delta * RESISTANCE, MAX_PULL));
  };

  const onTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    touchStartY.current = null;

    if (pull.get() >= PULL_THRESHOLD) {
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
      className={className}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none flex items-end justify-center overflow-hidden"
        style={{ height: pull, opacity: indicatorOpacity }}
      >
        <div className="flex items-center justify-center size-8 rounded-full bg-surface border border-border/60 shadow-sm mb-2">
          {refreshing ? (
            <Loader2 size={15} className="text-primary-600 animate-spin" strokeWidth={2.25} />
          ) : (
            <motion.span style={{ rotate: indicatorRotate }} className="flex">
              <ArrowDown size={15} className="text-primary-600" strokeWidth={2.25} />
            </motion.span>
          )}
        </div>
      </motion.div>

      {children}
    </div>
  );
};
