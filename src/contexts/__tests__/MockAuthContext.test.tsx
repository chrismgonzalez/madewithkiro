import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MockAuthProvider, useMockAuth } from "../MockAuthContext";

describe("MockAuthContext - Acceptance Tests", () => {
  // localStorage is cleared automatically by setup.ts

  describe("GIVEN the application starts", () => {
    it("WHEN I check authentication state THEN I should see the default unauthenticated state", () => {
      // Arrange & Act
      const { result } = renderHook(() => useMockAuth(), {
        wrapper: MockAuthProvider,
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("GIVEN I am unauthenticated", () => {
    it("WHEN I toggle authentication THEN I should become authenticated", () => {
      // Arrange
      const { result } = renderHook(() => useMockAuth(), {
        wrapper: MockAuthProvider,
      });

      // Verify initial state
      expect(result.current.isAuthenticated).toBe(false);

      // Act
      act(() => {
        result.current.toggleAuth();
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("GIVEN I am authenticated", () => {
    it("WHEN I toggle authentication THEN I should become unauthenticated", () => {
      // Arrange
      const { result } = renderHook(() => useMockAuth(), {
        wrapper: MockAuthProvider,
      });

      // Set up authenticated state
      act(() => {
        result.current.toggleAuth();
      });
      expect(result.current.isAuthenticated).toBe(true);

      // Act
      act(() => {
        result.current.toggleAuth();
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("GIVEN I toggle authentication state", () => {
    it("WHEN I refresh the page THEN my authentication state should persist", () => {
      // Arrange - First render and authenticate
      const { result: firstRender } = renderHook(() => useMockAuth(), {
        wrapper: MockAuthProvider,
      });

      act(() => {
        firstRender.current.toggleAuth();
      });
      expect(firstRender.current.isAuthenticated).toBe(true);

      // Act - Simulate page refresh by creating a new hook instance
      const { result: secondRender } = renderHook(() => useMockAuth(), {
        wrapper: MockAuthProvider,
      });

      // Assert - State should persist from localStorage
      expect(secondRender.current.isAuthenticated).toBe(true);
    });

    it("WHEN I toggle to unauthenticated and refresh THEN I should remain unauthenticated", () => {
      // Arrange - Start authenticated
      const { result: firstRender } = renderHook(() => useMockAuth(), {
        wrapper: MockAuthProvider,
      });

      act(() => {
        firstRender.current.toggleAuth(); // Authenticate
      });
      expect(firstRender.current.isAuthenticated).toBe(true);

      act(() => {
        firstRender.current.toggleAuth(); // Unauthenticate
      });
      expect(firstRender.current.isAuthenticated).toBe(false);

      // Act - Simulate page refresh
      const { result: secondRender } = renderHook(() => useMockAuth(), {
        wrapper: MockAuthProvider,
      });

      // Assert - Should remain unauthenticated
      expect(secondRender.current.isAuthenticated).toBe(false);
    });
  });
});
