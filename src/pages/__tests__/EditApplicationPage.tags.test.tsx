import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import EditApplicationPage from "../EditApplicationPage";
import GalleryPage from "../GalleryPage";
import * as mockDataService from "@/services/mockDataService";

// Mock the router hooks
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ appId: "app-1" }),
}));

describe("EditApplicationPage - Tag Update Acceptance Tests", () => {
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

  describe("GIVEN I view the edit form", () => {
    it("WHEN the form renders THEN I should see the current tags", async () => {
      // Arrange
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      // Act
      renderWithProviders(<EditApplicationPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      // Assert - Wait for form to load and verify tags are displayed
      await waitFor(() => {
        const tagsInput = screen.getByLabelText(/tags/i, {
          selector: "input",
        }) as HTMLInputElement;
        expect(tagsInput.value).toBe("react,typescript");
      });
    });
  });

  describe("GIVEN I add new tags to an application", () => {
    it("WHEN I save the changes THEN the application should have the new tags", async () => {
      // Arrange
      const user = userEvent.setup();
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );
      const updateSpy = vi
        .spyOn(mockDataService, "updateApplication")
        .mockResolvedValue({
          ...mockApplication,
          tags: ["react", "typescript", "aws", "lambda"],
          updatedAt: new Date().toISOString(),
        });

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

      // Act - Add new tags
      const tagsInput = screen.getByLabelText(/tags/i, {
        selector: "input",
      });
      await user.clear(tagsInput);
      await user.type(tagsInput, "react,typescript,aws,lambda");

      const submitButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(submitButton);

      // Assert - updateApplication should be called with new tags
      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          "app-1",
          expect.objectContaining({
            tags: ["react", "typescript", "aws", "lambda"],
          }),
          "user-1"
        );
      });
    });
  });

  describe("GIVEN I try to remove all tags", () => {
    it("WHEN I submit the form THEN I should see a validation error", async () => {
      // Arrange
      const user = userEvent.setup();
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

      // Act - Remove all tags
      const tagsInput = screen.getByLabelText(/tags/i, {
        selector: "input",
      });
      await user.clear(tagsInput);

      const submitButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(submitButton);

      // Assert - Should see validation error
      await waitFor(() => {
        expect(
          screen.getByText(/at least one tag is required/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("GIVEN I update an application's tags", () => {
    it("WHEN I save the changes THEN the gallery tag filter should include the new tags", async () => {
      // Arrange
      const user = userEvent.setup();

      // Mock initial application with old tags
      const initialApp = { ...mockApplication, tags: ["react", "typescript"] };

      // Mock updated application with new tags
      const updatedApp = {
        ...mockApplication,
        tags: ["react", "typescript", "aws"],
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        initialApp
      );
      vi.spyOn(mockDataService, "updateApplication").mockResolvedValue(
        updatedApp
      );

      // Mock getAllApplications to return the updated app
      vi.spyOn(mockDataService, "getAllApplications").mockResolvedValue([
        updatedApp,
      ]);

      // Render edit page
      const { rerender } = renderWithProviders(<EditApplicationPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByDisplayValue("Test App")).toBeInTheDocument();
      });

      // Act - Add new tag "aws"
      const tagsInput = screen.getByLabelText(/tags/i, {
        selector: "input",
      });
      await user.clear(tagsInput);
      await user.type(tagsInput, "react,typescript,aws");

      const submitButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(submitButton);

      // Wait for update to complete
      await waitFor(() => {
        expect(mockDataService.updateApplication).toHaveBeenCalled();
      });

      // Navigate to gallery page
      rerender(<GalleryPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      // Assert - Gallery should show the new "aws" tag in the filter
      await waitFor(() => {
        const awsTag = screen.getByRole("button", { name: /filter by aws/i });
        expect(awsTag).toBeInTheDocument();
      });
    });

    it("WHEN I filter by a new tag THEN the application should appear in the filtered results", async () => {
      // Arrange
      const user = userEvent.setup();

      // Mock application with new tag
      const appWithNewTag = {
        ...mockApplication,
        tags: ["react", "typescript", "aws"],
      };

      vi.spyOn(mockDataService, "getAllApplications").mockResolvedValue([
        appWithNewTag,
      ]);

      // Render gallery page
      renderWithProviders(<GalleryPage />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-1",
        },
      });

      // Wait for gallery to load
      await waitFor(() => {
        expect(screen.getByText("Test App")).toBeInTheDocument();
      });

      // Act - Click on the "aws" tag filter
      const awsTag = screen.getByRole("button", { name: /filter by aws/i });
      await user.click(awsTag);

      // Assert - Application should still be visible (filtered by aws tag)
      await waitFor(() => {
        expect(screen.getByText("Test App")).toBeInTheDocument();
      });

      // Verify the filter is active
      expect(awsTag).toHaveAttribute("aria-pressed", "true");
    });
  });
});
