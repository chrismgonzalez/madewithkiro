/**
 * Toast Notification Utilities
 *
 * Provides a centralized interface for displaying toast notifications
 * using react-hot-toast library.
 *
 * Features:
 * - Success notifications (green)
 * - Error notifications (red)
 * - Auto-dismiss after 5 seconds
 * - Consistent styling across the application
 */

import toast from "react-hot-toast";

/**
 * Default duration for toast notifications (5 seconds)
 */
const DEFAULT_DURATION = 5000;

/**
 * Display a success toast notification
 *
 * @param message - The success message to display
 * @param duration - Optional duration in milliseconds (default: 5000ms)
 */
export function showSuccessToast(
  message: string,
  duration: number = DEFAULT_DURATION
) {
  return toast.success(message, {
    duration,
    position: "top-right",
    style: {
      background: "#10b981",
      color: "#fff",
    },
    iconTheme: {
      primary: "#fff",
      secondary: "#10b981",
    },
  });
}

/**
 * Display an error toast notification
 *
 * @param message - The error message to display
 * @param duration - Optional duration in milliseconds (default: 5000ms)
 */
export function showErrorToast(
  message: string,
  duration: number = DEFAULT_DURATION
) {
  return toast.error(message, {
    duration,
    position: "top-right",
    style: {
      background: "#ef4444",
      color: "#fff",
    },
    iconTheme: {
      primary: "#fff",
      secondary: "#ef4444",
    },
  });
}

/**
 * Display a loading toast notification
 *
 * @param message - The loading message to display
 */
export function showLoadingToast(message: string) {
  return toast.loading(message, {
    position: "top-right",
  });
}

/**
 * Dismiss a specific toast notification
 *
 * @param toastId - The ID of the toast to dismiss
 */
export function dismissToast(toastId: string) {
  toast.dismiss(toastId);
}

/**
 * Dismiss all toast notifications
 */
export function dismissAllToasts() {
  toast.dismiss();
}
