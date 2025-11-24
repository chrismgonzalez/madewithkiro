import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AuthCallbackPage from "../AuthCallbackPage";

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
});

// Hoist mock functions to avoid initialization errors
const { mockHubListen, mockNavigate, mockUseSearch } = vi.hoisted(() => ({
  mockHubListen: vi.fn(),
  mockNavigate: vi.fn(),
  mockUseSearch: vi.fn(() => ({})),
}));

// Mock AWS Amplify Hub
vi.mock("@aws-amplify/core", () => ({
  Hub: {
    listen: mockHubListen,
  },
}));

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockUseSearch(),
}));

describe("AuthCallbackPage - Acceptance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseSearch.mockReturnValue({});
    mockHubListen.mockReturnValue(() => {});
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe("GIVEN a user completes OAuth authentication", () => {
    it("WHEN the callback URL is loaded THEN the system should wait for Amplify to complete the code exchange", async () => {
      // Arrange: Mock Amplify to simulate code exchange in progress
      mockHubListen.mockReturnValue(() => {});

      // Act: Render the callback page
      render(<AuthCallbackPage />);

      // Assert: Loading spinner should be displayed
      expect(screen.getByText(/completing sign in/i)).toBeInTheDocument();
    });
  });

  describe("GIVEN the OAuth code exchange completes successfully", () => {
    it("WHEN the Hub signIn event is processed THEN the system should retrieve the stored redirect destination from sessionStorage", async () => {
      // Arrange: Store a redirect destination
      const redirectDestination = "/profile/123";
      sessionStorage.setItem("redirect_after_auth", redirectDestination);

      // Mock Hub listener to simulate signIn event
      let hubCallback: any;
      mockHubListen.mockImplementation((channel: string, callback: any) => {
        if (channel === "auth") {
          hubCallback = callback;
        }
        return () => {};
      });

      // Act: Render the callback page
      render(<AuthCallbackPage />);

      // Simulate Hub signIn event
      if (hubCallback) {
        hubCallback({
          payload: {
            event: "signIn",
            data: {},
          },
        });
      }

      // Assert: Should navigate to stored destination
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith({
            to: redirectDestination,
            replace: true,
          });
        },
        { timeout: 500 }
      );

      // Assert: sessionStorage should be cleared
      expect(sessionStorage.getItem("redirect_after_auth")).toBeNull();
    });
  });

  describe("GIVEN a redirect destination was stored before authentication", () => {
    it("WHEN the callback processing completes THEN the system should redirect to the stored destination", async () => {
      // Arrange: Store a redirect destination
      const redirectDestination = "/add-app";
      sessionStorage.setItem("redirect_after_auth", redirectDestination);

      // Mock Hub listener
      let hubCallback: any;
      mockHubListen.mockImplementation((channel: string, callback: any) => {
        if (channel === "auth") {
          hubCallback = callback;
        }
        return () => {};
      });

      // Act: Render and trigger signIn event
      render(<AuthCallbackPage />);

      // Simulate successful authentication
      if (hubCallback) {
        hubCallback({
          payload: {
            event: "signIn",
            data: {},
          },
        });
      }

      // Assert: Should redirect to stored destination
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith({
            to: redirectDestination,
            replace: true,
          });
        },
        { timeout: 500 }
      );
    });
  });

  describe("GIVEN no redirect destination was stored", () => {
    it("WHEN the callback processing completes THEN the system should redirect to the home page", async () => {
      // Arrange: Ensure no redirect destination is stored
      sessionStorage.removeItem("redirect_after_auth");

      // Mock Hub listener
      let hubCallback: any;
      mockHubListen.mockImplementation((channel: string, callback: any) => {
        if (channel === "auth") {
          hubCallback = callback;
        }
        return () => {};
      });

      // Act: Render and trigger signIn event
      render(<AuthCallbackPage />);

      // Simulate successful authentication
      if (hubCallback) {
        hubCallback({
          payload: {
            event: "signIn",
            data: {},
          },
        });
      }

      // Assert: Should redirect to home page
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith({
            to: "/",
            replace: true,
          });
        },
        { timeout: 500 }
      );
    });
  });

  describe("GIVEN an OAuth error occurs during callback", () => {
    it("WHEN the error is detected THEN the system should display an error message and show a link to retry authentication", async () => {
      // Arrange: Simulate OAuth error in URL parameters
      const errorMessage = "access_denied";
      const errorDescription = "User denied access";

      mockUseSearch.mockReturnValue({
        error: errorMessage,
        error_description: errorDescription,
      });

      // Act: Render with error parameters
      render(<AuthCallbackPage />);

      // Assert: Error message should be displayed
      await waitFor(() => {
        expect(screen.getByText(/authentication error/i)).toBeInTheDocument();
      });

      // Assert: Retry button should be present
      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeInTheDocument();
    });

    it("WHEN an error parameter is present THEN the system should display a user-friendly error message", async () => {
      // Arrange: Different error types
      const errorCases = [
        {
          error: "access_denied",
          expectedMessage: /cancelled the sign-in process/i,
        },
        {
          error: "invalid_request",
          expectedMessage: /authentication request was invalid/i,
        },
        {
          error: "server_error",
          expectedMessage: /authentication provider encountered an error/i,
        },
      ];

      for (const { error, expectedMessage } of errorCases) {
        // Arrange: Mock search params with error
        mockUseSearch.mockReturnValue({ error });

        // Act: Render with specific error
        const { unmount } = render(<AuthCallbackPage />);

        // Assert: Appropriate error message should be displayed
        await waitFor(() => {
          expect(screen.getByText(expectedMessage)).toBeInTheDocument();
        });

        unmount();
      }
    });
  });
});
