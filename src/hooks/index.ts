/**
 * Hooks barrel export
 * Provides a single entry point for all custom hooks
 */

// Legacy mock data hooks (to be replaced)
export {
  useApplications as useMockApplications,
  useProfile as useMockProfile,
  useUserApplications,
} from "./useData";

// New TanStack Query hooks with real API integration
export { useProfile } from "./useProfile";
export { useApplications } from "./useApplications";

export { useMediaQuery } from "./useMediaQuery";
