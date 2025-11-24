import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Auth Routing Configuration Tests
 *
 * Validates that authentication routes are properly configured in the router.
 * Uses static analysis to verify route configuration without importing the router.
 */
describe("Auth Routing Configuration", () => {
  const routerContent = readFileSync(
    join(process.cwd(), "src/router.tsx"),
    "utf-8"
  );

  it("should import AuthPage component", () => {
    expect(routerContent).toContain(
      'import { AuthPage } from "@/pages/AuthPage"'
    );
  });

  it("should import AuthCallbackPage component", () => {
    expect(routerContent).toContain(
      'import AuthCallbackPage from "@/pages/AuthCallbackPage"'
    );
  });

  it("should import ProtectedRoute component", () => {
    expect(routerContent).toContain(
      'import { ProtectedRoute } from "@/components/ProtectedRoute"'
    );
  });

  it("should have /auth route configured", () => {
    expect(routerContent).toContain('path: "/auth"');
    expect(routerContent).toContain("component: AuthPage");
  });

  it("should have /auth/callback route configured", () => {
    expect(routerContent).toContain('path: "/auth/callback"');
    expect(routerContent).toContain("component: AuthCallbackPage");
  });

  it("should wrap protected routes with ProtectedRoute", () => {
    // Check that ProtectedRoute is used in the router
    expect(routerContent).toContain("<ProtectedRoute>");
    expect(routerContent).toContain("</ProtectedRoute>");
  });

  it("should include auth routes in the route tree", () => {
    expect(routerContent).toContain("authRoute");
    expect(routerContent).toContain("authCallbackRoute");
    expect(routerContent).toMatch(/routeTree.*addChildren.*authRoute/s);
    expect(routerContent).toMatch(/routeTree.*addChildren.*authCallbackRoute/s);
  });

  it("should protect profile view route", () => {
    // Profile view route should be wrapped with ProtectedRoute
    const profileRouteMatch = routerContent.match(
      /\/\/ Profile view route \(protected\)([\s\S]*?)path: "\/profile\/\$userId"([\s\S]*?)<ProtectedRoute>/
    );
    expect(profileRouteMatch).toBeTruthy();
  });

  it("should protect all user-specific routes", () => {
    // Count ProtectedRoute occurrences - should be 4 (profile view, profile edit, add app, edit app)
    const protectedRouteCount = (routerContent.match(/<ProtectedRoute>/g) || [])
      .length;
    expect(protectedRouteCount).toBeGreaterThanOrEqual(4);
  });
});
