import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProfilePicture } from "@/components/ProfilePicture";

describe("ProfilePicture Component - Acceptance Tests", () => {
  describe("GIVEN a user has a profile picture URL", () => {
    it("WHEN the ProfilePicture component renders THEN the system should display the user's profile picture", () => {
      const pictureUrl = "https://example.com/profile.jpg";
      const name = "John Doe";

      render(<ProfilePicture pictureUrl={pictureUrl} name={name} />);

      const img = screen.getByRole("img", {
        name: `${name}'s profile picture`,
      });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", pictureUrl);
    });
  });

  describe("GIVEN a user does not have a profile picture URL", () => {
    it("WHEN the ProfilePicture component renders THEN the system should display a default avatar with the user's initial", () => {
      const name = "John Doe";

      render(<ProfilePicture name={name} />);

      // Should show fallback with initial
      const fallback = screen.getByText("J");
      expect(fallback).toBeInTheDocument();

      // Should not have an img element
      const img = screen.queryByRole("img");
      expect(img).not.toBeInTheDocument();
    });
  });

  describe("GIVEN a profile picture fails to load", () => {
    it("WHEN the image error occurs THEN the system should fall back to the default avatar with the user's initial", async () => {
      const pictureUrl = "https://example.com/broken-image.jpg";
      const name = "Jane Smith";

      render(<ProfilePicture pictureUrl={pictureUrl} name={name} />);

      const img = screen.getByRole("img", {
        name: `${name}'s profile picture`,
      });

      // Simulate image load error
      img.dispatchEvent(new Event("error"));

      // After error, should show fallback with initial
      await waitFor(() => {
        const fallback = screen.getByText("J");
        expect(fallback).toBeInTheDocument();
      });
    });
  });

  describe("GIVEN the ProfilePicture component is rendered with different size props", () => {
    it("WHEN the component renders with size='sm' THEN the system should apply the appropriate size classes", () => {
      const name = "John Doe";

      const { container } = render(<ProfilePicture name={name} size="sm" />);

      // Check for small size classes
      const element = container.querySelector(".w-8");
      expect(element).toBeInTheDocument();
    });

    it("WHEN the component renders with size='md' THEN the system should apply the appropriate size classes", () => {
      const name = "John Doe";

      const { container } = render(<ProfilePicture name={name} size="md" />);

      // Check for medium size classes
      const element = container.querySelector(".w-12");
      expect(element).toBeInTheDocument();
    });

    it("WHEN the component renders with size='lg' THEN the system should apply the appropriate size classes", () => {
      const name = "John Doe";

      const { container } = render(<ProfilePicture name={name} size="lg" />);

      // Check for large size classes
      const element = container.querySelector(".w-24");
      expect(element).toBeInTheDocument();
    });
  });
});
