import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import ApplicationForm from "../ApplicationForm";

describe("ApplicationForm - Acceptance Tests", () => {
  describe("GIVEN I view the application form", () => {
    it("WHEN the form renders THEN I should see input fields for name, description, appUrl, githubUrl, tags, and visibility", () => {
      // Arrange & Act
      render(<ApplicationForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      // Assert
      expect(
        screen.getByLabelText(/application name/i, { selector: "input" })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/description/i, { selector: "textarea" })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/live app url/i, { selector: "input" })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/github.*url/i, { selector: "input" })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/tags/i, { selector: "input" })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/visibility/i, { selector: "select" })
      ).toBeInTheDocument();
    });
  });

  describe("GIVEN I submit the form with missing required fields", () => {
    it("WHEN I click submit THEN I should see validation errors for those specific fields", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ApplicationForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      // Act - Submit form without filling any fields
      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Assert - Should see validation errors for required fields
      await waitFor(() => {
        expect(
          screen.getByText(/application name is required/i)
        ).toBeInTheDocument();
      });
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      expect(screen.getByText(/must be a valid url/i)).toBeInTheDocument();
      expect(
        screen.getByText(/at least one tag is required/i)
      ).toBeInTheDocument();

      // Should not have called onSubmit
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("WHEN I submit with only some required fields THEN I should see validation errors for missing fields only", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ApplicationForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      // Act - Fill only name
      const nameInput = screen.getByLabelText(/application name/i, {
        selector: "input",
      });
      await user.type(nameInput, "My App");

      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Assert - Should see errors for other required fields
      await waitFor(() => {
        expect(
          screen.getByText(/description is required/i)
        ).toBeInTheDocument();
      });
      expect(screen.getByText(/must be a valid url/i)).toBeInTheDocument();
      expect(
        screen.getByText(/at least one tag is required/i)
      ).toBeInTheDocument();

      // Should NOT see error for name
      expect(
        screen.queryByText(/application name is required/i)
      ).not.toBeInTheDocument();

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN I submit the form with an invalid URL", () => {
    it("WHEN I click submit THEN I should see a URL validation error", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ApplicationForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      // Act - Fill fields with invalid URL
      await user.type(
        screen.getByLabelText(/application name/i, { selector: "input" }),
        "My App"
      );
      await user.type(
        screen.getByLabelText(/description/i, { selector: "textarea" }),
        "A great app"
      );
      await user.type(
        screen.getByLabelText(/live app url/i, { selector: "input" }),
        "not-a-valid-url"
      );
      await user.type(
        screen.getByLabelText(/tags/i, { selector: "input" }),
        "react,typescript"
      );

      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Assert - Should see URL validation error
      await waitFor(() => {
        expect(screen.getByText(/must be a valid url/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("WHEN I submit with invalid GitHub URL THEN I should see a URL validation error", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ApplicationForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      // Act - Fill fields with invalid GitHub URL
      await user.type(
        screen.getByLabelText(/application name/i, { selector: "input" }),
        "My App"
      );
      await user.type(
        screen.getByLabelText(/description/i, { selector: "textarea" }),
        "A great app"
      );
      await user.type(
        screen.getByLabelText(/live app url/i, { selector: "input" }),
        "https://example.com"
      );
      await user.type(
        screen.getByLabelText(/github.*url/i, { selector: "input" }),
        "invalid-github-url"
      );
      await user.type(
        screen.getByLabelText(/tags/i, { selector: "input" }),
        "react,typescript"
      );

      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Assert - Should see URL validation error for GitHub URL
      await waitFor(() => {
        expect(screen.getByText(/must be a valid url/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN I submit the form with all required fields", () => {
    it("WHEN I click submit THEN I should see a success message", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ApplicationForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      // Act - Fill all required fields
      await user.type(
        screen.getByLabelText(/application name/i, { selector: "input" }),
        "My Awesome App"
      );
      await user.type(
        screen.getByLabelText(/description/i, { selector: "textarea" }),
        "This is a great application built with Kiro"
      );
      await user.type(
        screen.getByLabelText(/live app url/i, { selector: "input" }),
        "https://myapp.example.com"
      );
      await user.type(
        screen.getByLabelText(/tags/i, { selector: "input" }),
        "react,typescript,aws"
      );

      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Assert - Should see success message
      await waitFor(() => {
        expect(screen.getByText(/success|saved|created/i)).toBeInTheDocument();
      });

      // Should have called onSubmit with correct data
      expect(onSubmit).toHaveBeenCalledWith({
        name: "My Awesome App",
        description: "This is a great application built with Kiro",
        appUrl: "https://myapp.example.com",
        githubUrl: "",
        tags: ["react", "typescript", "aws"],
        visibility: "public",
      });
    });

    it("WHEN I submit with all fields including optional THEN I should see a success message", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ApplicationForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      // Act - Fill all fields including optional
      await user.type(
        screen.getByLabelText(/application name/i, { selector: "input" }),
        "Full Featured App"
      );
      await user.type(
        screen.getByLabelText(/description/i, { selector: "textarea" }),
        "An app with all fields filled"
      );
      await user.type(
        screen.getByLabelText(/live app url/i, { selector: "input" }),
        "https://fullapp.example.com"
      );
      await user.type(
        screen.getByLabelText(/github.*url/i, { selector: "input" }),
        "https://github.com/user/repo"
      );
      await user.type(
        screen.getByLabelText(/tags/i, { selector: "input" }),
        "react,node,aws"
      );

      // Select private visibility
      const visibilitySelect = screen.getByLabelText(/visibility/i, {
        selector: "select",
      });
      await user.selectOptions(visibilitySelect, "private");

      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/success|saved|created/i)).toBeInTheDocument();
      });

      expect(onSubmit).toHaveBeenCalledWith({
        name: "Full Featured App",
        description: "An app with all fields filled",
        appUrl: "https://fullapp.example.com",
        githubUrl: "https://github.com/user/repo",
        tags: ["react", "node", "aws"],
        visibility: "private",
      });
    });
  });

  describe("GIVEN I have a validation error", () => {
    it("WHEN an error occurs THEN the form state should be preserved for retry", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ApplicationForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      // Act - Fill some fields
      await user.type(
        screen.getByLabelText(/application name/i, { selector: "input" }),
        "My App"
      );
      await user.type(
        screen.getByLabelText(/description/i, { selector: "textarea" }),
        "Great app"
      );

      // Submit with missing required fields
      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Wait for validation errors
      await waitFor(() => {
        expect(screen.getByText(/must be a valid url/i)).toBeInTheDocument();
      });

      // Assert - Form state should be preserved
      const nameInput = screen.getByLabelText(/application name/i, {
        selector: "input",
      }) as HTMLInputElement;
      const descriptionInput = screen.getByLabelText(/description/i, {
        selector: "textarea",
      }) as HTMLTextAreaElement;

      expect(nameInput.value).toBe("My App");
      expect(descriptionInput.value).toBe("Great app");

      // Now complete the form
      await user.type(
        screen.getByLabelText(/live app url/i, { selector: "input" }),
        "https://myapp.com"
      );
      await user.type(
        screen.getByLabelText(/tags/i, { selector: "input" }),
        "react"
      );

      await user.click(submitButton);

      // Assert - Should now succeed
      await waitFor(() => {
        expect(screen.getByText(/success|saved|created/i)).toBeInTheDocument();
      });

      expect(onSubmit).toHaveBeenCalledWith({
        name: "My App",
        description: "Great app",
        appUrl: "https://myapp.com",
        githubUrl: "",
        tags: ["react"],
        visibility: "public",
      });
    });
  });
});
