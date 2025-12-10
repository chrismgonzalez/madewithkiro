import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

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
      <div className="space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl mb-4 shadow-lg shadow-primary/25">
            <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="text-2xl font-semibold text-foreground">
            Check your email
          </h3>
          <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
            We've sent a verification code to{" "}
            <span className="font-semibold text-foreground">{email}</span>
          </p>
        </div>

        {/* Instructions Card */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-2">
                Three ways to sign in:
              </h4>
              <ul className="text-muted-foreground text-sm space-y-1.5 leading-relaxed">
                <li>• Click the "Login Instantly" button in your email</li>
                <li>• Enter the 6-digit code below</li>
                <li>• Copy/paste the link from your email</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Manual OTP Entry */}
        <form onSubmit={verifyOTP} className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground">
              Enter verification code
            </label>
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
              className="text-center text-2xl tracking-[0.5em] font-mono h-16 rounded-2xl border-2 focus:border-primary focus:ring-primary/20 transition-all duration-200"
              disabled={isVerifying}
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code from your email
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border-2 border-destructive/20 rounded-2xl p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive text-sm leading-relaxed">
                {error}
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isVerifying || otpCode.replace(/\s/g, "").length !== 6}
            size="lg"
            className="w-full h-14 text-base font-medium rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                Verifying code...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-3" />
                Verify code
              </>
            )}
          </Button>
        </form>

        {/* Alternative Actions */}
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Didn't receive the email? Check your spam folder
            </p>
          </div>

          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full h-12 rounded-2xl hover:bg-accent transition-all duration-200"
              disabled={isVerifying}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to sign-in options
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={sendMagicLink} className="space-y-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl mb-2">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          Sign in with email
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Enter your email and we'll send you a verification code
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border-2 border-destructive/20 rounded-2xl p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-destructive text-sm leading-relaxed">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <Input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-14 rounded-2xl border-2 focus:border-primary focus:ring-primary/20 transition-all duration-200 text-base"
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading || !email}
        size="lg"
        className="w-full h-14 text-base font-medium rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            Sending verification code...
          </>
        ) : (
          <>
            <Mail className="h-5 w-5 mr-3" />
            Send verification code
          </>
        )}
      </Button>

      {onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full h-12 rounded-2xl hover:bg-accent transition-all duration-200"
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to sign-in options
        </Button>
      )}
    </form>
  );
};
