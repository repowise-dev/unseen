import { useLayoutEffect, useRef, type RefObject } from 'react';

const SCROLL_THRESHOLD = 60; // px from bottom that still counts as "at bottom"

export function isAtBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.clientHeight - el.scrollTop <= SCROLL_THRESHOLD;
}

// Sticky-scroll without shared state: before each content-driven re-render we
// check whether the user was at the bottom, and only auto-scroll if they were.
// Programmatic scrolls can't pollute the "was the user reading?" signal.
export function useStickyScroll<T extends HTMLElement>(deps: unknown[]): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const wasAtBottom = useRef(true);

  // Snapshot BEFORE the DOM mutation lands: track on every scroll event.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = (): void => {
      wasAtBottom.current = isAtBottom(el);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && wasAtBottom.current) el.scrollTop = el.scrollHeight;
  }, deps);

  return ref;
}
