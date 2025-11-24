import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "@tanstack/react-router";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected Route Component
 *
 * Wrapper component that protects routes from unauthenticated access.
 * Redirects unauthenticated users to the authentication page while
 * storing their intended destination for post-auth redirect.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Protected content to render when authenticated
 *
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <ProfilePage />
 * </ProtectedRoute>
 * ```
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store intended destination with query params
      const fullPath = `${location.pathname}${location.search}`;
      sessionStorage.setItem("redirect_after_auth", fullPath);

      // Redirect to auth page
      navigate({ to: "/auth" });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Checking authentication..." />
      </div>
    );
  }

  // Render children if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
};
