import { Button } from "@/components/ui/button";
import { Chrome, Mail } from "lucide-react";

interface AuthMethodSelectorProps {
  onGoogleAuth: () => void;
  onEmailAuth: () => void;
  isLoading?: boolean;
}

export default function AuthMethodSelector({
  onGoogleAuth,
  onEmailAuth,
  isLoading = false,
}: AuthMethodSelectorProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <Button
        onClick={onGoogleAuth}
        disabled={isLoading}
        className="w-full min-h-[44px] min-w-[44px]"
        variant="outline"
        size="lg"
        aria-label="Sign in with Google"
      >
        <Chrome className="mr-2 h-5 w-5" aria-hidden="true" />
        <span>Continue with Google</span>
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <Button
        onClick={onEmailAuth}
        disabled={isLoading}
        className="w-full min-h-[44px] min-w-[44px]"
        variant="outline"
        size="lg"
        aria-label="Sign in with Email"
      >
        <Mail className="mr-2 h-5 w-5" aria-hidden="true" />
        <span>Continue with Email</span>
      </Button>
    </div>
  );
}
