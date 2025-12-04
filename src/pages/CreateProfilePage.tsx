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
        userId: user.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        awsBuilderHandle: data.awsBuilderHandle || "",
        linkedInUsername: data.linkedInUsername,
        githubUsername: data.githubUsername,
      };

      // Use updateProfile instead of createProfile
      // The profile is already created during OTP authentication (VerifyAuthChallenge Lambda)
      // This page is for completing/updating the profile information
      await profileService.updateProfile(profileData);

      navigate({ to: `/profile/${user.userId}` });
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert(
        `Failed to update profile: ${
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
