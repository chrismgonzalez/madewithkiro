/**
 * Account Linking Service
 *
 * Handles API calls for account linking operations
 */

import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Confirm account linking after user approval
 *
 * @returns Promise resolving to success response
 * @throws Error if linking fails
 */
export async function confirmAccountLink(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Get current auth session for token
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();

    if (!idToken) {
      throw new Error("No authentication token available");
    }

    const response = await fetch(`${API_BASE_URL}/auth/confirm-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        confirm: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to link accounts");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Account linking error:", error);
    throw error;
  }
}
