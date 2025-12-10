import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface MagicLinkAuthProps {
  onBack?: () => void;
}

/**
 * Magic Link Authentication Component
 *
 * Modern, user-friendly design with dark mode support:
 * - Email input form with validation
 * - Manual OTP entry with auto-formatting
 * - Clear instructions and multiple sign-in options
 * - Beautiful success and error states
 */
export const MagicLinkAuth = ({ onBack }: MagicLinkAuthProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const { signInWithOTP, confirmOTP } = useAuth();

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signInWithOTP(email);

      if (result.nextStep.additionalInfo?.error === "RATE_LIMITED") {
        const retryAfter = result.nextStep.additionalInfo.retryAfter;
        setError(
          `Too many requests. Please wait ${retryAfter} seconds before trying again.`
        );
        return;
      }

      setEmailSent(true);
    } catch (err: any) {
      if (err.code === "RATE_LIMITED") {
        setError(
          `Too many requests. Please wait ${
            err.retryAfter || 60
          } seconds before trying again.`
        );
      } else {
        setError(err.message || "Failed to send verification code");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError("");

    try {
      const result = await confirmOTP(otpCode.replace(/\s/g, ""));

      if (result.isSignedIn) {
        // Successfully authenticated - redirect will happen via auth context
        window.location.href = "/";
      }
    } catch (err: any) {
      if (err.code === "EXPIRED_OTP") {
        setError(
          "This verification code has expired. Please request a new one."
        );
      } else if (err.code === "INVALID_OTP") {
        setError("Invalid verification code. Please check and try again.");
      } else if (err.code === "MAX_ATTEMPTS_EXCEEDED") {
        setError("Too many failed attempts. Please request a new code.");
        setEmailSent(false);
        setOtpCode("");
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl mb-2 shadow-lg shadow-primary/25">
            <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground px-2">
            Code sent to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        {/* Manual OTP Entry */}
        <form onSubmit={verifyOTP} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="0 0 0 0 0 0"
                value={otpCode}
                onChange={(e) => {
                  // Auto-format with spaces for better readability
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 6) {
                    const formatted = value.replace(
                      /(\d{1})(\d{1})(\d{1})(\d{1})(\d{1})(\d{1})/,
                      "$1 $2 $3 $4 $5 $6"
                    );
                    setOtpCode(formatted);
                  }
                }}
                maxLength={11} // 6 digits + 5 spaces
                className="text-center text-md tracking-[0.3em] font-mono h-12 rounded-lg border focus:border-primary focus:ring-primary/20 transition-all duration-200 min-h-[44px]"
                disabled={isVerifying}
              />
              <p className="text-xs text-muted-foreground text-center mt-2">
                Enter the 6-digit code from your email
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isVerifying || otpCode.replace(/\s/g, "").length !== 6}
            className="w-full h-12 text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 transition-all duration-200 min-h-[44px]"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Alternative Actions */}
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Didn't receive the email? Check your spam folder
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={sendMagicLink} className="space-y-6">
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          Enter your email to receive a one-time password
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-lg border focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm min-h-[44px]"
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || !email}
          className="w-full h-12 text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 transition-all duration-200 min-h-[44px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending Code...
            </>
          ) : (
            "Send Code"
          )}
        </Button>
      </div>
    </form>
  );
};
