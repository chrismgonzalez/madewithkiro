import ApplicationForm from "@/components/ApplicationForm";
import { useNavigate } from "@tanstack/react-router";
import type { ApplicationFormData } from "@/utils/validation";

export default function AddApplicationPage() {
  const navigate = useNavigate();

  const handleSubmit = (data: ApplicationFormData) => {
    console.log("Application submitted:", data);
    // In the future, this will call an API to create the application
    // For now, just navigate back to gallery
    navigate({ to: "/" });
  };

  const handleCancel = () => {
    // Navigate back to gallery on cancel
    navigate({ to: "/" });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Add Application</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Share your Kiro-built application with the community
        </p>
      </div>
      <ApplicationForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
}
