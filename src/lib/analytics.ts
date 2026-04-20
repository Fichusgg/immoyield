export type AnalyticsEvent =
  | 'hero_cta_click'
  | 'signup_submit'
  | 'first_deal_saved'
  | 'report_shared'
  | 'demo_continue_click';

type EventProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (command: string, event: string, params?: EventProps) => void;
    dataLayer?: (EventProps & { event: string })[];
  }
}

export function track(event: AnalyticsEvent, props?: EventProps): void {
  if (typeof window === 'undefined') return;

  if (typeof window.gtag === 'function') {
    window.gtag('event', event, props);
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event, ...props });
  }
}
