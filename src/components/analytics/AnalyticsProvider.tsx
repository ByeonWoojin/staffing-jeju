"use client";

import { useEffect, type ReactNode } from "react";
import mixpanel from "mixpanel-browser";
import { configureAnalyticsClient } from "@/lib/analytics/client";

let mixpanelInitialized = false;

interface AnalyticsProviderProps {
  children: ReactNode;
  enabled: boolean;
  gaMeasurementId?: string;
  mixpanelToken?: string;
}

export function AnalyticsProvider({
  children,
  enabled,
  gaMeasurementId,
  mixpanelToken,
}: AnalyticsProviderProps) {
  const hasGa = Boolean(gaMeasurementId);
  const hasMixpanel = Boolean(mixpanelToken);

  configureAnalyticsClient({
    enabled,
    hasGa,
    hasMixpanel,
    isMixpanelReady: mixpanelInitialized,
  });

  useEffect(() => {
    configureAnalyticsClient({
      enabled,
      hasGa,
      hasMixpanel,
      isMixpanelReady: mixpanelInitialized,
    });

    if (!enabled || !mixpanelToken || mixpanelInitialized) {
      return;
    }

    mixpanel.init(mixpanelToken, {
      autocapture: false,
      debug: false,
      persistence: "localStorage",
      stop_utm_persistence: true,
      ip: false,
    });
    mixpanelInitialized = true;

    configureAnalyticsClient({
      enabled,
      hasGa,
      hasMixpanel,
      isMixpanelReady: true,
    });
  }, [enabled, gaMeasurementId, hasGa, hasMixpanel, mixpanelToken]);

  return children;
}

