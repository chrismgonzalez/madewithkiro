import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import ProfileForm from "@/components/ProfileForm";
import { profileService } from "@/services/profileService";
import type { ProfileFormData } from "@/utils/validation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function CreateProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (data: ProfileFormData) => {
    try {
      if (!user?.userId) {
        throw new Error("User ID not found. Please sign in again.");
      }

      const profileData = {
        firstName: data.firstName,
        lastName: data.lastName,
        awsBuilderHandle: data.awsBuilderHandle || "",
        linkedInUsername: data.linkedInUsername,
        githubUsername: data.githubUsername,
      };

      // Check if profile exists to determine whether to create or update
      // OTP users have profiles created during authentication (use PUT)
      // Social auth users don't have profiles yet (use POST)
      let savedProfile;
      try {
        await profileService.getProfile(user.userId);
        // Profile exists, update it
        savedProfile = await profileService.updateProfile({
          userId: user.userId,
          ...profileData,
        });
      } catch (error) {
        // Profile doesn't exist, create it
        savedProfile = await profileService.createProfile(profileData);
      }

      // Use the saved profile's userId (handles linked accounts)
      navigate({ to: `/profile/${savedProfile.userId}` });
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert(
        `Failed to save profile: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleCancel = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Welcome! Complete your profile</CardTitle>
          <CardDescription>
            Tell us a bit about yourself to get started on MadeWithKiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={{
              firstName: user?.givenName || "",
              lastName: user?.familyName || "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
