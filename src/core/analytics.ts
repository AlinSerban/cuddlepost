import posthog from 'posthog-js'

/** Safe custom events only — never put names, messages, emails, or voice here. */
export type AnalyticsEvent =
  | 'checkout_opened'
  | 'pay_clicked'
  | 'gift_created'
  | 'gift_opened'

export function analyticsEnabled() {
  return Boolean(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN)
}

export function track(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean | undefined>,
) {
  if (!analyticsEnabled()) return
  const clean: Record<string, string | number | boolean> = {}
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v !== undefined) clean[k] = v
    }
  }
  posthog.capture(event, clean)
}

export function trackError(error: unknown, info?: { componentStack?: string | null }) {
  if (!analyticsEnabled()) return
  if (error instanceof Error) {
    posthog.captureException(error, {
      component_stack: info?.componentStack?.slice(0, 500),
    })
    return
  }
  posthog.capture('exception', {
    message: String(error).slice(0, 300),
  })
}
