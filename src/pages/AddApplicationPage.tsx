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
    if (!currentUserId) {
      console.error("User not authenticated");
      return;
    }

    try {
      const { visibility, appUrl, ...rest } = data;
      const payload = {
        ...rest,
        appUrl: appUrl || undefined,
        userId: currentUserId,
      };

      await createApplication(payload);
      navigate({ to: "/" });
    } catch (error) {
      console.error("Failed to create application:", error);
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
