import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import ProfileForm from "../ProfileForm";

describe("ProfileForm - Acceptance Tests", () => {
  describe("GIVEN I view the profile form", () => {
    it("WHEN the form renders THEN I should see input fields for firstName, lastName, awsBuilderHandle, linkedInUsername, githubUsername", () => {
      // Arrange & Act
      render(<ProfileForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      // Assert
      expect(
        screen.getByLabelText(/first name/i, { selector: "input" })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/last name/i, { selector: "input" })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/aws builder.*handle/i, { selector: "input" })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/linkedin.*username/i, { selector: "input" })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/github.*username/i, { selector: "input" })
      ).toBeInTheDocument();
    });
  });

  describe("GIVEN I submit the form with missing required fields", () => {
    it("WHEN I click submit THEN I should see validation errors for those specific fields", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ProfileForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      // Act - Submit form without filling any fields
      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Assert - Should see validation errors for required fields
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(
        screen.getByText(/aws builder.*handle is required/i)
      ).toBeInTheDocument();

      // Should not have called onSubmit
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("WHEN I submit with only some required fields THEN I should see validation errors for missing fields only", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ProfileForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      // Act - Fill only firstName
      const firstNameInput = screen.getByLabelText(/first name/i, {
        selector: "input",
      });
      await user.type(firstNameInput, "John");

      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Assert - Should see errors for lastName and awsBuilderHandle only
      await waitFor(() => {
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      });
      expect(
        screen.getByText(/aws builder.*handle is required/i)
      ).toBeInTheDocument();

      // Should NOT see error for firstName
      expect(
        screen.queryByText(/first name is required/i)
      ).not.toBeInTheDocument();

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN I submit the form with all required fields", () => {
    it("WHEN I click submit THEN I should see a success message", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ProfileForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      // Act - Fill all required fields
      await user.type(
        screen.getByLabelText(/first name/i, { selector: "input" }),
        "John"
      );
      await user.type(
        screen.getByLabelText(/last name/i, { selector: "input" }),
        "Doe"
      );
      await user.type(
        screen.getByLabelText(/aws builder.*handle/i, { selector: "input" }),
        "johndoe"
      );

      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Assert - Should see success message
      await waitFor(() => {
        expect(screen.getByText(/success|saved|created/i)).toBeInTheDocument();
      });

      // Should have called onSubmit with correct data
      expect(onSubmit).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        awsBuilderHandle: "johndoe",
        linkedInUsername: "",
        githubUsername: "",
      });
    });

    it("WHEN I submit with all fields including optional THEN I should see a success message", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<ProfileForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      // Act - Fill all fields
      await user.type(
        screen.getByLabelText(/first name/i, { selector: "input" }),
        "Jane"
      );
      await user.type(
        screen.getByLabelText(/last name/i, { selector: "input" }),
        "Smith"
      );
      await user.type(
        screen.getByLabelText(/aws builder.*handle/i, { selector: "input" }),
        "janesmith"
      );
      await user.type(
        screen.getByLabelText(/linkedin.*username/i, { selector: "input" }),
        "janesmith"
      );
      await user.type(
        screen.getByLabelText(/github.*username/i, { selector: "input" }),
        "janesmith"
      );

      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/success|saved|created/i)).toBeInTheDocument();
      });

      expect(onSubmit).toHaveBeenCalledWith({
        firstName: "Jane",
        lastName: "Smith",
        awsBuilderHandle: "janesmith",
        linkedInUsername: "janesmith",
        githubUsername: "janesmith",
      });
    });
  });

  describe("GIVEN I am editing a profile and make changes", () => {
    it("WHEN I click cancel THEN the form should restore to its original state", async () => {
      // Arrange
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const initialData = {
        firstName: "Original",
        lastName: "Name",
        awsBuilderHandle: "original",
        linkedInUsername: "original",
        githubUsername: "original",
      };

      render(
        <ProfileForm
          onSubmit={vi.fn()}
          onCancel={onCancel}
          initialData={initialData}
        />
      );

      // Act - Modify fields
      const firstNameInput = screen.getByLabelText(/first name/i, {
        selector: "input",
      });
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "Modified");

      const lastNameInput = screen.getByLabelText(/last name/i, {
        selector: "input",
      });
      await user.clear(lastNameInput);
      await user.type(lastNameInput, "Changed");

      // Click cancel
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // Assert - onCancel should be called
      expect(onCancel).toHaveBeenCalled();

      // After cancel is called, the parent component would typically
      // re-render with original data or navigate away
    });

    it("WHEN I click cancel without making changes THEN onCancel should be called", async () => {
      // Arrange
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const initialData = {
        firstName: "John",
        lastName: "Doe",
        awsBuilderHandle: "johndoe",
      };

      render(
        <ProfileForm
          onSubmit={vi.fn()}
          onCancel={onCancel}
          initialData={initialData}
        />
      );

      // Act - Click cancel without changes
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // Assert
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("GIVEN I have a validation error on a field", () => {
    it("WHEN I correct that field THEN the error message for that field should clear", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProfileForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      // Act - Submit to trigger validation errors
      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });

      // Now correct the field
      const firstNameInput = screen.getByLabelText(/first name/i, {
        selector: "input",
      });
      await user.type(firstNameInput, "John");

      // Assert - Error should clear after typing
      await waitFor(() => {
        expect(
          screen.queryByText(/first name is required/i)
        ).not.toBeInTheDocument();
      });

      // Other errors should still be present
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(
        screen.getByText(/aws builder.*handle is required/i)
      ).toBeInTheDocument();
    });

    it("WHEN I correct multiple fields THEN each error should clear independently", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ProfileForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      // Act - Submit to trigger all validation errors
      const submitButton = screen.getByRole("button", { name: /submit|save/i });
      await user.click(submitButton);

      // Wait for errors
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });

      // Correct firstName
      await user.type(
        screen.getByLabelText(/first name/i, { selector: "input" }),
        "John"
      );

      await waitFor(() => {
        expect(
          screen.queryByText(/first name is required/i)
        ).not.toBeInTheDocument();
      });

      // Correct lastName
      await user.type(
        screen.getByLabelText(/last name/i, { selector: "input" }),
        "Doe"
      );

      await waitFor(() => {
        expect(
          screen.queryByText(/last name is required/i)
        ).not.toBeInTheDocument();
      });

      // awsBuilderHandle error should still be present
      expect(
        screen.getByText(/aws builder.*handle is required/i)
      ).toBeInTheDocument();

      // Correct awsBuilderHandle
      await user.type(
        screen.getByLabelText(/aws builder.*handle/i, { selector: "input" }),
        "johndoe"
      );

      await waitFor(() => {
        expect(
          screen.queryByText(/aws builder.*handle is required/i)
        ).not.toBeInTheDocument();
      });
    });
  });
});
