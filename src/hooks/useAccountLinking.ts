import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Custom hook for handling account linking redirect logic
 *
 * This hook manages the redirect flow when a user has a pending account link:
 * 1. Checks if user has pending_link flag
 * 2. Stores intended destination in sessionStorage
 * 3. Redirects to /link-account page
 *
 * Requirements: 3.4, 10.5
 */
export function useAccountLinking() {
  const navigate = useNavigate();
  const { pendingLink, linkTargetSub } = useAuth();

  useEffect(() => {
    // Only handle redirect if we have a pending link
    if (!pendingLink || !linkTargetSub) {
      return;
    }

    const currentPath = window.location.pathname;

    // Don't redirect if already on link-account or login page
    if (currentPath === "/link-account" || currentPath === "/login") {
      return;
    }

    // Store current path as intended destination
    sessionStorage.setItem("intendedDestination", currentPath);

    // Redirect to link-account page
    navigate({ to: "/link-account", replace: true });
  }, [pendingLink, linkTargetSub, navigate]);

  return {
    pendingLink,
    linkTargetSub,
  };
}

/**
 * Get the intended destination from sessionStorage
 *
 * @returns The intended destination path or null
 */
export function getIntendedDestination(): string | null {
  return sessionStorage.getItem("intendedDestination");
}

/**
 * Clear the intended destination from sessionStorage
 */
export function clearIntendedDestination(): void {
  sessionStorage.removeItem("intendedDestination");
}

/**
 * Set the intended destination in sessionStorage
 *
 * @param path - The path to store as intended destination
 */
export function setIntendedDestination(path: string): void {
  sessionStorage.setItem("intendedDestination", path);
}
