import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Chrome, AlertCircle } from "lucide-react";

export interface AccountLinkPromptProps {
  currentAuthMethod: "google" | "email";
  existingAuthMethod: "google" | "email";
  email: string;
  targetUserSub: string;
  onConfirm: () => Promise<void>;
  onDecline: () => void;
}

export default function AccountLinkPrompt({
  currentAuthMethod,
  existingAuthMethod,
  email,
  onConfirm,
  onDecline,
}: AccountLinkPromptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthMethodIcon = (method: "google" | "email") => {
    return method === "google" ? (
      <Chrome className="h-5 w-5" />
    ) : (
      <Mail className="h-5 w-5" />
    );
  };

  const getAuthMethodLabel = (method: "google" | "email") => {
    return method === "google" ? "Google" : "Email";
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onConfirm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to link accounts. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    onDecline();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl sm:text-2xl">
            Link Your Accounts
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            We found an existing account with the same email address
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Email Display */}
          <div className="rounded-lg bg-muted p-3 sm:p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Email Address
            </p>
            <p className="text-sm sm:text-base font-semibold break-all">
              {email}
            </p>
          </div>

          {/* Authentication Methods */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border p-3 sm:p-4">
              {getAuthMethodIcon(currentAuthMethod)}
              <div>
                <p className="text-sm font-medium">Current Sign-In Method</p>
                <p className="text-sm text-muted-foreground">
                  {getAuthMethodLabel(currentAuthMethod)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3 sm:p-4">
              {getAuthMethodIcon(existingAuthMethod)}
              <div>
                <p className="text-sm font-medium">Existing Account Method</p>
                <p className="text-sm text-muted-foreground">
                  {getAuthMethodLabel(existingAuthMethod)}
                </p>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 sm:p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Linking your accounts will merge them into one. You'll be able to
              sign in with either {getAuthMethodLabel(currentAuthMethod)} or{" "}
              {getAuthMethodLabel(existingAuthMethod)} and access the same
              profile and applications.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={isLoading}
            className="w-full sm:w-auto min-h-[44px]"
          >
            Decline
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {isLoading ? "Linking..." : "Confirm & Link Accounts"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
