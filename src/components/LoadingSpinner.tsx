import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export default function LoadingSpinner({
  message = "Loading...",
  size = "md",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 sm:gap-4 px-4">
      <div className="relative">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
        <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
      </div>
      {message && (
        <p className="text-muted-foreground text-xs sm:text-sm font-medium text-center">
          {message}
        </p>
      )}
    </div>
  );
}
