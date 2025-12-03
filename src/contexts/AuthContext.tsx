import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  signInWithRedirect,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { analytics } from "@/utils/analytics";

/**
 * Authenticated user information
 */
interface AuthUser {
  /** Unique user identifier from Cognito */
  userId: string;
  /** User's email address */
  email: string;
  /** User's first name (from Google) */
  givenName?: string;
  /** User's last name (from Google) */
  familyName?: string;
  /** URL to user's profile picture */
  picture?: string;
  /** Identity provider name (Google) */
  provider?: string;
}

/**
 * OTP request response (matches backend format)
 */
interface OTPRequestResponse {
  message: string;
  expiresIn: number;
  session: string; // Cognito session token for verification
}

/**
 * OTP verification response (matches backend format)
 */
interface OTPVerifyResponse {
  tokens: {
    idToken: string;
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  };
  user: {
    userId: string;
    email: string;
    authMethods: string;
  };
  isNewUser: boolean;
  linkedAccount: boolean;
}

/**
 * Authentication context type definition
 */
interface AuthContextType {
  /** Current authenticated user or null if not authenticated */
  user: AuthUser | null;
  /** Whether a user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether authentication status is being checked */
  isLoading: boolean;
  /** Initiate Google OAuth sign-in flow */
  signInWithGoogle: () => Promise<void>;
  /** Request OTP code for email authentication */
  requestOTP: (email: string) => Promise<OTPRequestResponse>;
  /** Verify OTP code and authenticate user */
  verifyOTP: (
    email: string,
    code: string,
    session: string
  ) => Promise<OTPVerifyResponse>;
  /** Sign out the current user globally */
  signOut: () => Promise<void>;
  /** Refresh the current session and obtain new tokens */
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component
 *
 * Provides authentication context to the application, managing user state,
 * OAuth flows, and session persistence. Automatically checks for existing
 * sessions on mount and listens for authentication events.
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components that will have access to auth context
 *
 * @example
 * ```tsx
 * import { AuthProvider } from '@/contexts/AuthContext';
 *
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <YourApp />
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    checkUser();

    // Listen for auth events
    const hubListener = Hub.listen("auth", ({ payload: { event } }) => {
      switch (event) {
        case "signedIn":
          checkUser();
          break;
        case "signedOut":
          setUser(null);
          break;
        case "customOAuthState":
          // Handle custom state if needed
          break;
      }
    });

    return () => hubListener();
  }, []);

  const checkUser = async () => {
    try {
      // First, check for OTP-based authentication (JWT tokens in localStorage)
      const otpAccessToken = localStorage.getItem("otp_access_token");
      const otpUserStr = localStorage.getItem("otp_user");

      if (otpAccessToken && otpUserStr) {
        try {
          // Verify the token is still valid by checking expiration
          const tokenParts = otpAccessToken.split(".");
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Date.now() / 1000;

            if (payload.exp && payload.exp > now) {
              // Token is still valid
              const otpUser = JSON.parse(otpUserStr);
              const authUser: AuthUser = {
                userId: otpUser.email,
                email: otpUser.email,
                provider: "email",
              };
              setUser(authUser);

              // Identify user in PostHog
              analytics.identify(authUser.userId, {
                email: authUser.email,
                provider: "email",
              });

              setIsLoading(false);
              return;
            } else {
              // Token expired, try to refresh
              await refreshOTPSession();
              return;
            }
          }
        } catch (e) {
          // Invalid token, clear it
          localStorage.removeItem("otp_access_token");
          localStorage.removeItem("otp_refresh_token");
          localStorage.removeItem("otp_user");
        }
      }

      // Fall back to Cognito/Amplify authentication (Google OAuth)
      await getCurrentUser();
      const attributes = await fetchUserAttributes();

      const authUser: AuthUser = parseUserAttributes(attributes);
      setUser(authUser);

      // Identify user in PostHog
      analytics.identify(authUser.userId, {
        email: authUser.email,
        name: `${authUser.givenName || ""} ${authUser.familyName || ""}`.trim(),
        provider: authUser.provider,
      });
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOTPSession = async () => {
    try {
      const refreshToken = localStorage.getItem("otp_refresh_token");
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const { apiClient } = await import("@/services/apiClient");

      const response = await apiClient.request<{
        tokens: {
          accessToken: string;
          refreshToken: string;
          expiresInSeconds: number;
        };
      }>({
        method: "POST",
        endpoint: "/auth/otp/refresh",
        data: { refreshToken },
        requiresAuth: false,
      });

      if (response.error || !response.data?.tokens) {
        throw new Error("Failed to refresh token");
      }

      // Update stored tokens
      localStorage.setItem(
        "otp_access_token",
        response.data.tokens.accessToken
      );
      localStorage.setItem(
        "otp_refresh_token",
        response.data.tokens.refreshToken
      );

      // Re-check user with new token
      const otpUserStr = localStorage.getItem("otp_user");
      if (otpUserStr) {
        const otpUser = JSON.parse(otpUserStr);
        const authUser: AuthUser = {
          userId: otpUser.email,
          email: otpUser.email,
          provider: "email",
        };
        setUser(authUser);
      }
    } catch (error) {
      // Refresh failed, clear tokens and user
      localStorage.removeItem("otp_access_token");
      localStorage.removeItem("otp_refresh_token");
      localStorage.removeItem("otp_user");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Parse Cognito user attributes into AuthUser format
   *
   * Extracts user information from Cognito attributes and handles
   * provider-specific attribute mapping (Google vs GitHub).
   *
   * @param attributes - Record of Cognito user attributes
   * @returns Parsed AuthUser object
   */
  const parseUserAttributes = (
    attributes: Record<string, string | undefined>
  ): AuthUser => {
    const userId = attributes.sub || "";
    const email = attributes.email || "";
    const picture = attributes.picture;

    // Parse identities to get provider
    const identitiesStr = attributes.identities;
    let provider: string | undefined;
    if (identitiesStr) {
      try {
        const identities = JSON.parse(identitiesStr);
        provider = identities[0]?.providerName;
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Handle Google attributes (given_name, family_name)
    const givenName = attributes.given_name;
    const familyName = attributes.family_name;

    return {
      userId,
      email,
      givenName,
      familyName,
      picture,
      provider,
    };
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithRedirect({ provider: "Google" });
    } catch (error) {
      console.error("Google sign-in error:", error);
      // Re-throw to allow UI to handle
      throw error;
    }
  };

  const requestOTP = async (email: string): Promise<OTPRequestResponse> => {
    try {
      const { apiClient } = await import("@/services/apiClient");

      // OTP request doesn't require authentication
      const response = await apiClient.request<OTPRequestResponse>({
        method: "POST",
        endpoint: "/auth/otp/request",
        data: { email },
        requiresAuth: false,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to request OTP");
      }

      if (!response.data) {
        throw new Error("No data returned from OTP request");
      }

      return response.data;
    } catch (error) {
      console.error("OTP request error:", error);
      throw error;
    }
  };

  const verifyOTP = async (
    email: string,
    code: string,
    _session: string // Session not needed for DynamoDB-based approach
  ): Promise<OTPVerifyResponse> => {
    try {
      const { apiClient } = await import("@/services/apiClient");

      // Call the verify endpoint directly
      const response = await apiClient.request<OTPVerifyResponse>({
        method: "POST",
        endpoint: "/auth/otp/verify",
        data: { email, code },
        requiresAuth: false,
      });

      if (response.error) {
        const error = new Error(
          response.error.message || "Failed to verify OTP"
        );
        (error as any).code = response.error.code;
        throw error;
      }

      if (!response.data || !response.data.tokens) {
        throw new Error("No tokens returned from OTP verification");
      }

      // Store tokens in localStorage for the API client to use
      localStorage.setItem(
        "otp_access_token",
        response.data.tokens.accessToken
      );
      localStorage.setItem(
        "otp_refresh_token",
        response.data.tokens.refreshToken
      );
      localStorage.setItem("otp_user", JSON.stringify(response.data.user));

      // Set user state from the response
      const authUser: AuthUser = {
        userId: response.data.user.email, // Use email as userId for OTP users
        email: response.data.user.email,
        provider: "email",
      };
      setUser(authUser);

      // Identify user in PostHog
      analytics.identify(authUser.userId, {
        email: authUser.email,
        provider: "email",
      });

      return response.data;
    } catch (error) {
      console.error("OTP verification error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Reset PostHog user identity
      analytics.reset();

      // Clear OTP tokens from localStorage
      localStorage.removeItem("otp_access_token");
      localStorage.removeItem("otp_refresh_token");
      localStorage.removeItem("otp_user");

      // Sign out from Amplify (for Google OAuth users)
      try {
        await amplifySignOut();
      } catch (e) {
        // Ignore errors if not signed in via Amplify
      }

      setUser(null);

      // Simply redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error("Sign-out error:", error);
      throw error;
    }
  };

  const refreshSession = async () => {
    try {
      await fetchAuthSession({ forceRefresh: true });
    } catch (error) {
      console.error("Session refresh error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signInWithGoogle,
        requestOTP,
        verifyOTP,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access authentication context
 *
 * Provides access to the current user state, authentication status,
 * and authentication methods (sign in, sign out, refresh session).
 *
 * @returns {AuthContextType} Authentication context containing:
 *   - user: Current authenticated user or null
 *   - isAuthenticated: Boolean indicating if user is authenticated
 *   - isLoading: Boolean indicating if auth check is in progress
 *   - signInWithGoogle: Function to initiate Google OAuth flow
 *   - signOut: Function to sign out the current user
 *   - refreshSession: Function to refresh the current session
 *
 * @throws {Error} If used outside of AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signInWithGoogle } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={signInWithGoogle}>Sign In</button>;
 *   }
 *
 *   return <div>Welcome, {user?.givenName}!</div>;
 * }
 * ```
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider. " +
        "Wrap your component tree with <AuthProvider> to use authentication features."
    );
  }
  return context;
};
