import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmptyGallery from "../EmptyGallery";
import EmptyFilterResults from "../EmptyFilterResults";
import EmptyProfile from "../EmptyProfile";

describe("Empty States - Acceptance Tests", () => {
  describe("EmptyGallery", () => {
    it("GIVEN the gallery has no applications WHEN I view the gallery THEN I should see an empty state message", () => {
      // GIVEN the gallery has no applications
      // WHEN I view the gallery
      render(<EmptyGallery />);

      // THEN I should see an empty state message
      expect(
        screen.getByText(/no applications available/i)
      ).toBeInTheDocument();
    });

    it("should display a descriptive message", () => {
      render(<EmptyGallery />);

      expect(
        screen.getByText(/no applications available/i)
      ).toBeInTheDocument();
    });
  });

  describe("EmptyFilterResults", () => {
    it("GIVEN no applications match filters WHEN I view the gallery THEN I should see an empty state message", () => {
      // GIVEN no applications match filters
      const onClearFilters = vi.fn();

      // WHEN I view the gallery
      render(<EmptyFilterResults onClearFilters={onClearFilters} />);

      // THEN I should see an empty state message
      expect(
        screen.getByText(/no applications match your filters/i)
      ).toBeInTheDocument();
    });

    it("should provide a clear filters action", async () => {
      const user = userEvent.setup();
      const onClearFilters = vi.fn();

      render(<EmptyFilterResults onClearFilters={onClearFilters} />);

      const clearButton = screen.getByRole("button", {
        name: /clear filters/i,
      });
      await user.click(clearButton);

      expect(onClearFilters).toHaveBeenCalledOnce();
    });
  });

  describe("EmptyProfile", () => {
    it("GIVEN a user has no applications WHEN I view their profile THEN I should see an empty state message", () => {
      // GIVEN a user has no applications
      // WHEN I view their profile
      render(<EmptyProfile />);

      // THEN I should see an empty state message
      expect(
        screen.getByText(/hasn't created any applications yet/i)
      ).toBeInTheDocument();
    });

    it("should display a descriptive message", () => {
      render(<EmptyProfile />);

      expect(
        screen.getByText(/hasn't created any applications yet/i)
      ).toBeInTheDocument();
    });
  });
});
