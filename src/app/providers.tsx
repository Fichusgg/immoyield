'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { createClient } from '@/lib/supabase/client';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (typeof window !== 'undefined' && posthogKey && posthogHost && !posthog.__loaded) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: 'identified_only',
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!posthogKey || !posthogHost) return;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (user) {
        posthog.identify(user.id, user.email ? { email: user.email } : undefined);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const user = session?.user;
        if (user) {
          posthog.identify(user.id, user.email ? { email: user.email } : undefined);
        }
      } else if (event === 'SIGNED_OUT') {
        posthog.reset();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!posthogKey || !posthogHost) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
