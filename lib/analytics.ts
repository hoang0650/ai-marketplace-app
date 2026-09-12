type AnalyticsEvent =
  | 'app_open'
  | 'product_view'
  | 'search'
  | 'add_favorite'
  | 'checkout_started'
  | 'payment_started'
  | 'payment_completed'
  | 'order_view'
  | 'refund_requested'
  | 'complaint_created'
  | 'review_created'
  | 'subscription_cancelled';

const SENSITIVE = /token|password|secret|key|card|cvv|otp/i;

export const AnalyticsService = {
  track(event: AnalyticsEvent, props?: Record<string, string | number | boolean>) {
    if (__DEV__) {
      const safe = Object.fromEntries(
        Object.entries(props || {}).filter(([k]) => !SENSITIVE.test(k)),
      );
      console.log('[analytics]', event, safe);
    }
  },
};
