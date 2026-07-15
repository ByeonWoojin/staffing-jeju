"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type {
  AnalyticsEventName,
  AnalyticsProperties,
} from "@/lib/analytics/events";

export function AnalyticsEventTracker({
  eventName,
  properties,
}: {
  eventName: AnalyticsEventName;
  properties?: AnalyticsProperties;
}) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackEvent(eventName, properties);
  }, [eventName, properties]);

  return null;
}

