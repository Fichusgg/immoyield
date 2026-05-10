'use client';

interface Props {
  children: React.ReactNode;
  /** Kept for API compatibility — the old scroll-fade animation has been removed. */
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Passthrough wrapper around children.
 *
 * Previously, this component used framer-motion's `useInView` to fade content
 * in on scroll. That caused sections below the fold to remain invisible
 * (opacity: 0) whenever the React tree errored upstream, or when the observer
 * failed to fire under Next 16 + React 19 — manifesting as "I see the hero but
 * nothing else." The animation isn't worth the risk; we render plain HTML.
 */
export default function FadeInSection({ children, className, style }: Props) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
