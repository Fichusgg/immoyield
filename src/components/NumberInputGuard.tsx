'use client';

import * as React from 'react';

/**
 * Globally neutralize the two ways a mouse/keyboard can mutate a focused
 * `<input type="number">` outside of typing:
 *   - Mouse wheel scrolling → blur the input so the page scrolls instead.
 *   - ↑ / ↓ arrow keys      → preventDefault so the value isn't stepped.
 *
 * Mounted once at the root layout. Covers every bare `<input type="number">`
 * in the codebase without requiring per-component changes.
 */
export function NumberInputGuard() {
  React.useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t instanceof HTMLInputElement &&
        t.type === 'number' &&
        document.activeElement === t
      ) {
        t.blur();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const t = e.target as HTMLElement | null;
      if (t instanceof HTMLInputElement && t.type === 'number') {
        e.preventDefault();
      }
    };

    document.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}
