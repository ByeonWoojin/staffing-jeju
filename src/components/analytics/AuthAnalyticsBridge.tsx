"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  identifyAnalyticsUser,
  trackEvent,
} from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { UserRole } from "@/types/database";

const validRoles = new Set<UserRole>(["staff", "owner", "admin"]);

function getAuthEventName(value: string | null) {
  if (value === ANALYTICS_EVENTS.LOGIN) return ANALYTICS_EVENTS.LOGIN;
  if (value === ANALYTICS_EVENTS.SIGN_UP) return ANALYTICS_EVENTS.SIGN_UP;
  return null;
}

function getUserRole(value: string | null): UserRole | undefined {
  if (!value || !validRoles.has(value as UserRole)) return undefined;
  return value as UserRole;
}

function clearAuthAnalyticsParams(url: URL) {
  url.searchParams.delete("auth_event");
  url.searchParams.delete("user_role");
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function AuthAnalyticsBridge() {
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const eventName = getAuthEventName(url.searchParams.get("auth_event"));
    const userRole = getUserRole(url.searchParams.get("user_role"));

    if (!eventName) return;

    const eventKey = `${eventName}:${userRole ?? ""}:${url.pathname}`;
    if (processedRef.current === eventKey) {
      clearAuthAnalyticsParams(url);
      return;
    }
    processedRef.current = eventKey;

    const supabase = createSupabaseBrowserClient();
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        const userId = data.user?.id;
        if (userId) {
          identifyAnalyticsUser(userId, { user_role: userRole });
          trackEvent(eventName, {
            method: "google",
            user_role: userRole,
          });
        }
      })
      .finally(() => {
        clearAuthAnalyticsParams(url);
      });
  }, []);

  return null;
}
