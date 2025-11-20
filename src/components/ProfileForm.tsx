import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileSchema, type ProfileFormData } from "@/utils/validation";
import { z } from "zod";

interface ProfileFormProps {
  onSubmit: (data: ProfileFormData) => void | Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ProfileFormData>;
}

interface FieldError {
  field: keyof ProfileFormData;
  message: string;
}

export default function ProfileForm({
  onSubmit,
  onCancel,
  initialData,
}: ProfileFormProps) {
  // Initialize form state with initial data or empty values
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    awsBuilderHandle: initialData?.awsBuilderHandle || "",
    linkedInUsername: initialData?.linkedInUsername || "",
    githubUsername: initialData?.githubUsername || "",
  });

  const [errors, setErrors] = useState<FieldError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store original data for cancel functionality
  const [originalData] = useState<ProfileFormData>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    awsBuilderHandle: initialData?.awsBuilderHandle || "",
    linkedInUsername: initialData?.linkedInUsername || "",
    githubUsername: initialData?.githubUsername || "",
  });

  // Clear success message after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: keyof ProfileFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (
    field: keyof ProfileFormData,
    value: string | undefined
  ) => {
    try {
      // Validate single field
      const fieldSchema = profileSchema.shape[field];
      fieldSchema.parse(value);

      // Clear error for this field
      setErrors((prev) => prev.filter((error) => error.field !== field));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues;
        if (issues.length > 0) {
          const fieldError = issues[0];
          setErrors((prev) => [
            ...prev.filter((e) => e.field !== field),
            { field, message: fieldError.message },
          ]);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      firstName: true,
      lastName: true,
      awsBuilderHandle: true,
      linkedInUsername: true,
      githubUsername: true,
    });

    // Validate entire form
    try {
      const validatedData = profileSchema.parse(formData);

      // Clear all errors
      setErrors([]);

      // Set submitting state
      setIsSubmitting(true);

      // Call onSubmit with validated data
      await onSubmit(validatedData);

      // Show success message
      setShowSuccess(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues;
        const fieldErrors: FieldError[] = issues.map((err) => ({
          field: err.path[0] as keyof ProfileFormData,
          message: err.message,
        }));
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Restore original data
    setFormData(originalData);
    setErrors([]);
    setTouched({});
    setShowSuccess(false);

    // Call onCancel callback
    onCancel();
  };

  const getFieldError = (field: keyof ProfileFormData): string | undefined => {
    return errors.find((error) => error.field === field)?.message;
  };

  const hasFieldError = (field: keyof ProfileFormData): boolean => {
    return errors.some((error) => error.field === field);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {showSuccess && (
        <div
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded"
          role="alert"
        >
          Profile saved successfully!
        </div>
      )}

      {/* First Name */}
      <div className="space-y-2">
        <Label htmlFor="firstName">
          First Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="firstName"
          type="text"
          value={formData.firstName}
          onChange={(e) => handleInputChange("firstName", e.target.value)}
          onBlur={() => handleBlur("firstName")}
          className={hasFieldError("firstName") ? "border-red-500" : ""}
          aria-invalid={hasFieldError("firstName")}
          aria-describedby={
            hasFieldError("firstName") ? "firstName-error" : undefined
          }
        />
        {hasFieldError("firstName") && (
          <p id="firstName-error" className="text-sm text-red-500">
            {getFieldError("firstName")}
          </p>
        )}
      </div>

      {/* Last Name */}
      <div className="space-y-2">
        <Label htmlFor="lastName">
          Last Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="lastName"
          type="text"
          value={formData.lastName}
          onChange={(e) => handleInputChange("lastName", e.target.value)}
          onBlur={() => handleBlur("lastName")}
          className={hasFieldError("lastName") ? "border-red-500" : ""}
          aria-invalid={hasFieldError("lastName")}
          aria-describedby={
            hasFieldError("lastName") ? "lastName-error" : undefined
          }
        />
        {hasFieldError("lastName") && (
          <p id="lastName-error" className="text-sm text-red-500">
            {getFieldError("lastName")}
          </p>
        )}
      </div>

      {/* AWS Builder Handle */}
      <div className="space-y-2">
        <Label htmlFor="awsBuilderHandle">
          AWS Builder Handle <span className="text-red-500">*</span>
        </Label>
        <Input
          id="awsBuilderHandle"
          type="text"
          value={formData.awsBuilderHandle}
          onChange={(e) =>
            handleInputChange("awsBuilderHandle", e.target.value)
          }
          onBlur={() => handleBlur("awsBuilderHandle")}
          className={hasFieldError("awsBuilderHandle") ? "border-red-500" : ""}
          aria-invalid={hasFieldError("awsBuilderHandle")}
          aria-describedby={
            hasFieldError("awsBuilderHandle")
              ? "awsBuilderHandle-error"
              : undefined
          }
        />
        {hasFieldError("awsBuilderHandle") && (
          <p id="awsBuilderHandle-error" className="text-sm text-red-500">
            {getFieldError("awsBuilderHandle")}
          </p>
        )}
      </div>

      {/* LinkedIn Username */}
      <div className="space-y-2">
        <Label htmlFor="linkedInUsername">LinkedIn Username</Label>
        <Input
          id="linkedInUsername"
          type="text"
          value={formData.linkedInUsername}
          onChange={(e) =>
            handleInputChange("linkedInUsername", e.target.value)
          }
          onBlur={() => handleBlur("linkedInUsername")}
          className={hasFieldError("linkedInUsername") ? "border-red-500" : ""}
          aria-invalid={hasFieldError("linkedInUsername")}
          aria-describedby={
            hasFieldError("linkedInUsername")
              ? "linkedInUsername-error"
              : undefined
          }
        />
        {hasFieldError("linkedInUsername") && (
          <p id="linkedInUsername-error" className="text-sm text-red-500">
            {getFieldError("linkedInUsername")}
          </p>
        )}
      </div>

      {/* GitHub Username */}
      <div className="space-y-2">
        <Label htmlFor="githubUsername">GitHub Username</Label>
        <Input
          id="githubUsername"
          type="text"
          value={formData.githubUsername}
          onChange={(e) => handleInputChange("githubUsername", e.target.value)}
          onBlur={() => handleBlur("githubUsername")}
          className={hasFieldError("githubUsername") ? "border-red-500" : ""}
          aria-invalid={hasFieldError("githubUsername")}
          aria-describedby={
            hasFieldError("githubUsername") ? "githubUsername-error" : undefined
          }
        />
        {hasFieldError("githubUsername") && (
          <p id="githubUsername-error" className="text-sm text-red-500">
            {getFieldError("githubUsername")}
          </p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
