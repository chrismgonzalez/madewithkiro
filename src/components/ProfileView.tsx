import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProfile } from "@/hooks/useProfile";
import { useApplications } from "@/hooks/useApplications";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { applicationService } from "@/services/applicationService";
import ProfileForm from "./ProfileForm";
import LoadingSpinner from "./LoadingSpinner";
import type { ProfileFormData } from "@/utils/validation";
import {
  Linkedin,
  Github,
  ExternalLink,
  Edit2,
  Package,
  Edit,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileViewProps {
  userId: string;
}

export default function ProfileView({ userId }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteAppId, setDeleteAppId] = useState<string | null>(null);
  const [deleteAppName, setDeleteAppName] = useState<string>("");

  // Get authentication state
  const { isAuthenticated, currentUserId } = useMockAuth();

  // Determine if viewing own profile
  const isOwnProfile = isAuthenticated && currentUserId === userId;

  // Fetch user profile and applications using real API hooks
  const {
    profile,
    isLoading: profileLoading,
    updateProfile,
  } = useProfile(userId);
  const { applications = [], isLoading: appsLoading } = useApplications(userId);

  // Handle form submission
  const handleSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      // Error is already handled by the hook
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setIsEditing(false);
  };

  // Handle delete
  const handleDeleteClick = (appId: string, appName: string) => {
    setDeleteAppId(appId);
    setDeleteAppName(appName);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteAppId || !currentUserId) return;

    try {
      await applicationService.deleteApplication(deleteAppId, currentUserId);
      setDeleteAppId(null);
      setDeleteAppName("");
      // Refetch applications
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete application:", error);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteAppId(null);
    setDeleteAppName("");
  };
  //   if (!deleteAppId) return;
  //   // Delete logic here
  // };

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
    <TooltipProvider>
      <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6">
        {/* Profile Header Card */}
        <Card className="mb-6 sm:mb-8 overflow-hidden relative">
          {/* Edit Button - Top Right Corner */}
          {isOwnProfile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="icon"
                  className="absolute top-4 right-4 z-10 min-h-[44px] min-w-[44px] bg-background/80 backdrop-blur-sm hover:bg-background"
                  aria-label="Edit Profile"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit your profile</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Gradient Background Banner */}
          <div className="h-24 sm:h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />

          <CardContent className="pt-0 -mt-12 sm:-mt-16">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Avatar with Ring */}
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-xl ring-2 ring-primary/20">
                <AvatarFallback className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1 space-y-3 sm:space-y-4 pt-12 sm:pt-16">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">
                      @{profile.awsBuilderHandle}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Social Links with ButtonGroup */}
                <div className="flex flex-col sm:flex-row gap-3 items-center sm:items-start">
                  <ButtonGroup className="flex-wrap justify-center sm:justify-start">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant="default"
                          className="gap-2 min-h-[44px]"
                        >
                          <a
                            href={`https://builder.aws.com/community/@${profile.awsBuilderHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="hidden sm:inline">
                              AWS Builder Center
                            </span>
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View AWS Builder profile</p>
                      </TooltipContent>
                    </Tooltip>

                    {profile.linkedInUsername && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            asChild
                            variant="outline"
                            className="gap-2 min-h-[44px]"
                          >
                            <a
                              href={`https://www.linkedin.com/in/${profile.linkedInUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Linkedin className="h-4 w-4" />
                              <span className="hidden sm:inline">LinkedIn</span>
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Connect on LinkedIn</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {profile.githubUsername && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            asChild
                            variant="outline"
                            className="gap-2 min-h-[44px]"
                          >
                            <a
                              href={`https://github.com/${profile.githubUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Github className="h-4 w-4" />
                              <span className="hidden sm:inline">GitHub</span>
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View GitHub profile</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </ButtonGroup>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Applications
            </h2>
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
            <div className="grid gap-3 sm:gap-4">
              {applications.map((app) => (
                <Card
                  key={app.appId}
                  data-testid={`application-card-${app.appId}`}
                  className="group flex flex-col h-full hover:shadow-xl hover:border-primary/50 transition-all duration-300"
                >
                  <CardHeader className="space-y-3">
                    <CardTitle className="text-xl font-semibold leading-tight group-hover:text-primary transition-colors">
                      {app.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {app.description}
                    </p>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col gap-4">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {app.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs font-medium"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <Separator />

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-auto pt-2">
                      <Button
                        asChild
                        size="sm"
                        className="min-h-[44px] min-w-[44px] flex-1"
                      >
                        <a
                          href={app.appUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="View application"
                        >
                          <ExternalLink className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">View App</span>
                        </a>
                      </Button>

                      {app.githubUrl && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] min-w-[44px]"
                        >
                          <a
                            href={app.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="View GitHub repository"
                          >
                            <Github className="h-4 w-4" />
                          </a>
                        </Button>
                      )}

                      {/* Edit and Delete buttons - only show for own profile */}
                      {isOwnProfile && (
                        <>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <a
                              href={`/edit/${app.appId}`}
                              aria-label="Edit application"
                            >
                              <Edit className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Edit</span>
                            </a>
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            className="min-h-[44px] min-w-[44px]"
                            onClick={() =>
                              handleDeleteClick(app.appId, app.name)
                            }
                            aria-label="Delete application"
                          >
                            <Trash2 className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteAppId !== null}
          onOpenChange={(open) => !open && handleDeleteCancel()}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Application</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteAppName}"? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDeleteCancel}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
