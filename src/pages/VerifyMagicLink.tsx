import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Magic Link Verification Page
 *
 * Modern, beautiful design with dark mode support for automatic OTP verification.
 * Handles magic link clicks from emails with clear visual feedback.
 */
export default function VerifyMagicLink() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/verify" });
  const { signInWithOTP, confirmOTP } = useAuth();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const email = params.get("email");
    const otpCode = params.get("otp");

    if (!email || !otpCode) {
      setStatus("error");
      setError(
        "Invalid verification link. Missing email or verification code."
      );
      return;
    }

    verifyMagicLink(email, otpCode);
  }, [search]);

  const verifyMagicLink = async (email: string, otpCode: string) => {
    try {
      // Step 1: Initiate OTP authentication flow
      await signInWithOTP(email);

      // Step 2: Immediately verify the OTP code from the URL
      const result = await confirmOTP(otpCode);

      if (result.isSignedIn) {
        // Successfully authenticated
        setStatus("success");

        // Redirect to home page after brief success message
        setTimeout(() => {
          navigate({ to: "/" });
        }, 2000);
      } else {
        setStatus("error");
        setError("Verification failed. The code may be invalid or expired.");
      }
    } catch (err: any) {
      console.error("Magic link verification error:", err);
      setStatus("error");

      // Handle specific error types
      if (err.code === "RATE_LIMITED") {
        setError(
          `Too many requests. Please wait ${
            err.retryAfter || 60
          } seconds before trying again.`
        );
      } else if (err.code === "EXPIRED_OTP") {
        setError(
          "This verification link has expired. Please request a new one."
        );
      } else if (err.code === "INVALID_OTP") {
        setError(
          "This verification link is invalid. Please request a new one."
        );
      } else {
        setError(err.message || "Verification failed. Please try again.");
      }
    }
  };

  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-3xl shadow-xl shadow-primary/25">
            <Loader2 className="h-10 w-10 animate-spin text-primary-foreground" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Verifying your magic link...
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Please wait while we sign you in securely
            </p>
          </div>
          <div className="flex justify-center">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-primary/80 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-3xl shadow-xl shadow-primary/25">
            <CheckCircle className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Successfully signed in!
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Redirecting to the homepage...
            </p>
          </div>
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-primary/20 shadow-lg">
            <div className="flex items-center justify-center space-x-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">Welcome to MadeWithKiro!</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-destructive to-destructive/80 rounded-3xl shadow-xl shadow-destructive/25">
          <XCircle className="h-10 w-10 text-destructive-foreground" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            Verification failed
          </h2>
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-destructive/20 shadow-lg">
            <p className="text-destructive leading-relaxed">{error}</p>
          </div>
        </div>
        <div className="space-y-4">
          <Button
            onClick={() => navigate({ to: "/login" })}
            size="lg"
            className="w-full h-14 text-base font-medium rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200"
          >
            Try signing in again
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/" })}
            size="lg"
            className="w-full h-14 text-base font-medium rounded-2xl border-2 hover:bg-accent transition-all duration-200"
          >
            Go to homepage
          </Button>
        </div>
      </div>
    </div>
  );
}
