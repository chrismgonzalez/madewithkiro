import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MagicLinkAuth } from "@/components/MagicLinkAuth";
import { Sparkles, Mail } from "lucide-react";
import { Link } from "@tanstack/react-router";

type AuthMethod = "select" | "email";

/**
 * Login Page Component
 *
 * Modern, spacious design with dark mode support:
 * 1. Google OAuth (social login)
 * 2. Email with magic link (OTP + instant login button)
 *
 * Features gradient background, better spacing, and clear visual hierarchy.
 */
export default function LoginPage() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>("select");
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign-in error:", error);
      // Error handling is done in the auth context
    }
  };

  return (
    <div className="flex justify-center p-3 sm:p-4 pt-4 sm:pt-8 pb-2 sm:pb-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-3 sm:mb-4">
          <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-lg sm:rounded-xl mb-2 sm:mb-3 shadow-lg shadow-primary/25">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground mb-1 tracking-tight">
            MadeWithKiro
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <Card className="shadow-xl border bg-card/95 backdrop-blur-xl rounded-xl sm:rounded-2xl overflow-hidden">
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
            {authMethod === "select" && (
              <>
                {/* Google OAuth Option */}
                <Button
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  size="lg"
                  className="w-full h-12 sm:h-14 text-sm sm:text-base font-medium border-2 hover:bg-accent transition-all duration-200 rounded-lg sm:rounded-xl min-h-[44px]"
                >
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative my-4 sm:my-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 sm:px-4 text-muted-foreground">
                      or
                    </span>
                  </div>
                </div>

                {/* Email Magic Link Option */}
                <Button
                  onClick={() => setAuthMethod("email")}
                  variant="outline"
                  size="lg"
                  className="w-full h-12 sm:h-14 text-sm sm:text-base font-medium border-2 border-primary/20 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 rounded-lg sm:rounded-xl min-h-[44px]"
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-primary" />
                  Use one-time-passcode
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-3 sm:mt-4">
                  New users will create an account automatically
                </p>
              </>
            )}

            {authMethod === "email" && (
              <MagicLinkAuth onBack={() => setAuthMethod("select")} />
            )}
          </CardContent>
        </Card>

        {/* Simplified Footer */}
        <div className="text-center mt-3 sm:mt-4">
          <p className="text-xs text-muted-foreground px-2">
            By signing in, you agree to our{" "}
            <Link
              to="/privacy"
              className="text-primary hover:text-primary/80 underline"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
