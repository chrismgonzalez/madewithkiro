import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { profileSchema, type ProfileFormData } from "@/utils/validation";
import { z } from "zod";
import { CheckCircle2, Github, Linkedin } from "lucide-react";

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
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Edit Profile</CardTitle>
        <CardDescription>
          Update your profile information and social links
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {showSuccess && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Profile saved successfully!</AlertDescription>
            </Alert>
          )}

          {/* Name Fields - Side by Side on Desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <InputGroup>
                <InputGroupInput
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  onBlur={() => handleBlur("firstName")}
                  className={hasFieldError("firstName") ? "border-red-500" : ""}
                  aria-invalid={hasFieldError("firstName")}
                  aria-describedby={
                    hasFieldError("firstName") ? "firstName-error" : undefined
                  }
                />
              </InputGroup>
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
              <InputGroup>
                <InputGroupInput
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  onBlur={() => handleBlur("lastName")}
                  className={hasFieldError("lastName") ? "border-red-500" : ""}
                  aria-invalid={hasFieldError("lastName")}
                  aria-describedby={
                    hasFieldError("lastName") ? "lastName-error" : undefined
                  }
                />
              </InputGroup>
              {hasFieldError("lastName") && (
                <p id="lastName-error" className="text-sm text-red-500">
                  {getFieldError("lastName")}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* AWS Builder Handle */}
          <div className="space-y-2">
            <Label htmlFor="awsBuilderHandle">
              AWS Builder Center Handle <span className="text-red-500">*</span>
            </Label>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>@</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="awsBuilderHandle"
                type="text"
                placeholder="your-handle"
                value={formData.awsBuilderHandle}
                onChange={(e) =>
                  handleInputChange("awsBuilderHandle", e.target.value)
                }
                onBlur={() => handleBlur("awsBuilderHandle")}
                className={
                  hasFieldError("awsBuilderHandle") ? "border-red-500" : ""
                }
                aria-invalid={hasFieldError("awsBuilderHandle")}
                aria-describedby={
                  hasFieldError("awsBuilderHandle")
                    ? "awsBuilderHandle-error"
                    : undefined
                }
              />
            </InputGroup>
            {hasFieldError("awsBuilderHandle") && (
              <p id="awsBuilderHandle-error" className="text-sm text-red-500">
                {getFieldError("awsBuilderHandle")}
              </p>
            )}
          </div>

          <Separator />

          {/* Social Links Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Social Links (Optional)
            </h3>

            {/* LinkedIn Username */}
            <div className="space-y-2">
              <Label htmlFor="linkedInUsername">LinkedIn Username</Label>
              <InputGroup>
                <InputGroupAddon>
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="linkedInUsername"
                  type="text"
                  placeholder="your-username"
                  value={formData.linkedInUsername}
                  onChange={(e) =>
                    handleInputChange("linkedInUsername", e.target.value)
                  }
                  onBlur={() => handleBlur("linkedInUsername")}
                  className={
                    hasFieldError("linkedInUsername") ? "border-red-500" : ""
                  }
                  aria-invalid={hasFieldError("linkedInUsername")}
                  aria-describedby={
                    hasFieldError("linkedInUsername")
                      ? "linkedInUsername-error"
                      : undefined
                  }
                />
              </InputGroup>
              {hasFieldError("linkedInUsername") && (
                <p id="linkedInUsername-error" className="text-sm text-red-500">
                  {getFieldError("linkedInUsername")}
                </p>
              )}
            </div>

            {/* GitHub Username */}
            <div className="space-y-2">
              <Label htmlFor="githubUsername">GitHub Username</Label>
              <InputGroup>
                <InputGroupAddon>
                  <Github className="h-4 w-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="githubUsername"
                  type="text"
                  placeholder="your-username"
                  value={formData.githubUsername}
                  onChange={(e) =>
                    handleInputChange("githubUsername", e.target.value)
                  }
                  onBlur={() => handleBlur("githubUsername")}
                  className={
                    hasFieldError("githubUsername") ? "border-red-500" : ""
                  }
                  aria-invalid={hasFieldError("githubUsername")}
                  aria-describedby={
                    hasFieldError("githubUsername")
                      ? "githubUsername-error"
                      : undefined
                  }
                />
              </InputGroup>
              {hasFieldError("githubUsername") && (
                <p id="githubUsername-error" className="text-sm text-red-500">
                  {getFieldError("githubUsername")}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] w-full sm:w-auto"
            >
              {isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
