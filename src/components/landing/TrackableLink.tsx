'use client';

import Link from 'next/link';
import { track } from '@/lib/analytics';
import type { AnalyticsEvent } from '@/lib/analytics';
import type { ComponentProps } from 'react';

interface Props extends ComponentProps<typeof Link> {
  event: AnalyticsEvent;
  eventProps?: Record<string, string | number | boolean>;
}

export default function TrackableLink({ event, eventProps, onClick, children, ...props }: Props) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}
