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

describe("EditApplicationPage - Error Handling Acceptance Tests", () => {
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

  describe("GIVEN I submit the edit form", () => {
    it("WHEN the form is processing THEN I should see a loading indicator", async () => {
      // Mock successful fetch
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      // Mock a longer delayed update to ensure we can catch the loading state
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      vi.spyOn(mockDataService, "updateApplication").mockReturnValue(
        updatePromise as any
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

      // Modify a field
      const nameInput = screen.getByLabelText(/application name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated App");

      // Get the submit button before clicking
      const submitButton = screen.getByRole("button", {
        name: /update application/i,
      });

      // Submit the form
      await user.click(submitButton);

      // Should show loading state (button disabled and text changed to "Saving...")
      await waitFor(() => {
        const button = screen.getByRole("button", { name: /saving/i });
        expect(button).toBeDisabled();
      });

      // Resolve the update to complete the test
      resolveUpdate!(mockApplication);

      // Wait for submission to complete
      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /saving/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("GIVEN an update operation fails", () => {
    it("WHEN the error occurs THEN I should see a user-friendly error message", async () => {
      // Mock successful fetch
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      // Mock failed update
      vi.spyOn(mockDataService, "updateApplication").mockRejectedValue(
        new Error("Failed to update application")
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

      // Modify a field
      const nameInput = screen.getByLabelText(/application name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated App");

      // Submit the form
      const submitButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(
          screen.getByText(/failed to update/i) ||
            screen.getByText(/error/i) ||
            screen.getByText(/something went wrong/i)
        ).toBeInTheDocument();
      });
    });

    it("WHEN the error occurs THEN the form state should be preserved", async () => {
      // Mock successful fetch
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      // Mock failed update
      vi.spyOn(mockDataService, "updateApplication").mockRejectedValue(
        new Error("Failed to update application")
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

      // Modify a field
      const nameInput = screen.getByLabelText(/application name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated App");

      // Submit the form
      const submitButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(submitButton);

      // Wait for error
      await waitFor(() => {
        expect(mockDataService.updateApplication).toHaveBeenCalled();
      });

      // Form state should be preserved
      expect(screen.getByDisplayValue("Updated App")).toBeInTheDocument();
    });
  });

  describe("GIVEN I have validation errors", () => {
    it("WHEN the errors are displayed THEN the specific fields should be highlighted", async () => {
      // Mock successful fetch
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

      // Clear required field to trigger validation error
      const nameInput = screen.getByLabelText(/application name/i);
      await user.clear(nameInput);
      await user.tab(); // Trigger blur event

      // Submit the form
      const submitButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(submitButton);

      // Field should be highlighted with error styling
      await waitFor(() => {
        const input = screen.getByLabelText(/application name/i);
        expect(input).toHaveClass("border-red-500");
      });

      // Error message should be displayed
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  describe("GIVEN I have a validation error on a field", () => {
    it("WHEN I correct that field THEN the error message should be cleared", async () => {
      // Mock successful fetch
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

      // Clear required field to trigger validation error
      const nameInput = screen.getByLabelText(/application name/i);
      await user.clear(nameInput);
      await user.tab(); // Trigger blur event

      // Submit the form to show validation errors
      const submitButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(submitButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });

      // Correct the field
      await user.type(nameInput, "Valid App Name");

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
      });

      // Field should no longer be highlighted
      expect(nameInput).not.toHaveClass("border-red-500");
    });
  });
});
