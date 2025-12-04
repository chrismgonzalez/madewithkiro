import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { AlertCircle, Link2 } from "lucide-react";

export default function LinkAccountPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkForExistingProfile();
  }, []);

  const checkForExistingProfile = async () => {
    try {
      if (!user?.email) {
        navigate({ to: "/create-profile", replace: true });
        return;
      }

      const profile = await profileService.checkProfileByEmail(user.email);

      if (profile) {
        setExistingProfile(profile);
      } else {
        navigate({ to: "/create-profile", replace: true });
      }
    } catch (error) {
      console.error("Error checking for existing profile:", error);
      navigate({ to: "/create-profile", replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccounts = async () => {
    try {
      setLinking(true);
      setError(null);

      if (!user?.userId || !existingProfile?.userId) {
        throw new Error("Missing user information");
      }

      await profileService.linkAccounts(existingProfile.userId);

      navigate({ to: `/profile/${existingProfile.userId}`, replace: true });
    } catch (error) {
      console.error("Error linking accounts:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to link accounts. Please try again."
      );
    } finally {
      setLinking(false);
    }
  };

  const handleCreateNewProfile = () => {
    navigate({ to: "/create-profile", replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner message="Checking for existing profile..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Link2 className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Account Found</CardTitle>
          <CardDescription>
            We found an existing profile for {user?.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {existingProfile && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Existing Profile</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {existingProfile.firstName} {existingProfile.lastName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {existingProfile.email}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Would you like to link your current sign-in method to this
              existing profile? This will allow you to sign in using either
              method.
            </p>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleLinkAccounts}
                disabled={linking}
                className="flex-1 min-h-[44px]"
                size="lg"
              >
                {linking ? "Linking..." : "Link Accounts"}
              </Button>
              <Button
                onClick={handleCreateNewProfile}
                disabled={linking}
                variant="outline"
                className="flex-1 min-h-[44px]"
                size="lg"
              >
                Create New Profile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
