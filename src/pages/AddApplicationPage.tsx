import ApplicationForm from "@/components/ApplicationForm";
import { useNavigate } from "@tanstack/react-router";
import type { ApplicationFormData } from "@/utils/validation";

export default function AddApplicationPage() {
  const navigate = useNavigate();

  const handleSubmit = (data: ApplicationFormData) => {
    console.log("Application submitted:", data);
    navigate({ to: "/" });
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
