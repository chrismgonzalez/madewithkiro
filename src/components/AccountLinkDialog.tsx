/**
 * Account Link Dialog Component
 *
 * Shows a dialog prompting the user to link their Google and email accounts
 * when a duplicate account is detected.
 */

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { confirmAccountLink } from "@/services/accountLinking";
import { signOut, fetchAuthSession } from "aws-amplify/auth";
import { Loader2, Link2 } from "lucide-react";

export function AccountLinkDialog() {
  const { pendingLink, user } = useAuth();
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLinking(true);
    setError(null);

    try {
      // Step 1: Link accounts via API
      await confirmAccountLink();

      // Step 2: Wait for backend to process and delete PENDING_LINK record
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 3: Try to refresh the token to get a new one without custom claims
      // This attempts to get a fresh token from Cognito
      try {
        await fetchAuthSession({ forceRefresh: true });

        // Step 4a: Token refreshed - check if custom claim is gone
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken;

        // Check if the custom:pending_link claim is still present
        // If it is, we need to sign out to force a completely fresh token
        if (idToken?.payload?.["custom:pending_link"]) {
          console.log(
            "Custom claim still present after refresh, signing out..."
          );
          throw new Error("Token refresh didn't clear custom claims");
        }

        // Success! Token refreshed and custom claim is gone
        console.log("Token refreshed successfully, custom claim cleared");

        // Reload page to update UI state
        localStorage.setItem("accountLinked", "true");
        window.location.href = "/?linked=true";
      } catch (refreshError) {
        // Step 4b: Token refresh failed or custom claim still present
        // Fall back to global sign out to guarantee fresh token
        console.log(
          "Token refresh failed, falling back to sign out:",
          refreshError
        );

        await signOut({ global: true });

        // Redirect to auth page with success message
        localStorage.setItem("accountLinked", "true");
        window.location.href = "/auth?message=accounts-linked";
      }
    } catch (err: any) {
      console.error("Failed to link accounts:", err);
      setError(err.message || "Failed to link accounts. Please try again.");
      setIsLinking(false);
    }
  };

  const handleCancel = () => {
    // User declined linking - just close the dialog
    // They can link later if needed
    window.location.reload();
  };

  if (!pendingLink) {
    return null;
  }

  return (
    <AlertDialog open={pendingLink}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle className="text-xl">
              Link Your Accounts?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3 pt-2">
            <p>
              We detected that you have both a <strong>Google account</strong>{" "}
              and an <strong>email account</strong> with{" "}
              <strong>{user?.email}</strong>.
            </p>
            <p>
              Would you like to link them together? This will allow you to sign
              in using either method with the same profile and data.
            </p>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isLinking}
            className="w-full sm:w-auto"
          >
            Not Now
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLinking}
            className="w-full sm:w-auto"
          >
            {isLinking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking Accounts...
              </>
            ) : (
              "Yes, Link Accounts"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
