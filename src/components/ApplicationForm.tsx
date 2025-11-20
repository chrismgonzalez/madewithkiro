import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  applicationSchema,
  type ApplicationFormData,
} from "@/utils/validation";
import { z } from "zod";

interface ApplicationFormProps {
  onSubmit: (data: ApplicationFormData) => void | Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ApplicationFormData>;
}

interface FieldError {
  field: keyof ApplicationFormData;
  message: string;
}

export default function ApplicationForm({
  onSubmit,
  onCancel,
  initialData,
}: ApplicationFormProps) {
  // Initialize form state with initial data or empty values
  const [formData, setFormData] = useState<ApplicationFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    appUrl: initialData?.appUrl || "",
    githubUrl: initialData?.githubUrl || "",
    tags: initialData?.tags || [],
    visibility: initialData?.visibility || "public",
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
    githubUrl: initialData?.githubUrl || "",
    tags: initialData?.tags || [],
    visibility: initialData?.visibility || "public",
  });

  // Clear success message after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

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
    value: string | string[]
  ) => {
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
      githubUrl: true,
      tags: true,
      visibility: true,
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues;
        const fieldErrors: FieldError[] = issues.map((err) => ({
          field: err.path[0] as keyof ApplicationFormData,
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {showSuccess && (
        <div
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded"
          role="alert"
        >
          Application saved successfully!
        </div>
      )}

      {/* Application Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Application Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          onBlur={() => handleBlur("name")}
          className={hasFieldError("name") ? "border-red-500" : ""}
          aria-invalid={hasFieldError("name")}
          aria-describedby={hasFieldError("name") ? "name-error" : undefined}
        />
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
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          onBlur={() => handleBlur("description")}
          className={`flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            hasFieldError("description") ? "border-red-500" : ""
          }`}
          aria-invalid={hasFieldError("description")}
          aria-describedby={
            hasFieldError("description") ? "description-error" : undefined
          }
        />
        {hasFieldError("description") && (
          <p id="description-error" className="text-sm text-red-500">
            {getFieldError("description")}
          </p>
        )}
      </div>

      {/* Live App URL */}
      <div className="space-y-2">
        <Label htmlFor="appUrl">
          Live App URL <span className="text-red-500">*</span>
        </Label>
        <Input
          id="appUrl"
          type="url"
          value={formData.appUrl}
          onChange={(e) => handleInputChange("appUrl", e.target.value)}
          onBlur={() => handleBlur("appUrl")}
          className={hasFieldError("appUrl") ? "border-red-500" : ""}
          aria-invalid={hasFieldError("appUrl")}
          aria-describedby={
            hasFieldError("appUrl") ? "appUrl-error" : undefined
          }
          placeholder="https://example.com"
        />
        {hasFieldError("appUrl") && (
          <p id="appUrl-error" className="text-sm text-red-500">
            {getFieldError("appUrl")}
          </p>
        )}
      </div>

      {/* GitHub URL */}
      <div className="space-y-2">
        <Label htmlFor="githubUrl">GitHub Repository URL</Label>
        <Input
          id="githubUrl"
          type="url"
          value={formData.githubUrl}
          onChange={(e) => handleInputChange("githubUrl", e.target.value)}
          onBlur={() => handleBlur("githubUrl")}
          className={hasFieldError("githubUrl") ? "border-red-500" : ""}
          aria-invalid={hasFieldError("githubUrl")}
          aria-describedby={
            hasFieldError("githubUrl") ? "githubUrl-error" : undefined
          }
          placeholder="https://github.com/username/repo"
        />
        {hasFieldError("githubUrl") && (
          <p id="githubUrl-error" className="text-sm text-red-500">
            {getFieldError("githubUrl")}
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">
          Tags <span className="text-red-500">*</span>
        </Label>
        <Input
          id="tags"
          type="text"
          value={tagsInput}
          onChange={(e) => handleTagsInputChange(e.target.value)}
          onBlur={() => handleBlur("tags")}
          className={hasFieldError("tags") ? "border-red-500" : ""}
          aria-invalid={hasFieldError("tags")}
          aria-describedby={hasFieldError("tags") ? "tags-error" : undefined}
          placeholder="react, typescript, aws (comma-separated)"
        />
        {hasFieldError("tags") && (
          <p id="tags-error" className="text-sm text-red-500">
            {getFieldError("tags")}
          </p>
        )}
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <Label htmlFor="visibility">
          Visibility <span className="text-red-500">*</span>
        </Label>
        <select
          id="visibility"
          value={formData.visibility}
          onChange={(e) =>
            handleInputChange(
              "visibility",
              e.target.value as "public" | "private"
            )
          }
          onBlur={() => handleBlur("visibility")}
          className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            hasFieldError("visibility") ? "border-red-500" : ""
          }`}
          aria-invalid={hasFieldError("visibility")}
          aria-describedby={
            hasFieldError("visibility") ? "visibility-error" : undefined
          }
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        {hasFieldError("visibility") && (
          <p id="visibility-error" className="text-sm text-red-500">
            {getFieldError("visibility")}
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
