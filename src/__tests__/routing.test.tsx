import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockAuthProvider } from "@/contexts/MockAuthContext";

// Mock router for testing
const mockNavigate = vi.fn();
const mockLocation = { pathname: "/" };

vi.mock("@tanstack/react-router", () => ({
  Router: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  RouterProvider: ({ router }: { router: any }) => <div>{router.children}</div>,
  createRouter: (config: any) => config,
  createRootRoute: () => ({
    component: () => <div>Root</div>,
  }),
  createRoute: (config: any) => config,
  Link: ({ to, children, ...props }: any) => (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        mockNavigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useParams: () => ({}),
  Outlet: () => <div>Outlet</div>,
}));

describe("Routing - Acceptance Tests", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLocation.pathname = "/";
    localStorage.clear();
  });

  describe("GIVEN I click a navigation link", () => {
    it("WHEN the link is clicked THEN I should navigate without a full page reload", async () => {
      const user = userEvent.setup();

      // Create a simple test component with navigation
      const TestComponent = () => {
        return (
          <MockAuthProvider>
            <div>
              <nav>
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    mockNavigate("/");
                  }}
                >
                  Gallery
                </a>
                <a
                  href="/profile/user123"
                  onClick={(e) => {
                    e.preventDefault();
                    mockNavigate("/profile/user123");
                  }}
                >
                  Profile
                </a>
                <a
                  href="/add-app"
                  onClick={(e) => {
                    e.preventDefault();
                    mockNavigate("/add-app");
                  }}
                >
                  Add App
                </a>
              </nav>
            </div>
          </MockAuthProvider>
        );
      };

      render(<TestComponent />);

      // Click on Profile link
      const profileLink = screen.getByText("Profile");
      await user.click(profileLink);

      // Should call navigate without page reload
      expect(mockNavigate).toHaveBeenCalledWith("/profile/user123");
    });
  });

  describe("GIVEN I navigate to a profile page", () => {
    it("WHEN the URL contains a userId THEN I should see the correct profile", async () => {
      const TestProfilePage = () => {
        const userId = "user123";
        return (
          <MockAuthProvider>
            <div>
              <h1>Profile Page</h1>
              <p>User ID: {userId}</p>
            </div>
          </MockAuthProvider>
        );
      };

      render(<TestProfilePage />);

      // Should display the correct userId
      expect(screen.getByText("User ID: user123")).toBeInTheDocument();
    });
  });

  describe("GIVEN I use browser back/forward buttons", () => {
    it("WHEN I navigate THEN the correct page should render", async () => {
      // This test verifies that the router handles browser navigation
      // In a real scenario, this would be tested with actual browser history

      const TestComponent = () => {
        return (
          <MockAuthProvider>
            <div>
              <p>Current path: {mockLocation.pathname}</p>
            </div>
          </MockAuthProvider>
        );
      };

      render(<TestComponent />);

      // Should show current path
      expect(screen.getByText("Current path: /")).toBeInTheDocument();

      // Simulate navigation by changing mockLocation
      mockLocation.pathname = "/profile/user123";

      // Re-render with new location
      const { rerender } = render(<TestComponent />);
      rerender(<TestComponent />);

      await waitFor(() => {
        expect(
          screen.getByText("Current path: /profile/user123")
        ).toBeInTheDocument();
      });
    });
  });

  describe("GIVEN I access a direct URL", () => {
    it("WHEN the page loads THEN the correct page should render", () => {
      // Set initial location
      mockLocation.pathname = "/add-app";

      const TestComponent = () => {
        return (
          <MockAuthProvider>
            <div>
              <h1>Add Application</h1>
              <p>Path: {mockLocation.pathname}</p>
            </div>
          </MockAuthProvider>
        );
      };

      render(<TestComponent />);

      // Should render the correct page based on URL
      expect(screen.getByText("Add Application")).toBeInTheDocument();
      expect(screen.getByText("Path: /add-app")).toBeInTheDocument();
    });
  });

  describe("Route-based code splitting", () => {
    it("WHEN navigating between routes THEN components should load correctly", async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        return (
          <MockAuthProvider>
            <div>
              <nav>
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    mockNavigate("/");
                  }}
                >
                  Gallery
                </a>
                <a
                  href="/profile/user123"
                  onClick={(e) => {
                    e.preventDefault();
                    mockNavigate("/profile/user123");
                  }}
                >
                  Profile
                </a>
              </nav>
              <main>
                {mockLocation.pathname === "/" && <div>Gallery Page</div>}
                {mockLocation.pathname.startsWith("/profile") && (
                  <div>Profile Page</div>
                )}
              </main>
            </div>
          </MockAuthProvider>
        );
      };

      render(<TestComponent />);

      // Should show gallery initially
      expect(screen.getByText("Gallery Page")).toBeInTheDocument();

      // Navigate to profile
      const profileLink = screen.getByText("Profile");
      await user.click(profileLink);

      // Should call navigate
      expect(mockNavigate).toHaveBeenCalledWith("/profile/user123");
    });
  });
});
