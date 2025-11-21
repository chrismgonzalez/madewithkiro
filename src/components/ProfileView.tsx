import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProfile, useUserApplications } from "@/hooks/useData";
import { useMockAuth } from "@/contexts/MockAuthContext";
import ProfileForm from "./ProfileForm";
import LoadingSpinner from "./LoadingSpinner";
import type { ProfileFormData } from "@/utils/validation";
import { Linkedin, Github, ExternalLink, Edit2, Package } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <div className="w-full max-w-4xl mx-auto">
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

  const userInitials =
    `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();

  // View mode - display profile
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6">
      {/* Profile Header Card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-primary/10">
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    AWS Builder: {profile.awsBuilderHandle}
                  </p>
                </div>
                {isOwnProfile && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>

              <Separator />

              {/* Social Links */}
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="default" size="sm" className="gap-2">
                  <a
                    href={`https://builder.aws.com/community/@${profile.awsBuilderHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    AWS Builder
                  </a>
                </Button>

                {profile.linkedInUsername && (
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a
                      href={`https://www.linkedin.com/in/${profile.linkedInUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  </Button>
                )}

                {profile.githubUsername && (
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a
                      href={`https://github.com/${profile.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Applications</h2>
          <Badge variant="secondary" className="ml-auto">
            {applications.length}
          </Badge>
        </div>

        {appsLoading ? (
          <LoadingSpinner message="Loading applications..." />
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">
                This user hasn't created any applications yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {applications.map((app) => (
              <Card
                key={app.appId}
                data-testid={`application-card-${app.appId}`}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <CardTitle className="text-xl">{app.name}</CardTitle>
                    <Badge
                      variant={
                        app.visibility === "public" ? "default" : "secondary"
                      }
                    >
                      {app.visibility === "public" ? "Public" : "Private"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{app.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {app.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="sm" className="gap-2">
                      <a
                        href={app.appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View App
                      </a>
                    </Button>
                    {app.githubUrl && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <a
                          href={app.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Github className="h-4 w-4" />
                          Source Code
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
