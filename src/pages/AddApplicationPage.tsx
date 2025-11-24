import ApplicationForm from "@/components/ApplicationForm";
import { useNavigate } from "@tanstack/react-router";
import { useApplications } from "@/hooks/useApplications";
import { useAuth } from "@/contexts/AuthContext";
import type { ApplicationFormData } from "@/utils/validation";

export default function AddApplicationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.userId;
  const { createApplication } = useApplications();

  const handleSubmit = async (data: ApplicationFormData) => {
    try {
      // Remove visibility field (not yet supported by backend) and convert empty appUrl to undefined
      const { visibility, appUrl, ...rest } = data;
      const payload = {
        ...rest,
        appUrl: appUrl || undefined, // Convert empty string to undefined
        userId: currentUserId || "test-user-001", // Fallback to test user
      };

      console.log("Submitting application:", payload);
      await createApplication(payload);
      // Redirect to gallery on success
      navigate({ to: "/" });
    } catch (error) {
      console.error("Failed to create application:", error);
      // Error is already handled by the hook
    }
  };

  const handleCancel = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <ApplicationForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
}
