import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { usePostHog } from "../contexts";

export function usePageTracking() {
  const location = useLocation();
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog.__loaded) {
      posthog.capture("$pageview", {
        $current_url: window.location.href,
      });
    }
  }, [location.pathname, posthog]);
}
