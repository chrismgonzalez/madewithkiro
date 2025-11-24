import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Amplify Configuration", () => {
  beforeEach(() => {
    // Reset modules to ensure clean state
    vi.resetModules();
  });

  it("should export amplify configuration", async () => {
    const amplifyModule = await import("../amplify");
    expect(amplifyModule.default).toBeDefined();
    expect(amplifyModule.default).toHaveProperty("Auth");
  });

  it("should configure Auth with Cognito settings", async () => {
    const amplifyModule = await import("../amplify");
    const config = amplifyModule.default;

    expect(config.Auth).toBeDefined();
    expect(config.Auth.Cognito).toBeDefined();
  });

  it("should include OAuth configuration", async () => {
    const amplifyModule = await import("../amplify");
    const config = amplifyModule.default;

    expect(config.Auth.Cognito.loginWith).toBeDefined();
    expect(config.Auth.Cognito.loginWith.oauth).toBeDefined();
  });

  it("should configure OAuth scopes", async () => {
    const amplifyModule = await import("../amplify");
    const config = amplifyModule.default;

    const scopes = config.Auth.Cognito.loginWith.oauth.scopes;
    expect(scopes).toContain("email");
    expect(scopes).toContain("openid");
    expect(scopes).toContain("profile");
    expect(scopes).toContain("aws.cognito.signin.user.admin");
  });

  it("should use code response type for OAuth", async () => {
    const amplifyModule = await import("../amplify");
    const config = amplifyModule.default;

    expect(config.Auth.Cognito.loginWith.oauth.responseType).toBe("code");
  });

  it("should configure redirect URLs", async () => {
    const amplifyModule = await import("../amplify");
    const config = amplifyModule.default;

    const oauth = config.Auth.Cognito.loginWith.oauth;
    expect(oauth.redirectSignIn).toBeDefined();
    expect(oauth.redirectSignOut).toBeDefined();
    expect(Array.isArray(oauth.redirectSignIn)).toBe(true);
    expect(Array.isArray(oauth.redirectSignOut)).toBe(true);
  });

  it("should use localhost URLs when running on localhost", async () => {
    // Mock window.location for localhost
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { origin: "http://localhost:5173" } as any;

    // Re-import to get fresh configuration
    vi.resetModules();
    const amplifyModule = await import("../amplify");
    const config = amplifyModule.default;

    const oauth = config.Auth.Cognito.loginWith.oauth;
    expect(oauth.redirectSignIn[0]).toBe("http://localhost:5173/auth/callback");
    expect(oauth.redirectSignOut[0]).toBe("http://localhost:5173/");

    // Restore original location
    window.location = originalLocation;
  });

  it("should use current domain URLs when not on localhost", async () => {
    // Mock window.location for production domain
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { origin: "https://madewithkiro.com" } as any;

    // Re-import to get fresh configuration
    vi.resetModules();
    const amplifyModule = await import("../amplify");
    const config = amplifyModule.default;

    const oauth = config.Auth.Cognito.loginWith.oauth;
    expect(oauth.redirectSignIn[0]).toBe(
      "https://madewithkiro.com/auth/callback"
    );
    expect(oauth.redirectSignOut[0]).toBe("https://madewithkiro.com/");

    // Restore original location
    window.location = originalLocation;
  });

  it("should strip https:// from Cognito domain", async () => {
    const amplifyModule = await import("../amplify");
    const config = amplifyModule.default;

    const domain = config.Auth.Cognito.loginWith.oauth.domain;
    expect(domain).not.toContain("https://");
    expect(domain).not.toContain("http://");
  });
});
