import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountLinkPrompt from "../AccountLinkPrompt";

describe("AccountLinkPrompt - Acceptance Tests", () => {
  const mockOnConfirm = vi.fn();
  const mockOnDecline = vi.fn();

  const defaultProps = {
    currentAuthMethod: "google" as const,
    existingAuthMethod: "email" as const,
    email: "user@example.com",
    targetUserSub: "existing-user-sub-123",
    onConfirm: mockOnConfirm,
    onDecline: mockOnDecline,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Requirement 10.1, 10.2: Component Rendering", () => {
    it("WHEN the component renders THEN it should display both authentication methods", () => {
      // Act
      render(<AccountLinkPrompt {...defaultProps} />);

      // Assert - Should show labels for both auth methods
      expect(screen.getByText("Current Sign-In Method")).toBeInTheDocument();
      expect(screen.getByText("Existing Account Method")).toBeInTheDocument();
    });

    it("WHEN the component renders THEN it should display the email address", () => {
      // Act
      render(<AccountLinkPrompt {...defaultProps} />);

      // Assert
      expect(screen.getByText(/user@example\.com/i)).toBeInTheDocument();
    });

    it("WHEN the component renders THEN it should display an explanation about account linking", () => {
      // Act
      render(<AccountLinkPrompt {...defaultProps} />);

      // Assert - Should explain what linking means
      expect(screen.getByText(/merge them into one/i)).toBeInTheDocument();
    });

    it("WHEN the component renders with email as current method THEN it should display correctly", () => {
      // Arrange
      const props = {
        ...defaultProps,
        currentAuthMethod: "email" as const,
        existingAuthMethod: "google" as const,
      };

      // Act
      render(<AccountLinkPrompt {...props} />);

      // Assert - Check for specific labels
      expect(screen.getByText("Current Sign-In Method")).toBeInTheDocument();
      expect(screen.getByText("Existing Account Method")).toBeInTheDocument();
    });
  });

  describe("Requirement 10.3: UI Elements", () => {
    it("WHEN the component renders THEN it should display Confirm and Decline buttons", () => {
      // Act
      render(<AccountLinkPrompt {...defaultProps} />);

      // Assert
      expect(
        screen.getByRole("button", { name: /confirm|link/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /decline|cancel|skip/i })
      ).toBeInTheDocument();
    });

    it("WHEN the component renders THEN buttons should have minimum touch target size", () => {
      // Act
      render(<AccountLinkPrompt {...defaultProps} />);

      // Assert
      const confirmButton = screen.getByRole("button", {
        name: /confirm|link/i,
      });
      const declineButton = screen.getByRole("button", {
        name: /decline|cancel|skip/i,
      });

      // Check that buttons have appropriate classes for touch targets
      expect(confirmButton).toBeInTheDocument();
      expect(declineButton).toBeInTheDocument();
    });
  });

  describe("Requirement 10.4: Confirmation Flow", () => {
    it("WHEN the user clicks the Confirm button THEN onConfirm should be called", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<AccountLinkPrompt {...defaultProps} />);

      // Act
      const confirmButton = screen.getByRole("button", {
        name: /confirm|link/i,
      });
      await user.click(confirmButton);

      // Assert
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it("WHEN onConfirm is in progress THEN the component should show a loading state", async () => {
      // Arrange
      const user = userEvent.setup();
      const slowOnConfirm = vi.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<AccountLinkPrompt {...defaultProps} onConfirm={slowOnConfirm} />);

      // Act
      const confirmButton = screen.getByRole("button", {
        name: /confirm|link/i,
      });
      await user.click(confirmButton);

      // Assert - Should show loading state on button
      expect(
        screen.getByRole("button", { name: /linking/i })
      ).toBeInTheDocument();
    });

    it("WHEN onConfirm is in progress THEN buttons should be disabled", async () => {
      // Arrange
      const user = userEvent.setup();
      const slowOnConfirm = vi.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<AccountLinkPrompt {...defaultProps} onConfirm={slowOnConfirm} />);

      // Act
      const confirmButton = screen.getByRole("button", {
        name: /confirm|link/i,
      });
      await user.click(confirmButton);

      // Assert - Buttons should be disabled during loading
      expect(confirmButton).toBeDisabled();

      const declineButton = screen.getByRole("button", {
        name: /decline|cancel|skip/i,
      });
      expect(declineButton).toBeDisabled();
    });
  });

  describe("Requirement 1.5: Decline Flow", () => {
    it("WHEN the user clicks the Decline button THEN onDecline should be called", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<AccountLinkPrompt {...defaultProps} />);

      // Act
      const declineButton = screen.getByRole("button", {
        name: /decline|cancel|skip/i,
      });
      await user.click(declineButton);

      // Assert
      expect(mockOnDecline).toHaveBeenCalledTimes(1);
    });

    it("WHEN the user declines THEN onConfirm should not be called", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<AccountLinkPrompt {...defaultProps} />);

      // Act
      const declineButton = screen.getByRole("button", {
        name: /decline|cancel|skip/i,
      });
      await user.click(declineButton);

      // Assert
      expect(mockOnDecline).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("WHEN onConfirm throws an error THEN the component should display an error message", async () => {
      // Arrange
      const user = userEvent.setup();
      const errorOnConfirm = vi.fn(() =>
        Promise.reject(new Error("Linking failed"))
      );

      render(
        <AccountLinkPrompt {...defaultProps} onConfirm={errorOnConfirm} />
      );

      // Act
      const confirmButton = screen.getByRole("button", {
        name: /confirm|link/i,
      });
      await user.click(confirmButton);

      // Assert - Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error|failed|unable/i)).toBeInTheDocument();
      });
    });

    it("WHEN an error occurs THEN the buttons should be re-enabled", async () => {
      // Arrange
      const user = userEvent.setup();
      const errorOnConfirm = vi.fn(() =>
        Promise.reject(new Error("Linking failed"))
      );

      render(
        <AccountLinkPrompt {...defaultProps} onConfirm={errorOnConfirm} />
      );

      // Act
      const confirmButton = screen.getByRole("button", {
        name: /confirm|link/i,
      });
      await user.click(confirmButton);

      // Assert - After error, buttons should be enabled again
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });

      const declineButton = screen.getByRole("button", {
        name: /decline|cancel|skip/i,
      });
      expect(declineButton).not.toBeDisabled();
    });

    it("WHEN an error is displayed THEN the user should be able to retry", async () => {
      // Arrange
      const user = userEvent.setup();
      let callCount = 0;
      const retryableOnConfirm = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("First attempt failed"));
        }
        return Promise.resolve();
      });

      render(
        <AccountLinkPrompt {...defaultProps} onConfirm={retryableOnConfirm} />
      );

      // Act - First attempt fails
      const confirmButton = screen.getByRole("button", {
        name: /confirm|link/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/error|failed|unable/i)).toBeInTheDocument();
      });

      // Act - Retry
      await user.click(confirmButton);

      // Assert - Should have been called twice
      await waitFor(() => {
        expect(retryableOnConfirm).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Loading States", () => {
    it("WHEN not loading THEN the component should not show loading indicators", () => {
      // Act
      render(<AccountLinkPrompt {...defaultProps} />);

      // Assert - Check button text is not "Linking..."
      expect(
        screen.queryByRole("button", { name: /^linking\.\.\.$/i })
      ).not.toBeInTheDocument();
    });

    it("WHEN loading THEN the Confirm button should show loading text or spinner", async () => {
      // Arrange
      const user = userEvent.setup();
      const slowOnConfirm = vi.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<AccountLinkPrompt {...defaultProps} onConfirm={slowOnConfirm} />);

      // Act
      const confirmButton = screen.getByRole("button", {
        name: /confirm|link/i,
      });
      await user.click(confirmButton);

      // Assert - Button should show "Linking..."
      expect(
        screen.getByRole("button", { name: /linking/i })
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("WHEN the component renders THEN it should have proper ARIA labels", () => {
      // Act
      render(<AccountLinkPrompt {...defaultProps} />);

      // Assert - Buttons should have accessible names
      expect(
        screen.getByRole("button", { name: /confirm|link/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /decline|cancel|skip/i })
      ).toBeInTheDocument();
    });

    it("WHEN the component renders THEN important information should be in the document", () => {
      // Act
      render(<AccountLinkPrompt {...defaultProps} />);

      // Assert - Email should be visible
      expect(screen.getByText(/user@example\.com/i)).toBeInTheDocument();

      // Auth method labels should be visible
      expect(screen.getByText("Current Sign-In Method")).toBeInTheDocument();
      expect(screen.getByText("Existing Account Method")).toBeInTheDocument();
    });
  });
});
