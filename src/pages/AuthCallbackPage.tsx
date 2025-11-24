import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Hub } from "@aws-amplify/core";
import { getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/services/profileService";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * OAuth Callback Page Component
 *
 * Handles the OAuth callback after user authenticates with Google or GitHub.
 * Waits for Amplify to complete the code exchange, listens for the Hub signIn event,
 * and redirects the user to their intended destination or home page.
 *
 * Also handles OAuth errors that may occur during the authentication process.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const searchParams = useSearch({ strict: false }) as {
    error?: string;
    error_description?: string;
  };
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("AuthCallbackPage mounted");
    console.log("Current user:", user);

    // Check for OAuth errors in URL parameters
    if (searchParams.error) {
      const errorMessage = getErrorMessage(
        searchParams.error,
        searchParams.error_description
      );
      setError(errorMessage);
      return;
    }

    // If user is already authenticated, check profile immediately
    if (user?.userId) {
      console.log("User already authenticated, checking profile");
      handleSuccessfulAuth();
      return;
    }

    // Listen for Hub signedIn event
    console.log("Setting up Hub listener");
    const hubListener = Hub.listen("auth", ({ payload: { event } }) => {
      console.log("Hub event received:", event);
      if (event === "signedIn") {
        handleSuccessfulAuth();
      }
    });

    // Cleanup listener on unmount
    return () => hubListener();
  }, [searchParams.error, searchParams.error_description, user]);

  /**
   * Handle successful authentication
   *
   * Checks if user has a profile, redirects to profile creation if not,
   * otherwise navigates to the intended destination.
   */
  const handleSuccessfulAuth = async () => {
    console.log("handleSuccessfulAuth called");

    // Get user directly from Amplify
    let userId: string | undefined;
    try {
      await getCurrentUser();
      const attributes = await fetchUserAttributes();
      userId = attributes.sub;
      console.log("User ID from Amplify:", userId);
    } catch (error) {
      console.error("Error getting current user:", error);
    }

    if (!userId) {
      console.log("No user ID, redirecting to home");
      navigate({ to: "/", replace: true });
      return;
    }

    // Check if profile exists
    try {
      console.log("Checking if profile exists for user:", userId);
      const profile = await profileService.getProfile(userId);
      console.log("Profile found:", profile);

      // Profile exists, redirect to intended destination
      const redirectTo = sessionStorage.getItem("redirect_after_auth") || "/";
      sessionStorage.removeItem("redirect_after_auth");
      console.log("Redirecting to:", redirectTo);
      navigate({ to: redirectTo, replace: true });
    } catch (error: any) {
      console.log("Error checking profile:", error);
      console.log("Error status:", error.status);

      // Profile doesn't exist (404), redirect to profile creation
      if (error.status === 404) {
        console.log("Profile not found (404), redirecting to create-profile");
        navigate({ to: "/create-profile", replace: true });
      } else {
        // Other error, go home
        console.error("Unexpected error, redirecting to home:", error);
        navigate({ to: "/", replace: true });
      }
    }
  };

  /**
   * Get user-friendly error message for OAuth errors
   *
   * Maps OAuth error codes to human-readable messages.
   *
   * @param error - OAuth error code
   * @param description - Optional error description from provider
   * @returns User-friendly error message
   */
  const getErrorMessage = (
    error: string,
    description?: string | null
  ): string => {
    const errorMessages: Record<string, string> = {
      access_denied: "You cancelled the sign-in process. Please try again.",
      invalid_request: "Authentication request was invalid. Please try again.",
      unauthorized_client:
        "This application is not authorized. Please contact support.",
      server_error:
        "The authentication provider encountered an error. Please try again later.",
      temporarily_unavailable:
        "The authentication service is temporarily unavailable. Please try again later.",
    };

    return (
      errorMessages[error] ||
      description ||
      "An unexpected error occurred during sign-in."
    );
  };

  /**
   * Handle retry authentication
   *
   * Navigates back to the auth page to allow user to try again.
   */
  const handleRetry = () => {
    navigate({ to: "/auth", replace: true });
  };

  // Display error state if OAuth error occurred
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600 dark:text-red-400">
              Authentication Error
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={handleRetry} variant="default" size="lg">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Display loading state while waiting for OAuth callback
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner message="Completing sign in..." size="lg" />
      </div>
    </div>
  );
}
