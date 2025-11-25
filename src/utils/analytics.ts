import posthog from "posthog-js";

const isPostHogEnabled = () => {
  return posthog.__loaded === true;
};

export const analytics = {
  track: (eventName: string, properties?: Record<string, any>) => {
    if (isPostHogEnabled()) {
      posthog.capture(eventName, properties);
    }
  },

  identify: (userId: string, properties?: Record<string, any>) => {
    if (isPostHogEnabled()) {
      posthog.identify(userId, properties);
    }
  },

  reset: () => {
    if (isPostHogEnabled()) {
      posthog.reset();
    }
  },
};
