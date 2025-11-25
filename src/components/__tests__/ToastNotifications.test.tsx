/**
 * Acceptance Tests for Toast Notifications
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 *
 * These tests validate that toast notifications are displayed correctly
 * for various user actions and API operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProfileForm from "@/components/ProfileForm";
import ApplicationForm from "@/components/ApplicationForm";
import type { ProfileFormData } from "@/utils/validation";

// Mock the toast utilities
vi.mock("@/utils/toast", () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

// Import the mocked functions
import * as toastUtils from "@/utils/toast";

describe("Toast Notifications - Acceptance Tests", () => {
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

  afterEach(() => {
    queryClient.clear();
  });

  describe("Requirement 16.1: Profile creation success toast", () => {
    it("GIVEN a user successfully creates a profile WHEN the creation completes THEN the system should display a success toast notification", async () => {
      // GIVEN: A profile form with successful submission
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const mockOnCancel = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <ProfileForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </QueryClientProvider>
      );

      const user = userEvent.setup();

      // WHEN: User fills out and submits the form
      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(
        screen.getByLabelText(/aws builder center handle/i),
        "johndoe"
      );

      const submitButton = screen.getByRole("button", {
        name: /save profile/i,
      });
      await user.click(submitButton);

      // THEN: Success toast should be displayed
      await waitFor(() => {
        expect(toastUtils.showSuccessToast).toHaveBeenCalledWith(
          expect.stringContaining("Profile created successfully"),
          5000
        );
      });
    });
  });

  describe("Requirement 16.2: Profile update success toast", () => {
    it("GIVEN a user successfully updates a profile WHEN the update completes THEN the system should display a success toast notification", async () => {
      // GIVEN: A profile form with initial data and successful update
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const mockOnCancel = vi.fn();

      const initialData: Partial<ProfileFormData> = {
        firstName: "John",
        lastName: "Doe",
        awsBuilderHandle: "johndoe",
      };

      render(
        <QueryClientProvider client={queryClient}>
          <ProfileForm
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
            initialData={initialData}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();

      // WHEN: User updates the profile
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "Jane");

      const submitButton = screen.getByRole("button", {
        name: /save profile/i,
      });
      await user.click(submitButton);

      // THEN: Success toast should be displayed
      await waitFor(() => {
        expect(toastUtils.showSuccessToast).toHaveBeenCalledWith(
          expect.stringContaining("Profile updated successfully"),
          5000
        );
      });
    });
  });

  describe("Requirement 16.3: Application creation success toast and redirect", () => {
    it("GIVEN a user successfully creates an application WHEN the creation completes THEN the system should display a success toast notification and redirect to the gallery", async () => {
      // GIVEN: An application form with successful submission
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const mockOnCancel = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <ApplicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </QueryClientProvider>
      );

      const user = userEvent.setup();

      // WHEN: User fills out and submits the form
      await user.type(screen.getByLabelText(/application name/i), "My App");
      await user.type(screen.getByLabelText(/description/i), "A great app");
      await user.type(
        screen.getByLabelText(/github repository url/i),
        "https://github.com/user/repo"
      );
      await user.type(screen.getByLabelText(/tags/i), "react, typescript");

      const submitButton = screen.getByRole("button", {
        name: /save application/i,
      });
      await user.click(submitButton);

      // THEN: Success toast should be displayed
      await waitFor(() => {
        expect(toastUtils.showSuccessToast).toHaveBeenCalledWith(
          expect.stringContaining("Application created successfully"),
          5000
        );
      });

      // Note: Redirect is handled by the page component, not the form
      // This will be tested in the page-level tests
    });
  });

  describe("Requirement 16.4: API operation failure toast", () => {
    it("GIVEN an API operation fails WHEN the error occurs THEN the system should display an error toast notification with the error message", async () => {
      // GIVEN: A profile form with failing submission
      const errorMessage = "Failed to save profile: Network error";
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error(errorMessage));
      const mockOnCancel = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <ProfileForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </QueryClientProvider>
      );

      const user = userEvent.setup();

      // WHEN: User submits the form and it fails
      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(
        screen.getByLabelText(/aws builder center handle/i),
        "johndoe"
      );

      const submitButton = screen.getByRole("button", {
        name: /save profile/i,
      });
      await user.click(submitButton);

      // THEN: Error toast should be displayed with the error message
      await waitFor(() => {
        expect(toastUtils.showErrorToast).toHaveBeenCalledWith(
          expect.stringContaining(errorMessage),
          5000
        );
      });
    });

    it("GIVEN an application creation fails WHEN the error occurs THEN the system should display an error toast notification", async () => {
      // GIVEN: An application form with failing submission
      const errorMessage = "Failed to create application: Validation error";
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error(errorMessage));
      const mockOnCancel = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <ApplicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </QueryClientProvider>
      );

      const user = userEvent.setup();

      // WHEN: User submits the form and it fails
      await user.type(screen.getByLabelText(/application name/i), "My App");
      await user.type(screen.getByLabelText(/description/i), "A great app");
      await user.type(
        screen.getByLabelText(/github repository url/i),
        "https://github.com/user/repo"
      );
      await user.type(screen.getByLabelText(/tags/i), "react");

      const submitButton = screen.getByRole("button", {
        name: /save application/i,
      });
      await user.click(submitButton);

      // THEN: Error toast should be displayed
      await waitFor(() => {
        expect(toastUtils.showErrorToast).toHaveBeenCalledWith(
          expect.stringContaining(errorMessage),
          5000
        );
      });
    });
  });

  describe("Requirement 16.5: Auto-dismiss after 5 seconds", () => {
    it("GIVEN a toast notification is displayed WHEN 5 seconds pass THEN the system should automatically dismiss the notification", async () => {
      // Note: This test validates that the toast library is configured with auto-dismiss
      // The actual auto-dismiss behavior is handled by the toast library itself

      // GIVEN: A successful operation that shows a toast
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const mockOnCancel = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <ProfileForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </QueryClientProvider>
      );

      const user = userEvent.setup();

      // WHEN: User submits the form successfully
      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(
        screen.getByLabelText(/aws builder center handle/i),
        "johndoe"
      );

      const submitButton = screen.getByRole("button", {
        name: /save profile/i,
      });
      await user.click(submitButton);

      // THEN: Toast should be called with duration option of 5000ms
      await waitFor(() => {
        expect(toastUtils.showSuccessToast).toHaveBeenCalledWith(
          expect.any(String),
          5000
        );
      });
    });
  });
});
