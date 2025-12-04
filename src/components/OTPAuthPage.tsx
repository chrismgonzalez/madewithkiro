import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft } from "lucide-react";
import OTPInput from "@/components/OTPInput";
import KiroIcon from "@/components/KiroIcon";
import { useAuth } from "@/contexts/AuthContext";

interface OTPAuthPageProps {
  onAuthSuccess?: () => void;
  onBack?: () => void;
}

type Step = "email" | "verify";

/**
 * Map Cognito error types to user-friendly messages
 * Requirements: 6.5 - Handle Cognito errors with user-friendly messages
 */
const mapCognitoError = (error: any): string => {
  // Handle rate limiting
  if (error.code === "RATE_LIMITED") {
    const retryAfter = error.retryAfter || 60;
    return `Too many requests. Please wait ${retryAfter} seconds before trying again.`;
  }

  // Handle max attempts exceeded
  if (
    error.code === "MAX_ATTEMPTS_EXCEEDED" ||
    error.name === "NotAuthorizedException"
  ) {
    return "Too many failed attempts. Please request a new code to try again.";
  }

  // Handle expired OTP
  if (error.code === "EXPIRED_OTP" || error.message?.includes("expired")) {
    return "This code has expired. Please request a new one.";
  }

  // Handle invalid OTP
  if (error.code === "INVALID_OTP" || error.message?.includes("incorrect")) {
    return "Incorrect code. Please try again.";
  }

  // Handle network errors
  if (error.name === "NetworkError" || error.message?.includes("network")) {
    return "Network error. Please check your connection and try again.";
  }

  // Default error message
  return error.message || "An error occurred. Please try again.";
};

export default function OTPAuthPage({
  onAuthSuccess,
  onBack,
}: OTPAuthPageProps) {
  const navigate = useNavigate();
  const { signInWithOTP, confirmOTP } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (step === "verify" && remainingTime > 0) {
      const timer = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step, remainingTime]);

  // Resend cooldown timer (60 seconds)
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // Use Amplify signIn with CUSTOM_WITHOUT_SRP flow
      // This triggers Cognito's custom authentication flow
      const response = await signInWithOTP(email);

      // Extract public challenge parameters from Cognito
      const additionalInfo = response.nextStep.additionalInfo;

      // Check for rate limiting error
      if (additionalInfo?.error === "RATE_LIMITED") {
        const retryAfter = parseInt(additionalInfo.retryAfter || "60", 10);
        setError(
          `Too many requests. Please wait ${retryAfter} seconds before trying again.`
        );
        setResendCooldown(retryAfter);
        return;
      }

      // Move to verification step
      setStep("verify");

      // Set expiration time from Cognito response (default 600 seconds)
      const expiresIn = parseInt(additionalInfo?.expiresIn || "600", 10);
      setRemainingTime(expiresIn);

      setCanResend(false);
      setResendCooldown(60); // 60 second cooldown for resend
    } catch (err: any) {
      // Map Cognito errors to user-friendly messages
      const errorMessage = mapCognitoError(err);
      setError(errorMessage);

      // Handle rate limiting cooldown
      if (err.code === "RATE_LIMITED") {
        const retryAfter = err.retryAfter || 60;
        setResendCooldown(retryAfter);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);

    try {
      // Use Amplify confirmSignIn to verify the OTP code
      // This completes the custom authentication flow
      const response = await confirmOTP(otpCode);

      // Check if authentication is complete
      if (response.isSignedIn) {
        // Authentication successful - tokens are now managed by Amplify
        if (onAuthSuccess) {
          onAuthSuccess();
        } else {
          // Check if user needs to create a profile
          // New users won't have firstName/lastName attributes yet
          // The VerifyAuthChallenge Lambda creates a profile, but we need to check
          // if the user needs to complete their profile information
          try {
            const { fetchUserAttributes } = await import("aws-amplify/auth");
            const attributes = await fetchUserAttributes();

            // Check if user has profile attributes (firstName, lastName)
            // If not, they need to create their profile
            const hasProfile = attributes.given_name || attributes.family_name;

            if (!hasProfile) {
              // New user needs to create a profile
              navigate({ to: "/create-profile", replace: true });
            } else {
              // Existing user - go to intended destination or home
              const redirectTo =
                sessionStorage.getItem("redirect_after_auth") || "/";
              sessionStorage.removeItem("redirect_after_auth");
              navigate({ to: redirectTo, replace: true });
            }
          } catch (attrError) {
            // If we can't fetch attributes, assume they need to create profile
            navigate({ to: "/create-profile", replace: true });
          }
        }
      } else {
        setError("Failed to verify code");
      }
    } catch (err: any) {
      // Map Cognito errors to user-friendly messages
      const errorMessage = mapCognitoError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || resendCooldown > 0) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Use Amplify signIn to request a new OTP
      const response = await signInWithOTP(email);

      // Extract public challenge parameters
      const additionalInfo = response.nextStep.additionalInfo;

      // Check for rate limiting error
      if (additionalInfo?.error === "RATE_LIMITED") {
        const retryAfter = parseInt(additionalInfo.retryAfter || "60", 10);
        setError(
          `Too many requests. Please wait ${retryAfter} seconds before trying again.`
        );
        setResendCooldown(retryAfter);
        return;
      }

      // Reset expiration time from Cognito response
      const expiresIn = parseInt(additionalInfo?.expiresIn || "600", 10);
      setRemainingTime(expiresIn);

      setCanResend(false);
      setResendCooldown(60); // 60 second cooldown
      setOtpCode(""); // Clear the input
    } catch (err: any) {
      // Map Cognito errors to user-friendly messages
      const errorMessage = mapCognitoError(err);
      setError(errorMessage);

      // Handle rate limiting cooldown
      if (err.code === "RATE_LIMITED") {
        const retryAfter = err.retryAfter || 60;
        setResendCooldown(retryAfter);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "verify") {
      setStep("email");
      setOtpCode("");
      setError(null);
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-8 sm:py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2 sm:space-y-3">
          <div className="flex justify-center mb-2">
            <KiroIcon size={64} />
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            {step === "email"
              ? "Sign in with Email"
              : "Enter Verification Code"}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {step === "email"
              ? "We'll send you a verification code"
              : `Code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
            >
              {error}
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="min-h-[44px]"
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full min-h-[44px]"
                size="lg"
              >
                <Mail className="mr-2 h-5 w-5" aria-hidden="true" />
                <span>{loading ? "Sending..." : "Send Code"}</span>
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOTPVerify} className="space-y-4 sm:space-y-6">
              <div className="space-y-4">
                <Label className="text-center block">
                  Enter the 6-digit code
                </Label>
                <OTPInput
                  value={otpCode}
                  onChange={setOtpCode}
                  disabled={loading || remainingTime === 0}
                  error={!!error}
                />
              </div>

              {remainingTime > 0 ? (
                <p className="text-sm text-center text-muted-foreground">
                  Code expires in{" "}
                  <span className="font-semibold">
                    {formatTime(remainingTime)}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-center text-destructive font-semibold">
                  Code expired. Please request a new one.
                </p>
              )}

              <Button
                type="submit"
                disabled={
                  loading || otpCode.length !== 6 || remainingTime === 0
                }
                className="w-full min-h-[44px]"
                size="lg"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendOTP}
                  disabled={loading || !canResend || resendCooldown > 0}
                  className="min-h-[44px]"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Code"}
                </Button>
              </div>
            </form>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={loading}
            className="w-full min-h-[44px]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back
          </Button>

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
}
