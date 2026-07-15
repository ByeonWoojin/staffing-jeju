"use client";

import { sendGAEvent } from "@next/third-parties/google";
import mixpanel from "mixpanel-browser";
import type {
  AnalyticsEventName,
  AnalyticsProperties,
} from "@/lib/analytics/events";

type SanitizedAnalyticsProperties = Record<string, string | number | boolean | null>;

let analyticsEnabled = false;
let gaAvailable = false;
let mixpanelAvailable = false;
let mixpanelReady = false;
let pendingMixpanelEvents: Array<{
  eventName: AnalyticsEventName;
  properties?: SanitizedAnalyticsProperties;
}> = [];
let pendingIdentify:
  | {
      userId: string;
      properties?: SanitizedAnalyticsProperties;
    }
  | null = null;
let pendingReset = false;

function warnAnalyticsError(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  console.warn(`[analytics] ${context}`, error);
}

function sanitizeProperties(
  properties?: AnalyticsProperties,
): SanitizedAnalyticsProperties | undefined {
  if (!properties) return undefined;

  const sanitized: SanitizedAnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    if (value === null) {
      sanitized[key] = null;
      continue;
    }
    if (typeof value === "string" || typeof value === "boolean") {
      sanitized[key] = value;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function trackMixpanel(
  eventName: AnalyticsEventName,
  properties?: SanitizedAnalyticsProperties,
) {
  if (!mixpanelAvailable) return;

  if (!mixpanelReady) {
    pendingMixpanelEvents.push({ eventName, properties });
    return;
  }

  try {
    mixpanel.track(eventName, properties);
  } catch (error) {
    warnAnalyticsError(`mixpanel.track(${eventName}) failed`, error);
  }
}

function flushMixpanelQueue() {
  if (!analyticsEnabled || !mixpanelAvailable || !mixpanelReady) return;

  if (pendingReset) {
    try {
      mixpanel.reset();
    } catch (error) {
      warnAnalyticsError("mixpanel.reset() failed", error);
    }
    pendingReset = false;
    pendingIdentify = null;
  }

  if (pendingIdentify) {
    try {
      mixpanel.identify(pendingIdentify.userId);
      if (pendingIdentify.properties) {
        mixpanel.people.set(pendingIdentify.properties);
      }
    } catch (error) {
      warnAnalyticsError("mixpanel.identify() failed", error);
    }
    pendingIdentify = null;
  }

  const events = pendingMixpanelEvents;
  pendingMixpanelEvents = [];
  for (const event of events) {
    trackMixpanel(event.eventName, event.properties);
  }
}

export function configureAnalyticsClient({
  enabled,
  hasGa,
  hasMixpanel,
  isMixpanelReady,
}: {
  enabled: boolean;
  hasGa: boolean;
  hasMixpanel: boolean;
  isMixpanelReady: boolean;
}) {
  analyticsEnabled = enabled;
  gaAvailable = enabled && hasGa;
  mixpanelAvailable = enabled && hasMixpanel;
  mixpanelReady = mixpanelAvailable && isMixpanelReady;

  if (!analyticsEnabled || !mixpanelAvailable) {
    pendingMixpanelEvents = [];
    pendingIdentify = null;
    pendingReset = false;
    return;
  }

  flushMixpanelQueue();
}

export function trackEvent(
  eventName: AnalyticsEventName,
  properties?: AnalyticsProperties,
) {
  if (!analyticsEnabled) return;

  const sanitized = sanitizeProperties(properties);

  if (gaAvailable) {
    try {
      sendGAEvent("event", eventName, sanitized ?? {});
    } catch (error) {
      warnAnalyticsError(`sendGAEvent(${eventName}) failed`, error);
    }
  }

  trackMixpanel(eventName, sanitized);
}

export function identifyAnalyticsUser(
  userId: string,
  properties?: AnalyticsProperties,
) {
  if (!analyticsEnabled || !mixpanelAvailable) return;

  const sanitized = sanitizeProperties(properties);
  if (!mixpanelReady) {
    pendingIdentify = { userId, properties: sanitized };
    return;
  }

  try {
    mixpanel.identify(userId);
    if (sanitized) {
      mixpanel.people.set(sanitized);
    }
  } catch (error) {
    warnAnalyticsError("mixpanel.identify() failed", error);
  }
}

export function resetAnalyticsUser() {
  if (!analyticsEnabled || !mixpanelAvailable) return;

  if (!mixpanelReady) {
    pendingReset = true;
    pendingIdentify = null;
    return;
  }

  try {
    mixpanel.reset();
  } catch (error) {
    warnAnalyticsError("mixpanel.reset() failed", error);
  }
}

