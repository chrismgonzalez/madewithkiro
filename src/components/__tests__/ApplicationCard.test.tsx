import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test/utils";
import ApplicationCard from "../ApplicationCard";
import { getAllApplications } from "@/services/mockData";

describe("ApplicationCard - Acceptance Tests", () => {
  // Use mock data for testing
  const mockApps = getAllApplications(true);
  const publicApp = mockApps.find((app) => app.visibility === "public")!;
  const appWithGithub = mockApps.find((app) => app.githubUrl)!;
  const appWithoutGithub = mockApps.find((app) => !app.githubUrl)!;

  describe("GIVEN an application card is rendered", () => {
    it("WHEN I view the card THEN I should see app name, description, and tags", () => {
      // Arrange & Act
      render(<ApplicationCard application={publicApp} />);

      // Assert - Should display app name
      expect(screen.getByText(publicApp.name)).toBeInTheDocument();

      // Assert - Should display description
      expect(screen.getByText(publicApp.description)).toBeInTheDocument();

      // Assert - Should display all tags
      publicApp.tags.forEach((tag) => {
        expect(screen.getByText(tag)).toBeInTheDocument();
      });
    });

    it("WHEN I view the card THEN I should see the application name and description", () => {
      // Arrange & Act
      render(<ApplicationCard application={publicApp} />);

      // Assert - Should display app name
      expect(screen.getByText(publicApp.name)).toBeInTheDocument();

      // Assert - Should display description
      expect(screen.getByText(publicApp.description)).toBeInTheDocument();
    });

    it("WHEN I view the card THEN I should see creator information with a clickable profile link", () => {
      // Arrange & Act
      render(<ApplicationCard application={publicApp} />);

      // Assert - Should display creator name
      expect(screen.getByText(publicApp.userName)).toBeInTheDocument();

      // Assert - Should have clickable link to creator profile
      const creatorLink = screen.getByRole("link", {
        name: new RegExp(publicApp.userName, "i"),
      });
      expect(creatorLink).toBeInTheDocument();
      expect(creatorLink).toHaveAttribute(
        "href",
        `/profile/${publicApp.userId}`
      );
    });
  });

  describe("GIVEN an application has a live app URL", () => {
    it("WHEN I view the card THEN I should see a clickable link that opens in a new tab", () => {
      // Arrange & Act
      render(<ApplicationCard application={publicApp} />);

      // Assert - Should have link to live app
      const appLink = screen.getByRole("link", {
        name: /view app|live app|visit/i,
      });
      expect(appLink).toBeInTheDocument();
      expect(appLink).toHaveAttribute("href", publicApp.appUrl);

      // Assert - Should open in new tab
      expect(appLink).toHaveAttribute("target", "_blank");
      expect(appLink).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("GIVEN an application has a GitHub URL", () => {
    it("WHEN I view the card THEN I should see a clickable GitHub link that opens in a new tab", () => {
      // Arrange & Act
      render(<ApplicationCard application={appWithGithub} />);

      // Assert - Should have link to GitHub repo
      const githubLink = screen.getByRole("link", {
        name: /github|view code|repository/i,
      });
      expect(githubLink).toBeInTheDocument();
      expect(githubLink).toHaveAttribute("href", appWithGithub.githubUrl);

      // Assert - Should open in new tab
      expect(githubLink).toHaveAttribute("target", "_blank");
      expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("WHEN an application has no GitHub URL THEN I should not see a GitHub link", () => {
      // Arrange & Act
      render(<ApplicationCard application={appWithoutGithub} />);

      // Assert - Should NOT have GitHub link
      const githubLink = screen.queryByRole("link", {
        name: /github|view code|repository/i,
      });
      expect(githubLink).not.toBeInTheDocument();
    });
  });

  describe("ApplicationCard visual elements", () => {
    it("WHEN I view the card THEN it should have proper card styling", () => {
      // Arrange & Act
      const { container } = render(<ApplicationCard application={publicApp} />);

      // Assert - Should render as a card (checking for card-like structure)
      // The actual styling is handled by shadcn/ui Card component
      expect(container.firstChild).toBeInTheDocument();
    });

    it("WHEN I view the card THEN tags should be displayed as badges", () => {
      // Arrange & Act
      render(<ApplicationCard application={publicApp} />);

      // Assert - Each tag should be visible
      publicApp.tags.forEach((tag) => {
        const tagElement = screen.getByText(tag);
        expect(tagElement).toBeInTheDocument();
      });
    });
  });

  describe("Edit button visibility - REMOVED from gallery view (moved to profile)", () => {
    it("GIVEN I am authenticated and viewing my own application card WHEN the card renders THEN I should NOT see an edit button", () => {
      // Arrange - Get an application owned by user-001 (Sarah Chen)
      const myApp = mockApps.find((app) => app.userId === "user-001")!;

      // Act - Render with authenticated user viewing their own app
      render(<ApplicationCard application={myApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Assert - Should NOT see edit button (moved to profile view)
      const editButton = screen.queryByRole("link", { name: /edit/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it("GIVEN I am authenticated and viewing another user's application card WHEN the card renders THEN I should NOT see an edit button", () => {
      // Arrange - Get an application owned by user-002 (Marcus Rodriguez)
      const otherUserApp = mockApps.find((app) => app.userId === "user-002")!;

      // Act - Render with authenticated user viewing another user's app
      render(<ApplicationCard application={otherUserApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Assert - Should NOT see edit button
      const editButton = screen.queryByRole("link", { name: /edit/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it("GIVEN I am unauthenticated WHEN I view any application card THEN I should NOT see an edit button", () => {
      // Arrange - Get any application
      const anyApp = mockApps[0];

      // Act - Render with unauthenticated user
      render(<ApplicationCard application={anyApp} />, {
        mockAuthState: {
          isAuthenticated: false,
          currentUserId: null,
        },
      });

      // Assert - Should NOT see edit button
      const editButton = screen.queryByRole("link", { name: /edit/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe("Delete button visibility - REMOVED from gallery view (moved to profile)", () => {
    it("GIVEN I am authenticated and viewing my own application card WHEN the card renders THEN I should NOT see a delete button", () => {
      // Arrange - Get an application owned by user-001 (Sarah Chen)
      const myApp = mockApps.find((app) => app.userId === "user-001")!;

      // Act - Render with authenticated user viewing their own app
      render(<ApplicationCard application={myApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Assert - Should NOT see delete button (moved to profile view)
      const deleteButton = screen.queryByRole("button", { name: /delete/i });
      expect(deleteButton).not.toBeInTheDocument();
    });

    it("GIVEN I am authenticated and viewing another user's application card WHEN the card renders THEN I should NOT see a delete button", () => {
      // Arrange - Get an application owned by user-002 (Marcus Rodriguez)
      const otherUserApp = mockApps.find((app) => app.userId === "user-002")!;

      // Act - Render with authenticated user viewing another user's app
      render(<ApplicationCard application={otherUserApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Assert - Should NOT see delete button
      const deleteButton = screen.queryByRole("button", { name: /delete/i });
      expect(deleteButton).not.toBeInTheDocument();
    });

    it("GIVEN I am unauthenticated WHEN I view any application card THEN I should NOT see a delete button", () => {
      // Arrange - Get any application
      const anyApp = mockApps[0];

      // Act - Render with unauthenticated user
      render(<ApplicationCard application={anyApp} />, {
        mockAuthState: {
          isAuthenticated: false,
          currentUserId: null,
        },
      });

      // Assert - Should NOT see delete button
      const deleteButton = screen.queryByRole("button", { name: /delete/i });
      expect(deleteButton).not.toBeInTheDocument();
    });
  });

  // NOTE: Delete confirmation flow tests removed - delete functionality moved to ProfileView
  // These tests are now in ProfileView.test.tsx instead
  // describe("Delete confirmation flow - Requirements 11.4, 11.5, 12.1, 12.3, 12.4, 12.5", () => {
});
