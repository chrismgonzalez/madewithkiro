import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import {
  getIntendedDestination,
  clearIntendedDestination,
} from "@/hooks/useAccountLinking";
import LoadingSpinner from "@/components/LoadingSpinner";
import AccountLinkPrompt from "@/components/AccountLinkPrompt";

export default function LinkAccountPage() {
  const navigate = useNavigate();
  const { user, pendingLink, linkTargetSub } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentAuthMethod, setCurrentAuthMethod] = useState<
    "google" | "email"
  >("email");
  const [existingAuthMethod, setExistingAuthMethod] = useState<
    "google" | "email"
  >("email");

  useEffect(() => {
    checkLinkingStatus();
  }, [user, pendingLink, linkTargetSub]);

  const checkLinkingStatus = async () => {
    try {
      // If no pending link, redirect to profile or home
      if (!pendingLink || !linkTargetSub) {
        if (user?.userId) {
          navigate({ to: `/profile/${user.userId}`, replace: true });
        } else {
          navigate({ to: "/", replace: true });
        }
        return;
      }

      // Determine current and existing auth methods
      const provider = user?.provider?.toLowerCase();
      if (provider === "google") {
        setCurrentAuthMethod("google");
        setExistingAuthMethod("email");
      } else {
        setCurrentAuthMethod("email");
        setExistingAuthMethod("google");
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking linking status:", error);
      navigate({ to: "/", replace: true });
    }
  };

  const handleConfirmLink = async () => {
    try {
      // Call the link accounts API endpoint
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/auth/link-accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: Add JWT token from Amplify session
        },
        body: JSON.stringify({
          targetUserSub: linkTargetSub,
          confirmLink: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to link accounts");
      }

      // Get intended destination and clear it
      const intendedDestination = getIntendedDestination();
      clearIntendedDestination();

      // Redirect to intended destination or profile
      if (intendedDestination) {
        navigate({ to: intendedDestination as any, replace: true });
      } else if (user?.userId) {
        navigate({ to: `/profile/${user.userId}`, replace: true });
      } else {
        navigate({ to: "/", replace: true });
      }
    } catch (error) {
      console.error("Error linking accounts:", error);
      throw error;
    }
  };

  const handleDeclineLink = () => {
    // Clear linking flags and proceed with separate account
    if (user?.userId) {
      navigate({ to: `/profile/${user.userId}`, replace: true });
    } else {
      navigate({ to: "/create-profile", replace: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner message="Checking linking status..." size="lg" />
      </div>
    );
  }

  if (!user?.email || !pendingLink || !linkTargetSub) {
    return null;
  }

  return (
    <AccountLinkPrompt
      currentAuthMethod={currentAuthMethod}
      existingAuthMethod={existingAuthMethod}
      email={user.email}
      targetUserSub={linkTargetSub}
      onConfirm={handleConfirmLink}
      onDecline={handleDeclineLink}
    />
  );
}
