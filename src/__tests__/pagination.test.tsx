/**
 * Pagination Acceptance Tests
 *
 * Tests pagination functionality for applications list following BDD/TDD approach.
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ApplicationGallery from "@/components/ApplicationGallery";
import type { Application } from "@/types";

// Mock the useApplications hook
vi.mock("@/hooks/useApplications", () => ({
  useApplications: vi.fn(),
}));

// Mock the auth context
vi.mock("@/contexts/MockAuthContext", () => ({
  useMockAuth: () => ({ isAuthenticated: true }),
}));

import { useApplications } from "@/hooks/useApplications";

// Helper to create mock applications
function createMockApplication(id: number): Application {
  return {
    appId: `app-${id}`,
    userId: "user-1",
    userName: "Test User",
    name: `Application ${id}`,
    description: `Description for app ${id}`,
    appUrl: `https://app${id}.example.com`,
    githubUrl: `https://github.com/user/app${id}`,
    tags: ["tag1", "tag2"],
    visibility: "public",
    createdAt: new Date().toISOString(),
  };
}

describe("Pagination Acceptance Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  /**
   * GIVEN the applications list exceeds 50 items
   * WHEN the gallery loads
   * THEN the system should request paginated results from the backend API
   */
  it("should request paginated results when applications exceed 50 items", async () => {
    // Mock hook to return 50 applications
    const mockApplications = Array.from({ length: 50 }, (_, i) =>
      createMockApplication(i + 1)
    );

    vi.mocked(useApplications).mockReturnValue({
      applications: mockApplications,
      isLoading: false,
      error: null,
      createApplication: vi.fn(),
      isCreating: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ApplicationGallery />
      </QueryClientProvider>
    );

    // Verify applications are displayed
    await waitFor(() => {
      expect(screen.getByText("Application 1")).toBeInTheDocument();
    });

    // Verify pagination controls are shown (will fail until implemented)
    expect(
      screen.queryByRole("navigation", { name: /pagination/i })
    ).toBeInTheDocument();
  });

  /**
   * GIVEN paginated results are displayed
   * WHEN the gallery renders
   * THEN the system should show page navigation controls in the UI
   */
  it("should show page navigation controls when paginated results are displayed", async () => {
    // Mock hook to return 50 applications
    const mockApplications = Array.from({ length: 50 }, (_, i) =>
      createMockApplication(i + 1)
    );

    vi.mocked(useApplications).mockReturnValue({
      applications: mockApplications,
      isLoading: false,
      error: null,
      createApplication: vi.fn(),
      isCreating: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ApplicationGallery />
      </QueryClientProvider>
    );

    // Wait for applications to load
    await waitFor(() => {
      expect(screen.getByText("Application 1")).toBeInTheDocument();
    });

    // Check for pagination controls
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /previous/i })
    ).toBeInTheDocument();
  });

  /**
   * GIVEN a user clicks the next page button
   * WHEN the button is clicked
   * THEN the system should fetch the next batch of results using the pagination token
   */
  it("should fetch next batch of results when next page button is clicked", async () => {
    const user = userEvent.setup();

    // Mock first page
    const firstPageApps = Array.from({ length: 50 }, (_, i) =>
      createMockApplication(i + 1)
    );

    vi.mocked(useApplications).mockReturnValue({
      applications: firstPageApps,
      isLoading: false,
      error: null,
      createApplication: vi.fn(),
      isCreating: false,
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ApplicationGallery />
      </QueryClientProvider>
    );

    // Wait for first page to load
    await waitFor(() => {
      expect(screen.getByText("Application 1")).toBeInTheDocument();
    });

    // Mock second page
    const secondPageApps = Array.from({ length: 50 }, (_, i) =>
      createMockApplication(i + 51)
    );

    vi.mocked(useApplications).mockReturnValue({
      applications: secondPageApps,
      isLoading: false,
      error: null,
      createApplication: vi.fn(),
      isCreating: false,
    });

    // Click next page button
    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    // Rerender to simulate state change
    rerender(
      <QueryClientProvider client={queryClient}>
        <ApplicationGallery />
      </QueryClientProvider>
    );

    // Verify second page is loaded
    await waitFor(() => {
      expect(screen.getByText("Application 51")).toBeInTheDocument();
    });
  });

  /**
   * GIVEN a user clicks the previous page button
   * WHEN the button is clicked
   * THEN the system should display the previously loaded results from cache
   */
  it("should display previously loaded results from cache when previous page button is clicked", async () => {
    const user = userEvent.setup();

    // Start on page 2
    const secondPageApps = Array.from({ length: 50 }, (_, i) =>
      createMockApplication(i + 51)
    );

    vi.mocked(useApplications).mockReturnValue({
      applications: secondPageApps,
      isLoading: false,
      error: null,
      createApplication: vi.fn(),
      isCreating: false,
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ApplicationGallery />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Application 51")).toBeInTheDocument();
    });

    // Mock first page (from cache)
    const firstPageApps = Array.from({ length: 50 }, (_, i) =>
      createMockApplication(i + 1)
    );

    vi.mocked(useApplications).mockReturnValue({
      applications: firstPageApps,
      isLoading: false,
      error: null,
      createApplication: vi.fn(),
      isCreating: false,
    });

    // Go back to previous page
    const prevButton = screen.getByRole("button", { name: /previous/i });
    await user.click(prevButton);

    // Rerender
    rerender(
      <QueryClientProvider client={queryClient}>
        <ApplicationGallery />
      </QueryClientProvider>
    );

    // Should show first page again from cache
    await waitFor(() => {
      expect(screen.getByText("Application 1")).toBeInTheDocument();
    });
  });

  /**
   * GIVEN the last page is reached
   * WHEN the page renders
   * THEN the system should disable the next page navigation control
   */
  it("should disable next page button when last page is reached", async () => {
    // Mock 51 items (2 pages: 50 + 1)
    // Start on page 2 (the last page)
    const allApps = Array.from({ length: 51 }, (_, i) =>
      createMockApplication(i + 1)
    );

    vi.mocked(useApplications).mockReturnValue({
      applications: allApps,
      isLoading: false,
      error: null,
      createApplication: vi.fn(),
      isCreating: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ApplicationGallery />
      </QueryClientProvider>
    );

    // Wait for applications to load
    await waitFor(() => {
      expect(screen.getByText("Application 1")).toBeInTheDocument();
    });

    // Navigate to page 2 (last page)
    const nextButton = screen.getByRole("button", { name: /next/i });
    await userEvent.setup().click(nextButton);

    // Wait for page 2 to render
    await waitFor(() => {
      expect(screen.getByText("Application 51")).toBeInTheDocument();
    });

    // Check that next button is now disabled (we're on the last page)
    expect(nextButton).toBeDisabled();
  });
});
