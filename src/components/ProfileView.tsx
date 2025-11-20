import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProfile, useUserApplications } from "@/hooks/useData";
import { useMockAuth } from "@/contexts/MockAuthContext";
import ProfileForm from "./ProfileForm";
import LoadingSpinner from "./LoadingSpinner";
import type { ProfileFormData } from "@/utils/validation";
import { Linkedin, Github, ExternalLink } from "lucide-react";

interface ProfileViewProps {
  userId: string;
}

export default function ProfileView({ userId }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Get authentication state
  const { isAuthenticated, currentUserId } = useMockAuth();

  // Determine if viewing own profile
  const isOwnProfile = isAuthenticated && currentUserId === userId;

  // Fetch user profile and applications
  const { data: profile, isLoading: profileLoading } = useProfile(userId);
  const { data: applications = [], isLoading: appsLoading } =
    useUserApplications(userId);

  // Handle form submission
  const handleSubmit = (data: ProfileFormData) => {
    console.log("Profile updated:", data);
    // In the future, this will call an API to update the profile
    // For now, just toggle back to view mode
    setIsEditing(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setIsEditing(false);
  };

  // Loading state
  if (profileLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6">
        <LoadingSpinner message="Loading profile..." />
      </div>
    );
  }

  // Profile not found
  if (!profile) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6">
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  // Edit mode - show ProfileForm
  if (isEditing) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Edit Profile</h1>
        <ProfileForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          initialData={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            awsBuilderHandle: profile.awsBuilderHandle,
            linkedInUsername: profile.linkedInUsername,
            githubUsername: profile.githubUsername,
          }}
        />
      </div>
    );
  }

  // View mode - display profile
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6">
      {/* Profile Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mb-4">
              AWS Builder: {profile.awsBuilderHandle}
            </p>
          </div>
          {/* Only show Edit button when viewing own profile */}
          {isOwnProfile && (
            <Button
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto"
            >
              Edit Profile
            </Button>
          )}
        </div>

        {/* Social Links */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* AWS Builder Center Link */}
          <a
            href={`https://builder.aws.com/community/@${profile.awsBuilderHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors min-h-[44px] text-sm sm:text-base"
          >
            <ExternalLink size={16} />
            AWS Builder Center
          </a>

          {/* LinkedIn Link - conditional */}
          {profile.linkedInUsername && (
            <a
              href={`https://www.linkedin.com/in/${profile.linkedInUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors min-h-[44px] text-sm sm:text-base"
            >
              <Linkedin size={16} />
              LinkedIn
            </a>
          )}

          {/* GitHub Link - conditional */}
          {profile.githubUsername && (
            <a
              href={`https://github.com/${profile.githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors min-h-[44px] text-sm sm:text-base"
            >
              <Github size={16} />
              GitHub
            </a>
          )}
        </div>
      </div>

      {/* Applications Section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Applications</h2>

        {appsLoading ? (
          <LoadingSpinner message="Loading applications..." />
        ) : applications.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-base sm:text-lg px-4">
              This user hasn't created any applications yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {applications.map((app) => (
              <div
                key={app.appId}
                data-testid={`application-card-${app.appId}`}
                className="border rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                  <h3 className="text-lg sm:text-xl font-semibold">
                    {app.name}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start ${
                      app.visibility === "public"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {app.visibility === "public" ? "Public" : "Private"}
                  </span>
                </div>

                <p className="text-gray-600 mb-4 text-sm sm:text-base">
                  {app.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {app.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs sm:text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Links */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <a
                    href={app.appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 inline-flex items-center justify-center sm:justify-start gap-1 min-h-[44px] text-sm sm:text-base"
                  >
                    <ExternalLink size={16} />
                    View App
                  </a>
                  {app.githubUrl && (
                    <a
                      href={app.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-800 inline-flex items-center justify-center sm:justify-start gap-1 min-h-[44px] text-sm sm:text-base"
                    >
                      <Github size={16} />
                      Source Code
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
