import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockAuthProvider } from "@/contexts/MockAuthContext";

interface MockAuthState {
  isAuthenticated?: boolean;
  currentUserId?: string | null;
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  mockAuthState?: MockAuthState;
}

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { mockAuthState, ...renderOptions } = options || {};

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider
          initialAuth={mockAuthState?.isAuthenticated}
          initialUserId={mockAuthState?.currentUserId}
        >
          {children}
        </MockAuthProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { renderWithProviders as render };
