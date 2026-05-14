// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://95888fcc2715dcabfff7217017250eba@o4511342919090176.ingest.us.sentry.io/4511342921252864',

  enabled: process.env.NODE_ENV === 'production',

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  ignoreErrors: [
    // Production CSP intentionally omits 'unsafe-eval' (see next.config.ts).
    // Hits on this rule are almost always content blockers / browser
    // extensions / injected scripts running eval inside a wrapped handler —
    // we have no callsite for eval/new Function on our own pages.
    /Refused to evaluate a string as JavaScript/,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
