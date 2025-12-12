import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import ApplicationForm from "../ApplicationForm";

describe("ApplicationForm - Acceptance Tests", () => {
  describe("GIVEN I view the application form", () => {
    it("WHEN the form renders THEN I should see input fields for name, description, appUrl, githubUrl, and tags", () => {
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
      expect(screen.getByText(/GitHub URL is required/i)).toBeInTheDocument();
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
      expect(screen.getByText(/GitHub URL is required/i)).toBeInTheDocument();
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
        expect(screen.getByText(/Must be a valid URL/i)).toBeInTheDocument();
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
        expect(screen.getByText(/Must be a valid URL/i)).toBeInTheDocument();
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
        screen.getByLabelText(/github.*url/i, { selector: "input" }),
        "https://github.com/user/myapp"
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
        githubUrl: "https://github.com/user/myapp",
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
        visibility: "public",
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
        expect(screen.getByText(/GitHub URL is required/i)).toBeInTheDocument();
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
        screen.getByLabelText(/github.*url/i, { selector: "input" }),
        "https://github.com/user/myapp"
      );
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
        githubUrl: "https://github.com/user/myapp",
        tags: ["react"],
        visibility: "public",
      });
    });
  });

  // Edit Mode Acceptance Tests
  describe("ApplicationForm Edit Mode - Acceptance Tests", () => {
    const mockInitialData = {
      name: "Existing App",
      description: "This is an existing application",
      appUrl: "https://existing.com",
      githubUrl: "https://github.com/user/existing",
      tags: ["react", "typescript"],
      visibility: "public" as const,
    };

    describe("GIVEN I view the edit form with initialData", () => {
      it("WHEN the form renders THEN all fields should be pre-populated with the application data", () => {
        // Arrange & Act
        render(
          <ApplicationForm
            onSubmit={vi.fn()}
            onCancel={vi.fn()}
            initialData={mockInitialData}
            mode="edit"
          />
        );

        // Assert - All fields should be pre-populated
        const nameInput = screen.getByLabelText(/application name/i, {
          selector: "input",
        }) as HTMLInputElement;
        const descriptionInput = screen.getByLabelText(/description/i, {
          selector: "textarea",
        }) as HTMLTextAreaElement;
        const appUrlInput = screen.getByLabelText(/live app url/i, {
          selector: "input",
        }) as HTMLInputElement;
        const githubUrlInput = screen.getByLabelText(/github.*url/i, {
          selector: "input",
        }) as HTMLInputElement;
        const tagsInput = screen.getByLabelText(/tags/i, {
          selector: "input",
        }) as HTMLInputElement;

        expect(nameInput.value).toBe("Existing App");
        expect(descriptionInput.value).toBe("This is an existing application");
        expect(appUrlInput.value).toBe("https://existing.com");
        expect(githubUrlInput.value).toBe("https://github.com/user/existing");
        expect(tagsInput.value).toBe("react,typescript");
      });

      it("WHEN the form renders THEN the submit button should say 'Update Application'", () => {
        // Arrange & Act
        render(
          <ApplicationForm
            onSubmit={vi.fn()}
            onCancel={vi.fn()}
            initialData={mockInitialData}
            mode="edit"
          />
        );

        // Assert
        expect(
          screen.getByRole("button", { name: /update application/i })
        ).toBeInTheDocument();
      });
    });

    describe("GIVEN I modify a field in edit mode", () => {
      it("WHEN I change the value THEN the form should validate the new value", async () => {
        // Arrange
        const user = userEvent.setup();
        render(
          <ApplicationForm
            onSubmit={vi.fn()}
            onCancel={vi.fn()}
            initialData={mockInitialData}
            mode="edit"
          />
        );

        // Act - Clear the name field (make it invalid)
        const nameInput = screen.getByLabelText(/application name/i, {
          selector: "input",
        });
        await user.clear(nameInput);
        await user.tab(); // Trigger blur event

        // Assert - Should see validation error
        await waitFor(() => {
          expect(
            screen.getByText(/application name is required/i)
          ).toBeInTheDocument();
        });
      });

      it("WHEN I change a URL to an invalid format THEN I should see a validation error", async () => {
        // Arrange
        const user = userEvent.setup();
        render(
          <ApplicationForm
            onSubmit={vi.fn()}
            onCancel={vi.fn()}
            initialData={mockInitialData}
            mode="edit"
          />
        );

        // Act - Change URL to invalid format
        const appUrlInput = screen.getByLabelText(/live app url/i, {
          selector: "input",
        });
        await user.clear(appUrlInput);
        await user.type(appUrlInput, "not-a-valid-url");
        await user.tab(); // Trigger blur event

        // Assert - Should see validation error
        await waitFor(() => {
          expect(screen.getByText(/Must be a valid URL/i)).toBeInTheDocument();
        });
      });
    });

    describe("GIVEN I submit the edit form with valid changes", () => {
      it("WHEN I click save THEN I should see a success message", async () => {
        // Arrange
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(
          <ApplicationForm
            onSubmit={onSubmit}
            onCancel={vi.fn()}
            initialData={mockInitialData}
            mode="edit"
          />
        );

        // Act - Modify a field
        const nameInput = screen.getByLabelText(/application name/i, {
          selector: "input",
        });
        await user.clear(nameInput);
        await user.type(nameInput, "Updated App Name");

        const submitButton = screen.getByRole("button", {
          name: /update application/i,
        });
        await user.click(submitButton);

        // Assert - Should see success message
        await waitFor(() => {
          expect(
            screen.getByText(/success|saved|created/i)
          ).toBeInTheDocument();
        });

        // Should have called onSubmit with updated data
        expect(onSubmit).toHaveBeenCalledWith({
          name: "Updated App Name",
          description: "This is an existing application",
          appUrl: "https://existing.com",
          githubUrl: "https://github.com/user/existing",
          tags: ["react", "typescript"],
          visibility: "public",
        });
      });
    });

    describe("GIVEN I submit the edit form with invalid data", () => {
      it("WHEN I click save THEN I should see validation errors", async () => {
        // Arrange
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(
          <ApplicationForm
            onSubmit={onSubmit}
            onCancel={vi.fn()}
            initialData={mockInitialData}
            mode="edit"
          />
        );

        // Act - Clear required fields
        const nameInput = screen.getByLabelText(/application name/i, {
          selector: "input",
        });
        await user.clear(nameInput);

        const descriptionInput = screen.getByLabelText(/description/i, {
          selector: "textarea",
        });
        await user.clear(descriptionInput);

        const submitButton = screen.getByRole("button", {
          name: /update application/i,
        });
        await user.click(submitButton);

        // Assert - Should see validation errors
        await waitFor(() => {
          expect(
            screen.getByText(/application name is required/i)
          ).toBeInTheDocument();
        });
        expect(
          screen.getByText(/description is required/i)
        ).toBeInTheDocument();

        // Should not have called onSubmit
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    describe("GIVEN I make changes in edit mode", () => {
      it("WHEN I click cancel THEN the changes should be discarded", async () => {
        // Arrange
        const user = userEvent.setup();
        const onCancel = vi.fn();
        render(
          <ApplicationForm
            onSubmit={vi.fn()}
            onCancel={onCancel}
            initialData={mockInitialData}
            mode="edit"
          />
        );

        // Act - Modify a field
        const nameInput = screen.getByLabelText(/application name/i, {
          selector: "input",
        });
        await user.clear(nameInput);
        await user.type(nameInput, "Modified Name");

        // Verify the change was made
        expect((nameInput as HTMLInputElement).value).toBe("Modified Name");

        // Click cancel
        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        await user.click(cancelButton);

        // Assert - onCancel should be called
        expect(onCancel).toHaveBeenCalled();

        // The form should restore original data
        // (This is tested by checking the value after cancel is clicked)
        await waitFor(() => {
          expect((nameInput as HTMLInputElement).value).toBe("Existing App");
        });
      });

      it("WHEN I click cancel without making changes THEN onCancel should be called", async () => {
        // Arrange
        const user = userEvent.setup();
        const onCancel = vi.fn();
        render(
          <ApplicationForm
            onSubmit={vi.fn()}
            onCancel={onCancel}
            initialData={mockInitialData}
            mode="edit"
          />
        );

        // Act - Click cancel without making changes
        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        await user.click(cancelButton);

        // Assert
        expect(onCancel).toHaveBeenCalled();
      });
    });
  });
});
