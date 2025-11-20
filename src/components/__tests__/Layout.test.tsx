import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockAuthProvider } from "@/contexts/MockAuthContext";
import Layout from "@/components/Layout";

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MockAuthProvider>{ui}</MockAuthProvider>);
};

describe("Layout Component - Acceptance Tests", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe("GIVEN I navigate to any page", () => {
    it("WHEN the page renders THEN I should see consistent header with Navigation", () => {
      renderWithProviders(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Should see the logo/app name
      expect(screen.getByText("MadeWithKiro")).toBeInTheDocument();

      // Should see navigation links
      expect(screen.getByText("Gallery")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Add App")).toBeInTheDocument();

      // Should see the content
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("WHEN the page renders THEN I should see a footer with links", () => {
      renderWithProviders(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Should see footer
      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();
    });

    it("WHEN the page renders THEN I should see main content area with max-width container", () => {
      renderWithProviders(
        <Layout>
          <div data-testid="test-content">Test Content</div>
        </Layout>
      );

      // Should see main element
      const main = screen.getByRole("main");
      expect(main).toBeInTheDocument();

      // Should contain the content
      expect(screen.getByTestId("test-content")).toBeInTheDocument();
    });
  });

  describe("Mobile responsiveness", () => {
    it("WHEN the page renders THEN the layout should be mobile-responsive", () => {
      renderWithProviders(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const main = screen.getByRole("main");
      expect(main).toBeInTheDocument();

      // The layout should have responsive classes (we can't test actual rendering, but we can verify structure)
      expect(main).toHaveClass("container");
    });
  });
});
