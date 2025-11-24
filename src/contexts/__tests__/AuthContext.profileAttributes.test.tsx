import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mock AWS Amplify v6 Auth functions
vi.mock("aws-amplify/auth", () => ({
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchUserAttributes: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

vi.mock("aws-amplify/utils", () => ({
  Hub: {
    listen: vi.fn(() => vi.fn()),
  },
}));

import { AuthProvider, useAuth } from "../AuthContext";
import * as auth from "aws-amplify/auth";

describe("AuthContext - Profile Attribute Retrieval Acceptance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GIVEN a user authenticates with Google", () => {
    it("WHEN the user profile is created THEN the system should extract email, given_name, family_name, and picture from the Google response", async () => {
      // Arrange
      const mockGoogleUser = {
        username: "google_123456789",
        userId: "google_123456789",
      };

      const mockGoogleAttributes = {
        sub: "google_123456789",
        email: "john.doe@example.com",
        email_verified: "true",
        given_name: "John",
        family_name: "Doe",
        picture: "https://lh3.googleusercontent.com/a/profile-pic",
        identities: JSON.stringify([
          {
            userId: "123456789",
            providerName: "Google",
            providerType: "Google",
            primary: "true",
            dateCreated: "1234567890",
          },
        ]),
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockGoogleUser as any);
      vi.mocked(auth.fetchUserAttributes).mockResolvedValue(
        mockGoogleAttributes as any
      );

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - User profile should contain all Google attributes
      expect(result.current.user).toEqual({
        userId: "google_123456789",
        email: "john.doe@example.com",
        givenName: "John",
        familyName: "Doe",
        picture: "https://lh3.googleusercontent.com/a/profile-pic",
        provider: "Google",
      });
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("GIVEN a user authenticates with GitHub", () => {
    it("WHEN the user profile is created THEN the system should extract email, name, and avatar_url from the GitHub response", async () => {
      // Arrange
      const mockGitHubUser = {
        username: "github_987654321",
        userId: "github_987654321",
      };

      const mockGitHubAttributes = {
        sub: "github_987654321",
        email: "jane.smith@example.com",
        email_verified: "true",
        name: "Jane Smith",
        picture: "https://avatars.githubusercontent.com/u/987654321",
        identities: JSON.stringify([
          {
            userId: "987654321",
            providerName: "GitHub",
            providerType: "OIDC",
            primary: "true",
            dateCreated: "1234567890",
          },
        ]),
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockGitHubUser as any);
      vi.mocked(auth.fetchUserAttributes).mockResolvedValue(
        mockGitHubAttributes as any
      );

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - User profile should contain GitHub attributes
      // Note: email and picture (avatar_url) should be extracted
      expect(result.current.user?.userId).toBe("github_987654321");
      expect(result.current.user?.email).toBe("jane.smith@example.com");
      expect(result.current.user?.picture).toBe(
        "https://avatars.githubusercontent.com/u/987654321"
      );
      expect(result.current.user?.provider).toBe("GitHub");
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("GIVEN a user authenticates with GitHub", () => {
    it("WHEN the name attribute is processed THEN the system should parse the full name into given_name and family_name", async () => {
      // Arrange
      const mockGitHubUser = {
        username: "github_111222333",
        userId: "github_111222333",
      };

      const mockGitHubAttributes = {
        sub: "github_111222333",
        email: "developer@example.com",
        name: "Alice Johnson",
        picture: "https://avatars.githubusercontent.com/u/111222333",
        identities: JSON.stringify([
          {
            userId: "111222333",
            providerName: "GitHub",
            providerType: "OIDC",
            primary: "true",
          },
        ]),
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockGitHubUser as any);
      vi.mocked(auth.fetchUserAttributes).mockResolvedValue(
        mockGitHubAttributes as any
      );

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - GitHub name should be parsed into given_name and family_name
      expect(result.current.user?.givenName).toBe("Alice");
      expect(result.current.user?.familyName).toBe("Johnson");
    });

    it("WHEN the name has multiple parts THEN the system should parse first word as given_name and remaining as family_name", async () => {
      // Arrange
      const mockGitHubUser = {
        username: "github_444555666",
        userId: "github_444555666",
      };

      const mockGitHubAttributes = {
        sub: "github_444555666",
        email: "user@example.com",
        name: "Maria Elena Garcia Rodriguez",
        picture: "https://avatars.githubusercontent.com/u/444555666",
        identities: JSON.stringify([
          {
            userId: "444555666",
            providerName: "GitHub",
            providerType: "OIDC",
            primary: "true",
          },
        ]),
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockGitHubUser as any);
      vi.mocked(auth.fetchUserAttributes).mockResolvedValue(
        mockGitHubAttributes as any
      );

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - First word should be given name, rest should be family name
      expect(result.current.user?.givenName).toBe("Maria");
      expect(result.current.user?.familyName).toBe("Elena Garcia Rodriguez");
    });

    it("WHEN the name has only one word THEN the system should use it as given_name with no family_name", async () => {
      // Arrange
      const mockGitHubUser = {
        username: "github_777888999",
        userId: "github_777888999",
      };

      const mockGitHubAttributes = {
        sub: "github_777888999",
        email: "mononym@example.com",
        name: "Madonna",
        picture: "https://avatars.githubusercontent.com/u/777888999",
        identities: JSON.stringify([
          {
            userId: "777888999",
            providerName: "GitHub",
            providerType: "OIDC",
            primary: "true",
          },
        ]),
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockGitHubUser as any);
      vi.mocked(auth.fetchUserAttributes).mockResolvedValue(
        mockGitHubAttributes as any
      );

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Single name should be given name only
      expect(result.current.user?.givenName).toBe("Madonna");
      expect(result.current.user?.familyName).toBeUndefined();
    });
  });

  describe("GIVEN user attributes are extracted", () => {
    it("WHEN the profile is stored THEN the system should store the profile picture URL in the user state", async () => {
      // Arrange
      const mockUser = {
        username: "test_user",
        userId: "test_123",
      };

      const mockAttributes = {
        sub: "test_123",
        email: "user@example.com",
        given_name: "Test",
        family_name: "User",
        picture: "https://example.com/profile-picture.jpg",
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockUser as any);
      vi.mocked(auth.fetchUserAttributes).mockResolvedValue(
        mockAttributes as any
      );

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Profile picture URL should be stored in user state
      expect(result.current.user?.picture).toBe(
        "https://example.com/profile-picture.jpg"
      );
    });

    it("WHEN no profile picture is provided THEN the picture field should be undefined", async () => {
      // Arrange
      const mockUser = {
        username: "test_user_no_pic",
        userId: "test_456",
      };

      const mockAttributes = {
        sub: "test_456",
        email: "nopic@example.com",
        given_name: "No",
        family_name: "Picture",
        // No picture attribute
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockUser as any);
      vi.mocked(auth.fetchUserAttributes).mockResolvedValue(
        mockAttributes as any
      );

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Picture should be undefined when not provided
      expect(result.current.user?.picture).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("WHEN GitHub name is empty string THEN both given_name and family_name should be undefined", async () => {
      // Arrange
      const mockGitHubUser = {
        username: "github_empty_name",
        userId: "github_empty",
      };

      const mockGitHubAttributes = {
        sub: "github_empty",
        email: "empty@example.com",
        name: "",
        picture: "https://avatars.githubusercontent.com/u/empty",
        identities: JSON.stringify([
          {
            userId: "empty",
            providerName: "GitHub",
            providerType: "OIDC",
            primary: "true",
          },
        ]),
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockGitHubUser as any);
      vi.mocked(auth.fetchUserAttributes).mockResolvedValue(
        mockGitHubAttributes as any
      );

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Empty name should result in undefined given/family names
      expect(result.current.user?.givenName).toBeUndefined();
      expect(result.current.user?.familyName).toBeUndefined();
    });

    it("WHEN GitHub name has extra whitespace THEN it should be trimmed and parsed correctly", async () => {
      // Arrange
      const mockGitHubUser = {
        username: "github_whitespace",
        userId: "github_ws",
      };

      const mockGitHubAttributes = {
        sub: "github_ws",
        email: "whitespace@example.com",
        name: "  John   Doe  ",
        picture: "https://avatars.githubusercontent.com/u/ws",
        identities: JSON.stringify([
          {
            userId: "ws",
            providerName: "GitHub",
            providerType: "OIDC",
            primary: "true",
          },
        ]),
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockGitHubUser as any);
      vi.mocked(auth.fetchUserAttributes).mockResolvedValue(
        mockGitHubAttributes as any
      );

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Whitespace should be trimmed and name parsed correctly
      expect(result.current.user?.givenName).toBe("John");
      expect(result.current.user?.familyName).toBe("Doe");
    });
  });
});
