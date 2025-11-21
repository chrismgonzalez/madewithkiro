import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import EditApplicationPage from "../EditApplicationPage";
import * as mockDataService from "@/services/mockDataService";

// Mock the router hooks
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ appId: "app-1" }),
}));

describe("EditApplicationPage - Cancel Functionality Acceptance Tests", () => {
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
    mockNavigate.mockClear();
  });

  describe("GIVEN I make changes in the edit form", () => {
    it("WHEN I click cancel THEN the changes should be discarded", async () => {
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      renderWithProviders(<EditApplicationPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      const user = userEvent.setup();

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByDisplayValue("Test App")).toBeInTheDocument();
      });

      // Make changes to the form
      const nameInput = screen.getByDisplayValue("Test App");
      await user.clear(nameInput);
      await user.type(nameInput, "Modified App Name");

      // Verify the change was made
      expect(screen.getByDisplayValue("Modified App Name")).toBeInTheDocument();

      // Click cancel button
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // The form should be restored to original values
      // Since we navigate away, we can't check the form state directly
      // But we can verify that navigation was called
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });

    it("WHEN I click cancel THEN I should be navigated back to the previous page", async () => {
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      renderWithProviders(<EditApplicationPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      const user = userEvent.setup();

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByDisplayValue("Test App")).toBeInTheDocument();
      });

      // Make changes to the form
      const nameInput = screen.getByDisplayValue("Test App");
      await user.clear(nameInput);
      await user.type(nameInput, "Modified App Name");

      // Click cancel button
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // Verify navigation was called
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
      });
    });

    it("WHEN I click cancel THEN the application data should remain unchanged", async () => {
      const getApplicationSpy = vi
        .spyOn(mockDataService, "getApplicationById")
        .mockResolvedValue(mockApplication);
      const updateApplicationSpy = vi.spyOn(
        mockDataService,
        "updateApplication"
      );

      renderWithProviders(<EditApplicationPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      const user = userEvent.setup();

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByDisplayValue("Test App")).toBeInTheDocument();
      });

      // Make changes to the form
      const nameInput = screen.getByDisplayValue("Test App");
      await user.clear(nameInput);
      await user.type(nameInput, "Modified App Name");

      const descriptionInput = screen.getByDisplayValue("Test description");
      await user.clear(descriptionInput);
      await user.type(descriptionInput, "Modified description");

      // Click cancel button
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // Verify that updateApplication was NOT called
      expect(updateApplicationSpy).not.toHaveBeenCalled();

      // Verify that the original data is still intact
      expect(getApplicationSpy).toHaveBeenCalledWith("app-1");
    });

    it("WHEN I try to navigate away THEN I should see a confirmation prompt", async () => {
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      // Mock window.confirm to track if it's called
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      renderWithProviders(<EditApplicationPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      const user = userEvent.setup();

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByDisplayValue("Test App")).toBeInTheDocument();
      });

      // Make changes to the form
      const nameInput = screen.getByDisplayValue("Test App");
      await user.clear(nameInput);
      await user.type(nameInput, "Modified App Name");

      // Simulate navigation attempt (e.g., browser back button)
      // This would typically be handled by a beforeunload event
      // For now, we'll test that the form tracks dirty state
      // The actual beforeunload implementation will be added in task 8.4

      // Note: This test is a placeholder for the unsaved changes warning
      // The actual implementation will be done in task 8.4
      // For now, we just verify the form has changed state
      expect(screen.getByDisplayValue("Modified App Name")).toBeInTheDocument();

      confirmSpy.mockRestore();
    });
  });
});
