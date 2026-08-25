import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

// Fires `onOutsideClick` on any mousedown outside `ref`'s element, only while `active` is true —
// used by every dismissible panel (notification bell, header search, combobox, filter popovers)
// instead of each hand-rolling its own useRef+useEffect+mousedown-listener. The callback is kept
// in a ref rather than the effect's dependency array, so an inline arrow function passed fresh on
// every render never causes the listener to be torn down and re-added, and never goes stale.
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutsideClick: () => void,
  active = true,
) {
  const callbackRef = useRef(onOutsideClick);
  useLayoutEffect(() => {
    callbackRef.current = onOutsideClick;
  });

  useEffect(() => {
    if (!active) return;
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) callbackRef.current();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [active, ref]);
}
