import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useApplication, useUpdateApplication } from "@/hooks/useData";
import { useMockAuth } from "@/contexts/MockAuthContext";
import ApplicationForm from "@/components/ApplicationForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { ApplicationFormData } from "@/utils/validation";

export default function EditApplicationPage() {
  const { appId } = useParams({ strict: false }) as { appId: string };
  const navigate = useNavigate();
  const { currentUserId, isAuthenticated } = useMockAuth();
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Fetch application data
  const {
    data: application,
    isLoading,
    error: fetchError,
  } = useApplication(appId);

  // Update mutation
  const { mutate: updateApplication, isPending: isUpdating } =
    useUpdateApplication();

  // Check authentication
  if (!isAuthenticated || !currentUserId) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please log in to edit applications.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <LoadingSpinner />
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  // Handle application not found
  if (!application) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Application Not Found</AlertTitle>
          <AlertDescription>
            The application you're trying to edit doesn't exist.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check ownership
  if (application.userId !== currentUserId) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unauthorized</AlertTitle>
          <AlertDescription>
            You don't have permission to edit this application.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle form submission
  const handleSubmit = async (data: ApplicationFormData) => {
    // Clear any previous errors
    setUpdateError(null);

    updateApplication(
      { appId, data },
      {
        onSuccess: () => {
          // TODO: Show success toast notification when toast system is implemented
          // For now, log success to console
          console.log("Application updated successfully");

          // Navigate back to gallery on success
          navigate({ to: "/" });
        },
        onError: (error) => {
          console.error("Failed to update application:", error);
          // Set error message for display
          setUpdateError(
            error instanceof Error
              ? error.message
              : "Failed to update application. Please try again."
          );
        },
      }
    );
  };

  // Handle cancel
  const handleCancel = () => {
    navigate({ to: "/" });
  };

  // Prepare initial data for the form
  const initialData: Partial<ApplicationFormData> = {
    name: application.name,
    description: application.description,
    appUrl: application.appUrl,
    githubUrl: application.githubUrl,
    tags: application.tags,
    visibility: application.visibility,
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {updateError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{updateError}</AlertDescription>
        </Alert>
      )}
      <ApplicationForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialData={initialData}
        mode="edit"
      />
    </div>
  );
}
