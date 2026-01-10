import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import {
  applicationSchema,
  type ApplicationFormData,
} from "@/utils/validation";
import { showSuccessToast, showErrorToast } from "@/utils/toast";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";

interface ApplicationFormProps {
  onSubmit: (data: ApplicationFormData) => void | Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ApplicationFormData>;
  mode?: "create" | "edit";
}

interface FieldError {
  field: keyof ApplicationFormData;
  message: string;
}

export default function ApplicationForm({
  onSubmit,
  onCancel,
  initialData,
  mode = "create",
}: ApplicationFormProps) {
  // Initialize form state with initial data or empty values
  const [formData, setFormData] = useState<ApplicationFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    appUrl: initialData?.appUrl || "",
    repositoryUrl: initialData?.repositoryUrl || "",
    tags: initialData?.tags || [],
    visibility: "public", // Always public since auth is required
  });

  const [errors, setErrors] = useState<FieldError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagsInput, setTagsInput] = useState<string>(
    initialData?.tags?.join(",") || ""
  );

  // Store original data for cancel functionality
  const [originalData] = useState<ApplicationFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    appUrl: initialData?.appUrl || "",
    repositoryUrl: initialData?.repositoryUrl || "",
    tags: initialData?.tags || [],
    visibility: "public", // Always public since auth is required
  });

  // Clear success message after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // Check if form has unsaved changes
  const hasUnsavedChanges = () => {
    return (
      formData.name !== originalData.name ||
      formData.description !== originalData.description ||
      formData.appUrl !== originalData.appUrl ||
      formData.repositoryUrl !== originalData.repositoryUrl ||
      JSON.stringify(formData.tags.sort()) !==
        JSON.stringify(originalData.tags.sort()) ||
      formData.visibility !== originalData.visibility
    );
  };

  // Warn user about unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges() && !isSubmitting) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [formData, originalData, isSubmitting]);

  const handleInputChange = (
    field: keyof ApplicationFormData,
    value: string | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleTagsInputChange = (value: string) => {
    setTagsInput(value);

    // Parse comma-separated tags
    const tagsArray = value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    handleInputChange("tags", tagsArray);
  };

  const handleBlur = (field: keyof ApplicationFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (
    field: keyof ApplicationFormData,
    value: string | string[] | undefined
  ) => {
    if (value === undefined) return;
    try {
      // Validate single field
      const fieldSchema = applicationSchema.shape[field];
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
      name: true,
      description: true,
      appUrl: true,
      repositoryUrl: true,
      tags: true,
    });

    // Validate entire form
    try {
      const validatedData = applicationSchema.parse(formData);

      // Clear all errors
      setErrors([]);

      // Set submitting state
      setIsSubmitting(true);

      // Call onSubmit with validated data
      await onSubmit(validatedData);

      // Show success message
      setShowSuccess(true);

      // Show success toast notification
      showSuccessToast("Application created successfully", 5000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues;
        const fieldErrors: FieldError[] = issues.map((err) => ({
          field: err.path[0] as keyof ApplicationFormData,
          message: err.message,
        }));
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        // Show error toast notification
        showErrorToast(error.message, 5000);
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
    setTagsInput(originalData.tags.join(","));

    // Call onCancel callback
    onCancel();
  };

  const getFieldError = (
    field: keyof ApplicationFormData
  ): string | undefined => {
    return errors.find((error) => error.field === field)?.message;
  };

  const hasFieldError = (field: keyof ApplicationFormData): boolean => {
    return errors.some((error) => error.field === field);
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">
          {mode === "edit" ? "Edit Application" : "Application Details"}
        </CardTitle>
        <CardDescription>
          {mode === "edit"
            ? "Update your application information"
            : "Share your Kiro-built application with the community"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {showSuccess && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Application saved successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Application Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Application Name <span className="text-red-500">*</span>
            </Label>
            <InputGroup>
              <InputGroupInput
                id="name"
                type="text"
                placeholder="My Awesome App"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                className={hasFieldError("name") ? "border-red-500" : ""}
                aria-invalid={hasFieldError("name")}
                aria-describedby={
                  hasFieldError("name") ? "name-error" : undefined
                }
              />
            </InputGroup>
            {hasFieldError("name") && (
              <p id="name-error" className="text-sm text-red-500">
                {getFieldError("name")}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              className={hasFieldError("description") ? "border-red-500" : ""}
              aria-invalid={hasFieldError("description")}
              aria-describedby={
                hasFieldError("description") ? "description-error" : undefined
              }
              rows={4}
            />
            {hasFieldError("description") && (
              <p id="description-error" className="text-sm text-red-500">
                {getFieldError("description")}
              </p>
            )}
          </div>

          <Separator />

          {/* URLs Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Application Links
            </h3>

            {/* Repository URL */}
            <div className="space-y-2">
              <Label htmlFor="repositoryUrl">
                Repository URL (Optional)
              </Label>
              <InputGroup>
                <InputGroupInput
                  id="repositoryUrl"
                  type="url"
                  placeholder="https://github.com/username/repo or https://gitlab.com/username/repo"
                  value={formData.repositoryUrl}
                  onChange={(e) =>
                    handleInputChange("repositoryUrl", e.target.value)
                  }
                  onBlur={() => handleBlur("repositoryUrl")}
                  className={hasFieldError("repositoryUrl") ? "border-red-500" : ""}
                  aria-invalid={hasFieldError("repositoryUrl")}
                  aria-describedby={
                    hasFieldError("repositoryUrl") ? "repositoryUrl-error" : undefined
                  }
                />
              </InputGroup>
              {hasFieldError("repositoryUrl") && (
                <p id="repositoryUrl-error" className="text-sm text-red-500">
                  {getFieldError("repositoryUrl")}
                </p>
              )}
            </div>

            {/* Live App URL */}
            <div className="space-y-2">
              <Label htmlFor="appUrl">Live App URL (Optional)</Label>
              <InputGroup>
                <InputGroupInput
                  id="appUrl"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.appUrl}
                  onChange={(e) => handleInputChange("appUrl", e.target.value)}
                  onBlur={() => handleBlur("appUrl")}
                  className={hasFieldError("appUrl") ? "border-red-500" : ""}
                  aria-invalid={hasFieldError("appUrl")}
                  aria-describedby={
                    hasFieldError("appUrl") ? "appUrl-error" : undefined
                  }
                />
              </InputGroup>
              {hasFieldError("appUrl") && (
                <p id="appUrl-error" className="text-sm text-red-500">
                  {getFieldError("appUrl")}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags <span className="text-red-500">*</span>{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (comma-separated)
              </span>
            </Label>
            <InputGroup>
              <InputGroupInput
                id="tags"
                type="text"
                value={tagsInput}
                onChange={(e) => handleTagsInputChange(e.target.value)}
                onBlur={() => handleBlur("tags")}
                className={hasFieldError("tags") ? "border-red-500" : ""}
                aria-invalid={hasFieldError("tags")}
                aria-describedby={
                  hasFieldError("tags") ? "tags-error" : undefined
                }
                placeholder="react, typescript, aws"
              />
            </InputGroup>
            {hasFieldError("tags") && (
              <p id="tags-error" className="text-sm text-red-500">
                {getFieldError("tags")}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] w-full sm:w-auto"
            >
              {isSubmitting
                ? "Saving..."
                : mode === "edit"
                ? "Update Application"
                : "Save Application"}
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
