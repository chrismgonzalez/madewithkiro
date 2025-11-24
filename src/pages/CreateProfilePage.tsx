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
    console.log("CreateProfilePage handleSubmit called with data:", data);
    console.log("Current user:", user);

    try {
      const profileData = {
        firstName: data.firstName,
        lastName: data.lastName,
        awsBuilderHandle: data.awsBuilderHandle || "",
        linkedInUsername: data.linkedInUsername,
        githubUsername: data.githubUsername,
      };

      console.log("Creating profile with data:", profileData);
      const result = await profileService.createProfile(profileData);
      console.log("Profile created successfully:", result);

      // Redirect to user's profile
      console.log("Redirecting to profile:", `/profile/${user?.userId}`);
      navigate({ to: `/profile/${user?.userId}` });
    } catch (error) {
      console.error("Failed to create profile:", error);
      alert(
        `Failed to create profile: ${
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
          <CardTitle>Welcome! Let's create your profile</CardTitle>
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
