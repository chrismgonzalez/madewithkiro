import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import posthog from "posthog-js";

interface PostHogContextValue {
  posthog: typeof posthog;
  isInitialized: boolean;
}

const PostHogContext = createContext<PostHogContextValue | undefined>(
  undefined
);

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
    const host = import.meta.env.VITE_POSTHOG_HOST;
    const useProxy = import.meta.env.VITE_POSTHOG_USE_PROXY === "true";

    if (apiKey && host) {
      const assetHost = host.includes("eu.i.posthog.com")
        ? "https://eu-assets.i.posthog.com"
        : "https://us-assets.i.posthog.com";

      const config: any = {
        api_host: useProxy ? "/ingest" : host,
        ui_host: assetHost,
        person_profiles: "identified_only",
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: true,
        loaded: () => {
          setIsInitialized(true);
        },
      };

      posthog.init(apiKey, config);
    }
  }, []);

  return (
    <PostHogContext.Provider value={{ posthog, isInitialized }}>
      {children}
    </PostHogContext.Provider>
  );
}

export function usePostHog() {
  const context = useContext(PostHogContext);
  if (context === undefined) {
    throw new Error("usePostHog must be used within a PostHogProvider");
  }
  return context.posthog;
}
