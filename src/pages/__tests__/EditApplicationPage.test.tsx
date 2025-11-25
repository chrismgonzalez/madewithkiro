import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import EditApplicationPage from "../EditApplicationPage";
import * as mockDataService from "@/services/mockDataService";

// Mock the router hooks
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ appId: "app-1" }),
}));

describe("EditApplicationPage - Acceptance Tests", () => {
  const mockApplication = {
    appId: "app-1",
    userId: "user-1",
    userName: "John Doe",
    name: "Test App",
    description: "Test description",
    appUrl: "https://example.com",
    githubUrl: "https://github.com/test/repo",
    tags: ["react", "typescript"],
    visibility: "public" as const,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GIVEN I navigate to an edit page with a valid appId", () => {
    it("WHEN the page loads THEN I should see a loading state while fetching application data", async () => {
      // Mock a delayed response
      vi.spyOn(mockDataService, "getApplicationById").mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockApplication), 100);
          })
      );

      renderWithProviders(<EditApplicationPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      // Should show loading state
      expect(screen.getByText(/loading application/i)).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(
          screen.queryByText(/loading application/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("GIVEN I am the owner of the application", () => {
    it("WHEN the application data loads THEN I should see the edit form pre-populated with current data", async () => {
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      renderWithProviders(<EditApplicationPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByDisplayValue("Test App")).toBeInTheDocument();
      });

      // Verify all fields are pre-populated
      expect(screen.getByDisplayValue("Test App")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test description")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("https://example.com")
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("https://github.com/test/repo")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("react,typescript")).toBeInTheDocument();
    });
  });

  describe("GIVEN I am not the owner of the application", () => {
    it("WHEN the page loads THEN I should see an authorization error message", async () => {
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      renderWithProviders(<EditApplicationPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-2", // Different user
        },
      });

      // Wait for error message
      await waitFor(() => {
        expect(
          screen.getByText(/you don't have permission/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("GIVEN I am unauthenticated", () => {
    it("WHEN I try to access the edit page THEN I should be redirected to login", async () => {
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      renderWithProviders(<EditApplicationPage />, {
        mockAuthState: {
          isAuthenticated: false,
          currentUserId: null,
        },
      });

      // Wait for redirect message or error
      await waitFor(() => {
        expect(
          screen.getByText(/please log in/i) ||
            screen.getByText(/authentication required/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("GIVEN the application does not exist", () => {
    it("WHEN the page loads THEN I should see an error message", async () => {
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(null);

      renderWithProviders(<EditApplicationPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/application not found/i)).toBeInTheDocument();
      });
    });
  });
});
