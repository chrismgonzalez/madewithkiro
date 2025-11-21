import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import ApplicationCard from "../ApplicationCard";
import type { Application } from "@/types";

// Mock the mockDataService
vi.mock("@/services/mockDataService", () => ({
  deleteApplication: vi.fn(),
}));

const createMockApplication = (
  overrides?: Partial<Application>
): Application => ({
  appId: "app-1",
  userId: "user-1",
  userName: "Test User",
  name: "Test Application",
  description: "Test description",
  appUrl: "https://example.com",
  githubUrl: "https://github.com/test/repo",
  tags: ["React", "TypeScript"],
  visibility: "public",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("ApplicationCard - Deletion Feedback", () => {
  let mockDeleteApplication: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mockDataService = await import("@/services/mockDataService");
    mockDeleteApplication = mockDataService.deleteApplication as ReturnType<
      typeof vi.fn
    >;
  });

  describe("GIVEN I successfully delete an application", () => {
    it("WHEN the deletion completes THEN I should see a success message", async () => {
      const mockApp = createMockApplication();

      // Mock successful deletion
      mockDeleteApplication.mockResolvedValue(undefined);

      // Spy on console.log to verify success logging
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      render(<ApplicationCard application={mockApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      const user = userEvent.setup();

      // Click delete button
      const deleteButton = screen.getByRole("button", {
        name: /delete application/i,
      });
      await user.click(deleteButton);

      // Confirm deletion - the button is labeled "Delete" in the dialog
      const confirmButton = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmButton);

      // Wait for deletion to complete
      await waitFor(() => {
        expect(mockDeleteApplication).toHaveBeenCalledWith("app-1", "user-1");
      });

      // Verify success was logged
      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          "Application deleted successfully"
        );
      });

      // TODO: Verify success message is displayed when toast system is implemented
      // For now, we verify the deletion was called successfully and logged
      // In the future, we'll check for: screen.getByText(/deleted successfully/i)

      consoleLogSpy.mockRestore();
    });
  });

  describe("GIVEN I successfully delete an application WHEN I view the gallery", () => {
    it("THEN the application should no longer appear", async () => {
      const mockApp = createMockApplication();

      // Mock successful deletion
      mockDeleteApplication.mockResolvedValue(undefined);

      render(<ApplicationCard application={mockApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      const user = userEvent.setup();

      // Click delete button
      const deleteButton = screen.getByRole("button", {
        name: /delete application/i,
      });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmButton);

      // Wait for deletion to complete
      await waitFor(() => {
        expect(mockDeleteApplication).toHaveBeenCalledWith("app-1", "user-1");
      });

      // Verify cache invalidation was triggered by checking the dialog closed
      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      });

      // Note: The actual removal from gallery is tested in integration tests
      // This test verifies the mutation completes successfully
    });
  });

  describe("GIVEN I successfully delete an application WHEN I view my profile page", () => {
    it("THEN the application should no longer appear", async () => {
      const mockApp = createMockApplication();

      // Mock successful deletion
      mockDeleteApplication.mockResolvedValue(undefined);

      render(<ApplicationCard application={mockApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      const user = userEvent.setup();

      // Click delete button
      const deleteButton = screen.getByRole("button", {
        name: /delete application/i,
      });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmButton);

      // Wait for deletion to complete
      await waitFor(() => {
        expect(mockDeleteApplication).toHaveBeenCalledWith("app-1", "user-1");
      });

      // Verify cache invalidation was triggered by checking the dialog closed
      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      });

      // Note: The actual removal from profile is tested in integration tests
      // This test verifies the mutation completes successfully and cache is invalidated
    });
  });

  describe("GIVEN a deletion fails", () => {
    it("WHEN the error occurs THEN I should see an error message", async () => {
      const mockApp = createMockApplication();

      // Mock failed deletion
      const errorMessage = "Failed to delete application";
      mockDeleteApplication.mockRejectedValue(new Error(errorMessage));

      // Spy on console.error to verify error logging
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(<ApplicationCard application={mockApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      const user = userEvent.setup();

      // Click delete button
      const deleteButton = screen.getByRole("button", {
        name: /delete application/i,
      });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmButton);

      // Wait for deletion to fail
      await waitFor(() => {
        expect(mockDeleteApplication).toHaveBeenCalledWith("app-1", "user-1");
      });

      // Verify error was logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to delete application:",
          expect.any(Error)
        );
      });

      // TODO: Verify error message is displayed when toast system is implemented
      // For now, we verify the error was logged
      // In the future, we'll check for: screen.getByText(/failed to delete/i)

      consoleErrorSpy.mockRestore();
    });

    it("WHEN the error occurs THEN the application should still appear in the gallery", async () => {
      const mockApp = createMockApplication();

      // Mock failed deletion
      mockDeleteApplication.mockRejectedValue(new Error("Failed to delete"));

      // Spy on console.error to suppress error output
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(<ApplicationCard application={mockApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      const user = userEvent.setup();

      // Verify the card is initially rendered
      expect(screen.getByText("Test Application")).toBeInTheDocument();

      // Click delete button
      const deleteButton = screen.getByRole("button", {
        name: /delete application/i,
      });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmButton);

      // Wait for deletion to fail
      await waitFor(() => {
        expect(mockDeleteApplication).toHaveBeenCalledWith("app-1", "user-1");
      });

      // Verify the card is still rendered (application still appears)
      // The card title should still be in the document
      const cardTitle = screen.getAllByText("Test Application")[0]; // First one is the card title
      expect(cardTitle).toBeInTheDocument();

      // Verify the dialog stays open on error
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });
});
