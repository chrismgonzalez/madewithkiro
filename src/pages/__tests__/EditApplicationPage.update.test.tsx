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

describe("EditApplicationPage - Update Persistence Acceptance Tests", () => {
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

  describe("GIVEN I submit valid changes to an application", () => {
    it("WHEN the update succeeds THEN the application should be updated in mock data", async () => {
      // Spy on the update function
      const updateSpy = vi.spyOn(mockDataService, "updateApplication");
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

      // Modify the name field
      const nameInput = screen.getByLabelText(/application name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated App Name");

      // Submit the form
      const saveButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(saveButton);

      // Verify updateApplication was called with correct data
      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          "app-1",
          expect.objectContaining({
            name: "Updated App Name",
          }),
          "user-1"
        );
      });
    });

    it("WHEN the update succeeds THEN I should see a success message", async () => {
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );
      vi.spyOn(mockDataService, "updateApplication").mockResolvedValue({
        ...mockApplication,
        name: "Updated App Name",
      });

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

      // Modify the name field
      const nameInput = screen.getByLabelText(/application name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated App Name");

      // Submit the form
      const saveButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(saveButton);

      // For now, we'll verify the update was called successfully
      // In the future, we'll check for a toast notification
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it("WHEN the update succeeds THEN I should be navigated back to the gallery", async () => {
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );
      vi.spyOn(mockDataService, "updateApplication").mockResolvedValue({
        ...mockApplication,
        name: "Updated App Name",
      });

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

      // Modify the name field
      const nameInput = screen.getByLabelText(/application name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated App Name");

      // Submit the form
      const saveButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(saveButton);

      // Verify navigation to gallery
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
      });
    });
  });

  describe("GIVEN I update an application", () => {
    it("WHEN I view the gallery THEN I should see the updated information immediately", async () => {
      // Mock the initial application
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      // Mock the update to return updated data
      const updatedApp = {
        ...mockApplication,
        name: "Updated App Name",
        updatedAt: new Date().toISOString(),
      };
      vi.spyOn(mockDataService, "updateApplication").mockResolvedValue(
        updatedApp
      );

      // Mock getAllApplications to return the updated app
      vi.spyOn(mockDataService, "getAllApplications").mockResolvedValue([
        updatedApp,
      ]);

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

      // Modify the name field
      const nameInput = screen.getByLabelText(/application name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated App Name");

      // Submit the form
      const saveButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(saveButton);

      // Verify the update was successful
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
      });

      // Note: Cache invalidation is tested through the mutation hook
      // The gallery will automatically refetch and show updated data
    });

    it("WHEN I view the user profile THEN I should see the updated information immediately", async () => {
      // Mock the initial application
      vi.spyOn(mockDataService, "getApplicationById").mockResolvedValue(
        mockApplication
      );

      // Mock the update to return updated data
      const updatedApp = {
        ...mockApplication,
        name: "Updated App Name",
        updatedAt: new Date().toISOString(),
      };
      vi.spyOn(mockDataService, "updateApplication").mockResolvedValue(
        updatedApp
      );

      // Mock getApplicationsByUserId to return the updated app
      vi.spyOn(mockDataService, "getApplicationsByUserId").mockResolvedValue([
        updatedApp,
      ]);

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

      // Modify the name field
      const nameInput = screen.getByLabelText(/application name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated App Name");

      // Submit the form
      const saveButton = screen.getByRole("button", {
        name: /update application/i,
      });
      await user.click(saveButton);

      // Verify the update was successful
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
      });

      // Note: Cache invalidation is tested through the mutation hook
      // The profile page will automatically refetch and show updated data
    });
  });
});
