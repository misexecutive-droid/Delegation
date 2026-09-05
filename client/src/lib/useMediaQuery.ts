import { useCallback, useMemo, useSyncExternalStore } from 'react';

// Cache one MediaQueryList per query string — matchMedia() isn't cheap to call, and every
// consumer's getSnapshot runs on every render, so a fresh instance per render would mean
// constructing a new MediaQueryList (and re-subscribing) constantly instead of once per query.
const mediaQueryCache = new Map<string, MediaQueryList>();

function getMediaQueryList(query: string): MediaQueryList {
  let mql = mediaQueryCache.get(query);
  if (!mql) {
    mql = window.matchMedia(query);
    mediaQueryCache.set(query, mql);
  }
  return mql;
}

export function useMediaQuery(query: string): boolean {
  const mql = useMemo(() => getMediaQueryList(query), [query]);
  const subscribe = useCallback(
    (callback: () => void) => {
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [mql],
  );
  const getSnapshot = useCallback(() => mql.matches, [mql]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// 767px, not 768 — flips exactly where Tailwind's `md:` (min-width: 768px) does,
// so this hook never disagrees with the CSS breakpoints already driving md:hidden elsewhere.
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');

/**
 * index.css already neutralises the `animate-in`/`animate-out` utilities under
 * prefers-reduced-motion, but a CSS media query can't reach motion driven from JavaScript —
 * requestAnimationFrame loops and framer-motion transitions run regardless. Those need to ask.
 */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
