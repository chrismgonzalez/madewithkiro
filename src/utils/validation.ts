import { z } from "zod";

/**
 * Validation schema for user profile forms
 */
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
    .min(1, "AWS Builder handle is required")
    .max(50, "AWS Builder handle must be 50 characters or less"),
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

export type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * Validation schema for application forms
 */
export const applicationSchema = z.object({
  name: z
    .string()
    .min(1, "Application name is required")
    .max(100, "Application name must be 100 characters or less"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or less"),
  appUrl: z.string().url("Must be a valid URL"),
  githubUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  tags: z
    .array(z.string())
    .min(1, "At least one tag is required")
    .max(10, "Maximum 10 tags allowed"),
  visibility: z.enum(["public", "private"]),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;
