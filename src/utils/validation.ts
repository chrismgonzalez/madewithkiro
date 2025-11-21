/**
 * Runtime type validation using Zod schemas
 * Provides validation for API responses to ensure type safety at runtime
 */

import { z } from "zod";

/**
 * Zod schema for UserProfile
 * Matches the backend UserProfile Pydantic model
 */
export const UserProfileSchema = z.object({
  userId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  awsBuilderHandle: z.string(),
  linkedInUsername: z.string().optional(),
  githubUsername: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Zod schema for CreateProfileRequest
 * Matches the backend CreateProfileRequest Pydantic model
 */
export const CreateProfileRequestSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  awsBuilderHandle: z.string().min(1).max(50),
  linkedInUsername: z.string().max(50).optional(),
  githubUsername: z.string().max(50).optional(),
});

/**
 * Zod schema for UpdateProfileRequest
 * Matches the backend UpdateProfileRequest Pydantic model
 */
export const UpdateProfileRequestSchema = z.object({
  userId: z.string(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  awsBuilderHandle: z.string().min(1).max(50),
  linkedInUsername: z.string().max(50).optional(),
  githubUsername: z.string().max(50).optional(),
});

/**
 * Zod schema for Application
 * Matches the backend Application Pydantic model
 */
export const ApplicationSchema = z.object({
  appId: z.string(),
  userId: z.string(),
  userName: z.string(),
  name: z.string(),
  description: z.string(),
  appUrl: z.string().url(),
  githubUrl: z.string().url().optional(),
  tags: z.array(z.string()),
  visibility: z.enum(["public", "private"]).optional(), // Future feature
  createdAt: z.string(),
});

/**
 * Zod schema for CreateApplicationRequest
 * Matches the backend CreateApplicationRequest Pydantic model
 */
export const CreateApplicationRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  appUrl: z.string().url(),
  githubUrl: z.string().url().optional(),
  tags: z.array(z.string()).min(1).max(10),
  visibility: z.enum(["public", "private"]).optional(), // Future feature
});

/**
 * Zod schema for ApiError
 */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string()).optional(),
});

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  public code: string;
  public details: Record<string, string>;

  constructor(message: string, details: Record<string, string>) {
    super(message);
    this.name = "ValidationError";
    this.code = "VALIDATION_ERROR";
    this.details = details;
  }
}

/**
 * Validate data against a Zod schema
 * Throws ValidationError with detailed field errors if validation fails
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @param typeName - Name of the type being validated (for error messages)
 * @returns The validated data
 * @throws ValidationError if validation fails
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  typeName: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    // Extract field-level errors from Zod
    const details: Record<string, string> = {};

    // Zod returns errors in the issues array
    result.error.issues.forEach((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      details[path] = issue.message;
    });

    // Log validation errors in development
    if (import.meta.env.DEV) {
      console.error(`Type validation failed for ${typeName}:`, {
        data,
        errors: details,
        issues: result.error.issues,
      });
    }

    throw new ValidationError(
      `Type validation failed: ${typeName} does not match expected structure`,
      details
    );
  }

  return result.data;
}

/**
 * Validate UserProfile response
 */
export function validateUserProfile(data: unknown) {
  return validateSchema(UserProfileSchema, data, "UserProfile");
}

/**
 * Validate Application response
 */
export function validateApplication(data: unknown) {
  return validateSchema(ApplicationSchema, data, "Application");
}

/**
 * Validate array of Applications
 */
export function validateApplicationArray(data: unknown) {
  return validateSchema(z.array(ApplicationSchema), data, "Application[]");
}

/**
 * Validate CreateProfileRequest
 */
export function validateCreateProfileRequest(data: unknown) {
  return validateSchema(
    CreateProfileRequestSchema,
    data,
    "CreateProfileRequest"
  );
}

/**
 * Validate UpdateProfileRequest
 */
export function validateUpdateProfileRequest(data: unknown) {
  return validateSchema(
    UpdateProfileRequestSchema,
    data,
    "UpdateProfileRequest"
  );
}

/**
 * Validate CreateApplicationRequest
 */
export function validateCreateApplicationRequest(data: unknown) {
  return validateSchema(
    CreateApplicationRequestSchema,
    data,
    "CreateApplicationRequest"
  );
}

/**
 * Form validation schemas
 * These are used by the form components for client-side validation
 */

// Profile form schema (for client-side validation)
export const profileSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less"),
  awsBuilderHandle: z
    .string()
    .min(1, "AWS Builder Handle is required")
    .max(50, "Handle must be 50 characters or less"),
  linkedInUsername: z
    .string()
    .max(50, "LinkedIn username must be 50 characters or less")
    .optional()
    .or(z.literal("")),
  githubUsername: z
    .string()
    .max(50, "GitHub username must be 50 characters or less")
    .optional()
    .or(z.literal("")),
});

// Application form schema (for client-side validation)
export const applicationSchema = z.object({
  name: z
    .string()
    .min(1, "Application name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or less"),
  appUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  githubUrl: z
    .string()
    .min(1, "GitHub URL is required")
    .url("Must be a valid URL"),
  tags: z
    .array(z.string())
    .min(1, "At least one tag is required")
    .max(10, "Maximum 10 tags allowed"),
  visibility: z.enum(["public", "private"]).optional(),
});

// Type exports for form data
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ApplicationFormData = z.infer<typeof applicationSchema>;
