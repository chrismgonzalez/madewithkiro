import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect } from "react";
import { getOAuthErrorMessage } from "@/utils/authErrors";
import KiroIcon from "@/components/KiroIcon";
import AuthMethodSelector from "@/components/AuthMethodSelector";
import OTPAuthPage from "@/components/OTPAuthPage";

/**
 * Authentication Page Component
 *
 * Provides Google OAuth and Email OTP authentication for users to sign in.
 * Handles OAuth errors from URL parameters and displays user-friendly error messages.
 * Shows loading states during authentication flows.
 *
 * @example
 * ```tsx
 * <Route path="/auth" element={<AuthPage />} />
 * ```
 */
export const AuthPage = () => {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<"selector" | "email">(
    "selector"
  );

  // Check for OAuth errors in URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorParam) {
      setError(getOAuthErrorMessage(errorParam, errorDescription));
    }
  }, []);

  /**
   * Handle Google sign-in button click
   */
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Redirect handled by Hub listener in AuthContext
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
      setIsLoading(false);
    }
  };

  /**
   * Handle Email OTP sign-in button click
   */
  const handleEmailSignIn = () => {
    setAuthMethod("email");
  };

  /**
   * Handle back from OTP flow
   */
  const handleBackToSelector = () => {
    setAuthMethod("selector");
  };

  // Show OTP auth page if email method selected
  if (authMethod === "email") {
    return <OTPAuthPage onBack={handleBackToSelector} />;
  }

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-8 sm:py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2 sm:space-y-3">
          <div className="flex justify-center mb-2">
            <KiroIcon size={64} />
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            Welcome to MadeWithKiro
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Sign in to showcase your Kiro-built applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md"
            >
              {error}
            </div>
          )}

          <AuthMethodSelector
            onGoogleAuth={handleGoogleSignIn}
            onEmailAuth={handleEmailSignIn}
            isLoading={isLoading}
          />

          <p className="text-xs sm:text-sm text-center text-muted-foreground mt-4">
            By continuing, you agree to our{" "}
            <a
              href="/terms"
              className="underline hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="underline hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
